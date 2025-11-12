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

  console.log("📊 Testing user.info.stats scope...");
  console.log("🔗 Calling TikTok API: GET /v2/user/info/\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/user/info/?fields=display_name,bio_description,avatar_url,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ User Statistics Retrieved Successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
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

