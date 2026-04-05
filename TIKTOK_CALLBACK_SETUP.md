# TikTok Callback Endpoint Setup Guide

This guide shows you how to set up the TikTok OAuth callback endpoint on your production domain.

## Quick Setup

### Option 1: Deploy as Standalone Server (Recommended)

1. **Deploy the callback server** (`scripts/tiktokCallbackServer.ts`) to your server
2. **Set environment variables**:
   ```env
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   TIKTOK_REDIRECT_URI=https://yourdomain.com/tiktok_callback
   PORT=3000
   ```

3. **Run the server**:
   ```bash
   npm install express axios dotenv
   tsx scripts/tiktokCallbackServer.ts
   ```

4. **Configure reverse proxy** (nginx/Apache) to route `/tiktok_callback` to your server

### Option 2: Integrate into Existing Express App

If you already have an Express server, add this route:

```typescript
app.get("/tiktok_callback", async (req, res) => {
  // Copy the handler from tiktokCallbackServer.ts
});
```

### Option 3: Serverless Function (Vercel/Netlify)

Create a serverless function that handles the callback:

**Vercel example** (`api/tiktok_callback.ts`):
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
// Use the callback handler logic from tiktokCallbackServer.ts
```

## Configuration Steps

### 1. Update Your .env File

```env
TIKTOK_REDIRECT_URI=https://yourdomain.com/tiktok_callback
```

### 2. Add Redirect URI in TikTok Developer Portal

- Go to your TikTok app → Basic Information
- Add redirect URI: `https://yourdomain.com/tiktok_callback`
- Save

### 3. Deploy the Endpoint

Choose one of the options above based on your hosting setup.

## Testing

1. **Test locally first** (if possible):
   ```bash
   TIKTOK_REDIRECT_URI=http://localhost:3000/tiktok_callback npm run dev
   ```

2. **Test production endpoint**:
   - Visit: `https://yourdomain.com/tiktok_callback?code=test`
   - Should show error (no valid code, but endpoint is working)

## Token Storage

The callback server stores tokens in files by default. For production with multiple users, you should:

1. **Store tokens in database** (recommended)
2. **Associate tokens with user sessions**
3. **Implement token refresh logic**

## Security Considerations

1. **Use HTTPS** - Always use HTTPS in production
2. **Validate state parameter** - Implement CSRF protection
3. **Secure token storage** - Don't expose tokens in logs
4. **Rate limiting** - Implement rate limiting on the callback endpoint

## Troubleshooting

### "Redirect URI mismatch"
- Make sure the URI in TikTok Developer Portal exactly matches your deployed endpoint
- Check for trailing slashes, http vs https, www vs non-www

### "Invalid code"
- Codes expire quickly (usually within 10 minutes)
- Make sure you're using the code immediately after authorization

### "Token exchange failed"
- Verify CLIENT_KEY and CLIENT_SECRET are correct
- Check that redirect_uri matches exactly

## Next Steps

After setting up the callback endpoint:

1. ✅ Test the endpoint is accessible
2. ✅ Update TikTok Developer Portal with the redirect URI
3. ✅ Update your `.env` file
4. ✅ Test the full OAuth flow
5. ✅ Submit for TikTok sandbox review

