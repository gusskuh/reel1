# YouTube Token Setup for GitHub Actions

To enable YouTube uploads in your GitHub Actions workflow, you need to generate a YouTube OAuth token locally and add it as a secret.

## Step 1: Generate Token Locally

1. **Make sure your local `.env` has YouTube credentials:**
   ```env
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
   UPLOAD_TO_YOUTUBE=true
   ```

2. **Run the script locally:**
   ```bash
   npm run create-reel
   ```

3. **When prompted for authorization:**
   - Visit the authorization URL shown in the terminal
   - Sign in with the Google account that owns your YouTube channel
   - Grant permissions
   - For Web apps: The browser will redirect and the token is saved automatically
   - For Desktop apps: Copy the code and paste it in the terminal

4. **Verify token was created:**
   ```bash
   cat youtube_token.json
   ```
   
   You should see JSON like:
   ```json
   {
     "access_token": "ya29...",
     "refresh_token": "1//0...",
     "scope": "https://www.googleapis.com/auth/youtube.upload",
     "token_type": "Bearer",
     "expiry_date": 1234567890
   }
   ```

## Step 2: Add Token to GitHub Secrets

1. **Copy the entire token file content:**
   ```bash
   # On Mac:
   cat youtube_token.json | pbcopy
   
   # On Linux:
   cat youtube_token.json | xclip -selection clipboard
   
   # Or manually: Open youtube_token.json and copy all contents
   ```

2. **Add to GitHub Secrets:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `YOUTUBE_TOKEN_JSON`
   - Value: Paste the entire JSON content (everything from `{` to `}`)
   - Click **Add secret**

## Step 3: Verify Other YouTube Secrets

Make sure these secrets are also set:
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI` (optional, defaults to `http://localhost:3000/oauth2callback`)
- `UPLOAD_TO_YOUTUBE` (set to `true` to enable uploads)

## Step 4: Test the Workflow

1. Go to **Actions** tab
2. Select "Daily Reel Generation"
3. Click **Run workflow**
4. Watch the logs - you should see:
   - ✅ YouTube token configured
   - 📺 Uploading to channel: [Your Channel Name]
   - ✅ Video uploaded successfully!

## Troubleshooting

### Token Expired
YouTube tokens expire after ~6 months. To refresh:
1. Delete `youtube_token.json` locally
2. Run `npm run create-reel` again
3. Re-authorize
4. Update the `YOUTUBE_TOKEN_JSON` secret with the new token

### "YOUTUBE_TOKEN_JSON secret is missing"
- Make sure you added the secret in GitHub
- Check the secret name is exactly `YOUTUBE_TOKEN_JSON` (case-sensitive)
- Verify you copied the entire JSON content (including `{` and `}`)

### "Authorization error" or "Invalid token"
- The token might be expired - regenerate it
- Make sure you copied the entire token file content
- Verify the token includes both `access_token` and `refresh_token`

### "No channel found"
- Make sure you authorized with the correct Google account
- Verify the account has a YouTube channel
- Check that you granted the `youtube.upload` scope

## Important Notes

- **Never commit `youtube_token.json`** - it's in `.gitignore` for a reason
- **Token contains sensitive credentials** - treat it like a password
- **Refresh tokens last longer** - the workflow will use the refresh token to get new access tokens automatically
- **One token per channel** - if you want to upload to multiple channels, you'll need separate tokens/secrets

## Security Best Practices

1. Only add the token secret if you actually want YouTube uploads
2. Rotate the token if you suspect it's compromised
3. Use different tokens for different environments (if you have staging/production)
4. Monitor YouTube API usage to detect unauthorized access

