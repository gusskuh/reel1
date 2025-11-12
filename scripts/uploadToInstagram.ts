import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import FormData from "form-data";
import https from "https";

dotenv.config();

// Configure axios with SSL handling for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates (for development)
});

const TOKEN_PATH = path.resolve("instagram_token.json");
const BASE_URL = "https://graph.facebook.com/v21.0";

interface VideoMetadata {
  title: string;
  description?: string;
  caption?: string;
}

interface InstagramToken {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Load stored access token
 */
function loadToken(): InstagramToken | null {
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    } catch (error) {
      console.error("⚠️  Error reading Instagram token file:", error);
      return null;
    }
  }
  return null;
}

/**
 * Save access token
 */
function saveToken(token: InstagramToken): void {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

/**
 * Get access token from environment or file
 */
function getAccessToken(): string {
  // First try environment variable
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  // Then try token file
  const tokenData = loadToken();
  if (tokenData?.access_token) {
    return tokenData.access_token;
  }

  throw new Error(
    "❌ Instagram access token not found. Please set INSTAGRAM_ACCESS_TOKEN in .env file or create instagram_token.json.\n" +
    "See INSTAGRAM_SETUP.md for instructions."
  );
}

/**
 * Upload video to Instagram Reels
 */
async function uploadVideoToInstagram(
  videoPath: string,
  accessToken: string,
  instagramAccountId: string,
  caption?: string
): Promise<string> {
  console.log(`📤 Uploading video to Instagram: ${path.basename(videoPath)}...`);

  const fileSize = fs.statSync(videoPath).size;
  console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Step 1: Create video container
  console.log("📋 Step 1: Creating video container...");
  const createContainerUrl = `${BASE_URL}/${instagramAccountId}/media`;
  
  const containerParams = new URLSearchParams({
    media_type: "REELS",
    video_file: fs.createReadStream(videoPath) as any, // Will be sent as multipart
  });

  // For Instagram, we need to upload the video file first, then create container
  // Actually, Instagram requires a two-step process:
  // 1. Upload video file to get a video_id
  // 2. Create container with video_id
  // 3. Publish container

  // Instagram Graph API flow for Reels:
  // 1. Create media container with video file
  // 2. Check status until FINISHED
  // 3. Publish the container
  
  const formData = new FormData();
  formData.append("video_file", fs.createReadStream(videoPath), {
    filename: path.basename(videoPath),
    contentType: "video/mp4",
  });
  formData.append("media_type", "REELS");
  // Add caption if provided (Instagram supports caption in initial request)
  if (caption) {
    formData.append("caption", caption);
  }
  formData.append("access_token", accessToken);

  try {
    // Step 1: Upload video and create container in one step
    const uploadResponse = await axios.post(
      `${BASE_URL}/${instagramAccountId}/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        httpsAgent,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const creationId = uploadResponse.data.id;
    if (!creationId) {
      throw new Error("No creation ID returned from Instagram API");
    }

    console.log(`✅ Video uploaded. Creation ID: ${creationId}`);

    // Step 2: Check status and publish
    console.log("📋 Step 2: Checking upload status...");
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 30;

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await axios.get(
        `${BASE_URL}/${creationId}`,
        {
          params: {
            fields: "status_code",
            access_token: accessToken,
          },
          httpsAgent,
        }
      );

      status = statusResponse.data.status_code;
      attempts++;

      if (status === "IN_PROGRESS") {
        console.log(`   Status: ${status} (attempt ${attempts}/${maxAttempts})...`);
      }
    }

    if (status !== "FINISHED") {
      throw new Error(`Video processing failed with status: ${status}`);
    }

    console.log("✅ Video processing completed");

    // Step 3: Publish the container
    console.log("📋 Step 3: Publishing Reel...");
    const publishResponse = await axios.post(
      `${BASE_URL}/${instagramAccountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    );

    const mediaId = publishResponse.data.id;
    console.log(`✅ Reel published! Media ID: ${mediaId}`);

    return mediaId;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ Instagram API Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      throw new Error(
        `Instagram upload failed: ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}

/**
 * Upload video to Instagram Reels
 */
export async function uploadToInstagram(
  videoPath: string,
  metadata: VideoMetadata
): Promise<string> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!appId || !appSecret) {
    throw new Error(
      "❌ Missing Instagram credentials. Please set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in .env file.\n" +
      "See INSTAGRAM_SETUP.md for instructions."
    );
  }

  if (!instagramAccountId) {
    throw new Error(
      "❌ Missing Instagram Business Account ID. Please set INSTAGRAM_BUSINESS_ACCOUNT_ID in .env file.\n" +
      "See INSTAGRAM_SETUP.md for instructions on how to get this."
    );
  }

  const accessToken = getAccessToken();

  try {
    // Upload and publish video
    const mediaId = await uploadVideoToInstagram(
      videoPath,
      accessToken,
      instagramAccountId,
      metadata.caption
    );

    // Update caption if provided (Instagram requires this after publishing)
    if (metadata.caption) {
      console.log("📝 Updating Reel caption...");
      try {
        // Instagram API: Update media with caption
        await axios.post(
          `${BASE_URL}/${mediaId}`,
          {
            caption: metadata.caption,
            access_token: accessToken,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            httpsAgent,
          }
        );
        console.log("✅ Caption updated");
      } catch (error: any) {
        console.warn("⚠️  Could not update caption:", error.response?.data || error.message);
        // Don't fail the whole upload if caption update fails
        console.log("   Reel was published but caption may not be set");
      }
    }

    const reelUrl = `https://www.instagram.com/reel/${mediaId}/`;
    console.log(`✅ Instagram Reel posted successfully!`);
    console.log(`🔗 URL: ${reelUrl}`);
    console.log(`📊 Media ID: ${mediaId}`);

    return reelUrl;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ Instagram API Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    throw error;
  }
}

/**
 * Generate Instagram caption from news article
 */
export function generateInstagramMetadata(
  newsTitle: string,
  script: string,
  tickerSymbol?: string
): VideoMetadata {
  // Instagram allows up to 2,200 characters for captions - use the full space!
  // Create engaging, detailed caption with emojis and comprehensive hashtags
  const emoji = tickerSymbol ? "📊" : "💰";
  
  // Use more of the script (up to 1500 chars) for Instagram
  const scriptExcerpt = script.length > 1500 ? script.substring(0, 1500) + "..." : script;
  const formattedScript = scriptExcerpt.replace(/\n/g, " ").trim();
  
  // Comprehensive hashtags for maximum reach
  const hashtags = tickerSymbol
    ? `#${tickerSymbol} #${tickerSymbol}Stock #${tickerSymbol}News #FinancialNews #StockMarket #Investing #Trading #Finance #Markets #Stocks #Reels #FinancialReels #InvestmentTips #MarketAnalysis #TradingTips #StockMarketNews #FinanceTips #InvestingTips #DayTrading #Money #Wealth #FinancialFreedom #InvestSmart #BusinessNews #EconomicNews`
    : "#FinancialNews #StockMarket #Investing #Trading #Finance #Markets #Stocks #Reels #FinancialReels #InvestmentTips #MarketAnalysis #TradingTips #StockMarketNews #FinanceTips #InvestingTips #DayTrading #Money #Wealth #FinancialFreedom #InvestSmart #BusinessNews #EconomicNews #WallStreet #NASDAQ #NYSE";

  const caption = `${emoji} ${newsTitle}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${formattedScript}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 What's your take on this? Let us know in the comments! 👇\n\n📊 Follow @valuezai for daily financial insights!\n🔔 Turn on post notifications!\n\n🔗 Visit valuezai.com for more financial content\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${hashtags}`;

  // Ensure it's under 2,200 characters (with some buffer)
  const maxLength = 2200;
  const finalCaption =
    caption.length > maxLength
      ? caption.substring(0, maxLength - 3) + "..."
      : caption;

  return {
    title: newsTitle,
    description: script,
    caption: finalCaption,
  };
}

