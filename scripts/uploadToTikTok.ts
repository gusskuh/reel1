import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import http from "http";
import url from "url";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";

interface VideoMetadata {
  title: string;
  description?: string;
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIEND" | "PRIVATE";
  disableDuet?: boolean;
  disableComment?: boolean;
  disableStitch?: boolean;
  videoCoverTimestamp?: number; // milliseconds
}

interface TikTokToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Load or request authorization credentials for TikTok API
 */
async function authorize(): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/tiktok_callback";

  if (!clientKey || !clientSecret) {
    throw new Error(
      "❌ Missing TikTok credentials. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env file.\n" +
      "Get them from: https://developers.tiktok.com/"
    );
  }

  // Check if we have previously stored a token
  if (fs.existsSync(TOKEN_PATH)) {
    const tokenData: TikTokToken = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    // Check if token is expired (with 5 minute buffer)
    if (tokenData.expires_in && tokenData.access_token) {
      return tokenData.access_token;
    }
  }

  // If no token, get a new one
  return getNewToken(clientKey, clientSecret, redirectUri);
}

/**
 * Get and store new token after prompting for user authorization
 */
function getNewToken(clientKey: string, clientSecret: string, redirectUri: string): Promise<string> {
  const isWebApp = redirectUri.startsWith("http://") || redirectUri.startsWith("https://");

  // Step 1: Get authorization code
  // Request all required scopes: user.info.stats, video.list, and video.upload
  const authUrl = `${BASE_URL}/v2/oauth/authorize/?client_key=${clientKey}&scope=user.info.stats,video.list,video.upload&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=state`;

  console.log("🔐 Authorize this app by visiting this url:", authUrl);
  console.log("\n");

  if (isWebApp) {
    // For Web apps: Start a local server to catch the OAuth callback
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (!req.url) {
          res.writeHead(400);
          res.end("Bad Request");
          return;
        }

        const parsedUrl = url.parse(req.url, true);
        const code = parsedUrl.query.code as string;
        const error = parsedUrl.query.error as string;

        if (error) {
          res.writeHead(400);
          res.end(`<html><body><h1>Authorization Error</h1><p>${error}</p><p>You can close this window.</p></body></html>`);
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200);
          res.end("<html><body><h1>Authorization Successful!</h1><p>You can close this window and return to the terminal.</p></body></html>");
          server.close();

          try {
            const accessToken = await exchangeCodeForToken(code, clientKey, clientSecret, redirectUri);
            resolve(accessToken);
          } catch (err: any) {
            console.error("❌ Error retrieving access token", err);
            reject(err);
          }
        } else {
          res.writeHead(400);
          res.end("<html><body><h1>No authorization code received</h1><p>You can close this window.</p></body></html>");
        }
      });

      const port = new URL(redirectUri).port || 3000;
      server.listen(port, () => {
        console.log(`🌐 Local server listening on ${redirectUri}`);
        console.log(`   Waiting for authorization...`);
      });

      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.error(`❌ Port ${port} is already in use. Please close the application using that port or change TIKTOK_REDIRECT_URI in .env`);
        } else {
          console.error("❌ Server error:", err);
        }
        reject(err);
      });
    });
  } else {
    // For Desktop apps: Manual code entry
    console.log("📋 After authorization, you'll get a code. Paste it here:");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question("Enter the code from that page here: ", async (code) => {
        rl.close();
        try {
          const accessToken = await exchangeCodeForToken(code, clientKey, clientSecret, redirectUri);
          resolve(accessToken);
        } catch (err: any) {
          console.error("❌ Error retrieving access token", err);
          reject(err);
        }
      });
    });
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  try {
    const response = await axios.post(
      `${BASE_URL}/v2/oauth/token/`,
      {
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokenData: TikTokToken = {
      access_token: response.data.data.access_token,
      refresh_token: response.data.data.refresh_token,
      expires_in: response.data.data.expires_in,
      token_type: response.data.data.token_type,
      scope: response.data.data.scope,
    };

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
    console.log("✅ Token stored to", TOKEN_PATH);
    return tokenData.access_token;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ TikTok API Error:", error.response.data);
      throw new Error(`Token exchange failed: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Upload video to TikTok using URL method (simpler than chunked upload)
 */
export async function uploadToTikTok(
  videoPath: string,
  metadata: VideoMetadata
): Promise<string> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  console.log("🔐 Authenticating with TikTok...");
  const accessToken = await authorize();

  const fileSize = fs.statSync(videoPath).size;
  console.log(`📤 Uploading video: ${path.basename(videoPath)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  // TikTok requires the video to be accessible via URL
  // For GitHub Actions, we'll need to upload to a temporary storage first
  // For now, we'll use the file upload method with chunks

  try {
    // Step 1: Initialize upload
    console.log("📋 Step 1: Initializing TikTok upload...");
    const initResponse = await axios.post(
      `${BASE_URL}/v2/post/publish/inbox/video/init/`,
      {
        post_info: {
          title: metadata.title,
          description: metadata.description || metadata.title,
          privacy_level: metadata.privacyLevel || "PUBLIC_TO_EVERYONE",
          disable_duet: metadata.disableDuet || false,
          disable_comment: metadata.disableComment || false,
          disable_stitch: metadata.disableStitch || false,
          video_cover_timestamp_ms: metadata.videoCoverTimestamp || 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    ).catch((error) => {
      console.error("❌ TikTok API Error (init):", error.response?.data || error.message);
      throw error;
    });

    const publishId = initResponse.data.data.publish_id;
    const uploadUrl = initResponse.data.data.upload_url;

    if (!uploadUrl) {
      throw new Error("No upload URL received from TikTok");
    }

    console.log(`✅ Upload initialized. Publish ID: ${publishId}`);

    // Step 2: Upload video file in chunks
    console.log("📤 Step 2: Uploading video file...");
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const fileBuffer = fs.readFileSync(videoPath);
    const totalSize = fileBuffer.length;
    let uploadedBytes = 0;

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = fileBuffer.slice(start, end);
      const isLastChunk = end >= totalSize;

      await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
          "Content-Length": (end - start).toString(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      uploadedBytes = end;
      const progress = ((uploadedBytes / totalSize) * 100).toFixed(1);
      console.log(`   Upload progress: ${progress}% (${(uploadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    console.log("✅ Video file uploaded");

    // Step 3: Finalize upload
    console.log("📋 Step 3: Finalizing upload...");
    const finalizeResponse = await axios.post(
      `${BASE_URL}/v2/post/publish/status/fetch/`,
      {
        publish_id: publishId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const videoId = finalizeResponse.data.data.share_id || publishId;
    const videoUrl = `https://www.tiktok.com/@${finalizeResponse.data.data.share_id || 'video'}`;

    console.log(`✅ Video uploaded successfully!`);
    console.log(`🔗 Video ID: ${videoId}`);
    console.log(`📱 Check your TikTok account to see the video`);

    return videoUrl;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ TikTok API Error:", error.response.data);
      throw new Error(`Upload failed: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Generate video metadata from news article
 */
export function generateTikTokMetadata(
  newsTitle: string,
  script: string,
  tickerSymbol?: string
): VideoMetadata {
  // Create a title (max 150 chars for TikTok)
  const title = tickerSymbol
    ? `${tickerSymbol} News: ${newsTitle.substring(0, 100)}`
    : `Financial News: ${newsTitle.substring(0, 100)}`;

  // Create detailed description (max 2200 chars for TikTok) - go all out!
  const fullScript = script.length > 1800 ? script.substring(0, 1800) + "..." : script;
  const description = `${fullScript}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 What do you think about this news? Drop a comment! 👇\n\n📊 Follow for daily financial updates!\n🔔 Turn on notifications so you don't miss out!\n\n🔗 Get more insights: valuezai.com\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n#FinancialNews #StockMarket #Investing #Trading #Finance #Markets #Stocks #InvestmentTips #MarketAnalysis #TradingTips #StockMarketNews #FinanceTok #InvestingTips #DayTrading #StockTok${tickerSymbol ? ` #${tickerSymbol} #${tickerSymbol}Stock #${tickerSymbol}News` : ""} #Money #Wealth #FinancialFreedom #InvestSmart`;

  return {
    title,
    description,
    privacyLevel: "PUBLIC_TO_EVERYONE",
    disableDuet: false,
    disableComment: false,
    disableStitch: false,
    videoCoverTimestamp: 1000, // 1 second into video
  };
}

