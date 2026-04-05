/**
 * Demo script to show TikTok OAuth flow for video recording
 * This script only demonstrates the OAuth authorization process
 * without actually uploading a video
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import http from "http";
import url from "url";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";
// Authorization URL - TikTok uses a different endpoint for OAuth authorization
const AUTH_URL = "https://www.tiktok.com/auth/authorize/";

interface TikTokToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

async function demoOAuthFlow() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/tiktok_callback";

  if (!clientKey || !clientSecret) {
    console.error(
      "❌ Missing TikTok credentials. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env file."
    );
    process.exit(1);
  }

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     TikTok OAuth Authorization Flow - Demo for Video        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Delete existing token to force new authorization
  if (fs.existsSync(TOKEN_PATH)) {
    console.log("📝 Removing existing token to demonstrate fresh OAuth flow...\n");
    fs.unlinkSync(TOKEN_PATH);
  }

  // Step 1: Generate authorization URL
  // Request all scopes that are in the TikTok app submission form
  // These match exactly what's registered in TikTok Developer Portal
  const scopes = "user.info.basic,user.info.stats,video.list,video.upload";
  const authUrl = `${AUTH_URL}?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=state`;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("STEP 1: Generate Authorization URL");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  console.log("📝 OAuth Configuration:");
  console.log(`   • Client Key: ${clientKey}`);
  console.log(`   • Redirect URI: ${redirectUri}`);
  console.log(`   • Authorization Endpoint: ${AUTH_URL}`);
  console.log("\n📋 Requested Scopes:");
  console.log(`   ✓ user.info.basic    - Basic user information (Login Kit)`);
  console.log(`   ✓ user.info.stats    - User statistics (followers, video count)`);
  console.log(`   ✓ video.list         - List uploaded videos`);
  console.log(`   ✓ video.upload       - Upload videos to TikTok`);
  
  console.log("\n" + "═".repeat(65));
  console.log("🔗 AUTHORIZATION URL (Copy this and open in browser):");
  console.log("═".repeat(65));
  console.log("\n" + authUrl + "\n");
  console.log("═".repeat(65) + "\n");
  
  console.log("💡 Next Steps:");
  console.log("   1. Copy the URL above");
  console.log("   2. Open it in your browser");
  console.log("   3. Log in to TikTok");
  console.log("   4. Review and approve the requested permissions");
  console.log("   5. You'll be redirected back to the callback URL\n");

  // Step 2: Start local server to catch callback
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("STEP 2: Start Callback Server");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("🌐 Starting callback server...");
  console.log(`   Listening for callback at: ${redirectUri}`);
  console.log("   Waiting for TikTok to redirect after authorization...\n");

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
      const errorDescription = parsedUrl.query.error_description as string;

      // Log the full request for debugging
      console.log(`\n📥 Received request: ${req.url}`);
      console.log(`   Full URL: ${req.url}`);
      console.log(`   Path: ${parsedUrl.pathname}`);
      console.log(`   Query params:`, parsedUrl.query);
      console.log(`   Query string: ${parsedUrl.query ? JSON.stringify(parsedUrl.query) : 'empty'}`);
      
      // Also check headers
      console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));

      if (error) {
        console.error(`\n❌ TikTok returned an error: ${error}`);
        if (errorDescription) {
          console.error(`   Description: ${errorDescription}`);
        }
        res.writeHead(400);
        res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: red;">❌ Authorization Error</h1>
          <p><strong>Error:</strong> ${error}</p>
          ${errorDescription ? `<p><strong>Description:</strong> ${errorDescription}</p>` : ''}
          <p>You can close this window.</p>
        </body></html>`);
        server.close();
        reject(new Error(`Authorization error: ${error} - ${errorDescription || ''}`));
        return;
      }

      if (code) {
        console.log("\n" + "═".repeat(65));
        console.log("STEP 3: Authorization Code Received!");
        console.log("═".repeat(65));
        console.log(`✅ Authorization code: ${code.substring(0, 30)}...`);
        console.log(`   Full code length: ${code.length} characters\n`);

        res.writeHead(200);
        res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Authorization Successful!</h1>
          <p>You can close this window and return to the terminal.</p>
          <p>The authorization code has been received and will be exchanged for an access token.</p>
        </body></html>`);
        server.close();

        try {
          console.log("═══════════════════════════════════════════════════════════════");
          console.log("STEP 4: Exchange Code for Access Token");
          console.log("═══════════════════════════════════════════════════════════════\n");
          console.log("🔄 Calling TikTok API to exchange authorization code for access token...");
          console.log(`   Endpoint: ${BASE_URL}/v2/oauth/token/\n`);
          
          const accessToken = await exchangeCodeForToken(code, clientKey, clientSecret, redirectUri);
          
          console.log("\n" + "╔══════════════════════════════════════════════════════════════╗");
          console.log("║              ✅ OAuth Flow Complete! ✅                        ║");
          console.log("╚══════════════════════════════════════════════════════════════╝\n");
          console.log("📝 Token Information:");
          console.log(`   • Token file: ${TOKEN_PATH}`);
          console.log(`   • Access Token: ${accessToken.substring(0, 30)}...`);
          console.log(`   • Token length: ${accessToken.length} characters`);
          console.log("\n✅ The app is now authorized and ready to use TikTok API!");
          console.log("   You can now use the following scopes:");
          console.log("   • user.info.basic - Get basic user information");
          console.log("   • user.info.stats - Get user statistics");
          console.log("   • video.list - List uploaded videos");
          console.log("   • video.upload - Upload videos to TikTok\n");
          
          resolve();
        } catch (err: any) {
          console.error("❌ Error retrieving access token:", err.message);
          reject(err);
        }
      } else {
        // No code and no error - might be a preflight, CORS, or TikTok is sending data differently
        console.log(`⚠️  Request received but no code or error parameter`);
        console.log(`   This might be a preflight request or TikTok is sending data in a different format`);
        console.log(`   Full request details logged above`);
        
        // Check if this is a preflight request
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
          return;
        }
        
        res.writeHead(200);
        res.end(`<html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>⚠️ Waiting for authorization...</h1>
          <p>If you were redirected here from TikTok, please check the terminal for details.</p>
          <p>If you see this page, TikTok may have redirected without the authorization code.</p>
          <p>Check the browser URL bar - does it contain a "code=" parameter?</p>
          <p>You can close this window.</p>
        </body></html>`);
      }
    });

    const port = new URL(redirectUri).port || 3000;
    server.listen(port, () => {
      console.log(`✅ Callback server is running!`);
      console.log(`   • Port: ${port}`);
      console.log(`   • Callback URL: ${redirectUri}`);
      console.log(`   • Status: Waiting for TikTok redirect...\n`);
      console.log("💡 The server will automatically capture the authorization code");
      console.log("   when TikTok redirects back after you approve the permissions.\n");
      console.log("💡 Instructions:");
      console.log("   1. Copy the authorization URL above");
      console.log("   2. Open it in your browser");
      console.log("   3. Log in to TikTok");
      console.log("   4. Review and approve the requested permissions");
      console.log("   5. You'll be redirected back here automatically\n");
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use.`);
        console.error(`   Please close the application using that port or change TIKTOK_REDIRECT_URI in .env`);
      } else {
        console.error("❌ Server error:", err);
      }
      reject(err);
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
    return tokenData.access_token;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ TikTok API Error:", error.response.data);
      throw new Error(`Token exchange failed: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Run the demo
demoOAuthFlow().catch((error) => {
  console.error("\n❌ Demo failed:", error.message);
  process.exit(1);
});

