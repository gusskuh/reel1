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
  console.log("\n" + "╔══════════════════════════════════════════════════════════════╗");
  console.log("║     Testing video.list Scope - Demo Video                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("📋 API Call Details:");
  console.log("   • Endpoint: GET /v2/video/list/");
  console.log("   • Scope: video.list");
  console.log("   • Purpose: Retrieve list of uploaded videos\n");

  // Check for token
  let accessToken: string | null = null;
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      accessToken = tokenData.access_token;
    } catch (e) {
      // Token file exists but invalid
    }
  }

  if (!accessToken) {
    console.log("⚠️  DEMO MODE: No valid token found");
    console.log("   (This is expected - OAuth will work after TikTok approves the app)\n");
    console.log("📝 Showing API call structure for demo purposes:\n");
    console.log("═".repeat(65));
    console.log("API Request:");
    console.log("═".repeat(65));
    console.log(`GET ${BASE_URL}/v2/video/list/?max_count=10`);
    console.log("Headers:");
    console.log(`  Authorization: Bearer <access_token>`);
    console.log("\n" + "═".repeat(65));
    console.log("Expected Response (after app approval):");
    console.log("═".repeat(65));
    console.log(JSON.stringify({
      data: {
        videos: [
          {
            id: "video_id_123",
            title: "Financial News Reel",
            create_time: "2025-01-10T12:00:00Z",
            cover_image_url: "https://...",
            share_url: "https://www.tiktok.com/@username/video/123"
          }
        ],
        cursor: "...",
        has_more: false
      }
    }, null, 2));
    console.log("═".repeat(65) + "\n");
    console.log("💡 This demonstrates how the video.list scope works.");
    console.log("   Once TikTok approves the app, this will return real video data.");
    console.log("   This allows the app to verify successful uploads and manage content.\n");
    return;
  }

  console.log("🔄 Making API request...\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/video/list/?max_count=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ API Response Received Successfully!\n");
    console.log("═".repeat(65));
    console.log("📹 Video List Data:");
    console.log("═".repeat(65));
    console.log(JSON.stringify(response.data, null, 2));
    console.log("═".repeat(65) + "\n");
    
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

