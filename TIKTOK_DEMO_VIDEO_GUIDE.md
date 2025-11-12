# TikTok App Review Demo Video Guide

## Overview
This guide will help you create a demo video that clearly demonstrates your TikTok API integration for app review.

## Video Structure (5-7 minutes recommended)

### Part 1: Introduction & Setup (30 seconds)
1. **Start with your website** (valuezai.com)
   - Show the homepage briefly
   - Explain this is where the automated system runs
   - Navigate to show it's a real website

2. **Show the codebase** (optional but helpful)
   - Briefly show the project structure
   - Point out the TikTok integration file (`scripts/uploadToTikTok.ts`)

### Part 2: OAuth Authorization Flow (1-2 minutes)
**This is critical - TikTok needs to see the authorization process**

1. **Open Terminal/Command Line**
   - Show the terminal window clearly
   - Run: `npm run create-reel` (or your TikTok upload script)

2. **Show Authorization URL**
   - When the script prints the authorization URL, zoom in on it
   - Copy the URL and open it in a browser

3. **Browser OAuth Flow**
   - Show the TikTok login page
   - Log in with your TikTok account
   - Show the permission request screen
   - **IMPORTANT**: Clearly show the scopes being requested:
     - `user.info.stats`
     - `video.list`
     - `video.upload`
   - Click "Authorize" or "Allow"
   - Show the redirect back to your callback URL
   - Show the success message

4. **Return to Terminal**
   - Show the terminal receiving the authorization code
   - Show the token being saved
   - Highlight the console output showing successful authentication

### Part 3: Using user.info.stats Scope (1 minute)
**You'll need to add a function to demonstrate this**

1. **Create a test script** (see below) that calls the user info API
2. **Run the script in terminal**
3. **Show the API response** displaying:
   - User statistics
   - Account information
   - Follower count, video count, etc.

### Part 4: Video Upload Process (2-3 minutes)
1. **Show the video file**
   - Display the video file that will be uploaded
   - Show file size and properties

2. **Terminal Output**
   - Show the upload initialization
   - Show chunked upload progress
   - Show upload completion
   - Highlight all console logs clearly

3. **API Calls** (optional but impressive)
   - If possible, show network requests in browser DevTools
   - Or show the API responses in terminal

### Part 5: Using video.list Scope (1 minute)
**You'll need to add a function to demonstrate this**

1. **Create a test script** (see below) that lists videos
2. **Run the script in terminal**
3. **Show the API response** displaying:
   - List of uploaded videos
   - Video metadata (IDs, titles, dates)
   - The video you just uploaded should appear in the list

### Part 6: Verification on TikTok (30 seconds)
1. **Open TikTok app or website**
2. **Navigate to your account**
3. **Show the uploaded video**
   - Point out the video that was just uploaded
   - Show it's live and published
   - Show the title, description, and metadata match what was sent via API

## Technical Requirements

### Use Sandbox Environment
- Make sure you're using TikTok's sandbox/test environment
- This is required for first-time app submissions
- The sandbox environment is available in the Developer Portal

### Scripts You'll Need to Create

#### 1. Test Script for user.info.stats
Create `scripts/testTikTokUserStats.ts`:

```typescript
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";

async function testUserStats() {
  // Load token
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error("❌ No token found. Please authorize first.");
    process.exit(1);
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  const accessToken = tokenData.access_token;

  console.log("📊 Fetching user statistics...\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/user/info/?fields=display_name,bio_description,avatar_url,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ User Statistics Retrieved:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testUserStats();
```

#### 2. Test Script for video.list
Create `scripts/testTikTokVideoList.ts`:

```typescript
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_PATH = path.resolve("tiktok_token.json");
const BASE_URL = "https://open.tiktokapis.com";

async function testVideoList() {
  // Load token
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error("❌ No token found. Please authorize first.");
    process.exit(1);
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  const accessToken = tokenData.access_token;

  console.log("📹 Fetching video list...\n");

  try {
    const response = await axios.get(
      `${BASE_URL}/v2/video/list/?max_count=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✅ Video List Retrieved:");
    console.log(`Total videos: ${response.data.data.videos?.length || 0}\n`);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testVideoList();
```

## Recording Tips

### Screen Recording Software
- **Mac**: QuickTime Player (built-in) or ScreenFlow
- **Windows**: OBS Studio (free) or Camtasia
- **Linux**: OBS Studio or SimpleScreenRecorder

### Best Practices
1. **Use a large terminal font** (18-20pt) so text is readable
2. **Zoom in on important parts**:
   - Authorization URLs
   - Console output
   - API responses
   - TikTok permission screens
3. **Add text annotations** (optional):
   - Label different sections
   - Highlight important steps
   - Point out scopes being used
4. **Speak clearly** or add subtitles explaining what's happening
5. **Keep it under 7 minutes** - TikTok reviewers are busy
6. **Show the complete flow** - don't skip steps

### What to Highlight
- ✅ OAuth authorization flow (very important!)
- ✅ Scope permissions being requested
- ✅ API calls and responses
- ✅ Successful video upload
- ✅ Video appearing on TikTok
- ✅ user.info.stats API call and response
- ✅ video.list API call showing uploaded videos

## Checklist Before Recording

- [ ] TikTok app is in sandbox/test mode
- [ ] All scopes are requested: `user.info.stats`, `video.list`, `video.upload`
- [ ] Test scripts are created and working
- [ ] You have a test video ready to upload
- [ ] Terminal font is large and readable
- [ ] Browser is ready for OAuth flow
- [ ] TikTok account is logged in and ready
- [ ] Screen recording software is set up
- [ ] Audio is working (if narrating)

## After Recording

1. **Edit the video** (if needed):
   - Trim unnecessary parts
   - Add text labels if helpful
   - Ensure it's under 50MB per file

2. **Export as MP4 or MOV**:
   - Resolution: 1080p minimum
   - Format: MP4 or MOV
   - Keep file size under 50MB

3. **Upload to TikTok Developer Portal**:
   - Go to your app → App Review
   - Upload the demo video
   - Make sure it clearly shows all required scopes

## Common Mistakes to Avoid

❌ **Don't skip the OAuth flow** - This is critical!
❌ **Don't forget to show scopes** - Make them visible in the permission screen
❌ **Don't use production environment** - Use sandbox for first submission
❌ **Don't make it too long** - Keep it concise and focused
❌ **Don't skip showing results** - Show the video on TikTok at the end
❌ **Don't forget user.info.stats** - Must demonstrate this scope
❌ **Don't forget video.list** - Must demonstrate this scope

## Alternative: Split into Multiple Videos

If one video is too long, you can upload up to 5 videos:
1. **Video 1**: OAuth authorization flow
2. **Video 2**: user.info.stats demonstration
3. **Video 3**: Video upload process
4. **Video 4**: video.list demonstration
5. **Video 5**: Final verification on TikTok

Each video should be focused and under 50MB.

