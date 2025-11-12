# Instagram Reels Upload Setup Guide

This guide will help you set up automatic Instagram Reels uploads for your generated reels.

## Prerequisites

1. A Facebook account (Instagram uses Facebook's Graph API)
2. A Facebook Developer account (free)
3. An Instagram Business or Creator account
4. A Facebook App registered in the Developer Portal

## Step 1: Create a Facebook Developer Account

1. Go to [Facebook Developers Portal](https://developers.facebook.com/)
2. Sign in with your Facebook account
3. Complete the developer registration process

## Step 2: Create a Facebook App

1. In the Developer Portal, go to **My Apps**
2. Click **Create App**
3. Select **Business** as the app type
4. Fill in the required information:
   - **App Name**: e.g., "ReelGen Uploader"
   - **App Contact Email**: Your email
5. Click **Create App**

## Step 3: Add Instagram Basic Display Product

1. In your app dashboard, go to **Add Products**
2. Find **Instagram Basic Display** and click **Set Up**
3. Follow the setup wizard

## Step 4: Configure Instagram Graph API

1. In your app dashboard, go to **Add Products**
2. Find **Instagram Graph API** and click **Set Up**
3. This is required for posting Reels

## Step 5: Connect Your Instagram Account

1. Go to **Tools** → **Graph API Explorer**
2. Select your app
3. Generate a User Access Token with these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

## Step 6: Get Your Instagram Business Account ID

1. You need to connect your Instagram account to a Facebook Page
2. Go to your Facebook Page → Settings → Instagram
3. Connect your Instagram Business/Creator account
4. Get your Instagram Business Account ID from the Graph API

## Step 7: Configure Your .env File

Add these variables to your `.env` file:

```env
# Instagram Upload Settings
INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
UPLOAD_TO_INSTAGRAM=true
```

## Step 8: Request Permissions

Instagram requires approval for certain permissions:
- **Content Publishing**: Request access to `instagram_content_publish` scope
- This may require app review for production use

## Video Requirements

Instagram Reels have specific requirements:
- **Format**: MP4
- **Resolution**: 1080x1920 (vertical/portrait) ✅ (your videos already meet this)
- **Aspect Ratio**: 9:16 ✅
- **Duration**: 15 seconds to 90 seconds (Reels limit)
- **File Size**: Max 100 MB
- **Frame Rate**: 30fps recommended
- **Codec**: H.264 video, AAC audio ✅

**Note**: Your videos might need to be trimmed to 90 seconds for Reels.

## API Limits

Instagram Graph API has rate limits:
- **Standard**: 200 requests per hour per user
- **Video uploads**: May have additional limits
- Check your app's rate limits in the Developer Portal

## Important Notes

- **Business Account Required**: You need an Instagram Business or Creator account (not personal)
- **Facebook Page Required**: Your Instagram account must be connected to a Facebook Page
- **App Review**: Some permissions require Facebook's app review process
- **Token Expiration**: Access tokens may expire and need refreshing
- **Content Guidelines**: Ensure your content complies with Instagram's Community Guidelines

## Troubleshooting

### "Invalid access token" error
- Regenerate your access token in Graph API Explorer
- Make sure you have the correct permissions

### "Permission denied" error
- Ensure your Instagram account is a Business or Creator account
- Verify your account is connected to a Facebook Page
- Check that you've requested the correct permissions

### "Video too long" error
- Instagram Reels have a 90-second limit
- Trim your video if it's longer than 90 seconds

### "File size too large" error
- Instagram Reels have a 100 MB file size limit
- Compress your video if needed

## Next Steps

Once set up, you can integrate Instagram uploads into your workflow similar to YouTube, TikTok, and X.

