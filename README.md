# ReelGen - Automated Financial News Reel Generator

An automated system that generates short financial news reels by:
- Fetching random financial news articles
- Generating engaging scripts with AI
- Creating voiceovers with text-to-speech
- Fetching relevant background videos
- Combining everything into polished vertical reels
- Optionally uploading to YouTube

## Features

- 📰 **News Fetching**: Random financial news from Financial Modeling Prep API
- ✍️ **AI Script Generation**: GPT-4 powered script creation
- 🎤 **Text-to-Speech**: OpenAI TTS for natural voiceovers
- 🎥 **Dynamic Video Scenes**: Multiple scene clips based on script content
- 📝 **Auto Captions**: Whisper-powered timed captions
- 📊 **Ticker Badge**: Automatic ticker symbol detection and display
- 📺 **YouTube Upload**: Automatic upload to your YouTube channel
- ⏰ **Scheduled Runs**: GitHub Actions for daily automation

## Prerequisites

- Node.js 18+ and npm
- FFmpeg (installed via `ffmpeg-static` package)
- API Keys:
  - OpenAI API key
  - Financial Modeling Prep API key
  - Pexels API key (for background videos)
  - YouTube OAuth credentials (optional, for uploads)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd reelGen
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Financial Modeling Prep API
FMP_API_KEY=your_fmp_api_key

# Pexels API (for background videos)
PEXELS_API_KEY=your_pexels_api_key

# YouTube Upload (optional)
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
UPLOAD_TO_YOUTUBE=true
```

4. For YouTube upload setup, see [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md)

## Usage

### Run locally:
```bash
npm run create-reel
```

This will:
1. Fetch a random financial news article
2. Generate a script
3. Create voiceover
4. Fetch background videos
5. Generate captions
6. Create the final video
7. Upload to YouTube (if enabled)

### Individual steps:
```bash
npm run fetch-news      # Fetch news article
npm run generate-script # Generate script
npm run generate-speech # Generate voiceover
```

## GitHub Actions - Daily Automation

The project includes a GitHub Actions workflow that runs daily at 9 AM UTC.

### Setup for GitHub Actions:

1. **Add Secrets to GitHub Repository:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `OPENAI_API_KEY`
     - `FMP_API_KEY`
     - `PEXELS_API_KEY`
     - `YOUTUBE_CLIENT_ID` (if uploading to YouTube)
     - `YOUTUBE_CLIENT_SECRET` (if uploading to YouTube)
     - `YOUTUBE_REDIRECT_URI` (if uploading to YouTube)
     - `YOUTUBE_TOKEN_JSON` (see below)

2. **YouTube Token Setup:**
   - Run the script locally once to generate `youtube_token.json`
   - Copy the contents of `youtube_token.json`
   - Add it as a secret named `YOUTUBE_TOKEN_JSON` in GitHub Secrets
   - Note: You'll need to refresh this token periodically (tokens expire after ~6 months)

3. **Enable GitHub Actions:**
   - The workflow is in `.github/workflows/daily-reel.yml`
   - It runs automatically on a schedule
   - You can also trigger it manually from the Actions tab

### Workflow Features:
- Runs daily at 9:00 AM UTC
- Installs dependencies
- Generates a new reel
- Uploads to YouTube (if configured)
- Stores generated videos as artifacts (for 7 days)
- Sends notifications on success/failure

## Project Structure

```
reelGen/
├── scripts/
│   ├── index.ts              # Main orchestration script
│   ├── fetchNews.ts          # Fetch financial news
│   ├── generateScript.ts    # Generate reel script
│   ├── generateSpeech.ts    # Text-to-speech
│   ├── fetchSceneVideos.ts  # Generate scene descriptions
│   ├── fetchBackgroundVideo.ts # Fetch video clips
│   ├── generateCaptions.ts  # Generate SRT captions
│   ├── createDynamicVideo.ts # Combine everything
│   └── uploadToYouTube.ts   # YouTube upload
├── .github/
│   └── workflows/
│       └── daily-reel.yml    # Daily automation workflow
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Video Settings:
- Resolution: 1080x1920 (vertical/portrait)
- Duration: ~30-40 seconds
- Caption style: Bottom-aligned, white text with black outline
- Ticker badge: Top center, large font

### YouTube Settings:
- Default privacy: Public (changeable in `uploadToYouTube.ts`)
- Category: People & Blogs
- Auto-generated tags from news content

## Troubleshooting

### Common Issues:

1. **FFmpeg not found**: The project uses `ffmpeg-static` which bundles FFmpeg. If issues persist, install FFmpeg system-wide.

2. **API Rate Limits**: 
   - OpenAI: Check your usage limits
   - Pexels: Free tier allows 200 requests/hour
   - YouTube: Free tier allows ~6 uploads/day

3. **YouTube Upload Fails**:
   - Check OAuth token is valid
   - Verify redirect URI matches Google Cloud Console
   - See [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md) for detailed setup

4. **Video Generation Errors**:
   - Ensure sufficient disk space
   - Check that scene videos are downloaded successfully
   - Verify audio file is generated correctly

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!

