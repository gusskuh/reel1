/**
 * TikTok OAuth Callback Server
 * 
 * This is a standalone server endpoint that handles TikTok OAuth callbacks.
 * Deploy this to your production server at: https://yourdomain.com/tiktok_callback
 * 
 * Usage:
 * 1. Deploy this to your server
 * 2. Set environment variables: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 * 3. Configure TikTok redirect URI to: https://yourdomain.com/tiktok_callback
 * 4. Users will be redirected here after authorizing
 */

import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `https://yourdomain.com/tiktok_callback`;
const TOKEN_STORAGE_PATH = process.env.TIKTOK_TOKEN_STORAGE_PATH || "/tmp/tiktok_tokens"; // Where to store tokens

// Ensure token storage directory exists
if (!fs.existsSync(TOKEN_STORAGE_PATH)) {
  fs.mkdirSync(TOKEN_STORAGE_PATH, { recursive: true });
}

const BASE_URL = "https://open.tiktokapis.com";

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  state?: string
): Promise<any> {
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    throw new Error("Missing TikTok credentials");
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/v2/oauth/token/`,
      {
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error("Token exchange error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * TikTok OAuth Callback Endpoint
 */
app.get("/tiktok_callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const errorDescription = req.query.error_description as string;
  const state = req.query.state as string;

  // Handle errors
  if (error) {
    console.error("TikTok OAuth error:", error, errorDescription);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Authorization Error</h1>
        <p><strong>Error:</strong> ${error}</p>
        ${errorDescription ? `<p><strong>Description:</strong> ${errorDescription}</p>` : ""}
        <p>Please try again or contact support.</p>
      </body>
      </html>
    `);
  }

  // Handle missing code
  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        </style>
      </head>
      <body>
        <h1>⚠️ No Authorization Code</h1>
        <p>No authorization code was received from TikTok.</p>
        <p>Please try authorizing again.</p>
      </body>
      </html>
    `);
  }

  try {
    // Exchange code for token
    console.log("Exchanging authorization code for token...");
    const tokenData = await exchangeCodeForToken(code, state);

    // Store token (you can customize this based on your needs)
    // Option 1: Store in file (for single-user scenarios)
    const tokenFilePath = path.join(TOKEN_STORAGE_PATH, `token_${Date.now()}.json`);
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));

    // Option 2: Store in database (for multi-user scenarios)
    // You would implement database storage here

    console.log("Token stored successfully");

    // Success response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Successful</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          h1 { margin: 0 0 20px 0; font-size: 2.5em; }
          p { font-size: 1.2em; margin: 10px 0; }
          .checkmark { font-size: 4em; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✅</div>
          <h1>Authorization Successful!</h1>
          <p>Your TikTok account has been connected successfully.</p>
          <p>You can now close this window and return to the app.</p>
          <p style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
            Token expires in: ${tokenData.expires_in ? Math.round(tokenData.expires_in / 3600) + " hours" : "N/A"}
          </p>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Error processing callback:", err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Error Processing Authorization</h1>
        <p>An error occurred while processing your authorization.</p>
        <p>Please try again or contact support.</p>
        <pre style="text-align: left; background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 5px;">
${err.message || "Unknown error"}
        </pre>
      </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "tiktok-callback" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TikTok Callback Server running on port ${PORT}`);
  console.log(`📍 Callback URL: ${REDIRECT_URI}`);
  console.log(`💾 Token storage: ${TOKEN_STORAGE_PATH}`);
});

