# Deployment Guide

This guide walks you through deploying ReelGen to GitHub and setting up daily automation.

## Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: ReelGen automated reel generator"
```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Don't initialize with README (you already have one)

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of the following:

### Required Secrets:

- **`OPENAI_API_KEY`**: Your OpenAI API key
- **`FMP_API_KEY`**: Your Financial Modeling Prep API key
- **`PEXELS_API_KEY`**: Your Pexels API key

### Optional (for YouTube upload):

- **`YOUTUBE_CLIENT_ID`**: From Google Cloud Console
- **`YOUTUBE_CLIENT_SECRET`**: From Google Cloud Console
- **`YOUTUBE_REDIRECT_URI`**: `http://localhost:3000/oauth2callback` (or your configured URI)
- **`UPLOAD_TO_YOUTUBE`**: `true` or `false`
- **`YOUTUBE_TOKEN_JSON`**: See Step 3 below

## Step 3: Setup YouTube Token (if uploading to YouTube)

The YouTube OAuth token needs to be generated locally first, then added as a secret.

1. **Generate token locally**:
```bash
# Make sure your .env has YouTube credentials
npm run create-reel
# When prompted, authorize the app
# This will create youtube_token.json
```

2. **Copy token to GitHub Secret**:
```bash
# On Mac/Linux:
cat youtube_token.json | pbcopy  # Copies to clipboard

# Or manually copy the contents of youtube_token.json
```

3. **Add as GitHub Secret**:
   - Name: `YOUTUBE_TOKEN_JSON`
   - Value: Paste the entire JSON content from `youtube_token.json`

**Important Notes:**
- YouTube tokens expire after ~6 months
- You'll need to refresh the token periodically
- To refresh: Delete `youtube_token.json`, run locally again, update the secret

## Step 4: Configure Workflow Schedule

Edit `.github/workflows/daily-reel.yml` to adjust the schedule:

```yaml
schedule:
  - cron: '0 9 * * *'  # 9 AM UTC daily
```

Cron format: `minute hour day month weekday`
- `0 9 * * *` = 9:00 AM UTC every day
- `0 14 * * *` = 2:00 PM UTC (9 AM EST)
- `0 9 * * 1-5` = 9 AM UTC, weekdays only

Use [crontab.guru](https://crontab.guru) to help with cron syntax.

## Step 5: Test the Workflow

1. **Manual Trigger**:
   - Go to **Actions** tab in your GitHub repository
   - Select "Daily Reel Generation" workflow
   - Click **Run workflow** → **Run workflow**

2. **Monitor Execution**:
   - Watch the workflow run in real-time
   - Check logs for any errors
   - Download artifacts to see generated videos

3. **Verify YouTube Upload** (if enabled):
   - Check your YouTube channel for the new video
   - Verify metadata (title, description, tags)

## Step 6: Monitor and Maintain

### Daily Checks:
- Review workflow runs in GitHub Actions
- Check for failed runs and investigate errors
- Download and review generated videos

### Weekly/Monthly:
- Review API usage and quotas
- Check YouTube token expiration (refresh if needed)
- Update dependencies if needed: `npm update`

### Troubleshooting:

**Workflow fails with "Missing API key":**
- Verify all secrets are set correctly
- Check secret names match exactly (case-sensitive)

**YouTube upload fails:**
- Token may be expired - regenerate and update secret
- Check YouTube API quota hasn't been exceeded
- Verify OAuth credentials are correct

**Video generation fails:**
- Check GitHub Actions logs for specific errors
- Verify all API keys are valid
- Ensure sufficient disk space in GitHub Actions runner

**Workflow doesn't run on schedule:**
- GitHub Actions schedules can be delayed by up to 15 minutes
- Verify the cron syntax is correct
- Check repository has activity (inactive repos may have delayed schedules)

## Alternative: Self-Hosted Runner

For more control and longer-running jobs, consider a self-hosted GitHub Actions runner:

1. Set up a server/VPS
2. Install GitHub Actions runner
3. Update workflow to use `runs-on: self-hosted`
4. Benefits: No time limits, persistent storage, custom environment

## Cost Considerations

### GitHub Actions:
- Free tier: 2,000 minutes/month
- Each run: ~5-10 minutes
- ~200-400 runs/month on free tier

### API Costs:
- OpenAI: Pay per use (GPT-4o-mini is very affordable)
- Pexels: Free tier (200 requests/hour)
- Financial Modeling Prep: Check your plan limits
- YouTube: Free (with quotas)

## Security Best Practices

1. **Never commit secrets**:
   - `.env` is in `.gitignore`
   - `youtube_token.json` is in `.gitignore`
   - Use GitHub Secrets for all sensitive data

2. **Rotate tokens regularly**:
   - YouTube tokens: Every 6 months
   - API keys: As needed if compromised

3. **Limit secret access**:
   - Only add secrets that are actually needed
   - Review who has access to the repository

4. **Monitor usage**:
   - Set up billing alerts for API usage
   - Review GitHub Actions usage regularly

## Next Steps

- Customize video settings in `createDynamicVideo.ts`
- Adjust script generation prompts in `generateScript.ts`
- Add more video sources or effects
- Set up notifications (email, Slack, etc.) for workflow results

