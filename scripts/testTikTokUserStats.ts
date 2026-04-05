import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";

/**
 * Test script to demonstrate user.info.stats scope
 * This shows how the app retrieves user statistics from TikTok
 */
async function testUserStats() {
  console.log("\n" + "╔══════════════════════════════════════════════════════════════╗");
  console.log("║     Testing user.info.stats Scope - Demo Video            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("📋 API Call Details:");
  console.log("   • Endpoint: GET /v2/user/info/");
  console.log("   • Scope: user.info.stats");
  console.log("   • Purpose: Retrieve user statistics (followers, video count, etc.)\n");

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
    console.log(`GET ${BASE_URL}/v2/user/info/?fields=display_name,bio_description,avatar_url,follower_count,following_count,likes_count,video_count`);
    console.log("Headers:");
    console.log(`  Authorization: Bearer <access_token>`);
    console.log("\n" + "═".repeat(65));
    console.log("Expected Response (after app approval):");
    console.log("═".repeat(65));
    console.log(JSON.stringify({
      data: {
        user: {
          display_name: "Your TikTok Account",
          follower_count: 1234,
          following_count: 567,
          likes_count: 8901,
          video_count: 42,
          avatar_url: "https://..."
        }
      }
    }, null, 2));
    console.log("═".repeat(65) + "\n");
    console.log("💡 This demonstrates how the user.info.stats scope works.");
    console.log("   Once TikTok approves the app, this will return real data.\n");
    return;
  }

  console.log("🔄 Making API request...\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/user/info/?fields=display_name,bio_description,avatar_url,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ API Response Received Successfully!\n");
    console.log("═".repeat(65));
    console.log("📊 User Statistics Data:");
    console.log("═".repeat(65));
    console.log(JSON.stringify(response.data, null, 2));
    console.log("═".repeat(65) + "\n");
    
    if (response.data.data?.user) {
      const user = response.data.data.user;
      console.log("📈 Account Summary:");
      console.log(`   Display Name: ${user.display_name || "N/A"}`);
      console.log(`   Followers: ${user.follower_count || 0}`);
      console.log(`   Following: ${user.following_count || 0}`);
      console.log(`   Total Likes: ${user.likes_count || 0}`);
      console.log(`   Video Count: ${user.video_count || 0}`);
    }
    
    console.log("\n✅ This demonstrates the user.info.stats scope is working correctly!");
  } catch (error: any) {
    console.error("\n❌ Error fetching user statistics:");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

testUserStats();

