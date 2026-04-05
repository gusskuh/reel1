import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import http from "http";
import url from "url";
import {
  exchangeAuthorizationCode,
  ensureValidAccessToken,
  uploadVideoToTikTok,
} from "../lib/tiktok/api";
import type { TikTokToken, VideoMetadata } from "../lib/tiktok/types";
import { TIKTOK_AUTH_URL, TIKTOK_SCOPES } from "../lib/tiktok/constants";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");

/**
 * Load or request authorization credentials for TikTok API
 */
async function authorize(): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/tiktok_callback";

  if (!clientKey || !clientSecret) {
    throw new Error(
      "❌ Missing TikTok credentials. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env file.\n" +
        "Get them from: https://developers.tiktok.com/"
    );
  }

  if (fs.existsSync(TOKEN_PATH)) {
    const token: TikTokToken = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    if (token.access_token) {
      try {
        const refreshed = await ensureValidAccessToken(
          token,
          clientKey,
          clientSecret
        );
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(refreshed, null, 2));
        return refreshed.access_token;
      } catch {
        // Re-authorize
      }
    }
  }

  return getNewToken(clientKey, clientSecret, redirectUri);
}

function getNewToken(
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  const isWebApp =
    redirectUri.startsWith("http://") || redirectUri.startsWith("https://");

  const authUrl = `${TIKTOK_AUTH_URL}?client_key=${clientKey}&scope=${TIKTOK_SCOPES}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=state`;

  console.log("🔐 Authorize this app by visiting this url:", authUrl);
  console.log("\n");

  if (isWebApp) {
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
          res.end(
            `<html><body><h1>Authorization Error</h1><p>${error}</p><p>You can close this window.</p></body></html>`
          );
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200);
          res.end(
            "<html><body><h1>Authorization Successful!</h1><p>You can close this window and return to the terminal.</p></body></html>"
          );
          server.close();

          try {
            const accessToken = await exchangeCodeForToken(
              code,
              clientKey,
              clientSecret,
              redirectUri
            );
            resolve(accessToken);
          } catch (err: unknown) {
            console.error("❌ Error retrieving access token", err);
            reject(err);
          }
        } else {
          res.writeHead(400);
          res.end(
            "<html><body><h1>No authorization code received</h1><p>You can close this window.</p></body></html>"
          );
        }
      });

      const port = new URL(redirectUri).port || 3000;
      server.listen(Number(port), () => {
        console.log(`🌐 Local server listening on ${redirectUri}`);
        console.log(`   Waiting for authorization...`);
      });

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `❌ Port ${port} is already in use. Please close the application using that port or change TIKTOK_REDIRECT_URI in .env`
          );
        } else {
          console.error("❌ Server error:", err);
        }
        reject(err);
      });
    });
  }

  console.log("📋 After authorization, you'll get a code. Paste it here:");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the code from that page here: ", async (code) => {
      rl.close();
      try {
        const accessToken = await exchangeCodeForToken(
          code,
          clientKey,
          clientSecret,
          redirectUri
        );
        resolve(accessToken);
      } catch (err: unknown) {
        console.error("❌ Error retrieving access token", err);
        reject(err);
      }
    });
  });
}

async function exchangeCodeForToken(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  try {
    const token = await exchangeAuthorizationCode(
      code,
      clientKey,
      clientSecret,
      redirectUri
    );
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    console.log("✅ Token stored to", TOKEN_PATH);
    return token.access_token;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("❌ TikTok API Error:", error.response.data);
      throw new Error(
        `Token exchange failed: ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}

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
  console.log(
    `📤 Uploading video: ${path.basename(videoPath)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`
  );

  const { shareUrl } = await uploadVideoToTikTok(
    accessToken,
    videoPath,
    metadata,
    { log: (m) => console.log(m) }
  );

  console.log(`✅ Video uploaded successfully!`);
  console.log(`📱 Check your TikTok account to see the video`);

  return shareUrl;
}

export function generateTikTokMetadata(
  newsTitle: string,
  script: string,
  tickerSymbol?: string
): VideoMetadata {
  const title = tickerSymbol
    ? `${tickerSymbol} News: ${newsTitle.substring(0, 100)}`
    : `Financial News: ${newsTitle.substring(0, 100)}`;

  const fullScript =
    script.length > 1800 ? script.substring(0, 1800) + "..." : script;
  const description = `${fullScript}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 What do you think about this news? Drop a comment! 👇\n\n📊 Follow for daily financial updates!\n🔔 Turn on notifications so you don't miss out!\n\n🔗 Get more insights: valuezai.com\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n#FinancialNews #StockMarket #Investing #Trading #Finance #Markets #Stocks #InvestmentTips #MarketAnalysis #TradingTips #StockMarketNews #FinanceTok #InvestingTips #DayTrading #StockTok${tickerSymbol ? ` #${tickerSymbol} #${tickerSymbol}Stock #${tickerSymbol}News` : ""} #Money #Wealth #FinancialFreedom #InvestSmart`;

  return {
    title,
    description,
    privacyLevel: "PUBLIC_TO_EVERYONE",
    disableDuet: false,
    disableComment: false,
    disableStitch: false,
    videoCoverTimestamp: 1000,
  };
}
