import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import http from "http";
import url from "url";

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const TOKEN_PATH = path.resolve("youtube_token.json");
const CREDENTIALS_PATH = path.resolve("youtube_credentials.json");

interface VideoMetadata {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

/**
 * Load or request authorization credentials for YouTube API
 */
async function authorize(): Promise<any> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  // Default redirect URI - can be overridden in .env
  // For Desktop apps: use 'urn:ietf:wg:oauth:2.0:oob'
  // For Web apps: use 'http://localhost:3000/oauth2callback' or your configured URI
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "❌ Missing YouTube credentials. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env file.\n" +
      "Get them from: https://console.cloud.google.com/apis/credentials"
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Check if we have previously stored a token
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      oauth2Client.setCredentials(token);
      
      // Set up automatic token refresh
      oauth2Client.on("tokens", (tokens) => {
        // When tokens are refreshed, update the stored token
        if (tokens.refresh_token) {
          token.refresh_token = tokens.refresh_token;
        }
        token.access_token = tokens.access_token;
        token.expiry_date = tokens.expiry_date;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log("🔄 YouTube token refreshed automatically");
      });
      
      return oauth2Client;
    } catch (error) {
      console.warn("⚠️  Error loading token file, will request new token");
      // If token file is corrupted, get a new one
      return getNewToken(oauth2Client);
    }
  }

  // If no token, get a new one
  return getNewToken(oauth2Client);
}

/**
 * Get and store new token after prompting for user authorization
 * Supports both Web app (with local server) and Desktop app (manual code entry) flows
 */
function getNewToken(oauth2Client: any): Promise<any> {
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/oauth2callback";
  const isWebApp = redirectUri.startsWith("http://") || redirectUri.startsWith("https://");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

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
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            console.log("✅ Token stored to", TOKEN_PATH);
            resolve(oauth2Client);
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
          console.error(`❌ Port ${port} is already in use. Please close the application using that port or change YOUTUBE_REDIRECT_URI in .env`);
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
      rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oauth2Client.getToken(code, (err: any, token: any) => {
          if (err) {
            console.error("❌ Error retrieving access token", err);
            reject(err);
            return;
          }
          oauth2Client.setCredentials(token);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
          console.log("✅ Token stored to", TOKEN_PATH);
          resolve(oauth2Client);
        });
      });
    });
  }
}

/**
 * Upload a video to YouTube
 */
export async function uploadToYouTube(
  videoPath: string,
  metadata: VideoMetadata
): Promise<string> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  console.log("🔐 Authenticating with YouTube...");
  const auth = await authorize();

  const youtube = google.youtube({ version: "v3", auth });

  const fileSize = fs.statSync(videoPath).size;
  console.log(`📤 Uploading video: ${path.basename(videoPath)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  const requestParameters: any = {
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description || "",
        tags: metadata.tags || [],
        categoryId: metadata.categoryId || "22", // People & Blogs
        defaultLanguage: metadata.defaultLanguage || "en",
        defaultAudioLanguage: metadata.defaultAudioLanguage || "en",
      },
      status: {
        privacyStatus: metadata.privacyStatus || "unlisted",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  };

  try {
    const response = await youtube.videos.insert(requestParameters);
    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`✅ Video uploaded successfully!`);
    console.log(`🔗 URL: ${videoUrl}`);
    console.log(`📊 Video ID: ${videoId}`);

    return videoUrl;
  } catch (error: any) {
    if (error.response) {
      const errorData = error.response.data;
      console.error("❌ YouTube API Error:", errorData);
      
      // Check for token expiration
      if (errorData.error === "invalid_grant" || 
          (errorData.error?.error === "invalid_grant") ||
          errorData.error_description?.includes("Token has been expired") ||
          errorData.error_description?.includes("Token has been revoked")) {
        console.error("\n⚠️  YouTube token has expired or been revoked!");
        console.error("   To fix this:");
        console.error("   1. Delete youtube_token.json locally (or the secret in GitHub)");
        console.error("   2. Run: npm run create-reel");
        console.error("   3. Re-authorize YouTube when prompted");
        console.error("   4. Update YOUTUBE_TOKEN_JSON secret in GitHub with the new token");
        console.error("\n   For GitHub Actions:");
        console.error("   - Go to repository Settings → Secrets → Actions");
        console.error("   - Update YOUTUBE_TOKEN_JSON with the new token");
        throw new Error("YouTube token expired - please regenerate the token (see instructions above)");
      }
      
      throw new Error(`Upload failed: ${JSON.stringify(errorData.error || errorData)}`);
    }
    throw error;
  }
}

/**
 * Generate video metadata from news article
 */
export function generateVideoMetadata(
  newsTitle: string,
  script: string,
  tickerSymbol?: string
): VideoMetadata {
  // Create a title (max 100 chars for YouTube)
  const title = tickerSymbol
    ? `${tickerSymbol} News: ${newsTitle.substring(0, 80)}`
    : `Financial News: ${newsTitle.substring(0, 80)}`;

  // Create description
  const description = `${script}\n\n📊 Stay updated with the latest financial news!\n\n🔗 Visit us at: valuezai.com\n\n#FinancialNews #StockMarket #Investing`;

  // Generate comprehensive tags from title, ticker, and keywords
  const tags: string[] = [
    "Financial News",
    "Stock Market",
    "Investing",
    "Trading",
    "Finance",
    "Markets",
    "Stocks",
    "Investment Tips",
    "Market Analysis",
    "Financial Education"
  ];
  if (tickerSymbol) {
    tags.push(tickerSymbol, `${tickerSymbol} Stock`, `${tickerSymbol} News`);
  }
  // Extract keywords from title and script
  const titleWords = newsTitle.split(/\s+/).filter(w => w.length > 3 && !["News", "Stock", "Market"].includes(w));
  tags.push(...titleWords.slice(0, 8));
  
  // Add script keywords
  const scriptWords = script.split(/\s+/).filter(w => w.length > 4 && /^[A-Z]/.test(w));
  tags.push(...scriptWords.slice(0, 5));

  return {
    title,
    description,
    tags,
    categoryId: "22", // People & Blogs
    privacyStatus: "public", // Change to "public" if you want it public
    defaultLanguage: "en",
    defaultAudioLanguage: "en",
  };
}

