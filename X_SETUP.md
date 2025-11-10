# X (Twitter) Upload Setup Guide

This guide will help you set up automatic X (formerly Twitter) posting for your generated reels.

## Prerequisites

1. An X (Twitter) account
2. An X Developer account (free or paid, depending on API access level)
3. An X app registered in the Developer Portal

## Step 1: Create an X Developer Account

1. Go to [X Developer Portal](https://developer.x.com/)
2. Sign in with your X account
3. Apply for a developer account (usually approved quickly)
4. Complete the developer application form

## Step 2: Create an App

1. In the Developer Portal, go to **Projects & Apps**
2. Click **Create App** or **+ Create App**
3. Fill in the required information:
   - **App Name**: e.g., "ReelGen Uploader"
   - **App Environment**: Select appropriate environment
4. Click **Create**

## Step 3: Get API Credentials

1. In your app settings, go to **Keys and tokens**
2. You'll need:
   - **API Key** (also called Consumer Key)
   - **API Key Secret** (also called Consumer Secret)
3. Generate **Access Token and Secret**:
   - Click **Generate** next to "Access Token and Secret"
   - **Important**: Copy these immediately - you won't see them again!
   - You'll get:
     - Access Token
     - Access Token Secret

## Step 4: Set App Permissions

1. Go to your app → **Settings**
2. Under **App permissions**, select:
   - **Read and Write** (required for posting)
3. Click **Save**

## Step 5: Configure Your .env File

Add these variables to your `.env` file:

```env
# X (Twitter) Upload Settings
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here
UPLOAD_TO_X=true
```

Replace the values with your actual credentials from Step 3.

## Step 6: Create Token File

Since X uses OAuth 1.0a with pre-generated tokens, create `x_token.json`:

```json
{
  "oauth_token": "your_access_token_here",
  "oauth_token_secret": "your_access_token_secret_here",
  "screen_name": "your_x_username"
}
```

Or run the script once and it will prompt you to create this file.

## Step 7: Add to GitHub Secrets (for GitHub Actions)

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `X_API_KEY`
   - `X_API_SECRET`
   - `X_ACCESS_TOKEN`
   - `X_ACCESS_TOKEN_SECRET`
   - `UPLOAD_TO_X` (set to `true`)
   - `X_TOKEN_JSON` (the entire content of `x_token.json`)

## Video Requirements

X has specific requirements for video uploads:

- **Format**: MP4 ✅ (your videos already meet this)
- **Resolution**: Up to 1920x1200 (your 1080x1920 is fine)
- **Aspect Ratio**: 16:9, 1:1, or 4:3 (your 9:16 vertical works)
- **Duration**: Up to 140 seconds (your ~30-40s videos are fine)
- **File Size**: Max 512 MB (your videos are much smaller)
- **Codec**: H.264 video, AAC audio ✅

Your generated videos already meet these requirements!

## Tweet Text

- **Character Limit**: 280 characters
- **Hashtags**: Automatically added based on content
- **Link**: valuezai.com is included
- **Format**: Title + script snippet + link + hashtags

## Troubleshooting

### "Missing X credentials" error
- Make sure all four credentials are set in your `.env` file
- Verify the token file exists and is valid JSON

### "Invalid or expired token" error
- Regenerate Access Token and Secret in X Developer Portal
- Update your `.env` file and `x_token.json`

### "Permission denied" error
- Make sure app permissions are set to "Read and Write"
- Regenerate tokens after changing permissions

### "Upload failed" error
- Verify your video meets X's requirements (see above)
- Check file size (must be under 512 MB)
- Ensure video is in MP4 format with H.264 codec

### "Rate limit exceeded" error
- X has rate limits based on your API access level
- Free tier: Limited posts per day
- Wait before retrying or upgrade your API access

## API Access Levels

X offers different API access levels:

- **Free**: Limited posts per day (varies)
- **Basic ($100/month)**: 3,000 posts/month
- **Pro ($5,000/month)**: 50,000 posts/month

Check your current limits in the Developer Portal.

## Security Note

- Never commit `x_token.json` or your `.env` file to version control
- Add them to `.gitignore`:
  ```
  x_token.json
  .env
  ```
- Treat API keys and tokens like passwords

## Important Notes

- **OAuth 1.0a**: X uses OAuth 1.0a (not OAuth 2.0 like YouTube/TikTok)
- **Pre-generated Tokens**: You generate tokens in the Developer Portal, not through OAuth flow
- **Rate Limits**: Be mindful of X's API rate limits
- **Content Guidelines**: Ensure your content complies with X's Terms of Service

## Next Steps

Once set up:
- Videos will post automatically after generation
- Check your X account to see posted videos
- Monitor API usage in the Developer Portal
- Adjust tweet text format in `uploadToX.ts` → `generateXMetadata()`

## Testing

Test locally first:
```bash
# Make sure .env has X credentials
npm run create-reel
```

Check your X account to verify the post appears!

