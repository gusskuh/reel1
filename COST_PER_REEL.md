# Cost Per Reel - Breakdown

Estimated cost to generate **one reel** (video creation only, excluding optional uploads).

---

## API & AI Usage

### 1. **OpenAI - GPT-4o-mini** (Script Generation)
- **Usage:** 1 call to summarize news article into ~30-second script
- **Input:** ~800 tokens (prompt + news article)
- **Output:** ~135 tokens (~75-100 words)
- **Pricing:** $0.15/1M input, $0.60/1M output
- **Cost:** ~**$0.0002**

### 2. **OpenAI - GPT-4o-mini** (Scene Generation)
- **Usage:** 1 call to split script into visual scenes with keywords
- **Input:** ~250 tokens (prompt + script)
- **Output:** ~200 tokens (JSON with 5-10 scenes)
- **Pricing:** $0.15/1M input, $0.60/1M output
- **Cost:** ~**$0.0002**

### 3. **OpenAI - TTS (tts-1)** (Voiceover)
- **Usage:** Convert script to speech (MP3)
- **Characters:** ~500-750 (30-second script)
- **Pricing:** $15.00 per 1M characters
- **Cost:** ~**$0.008 - $0.012**

### 4. **OpenAI - Whisper** (Captions/Transcription)
- **Usage:** Transcribe voiceover for timed captions
- **Duration:** ~30-45 seconds of audio
- **Pricing:** $0.006 per minute
- **Cost:** ~**$0.003 - $0.005**

### 5. **Financial Modeling Prep (FMP)** (News)
- **Usage:** 1 API call to fetch news articles
- **Pricing:** Free tier = 250 calls/day; Paid = $22+/month
- **Cost:** **$0** (within free tier) or ~$0.001/call (amortized on paid plan)

### 6. **Pexels** (Video Clips)
- **Usage:** 1 search + 5-10 video downloads (one per scene)
- **Pricing:** Free (200 req/hour, 20k/month)
- **Cost:** **$0**

---

## Optional Uploads (No API Cost)

- **YouTube:** Free (OAuth)
- **TikTok:** Free (OAuth)
- **X (Twitter):** Free (OAuth)
- **Instagram:** Free (OAuth)

---

## Packages & Tools (Free)

- **ffmpeg** – Open source
- **OpenAI SDK, axios, dotenv, etc.** – Free npm packages
- **Google APIs (YouTube)** – Free
- **GitHub Actions** – 2,000 min/month free for private repos

---

## Total Cost Per Reel

| Component        | Cost        |
|-----------------|-------------|
| GPT-4o-mini (script) | ~$0.0002 |
| GPT-4o-mini (scenes) | ~$0.0002 |
| TTS (voiceover)      | ~$0.008   |
| Whisper (captions)   | ~$0.004   |
| FMP (news)           | $0        |
| Pexels (videos)      | $0        |
| **Total**            | **~$0.012 - $0.02** |

### Summary

**~$0.015 per reel** (about **1.5 cents**)

- **Daily (1 reel/day):** ~$0.45/month
- **Daily (1 reel/day, 30 days):** ~$0.45/month
- **100 reels:** ~$1.50

---

## Cost Optimization Tips

1. **Use Batch API** – 50% discount on GPT-4o-mini if you batch non-urgent requests
2. **Shorter scripts** – Less TTS and Whisper usage
3. **tts-1 vs tts-1-hd** – You use `tts-1` (cheaper); `tts-1-hd` is $30/1M chars
4. **FMP free tier** – 250 calls/day = plenty for 1 reel/day
5. **Pexels** – Free; stay under 20k requests/month

---

## Notes

- Costs assume typical ~30-45 second reels
- Longer scripts = more TTS + Whisper cost
- Prices from OpenAI (Feb 2025); check [platform.openai.com/docs/pricing](https://platform.openai.com/docs/pricing) for updates
- GitHub Actions: free tier may have limits; check your plan
