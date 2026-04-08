import axios from "axios";
import fs, { createWriteStream } from "fs";
import path from "path";
import https from "https";
import { pipeline } from "stream/promises";
import dotenv from "dotenv";
dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

interface VideoFile {
  id: number;
  link: string;
  width: number;
  height: number;
  file_type: string;
  quality: string;
}

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  video_files: VideoFile[];
}

/** Prefer smallest portrait file so ffmpeg decodes less (RAM on 512MB hosts). */
function pickSmallestPortraitFile(files: VideoFile[]): VideoFile | null {
  if (!files.length) return null;
  const portrait = files.filter((f) => f.width > 0 && f.height > 0 && f.width < f.height);
  const pool = portrait.length ? portrait : files;
  return [...pool].sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

/**
 * Fetch a short, vertical stock video from Pexels that matches a query.
 * e.g. "stock market", "crypto", "technology"
 */
export async function fetchBackgroundVideo(
  query: string,
  filename = "background.mp4"
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn("⚠️  Missing PEXELS_API_KEY in .env");
    return null;
  }

  try {
    console.log(`🎥 Searching Pexels for: "${query}"...`);

    // Configure axios with SSL handling
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Allow self-signed certificates (for development)
    });

    const res = await axios.get("https://api.pexels.com/videos/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        orientation: "portrait",
        size: "medium",
        per_page: 5,
      },
      httpsAgent,
    });

    const videos: PexelsVideo[] = res.data.videos || [];

    if (!videos.length) {
      console.log("⚠️  No matching videos found.");
      return null;
    }

    // Prefer a result that has at least one portrait file
    const selected =
      videos.find((v) => v.video_files.some((f) => f.width < f.height)) || videos[0];

    const file = pickSmallestPortraitFile(selected.video_files);
    if (!file?.link) {
      console.log("⚠️  No usable video file metadata.");
      return null;
    }

    const videoUrl = file.link;

    console.log(`📦 Downloading (${file.width}×${file.height}) → stream to disk: ${videoUrl}`);

    const outputPath = path.resolve(filename);
    const partPath = `${outputPath}.part`;

    // Stream to disk — never load full MP4 into RAM (arraybuffer was spiking memory on HD clips).
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

    console.log(`✅ Saved background video: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Failed to fetch video:", err);
    return null;
  }
}
