import { uploadToX } from "./uploadToX";
import path from "path";

/**
 * Test script to quickly test X upload without running the full process
 */
async function testXUpload() {
  const videoPath = path.resolve("dynamic_reel.mp4");
  
  // Check if video exists
  const fs = require("fs");
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ Video file not found: ${videoPath}`);
    console.log("💡 Make sure you have a video file at:", videoPath);
    process.exit(1);
  }

  console.log("🧪 Testing X upload...");
  console.log(`📹 Video: ${videoPath}`);
  console.log(`📊 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)} MB\n`);

  const metadata = {
    text: "🧪 Test upload - Automated financial news reel",
  };

  try {
    const tweetUrl = await uploadToX(videoPath, metadata);
    console.log("\n✅ Test successful!");
    console.log(`🔗 Tweet URL: ${tweetUrl}`);
  } catch (error: any) {
    console.error("\n❌ Test failed!");
    console.error(error.message);
    process.exit(1);
  }
}

testXUpload();

