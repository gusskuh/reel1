# TikTok Upload Setup Guide

This guide will help you set up automatic TikTok uploads for your generated reels.

## Prerequisites

1. A TikTok account
2. A TikTok Developer account (free)
3. A TikTok app registered in the Developer Portal

## Step 1: Create a TikTok Developer Account

1. Go to [TikTok Developers Portal](https://developers.tiktok.com/)
2. Sign in with your TikTok account
3. Complete the developer registration process

## Step 2: Create an Application

1. In the Developer Portal, go to **My Apps**
2. Click **Create App**
3. Fill in the required information:
   - **App Name**: e.g., "ReelGen Uploader"
   - **App Category**: Select "Content Management" or appropriate category
   - **Description**: Brief description of your app
4. Submit for review (usually approved quickly for basic apps)

## Step 3: Add Required Products

**Important**: Content Posting API requires Login Kit to be added first.

1. In your app, go to **Products** (or **APIs** section)
2. **Add Login Kit first:**
   - Click **Add** next to "Login Kit"
   - Complete any required configuration
   - Save

3. **Add Content Posting API:**
   - After Login Kit is added, the "Add" button for Content Posting API will become enabled
   - Click **Add** next to "Content Posting API"
   - Complete any required configuration
   - Save

**Note**: Even though you're using Content Posting API for automated posting (not Login Kit for end users), TikTok requires Login Kit as a prerequisite. This is a platform requirement.

4. After both products are added, the `video.upload` scope will become available in your app submission form.

## Step 4: Configure OAuth

1. In your app settings, go to **Basic Information**
2. Note your **Client Key** and **Client Secret** (you'll need these)
3. Add **Redirect URI** (must match exactly; register every URL you use):
   - **Next.js web app (Connect TikTok on the site):**  
     `http://localhost:3000/api/tiktok/callback` (local) and `https://YOUR_DOMAIN/api/tiktok/callback` (production)
   - **CLI / `npm run create-reel` (legacy):** `http://localhost:3000/tiktok_callback` if you still use that flow
4. Request **Scopes** (after adding Content Posting API product):
   - `user.info.stats` - User statistics and account information
   - `video.list` - List and manage uploaded videos
   - `video.upload` - Upload videos (requires approval)
   
   **Note**: These scopes will only be available after you've added the Content Posting API product (Step 3).

## Step 5: Verify Domain Ownership

**Important**: TikTok requires domain verification before you can use the Content Posting API.

You have **two options** for domain verification:

### Option A: HTML File Method (Recommended - Easier)

1. **Go to URL Ownership Verification:**
   - In your TikTok Developer Portal, go to **Content Posting** → **URL Ownership Verification**
   - Or go to your app → **URL Properties** (top right corner)

2. **Add Your Domain:**
   - Enter your domain (e.g., `https://valuezai.com` or `valuezai.com`)
   - Click **Verify**

3. **Download Verification File:**
   - TikTok will provide a verification file (e.g., `tiktok_verify_xxxxx.html`)
   - Download this file

4. **Upload the File to Your Website:**
   - Upload the file to your domain's **root directory** (public_html, www, or root folder)
   - The file must be accessible at: `https://yourdomain.com/tiktok_verify_xxxxx.html`
   - You can verify it's accessible by visiting the URL in your browser

5. **Verify in TikTok:**
   - Return to the TikTok Developer Portal
   - Click **Verify** button
   - TikTok will check if the file is accessible at the URL

**For valuezai.com:**
- Upload the file to your web hosting root directory
- Make sure it's accessible at: `https://valuezai.com/tiktok_verify_xxxxx.html`
- If you're using a hosting service (like cPanel, Vercel, Netlify, etc.), upload it to the public/root folder

### Option B: DNS TXT Record Method

1. **Go to URL Ownership Verification:**
   - In your TikTok Developer Portal, go to **Content Posting** → **URL Ownership Verification**
   - Or go to your app → **URL Properties**

2. **Add Your Domain:**
   - Enter your domain (e.g., `valuezai.com`)
   - Select **DNS TXT Record** method

3. **Get TXT Record Value:**
   - TikTok will provide a TXT record value (e.g., `tiktok-developers-site-verification=xxxxx`)

4. **Add TXT Record to DNS:**
   - Go to your domain registrar (where you bought the domain)
   - Access DNS settings
   - Add a new TXT record:
     - **Host/Name**: `@` (or leave blank for root domain)
     - **Value**: The exact value TikTok provided
     - **TTL**: 1 hour (or default)

5. **Wait for DNS Propagation:**
   - DNS changes can take 5 minutes to 48 hours
   - Check if it's live: `dig TXT valuezai.com` or use online DNS checkers

6. **Verify in TikTok:**
   - Return to TikTok Developer Portal
   - Click **Verify** button
   - If it fails, wait a few hours and try again (DNS propagation delay)

**Troubleshooting DNS Method:**
- Make sure the TXT record value matches **exactly** (no extra spaces)
- Wait at least 1 hour after adding the record
- Use `dig TXT valuezai.com` to verify the record is live
- Try clicking "Verify" multiple times (TikTok's system checks periodically)

## Step 6: Request Video Upload Permission

**Important**: TikTok requires approval for video upload permissions.

1. Go to your app → **Permissions**
2. Request access to `video.upload` scope
3. Fill out the application form explaining your use case
4. Wait for approval (can take a few days to weeks)

**Note**: Until approved, you can test with other scopes, but video upload won't work.

## Step 7: Configure Your .env File

Add these variables to your `.env` file:

```env
# TikTok Upload Settings
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
# Must match a redirect URI registered in the Developer Portal (see Step 4)
TIKTOK_REDIRECT_URI=http://localhost:3000/api/tiktok/callback
# Required for the Next.js app: encrypts the TikTok token cookie (min 16 chars; use e.g. openssl rand -hex 32)
TIKTOK_SESSION_SECRET=your_long_random_secret
UPLOAD_TO_TIKTOK=true
```

For **production**, set `TIKTOK_REDIRECT_URI` to your public URL, e.g. `https://valuezai.com/api/tiktok/callback`, and add that same URL in the TikTok portal.

Replace `your_client_key_here` and `your_client_secret_here` with the values from Step 3.

## Step 8: Authorize the Application

1. Run your reel generation script:
   ```bash
   npm run create-reel
   ```

2. When it reaches the TikTok upload step, it will:
   - Print an authorization URL
   - Start a local server (for Web apps) or wait for manual code entry
   - **IMPORTANT**: Sign in with the TikTok account you want to upload to
   - You'll be asked to grant permissions
   
   **For Web applications:**
   - After authorization, TikTok will redirect to `http://localhost:3000/tiktok_callback`
   - The local server will automatically capture the authorization code
   - You'll see a success message in your browser - you can close that window
   - The script will continue automatically
   
   **For Desktop applications:**
   - After authorization, you'll see a code on the screen
   - Copy and paste that code into the terminal

3. The token will be saved to `tiktok_token.json` for future use

## Step 9: Add Token to GitHub Secrets (for GitHub Actions)

1. **Copy the token content:**
   ```bash
   # On Mac:
   cat tiktok_token.json | pbcopy
   
   # Or manually: Open tiktok_token.json and copy all contents
   ```

2. **Add to GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `TIKTOK_TOKEN_JSON`
   - Value: Paste the entire JSON content
   - Click **Add secret**

3. **Also add these secrets:**
   - `TIKTOK_CLIENT_KEY`
   - `TIKTOK_CLIENT_SECRET`
   - `TIKTOK_REDIRECT_URI` (optional, defaults to `http://localhost:3000/tiktok_callback`)
   - `UPLOAD_TO_TIKTOK` (set to `true` to enable uploads)

## Video Requirements

TikTok has specific requirements for uploaded videos:

- **Format**: MP4
- **Resolution**: 1080x1920 (vertical/portrait) ✅ (your videos already meet this)
- **Aspect Ratio**: 9:16 ✅
- **Duration**: 15 seconds to 10 minutes
- **File Size**: Max 287 MB
- **Frame Rate**: 30fps recommended
- **Codec**: H.264 video, AAC audio ✅

Your generated videos already meet these requirements!

## Troubleshooting

### "Missing TikTok credentials" error
- Make sure `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` are set in your `.env` file

### "Token expired" error
- Delete `tiktok_token.json` and re-authorize (Step 6)

### "Permission denied" or "Scope not approved"
- Make sure you've requested and been approved for `video.upload` scope
- Check your app status in the Developer Portal

### "Upload failed" error
- Verify your video meets TikTok's requirements (see above)
- Check file size (must be under 287 MB)
- Ensure video is in MP4 format with H.264 codec

### "redirect_uri_mismatch" error
- The redirect URI in your `.env` file must **exactly match** what you configured in TikTok Developer Portal
- Check Step 3 for the correct redirect URI

## API Limits

TikTok API has rate limits:
- **Free tier**: Limited requests per day
- **Video uploads**: Typically 10-20 per day (varies by account)
- Check your app's rate limits in the Developer Portal

## Security Note

- Never commit `tiktok_token.json` or your `.env` file to version control
- Add them to `.gitignore`:
  ```
  tiktok_token.json
  .env
  ```

## Important Notes

- **Approval Required**: Video upload requires TikTok's approval - this can take time
- **Token Expiration**: Tokens may expire - you'll need to refresh periodically
- **Rate Limits**: Be mindful of TikTok's API rate limits
- **Content Guidelines**: Ensure your content complies with TikTok's Community Guidelines

## Next Steps

Once set up:
- Videos will upload automatically after generation
- Check your TikTok account to see uploaded videos
- Monitor API usage in the Developer Portal
- Adjust metadata (title, description, hashtags) in `uploadToTikTok.ts`


