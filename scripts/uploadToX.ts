import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import OAuth from "oauth-1.0a";
import FormData from "form-data";
import https from "https";

dotenv.config();

// Configure axios with SSL handling for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates (for development)
});

const TOKEN_PATH = path.resolve("x_token.json");
// X API v1.1 media upload endpoint
// Try api.twitter.com first (legacy), fallback to api.x.com
const BASE_URL = "https://api.twitter.com";

interface XToken {
  oauth_token: string;
  oauth_token_secret: string;
  user_id?: string;
  screen_name?: string;
}

interface PostMetadata {
  text: string;
  mediaIds?: string[];
}

/**
 * Load stored OAuth tokens or create from environment variables
 */
function loadTokens(): XToken {
  // First try to load from file
  if (fs.existsSync(TOKEN_PATH)) {
    const fileTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    if (fileTokens.oauth_token && fileTokens.oauth_token_secret) {
      return fileTokens;
    }
  }

  // Fall back to environment variables
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (accessToken && accessTokenSecret) {
    const tokens: XToken = {
      oauth_token: accessToken,
      oauth_token_secret: accessTokenSecret,
    };
    // Save to file for future use
    saveTokens(tokens);
    return tokens;
  }

  throw new Error(
    "❌ X tokens not found. Please set X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in .env file, or create x_token.json.\n" +
    "See X_SETUP.md for instructions."
  );
}

/**
 * Save OAuth tokens
 */
function saveTokens(tokens: XToken): void {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Get OAuth instance
 */
function getOAuth(): OAuth {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "❌ Missing X credentials. Please set X_API_KEY and X_API_SECRET in .env file.\n" +
      "Get them from: https://developer.x.com/en/portal/dashboard"
    );
  }

  return new OAuth({
    consumer: {
      key: apiKey,
      secret: apiSecret,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

/**
 * Verify X API credentials by making a simple API call
 */
async function verifyCredentials(oauth: OAuth, tokens: XToken): Promise<boolean> {
  try {
    const verifyUrl = "https://api.x.com/1.1/account/verify_credentials.json";
    const verifyRequest = {
      url: verifyUrl,
      method: "GET",
    };

    const verifyAuth = oauth.authorize(verifyRequest, {
      key: tokens.oauth_token,
      secret: tokens.oauth_token_secret,
    });

    const response = await axios.get(verifyUrl, {
      headers: {
        Authorization: oauth.toHeader(verifyAuth).Authorization,
      },
      httpsAgent,
    });

    if (response.data && response.data.screen_name) {
      console.log(`✅ X credentials verified for @${response.data.screen_name}`);
      return true;
    }
    return false;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error("❌ X credentials verification failed: Invalid or expired token");
      console.error("📝 Please regenerate your Access Token and Secret in the X Developer Portal:");
      console.error("   1. Go to https://developer.x.com/en/portal/dashboard");
      console.error("   2. Select your app → Keys and tokens");
      console.error("   3. Click 'Regenerate' next to Access Token and Secret");
      console.error("   4. Update X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in your .env file");
      console.error("   5. Update x_token.json or delete it to regenerate from .env");
    }
    return false;
  }
}

/**
 * Upload video to X and get media ID
 */
async function uploadVideo(videoPath: string, oauth: OAuth, tokens: XToken): Promise<string> {
  const fileSize = fs.statSync(videoPath).size;
  console.log(`📤 Uploading video to X: ${path.basename(videoPath)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  // X requires video upload in chunks for files > 5MB
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const fileBuffer = fs.readFileSync(videoPath);
  const totalSize = fileBuffer.length;

  // Step 1: Initialize media upload
  // NOTE: X API v2 does NOT support video uploads - must use v1.1 endpoints
  // We use v1.1 for media upload, then v2 for posting the tweet (see line 452)
  const initUrl = `https://upload.twitter.com/1.1/media/upload.json`;
  const initData = {
    command: "INIT",
    media_type: "video/mp4",
    total_bytes: totalSize.toString(),
  };

  // Create URL-encoded string for consistent signature calculation
  const initDataString = new URLSearchParams(initData).toString();

  // For OAuth 1.0a, we need to include the data in the signature
  const initRequest = {
    url: initUrl,
    method: "POST",
    data: initData,
  };

  const initAuth = oauth.authorize(initRequest, {
    key: tokens.oauth_token,
    secret: tokens.oauth_token_secret,
  });

  let initResponse;
  try {
    initResponse = await axios.post(initUrl, initDataString, {
      headers: {
        Authorization: oauth.toHeader(initAuth).Authorization,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent,
    });
  } catch (error: any) {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    };
    console.error("❌ X API Error (INIT):", JSON.stringify(errorDetails, null, 2));
    
    // Log the full error array if present
    if (error.response?.data?.errors) {
      console.error("❌ X API Errors:", JSON.stringify(error.response.data.errors, null, 2));
    }
    
    const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
    const errorCode = error.response?.data?.errors?.[0]?.code;
    
    // Provide helpful guidance for error code 89 (invalid/expired token)
    if (errorCode === 89) {
      throw new Error(
        `Failed to initialize upload: ${errorMessage}\n` +
        `\n📝 To fix this:\n` +
        `1. Go to https://developer.x.com/en/portal/dashboard\n` +
        `2. Select your app → Keys and tokens\n` +
        `3. Click 'Regenerate' next to Access Token and Secret\n` +
        `4. Update X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in your .env file\n` +
        `5. Delete x_token.json to regenerate from .env`
      );
    }
    
    throw new Error(`Failed to initialize upload: ${errorMessage}`);
  }

  if (!initResponse.data || !initResponse.data.media_id_string) {
    console.error("❌ Invalid response from X API:", initResponse.data);
    throw new Error(`Failed to initialize upload: ${JSON.stringify(initResponse.data)}`);
  }

  const mediaId = initResponse.data.media_id_string;
  const uploadUrl = initResponse.data.upload_url; // Optional - only for very large files
  
  // Log the full response for debugging
  console.log("📋 INIT Response:", JSON.stringify(initResponse.data, null, 2));
  
  if (uploadUrl) {
    console.log(`✅ Media upload initialized. Media ID: ${mediaId}, Upload URL: ${uploadUrl}`);
  } else {
    console.log(`✅ Media upload initialized. Media ID: ${mediaId} (using standard endpoint)`);
  }

  // Step 2: Upload video in chunks
  if (totalSize > chunkSize) {
    console.log("📦 Uploading video in chunks...");
    let segmentIndex = 0;

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = fileBuffer.slice(start, end);

      // Use upload_url if provided, otherwise use v1.1 endpoint
      const appendUrl = uploadUrl || `https://upload.twitter.com/1.1/media/upload.json`;
      
      // For multipart/form-data, OAuth signature should NOT include the form data
      // Only sign the URL and method
      const appendRequest = {
        url: appendUrl,
        method: "POST",
      };

      const appendAuth = oauth.authorize(appendRequest, {
        key: tokens.oauth_token,
        secret: tokens.oauth_token_secret,
      });

      // For APPEND, we need to send multipart/form-data with the chunk
      const formData = new FormData();
      formData.append("command", "APPEND");
      formData.append("media_id", mediaId);
      formData.append("segment_index", segmentIndex.toString());
      formData.append("media", chunk, {
        filename: "video.mp4",
        contentType: "video/mp4",
      });

      await axios.post(appendUrl, formData, {
        headers: {
          Authorization: oauth.toHeader(appendAuth).Authorization,
          ...formData.getHeaders(),
        },
        httpsAgent,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      segmentIndex++;
      const progress = ((end / totalSize) * 100).toFixed(1);
      console.log(`   Upload progress: ${progress}% (${(end / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    }
  } else {
    // For small files, upload directly
    // Use upload_url if provided, otherwise use v1.1 endpoint
    const appendUrl = uploadUrl || `https://upload.twitter.com/1.1/media/upload.json`;
    
    // For multipart/form-data, OAuth signature should NOT include the form data
    // Only sign the URL and method
    const appendRequest = {
      url: appendUrl,
      method: "POST",
    };

    const appendAuth = oauth.authorize(appendRequest, {
      key: tokens.oauth_token,
      secret: tokens.oauth_token_secret,
    });

    const formData = new FormData();
    formData.append("command", "APPEND");
    formData.append("media_id", mediaId);
    formData.append("segment_index", "0");
    formData.append("media", fileBuffer, {
      filename: "video.mp4",
      contentType: "video/mp4",
    });

    await axios.post(appendUrl, formData, {
      headers: {
        Authorization: oauth.toHeader(appendAuth).Authorization,
        ...formData.getHeaders(),
      },
      httpsAgent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  // Step 3: Finalize upload
  const finalizeData = {
    command: "FINALIZE",
    media_id: mediaId,
  };

  // Create URL-encoded string for consistent signature calculation
  const finalizeDataString = new URLSearchParams(finalizeData).toString();

  const finalizeUrl = `https://upload.twitter.com/1.1/media/upload.json`;
  const finalizeRequest = {
    url: finalizeUrl,
    method: "POST",
    data: finalizeData,
  };

  const finalizeAuth = oauth.authorize(finalizeRequest, {
    key: tokens.oauth_token,
    secret: tokens.oauth_token_secret,
  });

  // Wait for processing
  // First, send FINALIZE command
  console.log("📋 Finalizing upload...");
  const finalizeResponse = await axios.post(
    finalizeUrl,
    finalizeDataString,
    {
      headers: {
        Authorization: oauth.toHeader(finalizeAuth).Authorization,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent,
    }
  );

  let processingInfo = finalizeResponse.data.processing_info || { state: "succeeded" };
  let attempts = 0;
  const maxAttempts = 30;

  // Wait for processing to complete (pending, in_progress, or succeeded)
  while ((processingInfo.state === "pending" || processingInfo.state === "in_progress") && attempts < maxAttempts) {
    if (processingInfo.check_after_secs) {
      const waitTime = processingInfo.check_after_secs * 1000;
      console.log(`   Processing video... (waiting ${processingInfo.check_after_secs}s before next check)`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Default 2 seconds
    }

    // Check status by sending FINALIZE again (it returns updated processing_info)
    const checkResponse = await axios.post(
      finalizeUrl,
      finalizeDataString,
      {
        headers: {
          Authorization: oauth.toHeader(finalizeAuth).Authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent,
      }
    );

    processingInfo = checkResponse.data.processing_info || { state: "succeeded" };
    attempts++;

    if (processingInfo.state === "pending" || processingInfo.state === "in_progress") {
      console.log(`   Processing video... (attempt ${attempts}/${maxAttempts}, state: ${processingInfo.state})`);
    }
  }

  if (processingInfo.state !== "succeeded") {
    throw new Error(`Video processing failed: ${processingInfo.state}`);
  }

  console.log("✅ Video uploaded and processed");
  return mediaId;
}

/**
 * Post tweet with video
 */
export async function uploadToX(
  videoPath: string,
  metadata: PostMetadata
): Promise<string> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const tokens = loadTokens();
  if (!tokens) {
    throw new Error(
      "❌ X tokens not found. Please set up OAuth tokens first.\n" +
      "See X_SETUP.md for instructions."
    );
  }

  // Debug: Verify tokens are loaded (don't log secrets in production)
  console.log("🔑 X tokens loaded:", {
    has_token: !!tokens.oauth_token,
    has_secret: !!tokens.oauth_token_secret,
    screen_name: tokens.screen_name,
  });

  const oauth = getOAuth();
  
  // Debug: Verify OAuth instance is created
  console.log("🔑 OAuth instance created:", {
    has_api_key: !!process.env.X_API_KEY,
    has_api_secret: !!process.env.X_API_SECRET,
  });

  // Verify credentials before attempting upload
  console.log("🔍 Verifying X credentials...");
  const credentialsValid = await verifyCredentials(oauth, tokens);
  if (!credentialsValid) {
    throw new Error(
      "❌ X credentials are invalid or expired. Please regenerate your Access Token and Secret.\n" +
      "See X_SETUP.md for detailed instructions."
    );
  }

  try {
    // Upload video
    const mediaId = await uploadVideo(videoPath, oauth, tokens);

    // Post tweet with video
    console.log("📝 Posting tweet with video...");
    // Must use v2 endpoint (v1.1 statuses/update not available with current access level)
    // Using the format that worked in testing: media object with media_ids array
    const tweetUrl = `https://api.x.com/2/tweets`;
    
    // Format that worked: media object with media_ids array
    const tweetData = {
      text: metadata.text,
      media: {
        media_ids: [mediaId],
      },
    };
    
    // Debug: Log the request (without sensitive data)
    console.log("📋 Tweet data:", {
      text_length: metadata.text.length,
      text_preview: metadata.text.substring(0, 100) + (metadata.text.length > 100 ? "..." : ""),
      media_ids: [mediaId],
      media_count: 1,
    });
    
    // Check if text might be too long or have issues
    if (metadata.text.length > 280) {
      console.warn("⚠️  Warning: Tweet text is longer than 280 characters!");
    }

    // For JSON requests with OAuth 1.0a, don't include the JSON body in the signature
    const tweetRequest = {
      url: tweetUrl,
      method: "POST",
    };

    const tweetAuth = oauth.authorize(tweetRequest, {
      key: tokens.oauth_token,
      secret: tokens.oauth_token_secret,
    });

    const tweetResponse = await axios.post(tweetUrl, tweetData, {
      headers: {
        Authorization: oauth.toHeader(tweetAuth).Authorization,
        "Content-Type": "application/json",
      },
      httpsAgent,
    });

    // v2 returns data wrapped in data object
    const tweetId = tweetResponse.data.data.id;
    const screenName = tokens.screen_name || "user";
    const tweetUrl_public = `https://x.com/${screenName}/status/${tweetId}`;

    console.log(`✅ Tweet posted successfully!`);
    console.log(`🔗 URL: ${tweetUrl_public}`);
    console.log(`📊 Tweet ID: ${tweetId}`);

    return tweetUrl_public;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ X API Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
      // Log full error details for debugging
      if (error.response.data?.errors) {
        console.error("❌ X API Errors:", JSON.stringify(error.response.data.errors, null, 2));
      }
      
      const errorMessage = error.response.data?.errors?.[0]?.message 
        || error.response.data?.detail 
        || error.response.data?.message 
        || JSON.stringify(error.response.data);
      
      // Check for rate limit errors
      if (error.response.status === 429) {
        const resetTime = error.response.headers["x-rate-limit-reset"];
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : "soon";
        throw new Error(
          `Upload failed: Rate limit exceeded. Please wait until ${resetDate} before trying again.\n` +
          `You have ${error.response.headers["x-user-limit-24hour-remaining"] || 0} requests remaining today.`
        );
      }
      
      // Provide helpful guidance for permission errors
      if (error.response.status === 403) {
        const remaining = error.response.headers["x-user-limit-24hour-remaining"];
        const resetTime = error.response.headers["x-user-limit-24hour-reset"];
        
        // Check if it's a rate limit issue
        if (remaining && parseInt(remaining) <= 0) {
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : "soon";
          throw new Error(
            `Upload failed: Daily rate limit reached. You've used all your requests for today.\n` +
            `Rate limit resets at: ${resetDate}\n` +
            `\n💡 Tip: You have a limit of ${error.response.headers["x-user-limit-24hour-limit"] || "unknown"} requests per day.`
          );
        }
        
        // Log what was being sent for debugging
        console.error("📋 Request that failed:", {
          text_length: metadata?.text?.length || 0,
          text_preview: metadata?.text?.substring(0, 50) || "N/A",
        });
        
        throw new Error(
          `Upload failed: ${errorMessage}\n` +
          `\n📝 Possible causes:\n` +
          `1. Rate limit issue (${remaining || 0} requests remaining)\n` +
          `2. Tweet content violates X policies\n` +
          `3. App permissions need to be "Read and Write"\n` +
          `\n💡 Try:\n` +
          `- Wait for rate limit reset (${resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : "check X dashboard"})\n` +
          `- Verify app permissions at https://developer.x.com/en/portal/dashboard\n` +
          `- Regenerate Access Token and Secret if permissions changed`
        );
      }
      
      throw new Error(`Upload failed: ${errorMessage}`);
    } else if (error.request) {
      console.error("❌ X API Request Error:", error.message);
      throw new Error(`Upload failed: No response from server - ${error.message}`);
    } else {
      console.error("❌ X API Error:", error.message);
      throw error;
    }
  }
}

/**
 * Generate tweet text from news article
 */
export function generateXMetadata(
  newsTitle: string,
  script: string,
  tickerSymbol?: string
): PostMetadata {
  // X has a 280 character limit, but keep it under 260 to be safe
  // Keep it short and simple to avoid API issues
  // Use simple format: emoji + title + hashtags
  const emoji = tickerSymbol ? "📊" : "💰";
  
  // Simple format that worked in testing
  let text = `${emoji} ${newsTitle}`;
  
  // Add hashtags if there's room (keep under 260 chars to be safe)
  const hashtags = tickerSymbol ? ` #${tickerSymbol} #FinancialNews` : " #FinancialNews #StockMarket";
  const maxLength = 260; // Safe limit under 280
  
  if ((text + hashtags).length <= maxLength) {
    text += hashtags;
  } else {
    // If title is too long, truncate it to fit hashtags
    const availableSpace = maxLength - hashtags.length - 1; // -1 for space
    text = `${emoji} ${newsTitle.substring(0, availableSpace)}${hashtags}`;
  }

  return {
    text: text.substring(0, maxLength), // Final safety check - ensure under 260
  };
}

