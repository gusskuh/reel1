import { fetchMarketNews } from "./fetchNews";
import { generateReelScript } from "./generateScript";
import { generateSpeech } from "./generateSpeech";
import { fetchBackgroundVideo } from "./fetchBackgroundVideo";
import { createReelVideo } from "./createVideo";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { generateCaptions } from "./generateCaptions";
import { generateSceneVideos } from "./fetchSceneVideos";
import { createDynamicVideo } from "./createDynamicVideo";
import { uploadToYouTube, generateVideoMetadata } from "./uploadToYouTube";

async function main() {
  try {
    console.log("📰 Step 1: Fetching news...");
    const news = await fetchMarketNews();
    if (!news) {
      console.error("❌ No news available.");
      return;
    }
    console.log(`✅ Found article: ${news.title}\n`);
    
    // Extract ticker symbol from title (look for uppercase letters, typically 1-5 chars)
    const tickerMatch = news.title.match(/\b([A-Z]{1,5})\b/);
    const tickerSymbol = tickerMatch ? tickerMatch[1] : undefined;
    if (tickerSymbol) {
      console.log(`📊 Ticker symbol detected: ${tickerSymbol}\n`);
    }

    console.log("✍️  Step 2: Generating script...");
    const script = await generateReelScript({
      title: news.title,
      content: news.content,
    });
    console.log("✅ Script generated\n");

    console.log("🎤 Step 3: Generating speech...");
    const voice = await generateSpeech(script);
    console.log(`✅ Speech saved: ${voice}\n`);

    console.log("🎥 Step 4: Fetching video scenes...");

    const scenes = await generateSceneVideos(script);
    if (!scenes) {
      console.error("❌ No scenes generated.");
      return;
    }
    console.log(`✅ Generated ${scenes.length} scene videos\n`);
    console.log("🎞️  Step 5: Creating final video...");
    // await createReelVideo({
    //   voicePath: voice,
    //   backgroundPath: background,
    //   captions: captionsPath,
    // });

    // Assume each scene roughly matches 5s of narration (can refine with Whisper timings)
    const sceneSegments = scenes.map((s: any, i: number) => ({
      start: i * 5,
      end: (i + 1) * 5,
      text: s.text,
      clipPath: `scene_${i + 1}.mp4`,
    }));

    // 5️⃣ Generate timed captions file (SRT)

    const captionsPath = await generateCaptions(voice);
    if (!captionsPath) {
      console.error("❌ No captions generated.");
      return;
    }
    console.log(`✅ Captions saved: ${captionsPath}\n`);

    const videoPath = await createDynamicVideo({
      scenes: sceneSegments,
      voicePath: voice,
      captionFile: captionsPath,
      tickerSymbol: tickerSymbol,
    });

    console.log(`✅ Video created: ${videoPath}\n`);

    // Optional: Upload to YouTube
    if (process.env.UPLOAD_TO_YOUTUBE === "true") {
      try {
        console.log("📺 Step 7: Uploading to YouTube...");
        const metadata = generateVideoMetadata(news.title, script, tickerSymbol);
        const videoUrl = await uploadToYouTube(videoPath, metadata);
        console.log(`✅ Uploaded to YouTube: ${videoUrl}\n`);
      } catch (error) {
        console.error("⚠️  YouTube upload failed:", error);
        console.log("   Continuing without YouTube upload...\n");
      }
    } else {
      console.log("💡 Tip: Set UPLOAD_TO_YOUTUBE=true in .env to auto-upload to YouTube\n");
    }

    console.log("\n✅ All done! Your automated financial news reel is ready 🎉");
  } catch (error) {
    console.error("❌ Error creating reel:", error);
    process.exit(1);
  }
}

/**
 * Create a simple colored background image as fallback
 */
async function createSimpleBackground(): Promise<string> {
  const outputPath = path.resolve("background.jpg");

  return new Promise((resolve) => {
    ffmpeg()
      .input("color=c=#1a1a2e:s=1080x1920")
      .inputFormat("lavfi")
      .outputOptions(["-frames:v", "1"])
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err: Error) => {
        console.warn("⚠️  Could not create background. Using default fallback.");
        // Return a path anyway - createVideo will handle the error
        resolve("background.jpg");
      });
  });
}

main();
