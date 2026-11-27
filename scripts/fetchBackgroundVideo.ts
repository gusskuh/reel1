import axios from "axios";
import fs, { createWriteStream } from "fs";
import path from "path";
import https from "https";
import { pipeline } from "stream/promises";
import dotenv from "dotenv";
dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

interface VideoFile {
  id?: number;
  link: string;
  width: number;
  height: number;
  file_type?: string;
  quality?: string;
}

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  video_files: VideoFile[];
}

export type StockClipSource = "pexels" | "pixabay";

export type FetchStockVideoOptions = {
  /** Clip ids already used this reel — format `pexels:123` / `pixabay:456` */
  excludeIds?: Set<string>;
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function clipKey(source: StockClipSource, id: string | number): string {
  return `${source}:${id}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Prefer smallest portrait file so ffmpeg decodes less (RAM on 512MB hosts). */
function pickSmallestPortraitFile(files: VideoFile[]): VideoFile | null {
  if (!files.length) return null;
  const portrait = files.filter((f) => f.width > 0 && f.height > 0 && f.width < f.height);
  const pool = portrait.length ? portrait : files;
  return [...pool].sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

async function downloadToFile(videoUrl: string, filename: string): Promise<string> {
  const outputPath = path.resolve(filename);
  const partPath = `${outputPath}.part`;

  const response = await axios.get(videoUrl, {
    responseType: "stream",
    httpsAgent,
    timeout: 120_000,
    maxContentLength: 45 * 1024 * 1024,
    maxBodyLength: 45 * 1024 * 1024,
  });

  try {
    await pipeline(response.data, createWriteStream(partPath));
    fs.renameSync(partPath, outputPath);
  } catch (e) {
    try {
      if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
    } catch {
      /* ignore */
    }
    throw e;
  }

  return outputPath;
}

async function fetchFromPexels(
  query: string,
  filename: string,
  excludeIds?: Set<string>
): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;

  const page = 1 + Math.floor(Math.random() * 3); // pages 1–3 for variety
  console.log(`🎥 Searching Pexels for: "${query}" (page ${page})...`);

  const res = await axios.get("https://api.pexels.com/videos/search", {
    headers: { Authorization: PEXELS_API_KEY },
    params: {
      query,
      orientation: "portrait",
      size: "medium",
      per_page: 15,
      page,
    },
    httpsAgent,
  });

  const videos: PexelsVideo[] = shuffle(res.data.videos || []);
  for (const selected of videos) {
    const key = clipKey("pexels", selected.id);
    if (excludeIds?.has(key)) continue;

    const file = pickSmallestPortraitFile(selected.video_files || []);
    if (!file?.link) continue;

    console.log(`📦 Pexels #${selected.id} (${file.width}×${file.height}) → ${filename}`);
    const outputPath = await downloadToFile(file.link, filename);
    excludeIds?.add(key);
    console.log(`✅ Saved background video: ${outputPath}`);
    return outputPath;
  }

  console.log("⚠️  No unused Pexels matches.");
  return null;
}

/**
 * Pixabay Videos API — free key from https://pixabay.com/api/docs/
 * No orientation filter; we prefer portrait when available.
 */
async function fetchFromPixabay(
  query: string,
  filename: string,
  excludeIds?: Set<string>
): Promise<string | null> {
  if (!PIXABAY_API_KEY) return null;

  const page = 1 + Math.floor(Math.random() * 3);
  console.log(`🎥 Searching Pixabay for: "${query}" (page ${page})...`);

  const res = await axios.get("https://pixabay.com/api/videos/", {
    params: {
      key: PIXABAY_API_KEY,
      q: query,
      video_type: "film",
      safesearch: "true",
      per_page: 20,
      page,
    },
    httpsAgent,
    timeout: 30_000,
  });

  type PixabayHit = {
    id: number;
    videos?: Record<string, { url?: string; width?: number; height?: number }>;
  };

  const hits: PixabayHit[] = shuffle(res.data.hits || []);
  const ranked = [
    ...hits.filter((h) => {
      const med = h.videos?.medium || h.videos?.small || h.videos?.tiny;
      return med && (med.height || 0) > (med.width || 0);
    }),
    ...hits,
  ];

  const seen = new Set<number>();
  for (const hit of ranked) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const key = clipKey("pixabay", hit.id);
    if (excludeIds?.has(key)) continue;

    const variants = ["tiny", "small", "medium", "large"]
      .map((k) => hit.videos?.[k])
      .filter(Boolean) as { url?: string; width?: number; height?: number }[];

    const portrait = variants.filter((v) => (v.width || 0) > 0 && (v.height || 0) > (v.width || 0));
    const pool = portrait.length ? portrait : variants;
    const file = [...pool].sort(
      (a, b) => (a.width || 0) * (a.height || 0) - (b.width || 0) * (b.height || 0)
    )[0];
    if (!file?.url) continue;

    console.log(
      `📦 Pixabay #${hit.id} (${file.width}×${file.height}) → ${filename}`
    );
    const outputPath = await downloadToFile(file.url, filename);
    excludeIds?.add(key);
    console.log(`✅ Saved background video: ${outputPath}`);
    return outputPath;
  }

  console.log("⚠️  No unused Pixabay matches.");
  return null;
}

/**
 * Fetch a short stock video matching a query.
 * Tries Pexels then Pixabay; randomizes page/result and skips excludeIds.
 */
export async function fetchBackgroundVideo(
  query: string,
  filename = "background.mp4",
  options?: FetchStockVideoOptions
): Promise<string | null> {
  const excludeIds = options?.excludeIds;
  const providers: Array<() => Promise<string | null>> = [];

  // Randomize provider order when both keys exist so homepage reels don't always look like Pexels.
  if (PEXELS_API_KEY && PIXABAY_API_KEY) {
    if (Math.random() < 0.5) {
      providers.push(
        () => fetchFromPexels(query, filename, excludeIds),
        () => fetchFromPixabay(query, filename, excludeIds)
      );
    } else {
      providers.push(
        () => fetchFromPixabay(query, filename, excludeIds),
        () => fetchFromPexels(query, filename, excludeIds)
      );
    }
  } else if (PEXELS_API_KEY) {
    providers.push(() => fetchFromPexels(query, filename, excludeIds));
  } else if (PIXABAY_API_KEY) {
    providers.push(() => fetchFromPixabay(query, filename, excludeIds));
  } else {
    console.warn("⚠️  Missing PEXELS_API_KEY and PIXABAY_API_KEY");
    return null;
  }

  try {
    for (const run of providers) {
      const saved = await run();
      if (saved) return saved;
    }
    return null;
  } catch (err) {
    console.error("❌ Failed to fetch video:", err);
    return null;
  }
}
