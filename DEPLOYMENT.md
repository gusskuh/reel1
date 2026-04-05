# Simple Reel MVP — Deployment

Deploy the Next.js app to **Railway** or **Render** for a long-running Node server. The pipeline takes 2–5 minutes per reel, so serverless platforms (e.g. Vercel) are not suitable due to execution time limits.

## Environment variables

Configure these in your hosting provider's dashboard:

| Variable                   | Required | Description                                          |
|---------------------------|----------|------------------------------------------------------|
| `OPENAI_API_KEY`          | Yes      | OpenAI API key (TTS, Whisper, GPT)                   |
| `FMP_API_KEY`             | Yes      | Financial Modeling Prep API key                    |
| `PEXELS_API_KEY`          | Yes      | Pexels API key for video clips                       |
| `TIKTOK_CLIENT_KEY`       | For TikTok posting | From [TikTok Developers](https://developers.tiktok.com/)   |
| `TIKTOK_CLIENT_SECRET`    | For TikTok posting | Same app as client key                               |
| `TIKTOK_REDIRECT_URI`     | For TikTok posting | e.g. `https://YOUR_HOST/api/tiktok/callback` (portal must match) |
| `TIKTOK_SESSION_SECRET`    | For TikTok posting | Random string 16+ chars; encrypts OAuth cookie        |

## Railway

1. Install the [Railway CLI](https://docs.railway.app/develop/cli) (optional) or use the web UI.

2. Create a new project and connect your Git repo.

3. Add a new service, select your repo, and configure:
   - **Build command**: `npm run build`
   - **Start command**: `npm start`
   - **Root directory**: `.` (project root)

4. Set environment variables in Railway dashboard → your service → Variables.

5. Railway runs `next start` which keeps the Node process running; the pipeline executes in the same process.

6. Deploy and obtain your public URL (e.g. `https://yourapp.up.railway.app`).

## Render

1. Go to [render.com](https://render.com) and create a new **Web Service**.

2. Connect your Git repository.

3. Configure:
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm start`
   - **Instance type**: Free or paid (free has cold starts and lower resources)

4. Add environment variables in Render dashboard → Environment.

5. Deploy. Your app will be available at `https://your-service.onrender.com`.

## Notes

- **`uploads/`** is created at runtime. On ephemeral disks, files are lost on restart; this is acceptable for the MVP.
- **Rate limiting** is 3 generations per IP per hour (in-memory).
- **Jobs** are stored in memory and lost when the server restarts.

## Local development

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and use "Generate Reel" to test the flow.
