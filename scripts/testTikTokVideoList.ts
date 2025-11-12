import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";

/**
 * Test script to demonstrate video.list scope
 * This shows how the app retrieves a list of videos from the TikTok account
 */
async function testVideoList() {
  // Load token
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error("❌ No token found. Please authorize first by running the upload script.");
    console.log("💡 Run: npm run create-reel (or your TikTok upload script)");
    process.exit(1);
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error("❌ No access token found in token file.");
    process.exit(1);
  }

  console.log("📹 Testing video.list scope...");
  console.log("🔗 Calling TikTok API: GET /v2/video/list/\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/video/list/?max_count=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ Video List Retrieved Successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    if (response.data.data?.videos) {
      const videos = response.data.data.videos;
      console.log(`📊 Total Videos Retrieved: ${videos.length}\n`);
      
      if (videos.length > 0) {
        console.log("📝 Video Details:");
        videos.forEach((video: any, index: number) => {
          console.log(`\n   Video ${index + 1}:`);
          console.log(`   - ID: ${video.id || "N/A"}`);
          console.log(`   - Title: ${video.title || "N/A"}`);
          console.log(`   - Create Time: ${video.create_time || "N/A"}`);
          console.log(`   - Cover Image: ${video.cover_image_url ? "✅" : "❌"}`);
          console.log(`   - Share URL: ${video.share_url || "N/A"}`);
        });
      } else {
        console.log("ℹ️  No videos found. Upload a video first to see it in the list.");
      }
    }
    
    console.log("\n✅ This demonstrates the video.list scope is working correctly!");
    console.log("💡 This allows the app to verify successful uploads and manage content.");
  } catch (error: any) {
    console.error("\n❌ Error fetching video list:");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

testVideoList();

