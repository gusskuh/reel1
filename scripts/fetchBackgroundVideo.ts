import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";
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

    // Choose the first one that is vertical
    const selected = videos.find((v) =>
      v.video_files.some((f) => f.width < f.height)
    ) || videos[0];

    // Choose a vertical or best-quality file
    const file =
      selected.video_files.find((f) => f.width < f.height) ||
      selected.video_files.sort((a, b) => b.width - a.width)[0];

    const videoUrl = file.link;

    console.log(`📦 Downloading video from: ${videoUrl}`);

    // Reuse the same httpsAgent for video download
    const response = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      httpsAgent,
    });
    const outputPath = path.resolve(filename);
    fs.writeFileSync(outputPath, Buffer.from(response.data));

    console.log(`✅ Saved background video: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Failed to fetch video:", err);
    return null;
  }
}
