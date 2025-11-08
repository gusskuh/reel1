# YouTube Upload Setup Guide

This guide will help you set up automatic YouTube uploads for your generated reels.

## Prerequisites

1. A Google account with access to YouTube
2. A YouTube channel (you can create one at [youtube.com](https://www.youtube.com))

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Give it a name (e.g., "ReelGen YouTube Uploader")
4. Click "Create"

## Step 2: Enable YouTube Data API v3

1. In your project, go to **APIs & Services** → **Library**
2. Search for "YouTube Data API v3"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/youtube.upload`
   - Add test users (your email)
   - Save and continue
4. For Application type, choose **Web application** (recommended) or **Desktop app**
5. Give it a name (e.g., "ReelGen Uploader")
6. **IMPORTANT**: In the "Authorized redirect URIs" section, add:
   - For **Web application**: `http://localhost:3000/oauth2callback`
   - For **Desktop app**: `urn:ietf:wg:oauth:2.0:oob`
7. Click **Create**
8. **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these!

## Step 4: Configure Your .env File

Add these variables to your `.env` file:

```env
# YouTube Upload Settings
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
# For Web application: use http://localhost:3000/oauth2callback
# For Desktop app: use urn:ietf:wg:oauth:2.0:oob
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
UPLOAD_TO_YOUTUBE=true
```

**Important**: The redirect URI must **exactly match** what you configure in Google Cloud Console (see Step 3 above).

Replace `your_client_id_here` and `your_client_secret_here` with the values from Step 3.

## Step 5: Authorize the Application

1. Run your reel generation script:
   ```bash
   npm run create-reel
   ```

2. When it reaches the YouTube upload step, it will:
   - Print an authorization URL
   - Start a local server (for Web apps) or wait for manual code entry (for Desktop apps)
   - **IMPORTANT**: Sign in with the Google account that owns the YouTube channel you want to upload to
   - You'll be asked to grant permissions
   
   **For Web applications:**
   - After authorization, Google will redirect to `http://localhost:3000/oauth2callback`
   - The local server will automatically capture the authorization code
   - You'll see a success message in your browser - you can close that window
   - The script will continue automatically
   
   **For Desktop applications:**
   - After authorization, you'll see a code on the screen
   - Copy and paste that code into the terminal

3. The token will be saved to `youtube_token.json` for future use

### Which Channel Will It Upload To?

**The script uploads to the YouTube channel associated with the Google account you use to authorize the app.**

- If you have **one channel**: It automatically uploads to that channel
- If you have **multiple channels**: It uploads to the **primary/default channel** of the Google account you authorize with
- The script will **display the channel name** before uploading so you can verify it's correct

**To upload to a different channel:**
- Delete `youtube_token.json`
- Re-run the script and authorize with the Google account that owns the desired channel

## Step 6: Upload Settings

By default, videos are uploaded as **Unlisted**. To change this:

Edit `scripts/uploadToYouTube.ts` and modify the `privacyStatus` in the `generateVideoMetadata` function:

```typescript
privacyStatus: "public", // Options: "public", "unlisted", "private"
```

## Troubleshooting

### "Missing YouTube credentials" error
- Make sure `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are set in your `.env` file

### "Token expired" error
- Delete `youtube_token.json` and re-authorize (Step 5)

### "Quota exceeded" error
- YouTube API has daily quotas. Free tier: 10,000 units/day
- Each upload uses ~1,600 units
- You can upload ~6 videos per day on the free tier

### "redirect_uri_mismatch" error
- **This is the most common error!** The redirect URI in your `.env` file must **exactly match** what you configured in Google Cloud Console
- For Desktop apps, use: `urn:ietf:wg:oauth:2.0:oob`
- Make sure you added this exact URI in the "Authorized redirect URIs" section when creating your OAuth client
- Check Step 3 in this guide for details

### Upload fails with "Forbidden"
- Make sure you've enabled YouTube Data API v3 in Google Cloud Console
- Check that your OAuth consent screen is properly configured

## Video Metadata

The script automatically generates:
- **Title**: Based on news title and ticker symbol (if detected)
- **Description**: Includes the script, call-to-action, and hashtags
- **Tags**: Extracted from the news title and ticker symbol
- **Category**: "People & Blogs" (category ID 22)

You can customize this in `scripts/uploadToYouTube.ts` → `generateVideoMetadata()` function.

## Security Note

- Never commit `youtube_token.json` or your `.env` file to version control
- Add them to `.gitignore`:
  ```
  youtube_token.json
  .env
  ```

