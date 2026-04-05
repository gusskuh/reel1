# Extending YouTube OAuth Token Lifespan

If your YouTube refresh tokens expire every 7 days, it's because your OAuth app is in **Testing** mode. This guide shows you how to extend the token lifespan by publishing your app to **Production** mode.

## Why Tokens Expire in 7 Days

- **Testing Mode**: Refresh tokens expire after 7 days
- **Production Mode**: Refresh tokens don't expire (unless revoked or unused for 6+ months)

## Step-by-Step: Publish Your App to Production

### Step 1: Go to OAuth Consent Screen

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
   - Direct link: https://console.cloud.google.com/apis/credentials/consent

### Step 2: Check Current Publishing Status

Look at the top of the page. You'll see:
- **"Testing"** status (this is why tokens expire in 7 days)
- A **"PUBLISH APP"** button

### Step 3: Publish Your App

**Before Publishing - Complete Required Fields:**

1. **App Information**:
   - App name: Your app name (e.g., "ReelGen YouTube Uploader")
   - User support email: Your email
   - App logo: Optional but recommended
   - App domain: Optional
   - Developer contact information: Your email

2. **Scopes**:
   - Make sure `https://www.googleapis.com/auth/youtube.upload` is listed
   - Add any other scopes you need

3. **Test Users** (if External app):
   - Add your Google account email as a test user
   - This allows you to use the app before it's fully verified

**Publishing Options:**

**Option A: Publish Without Verification (Recommended for Personal Use)**
- Click **"PUBLISH APP"** button
- You'll see a warning about unverified app
- Click **"CONFIRM"** to proceed
- Your app will be published, but may show "Unverified" warning to users
- **This is fine for personal/automated use**

**Option B: Request Verification (For Public Apps)**
- Complete all required fields
- Add privacy policy URL (required for verification)
- Add terms of service URL (required for verification)
- Click **"PUBLISH APP"** → **"SUBMIT FOR VERIFICATION"**
- Wait for Google's review (can take days/weeks)
- Once verified, no warnings shown to users

### Step 4: Regenerate Your Refresh Token

**Important**: After publishing, you MUST regenerate your token to get the extended lifespan.

1. **Delete the old token**:
   ```bash
   rm youtube_token.json
   ```

2. **Regenerate the token**:
   ```bash
   npm run refresh-youtube-token
   ```

3. **Authorize again**:
   - Visit the authorization URL
   - Sign in with your Google account
   - Grant permissions
   - The new token will have extended lifespan

4. **Update GitHub Secret**:
   - Copy the new token from `youtube_token.json`
   - Update `YOUTUBE_TOKEN_JSON` secret in GitHub:
     - Go to repository → Settings → Secrets → Actions
     - Edit `YOUTUBE_TOKEN_JSON`
     - Paste the new token JSON
     - Save

## Verification Requirements (Optional)

If you want to avoid "Unverified app" warnings, you need to:

1. **Privacy Policy**:
   - Create a privacy policy page on your website
   - Must explain what data you collect and how you use it
   - Add URL in OAuth consent screen

2. **Terms of Service**:
   - Create a terms of service page
   - Add URL in OAuth consent screen

3. **App Domain Verification**:
   - Verify ownership of your domain
   - Add authorized domains in OAuth consent screen

4. **Submit for Verification**:
   - Complete all required fields
   - Submit for Google's review
   - Wait for approval (can take days/weeks)

**Note**: For personal/automated use, you can skip verification and just publish. The "Unverified" warning only appears during authorization, not during automated token refresh.

## After Publishing

✅ **Refresh tokens will no longer expire after 7 days**
✅ **Tokens will only expire if**:
   - User revokes access manually
   - Token unused for 6+ months
   - User changes password (for Gmail scopes)
   - Maximum number of tokens exceeded

## Troubleshooting

### "Publish App" Button is Disabled
- Complete all required fields (marked with *)
- Add at least one scope
- Add test users (for External apps)

### Still Getting 7-Day Expiration
- Make sure you regenerated the token AFTER publishing
- Old tokens created in Testing mode still expire in 7 days
- Delete `youtube_token.json` and regenerate

### "Unverified App" Warning
- This is normal for unverified apps
- It only appears during authorization
- Doesn't affect token lifespan
- To remove: Complete verification process

### Can't Publish (Greyed Out)
- Check that all required fields are filled
- Make sure you're the project owner/editor
- Try refreshing the page

## Quick Checklist

- [ ] Go to OAuth consent screen
- [ ] Complete all required fields
- [ ] Click "PUBLISH APP"
- [ ] Delete old `youtube_token.json`
- [ ] Run `npm run refresh-youtube-token`
- [ ] Update `YOUTUBE_TOKEN_JSON` secret in GitHub
- [ ] Test that token refresh works

## Expected Result

After publishing and regenerating:
- ✅ Refresh token lifespan: **Indefinite** (until revoked/unused 6+ months)
- ✅ No more 7-day expiration
- ✅ Automatic token refresh will work reliably
- ✅ GitHub Actions workflow won't need frequent token updates



