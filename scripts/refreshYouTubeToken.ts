/**
 * Script to refresh/regenerate YouTube OAuth token
 * Run this when your token expires
 */

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

async function refreshToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

  if (!clientId || !clientSecret) {
    console.error(
      "❌ Missing YouTube credentials. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env file."
    );
    process.exit(1);
  }

  console.log("\n" + "╔══════════════════════════════════════════════════════════════╗");
  console.log("║        YouTube Token Refresh/Regeneration           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Delete old token if exists
  if (fs.existsSync(TOKEN_PATH)) {
    console.log("📝 Removing old token file...\n");
    fs.unlinkSync(TOKEN_PATH);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const isWebApp = redirectUri.startsWith("http://") || redirectUri.startsWith("https://");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // This ensures we get a refresh_token
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh_token
  });

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("STEP 1: Authorize the Application");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("🔗 Visit this URL to authorize:");
  console.log("\n" + authUrl + "\n");
  console.log("═".repeat(65) + "\n");

  if (isWebApp) {
    console.log("🌐 Starting local server to receive callback...");
    console.log(`   Server will listen on: ${redirectUri}\n`);

    return new Promise<void>((resolve, reject) => {
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
          res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1 style="color: red;">❌ Authorization Error</h1>
            <p>${error}</p>
            <p>You can close this window.</p>
          </body></html>`);
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (code) {
          console.log("\n" + "═".repeat(65));
          console.log("STEP 2: Authorization Code Received");
          console.log("═".repeat(65));
          console.log(`✅ Code received: ${code.substring(0, 30)}...\n`);

          res.writeHead(200);
          res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1 style="color: green;">✅ Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body></html>`);
          server.close();

          try {
            console.log("🔄 Exchanging code for access token...\n");
            const { tokens } = await oauth2Client.getToken(code);
            
            // Save token
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            
            console.log("\n" + "╔══════════════════════════════════════════════════════════════╗");
            console.log("║              ✅ Token Generated Successfully! ✅            ║");
            console.log("╚══════════════════════════════════════════════════════════════╝\n");
            console.log("📝 Token saved to: " + TOKEN_PATH);
            console.log("\n📋 Token Details:");
            console.log(`   • Access Token: ${tokens.access_token?.substring(0, 30)}...`);
            console.log(`   • Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 30) + "..." : "❌ Missing!"}`);
            console.log(`   • Expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : "N/A"}`);
            
            if (!tokens.refresh_token) {
              console.log("\n⚠️  WARNING: No refresh_token received!");
              console.log("   This token will expire and cannot be automatically refreshed.");
              console.log("   Make sure you see the consent screen and grant permissions.");
            } else {
              console.log("\n✅ Refresh token included - token can be automatically refreshed!");
            }
            
            console.log("\n📤 Next Steps:");
            console.log("   1. Copy the token file content:");
            console.log(`      cat ${TOKEN_PATH} | pbcopy  (Mac)`);
            console.log("   2. Update GitHub Secret:");
            console.log("      - Go to repository → Settings → Secrets → Actions");
            console.log("      - Update YOUTUBE_TOKEN_JSON with the new token");
            console.log("\n");
            
            resolve();
          } catch (err: any) {
            console.error("❌ Error retrieving access token:", err.message);
            reject(err);
          }
        } else {
          res.writeHead(400);
          res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>⚠️ No authorization code received</h1>
            <p>You can close this window.</p>
          </body></html>`);
        }
      });

      const port = new URL(redirectUri).port || 3000;
      server.listen(port, () => {
        console.log(`✅ Server listening on port ${port}`);
        console.log("   Waiting for authorization...\n");
        console.log("💡 Instructions:");
        console.log("   1. Copy the authorization URL above");
        console.log("   2. Open it in your browser");
        console.log("   3. Sign in with your Google account");
        console.log("   4. Grant permissions to upload videos");
        console.log("   5. You'll be redirected back automatically\n");
      });

      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.error(`❌ Port ${port} is already in use.`);
          console.error(`   Please close the application using that port or change YOUTUBE_REDIRECT_URI in .env`);
        } else {
          console.error("❌ Server error:", err);
        }
        reject(err);
      });
    });
  } else {
    // Desktop app flow
    console.log("📋 After authorization, you'll get a code. Paste it here:\n");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise<void>((resolve, reject) => {
      rl.question("Enter the code from that page here: ", async (code) => {
        rl.close();
        try {
          const { tokens } = await oauth2Client.getToken(code);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
          console.log("\n✅ Token saved to", TOKEN_PATH);
          resolve();
        } catch (err: any) {
          console.error("❌ Error retrieving access token:", err.message);
          reject(err);
        }
      });
    });
  }
}

refreshToken().catch((error) => {
  console.error("\n❌ Failed to refresh token:", error.message);
  process.exit(1);
});


