# Deploy PitchIQ Backend to Render

## Prerequisites
- GitHub account with PitchIQ repo pushed
- Render account (free tier: https://render.com)
- API keys ready (OpenAI, Deepgram, Cartesia, etc.)

## Step 1: Push Code to GitHub

```bash
cd c:/Users/cason/PitchIQ
git add -A
git commit -m "Prepare backend for Render deployment"
git push origin main
```

## Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **PitchIQ** repository

## Step 3: Configure Service

**Basic Settings:**
- **Name:** `pitchiq-backend`
- **Region:** Oregon (or closest to you)
- **Branch:** `main`
- **Root Directory:** (leave blank)
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn wsgi:app`

**Plan:**
- Select **Free** (0/mo)

## Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** for each:

### Required Variables:
```
FLASK_CONFIG=production
SECRET_KEY=<click "Generate Value">
```

### API Keys (get from your .env file):
```
OPENAI_API_KEY=<your-key>
DEEPGRAM_API_KEY=<your-key>
CARTESIA_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
```

### AWS (if using):
```
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-key>
AWS_REGION=us-east-1
```

## Step 5: Add PostgreSQL Database (Optional but Recommended)

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. **Name:** `pitchiq-db`
3. **Database:** `pitchiq`
4. **User:** `pitchiq`
5. **Region:** Same as web service
6. **Plan:** Free
7. Click **"Create Database"**

8. Go back to your **Web Service** settings
9. Add environment variable:
   ```
   DATABASE_URL=<copy from PostgreSQL internal connection string>
   ```

## Step 6: Deploy

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Once deployed, you'll see: **"Your service is live at https://pitchiq-backend.onrender.com"**

## Step 7: Update Frontend

Copy your Render URL (e.g., `https://pitchiq-backend.onrender.com`)

Update these files:

### File 1: `app/frontend/netlify.toml`
```toml
[build.environment]
  NODE_VERSION = "18"
  VITE_API_BASE_URL = "https://pitchiq-backend.onrender.com"
```

### File 2: `netlify.toml` (root)
```toml
[build.environment]
  NODE_VERSION = "22"
  VITE_API_BASE_URL = "https://pitchiq-backend.onrender.com"
```

Then redeploy frontend:
```bash
cd app/frontend
npm run build
netlify deploy --prod --dir=dist
```

## Step 8: Test Signup

1. Go to https://pitchiq.ca/signup
2. Open DevTools console
3. Look for: `🔧 API Base URL: https://pitchiq-backend.onrender.com`
4. Try signing up
5. Should work! ✅

## Troubleshooting

### Build fails
- Check build logs in Render dashboard
- Verify requirements.txt has all dependencies
- Check Python version compatibility

### Service crashes on startup
- Check deploy logs for errors
- Verify DATABASE_URL if using PostgreSQL
- Check SECRET_KEY is set

### CORS errors
- Backend CORS already configured for pitchiq.ca
- Check browser Network tab for specific errors

### Database migrations
SSH into Render service or use Render Shell:
```bash
flask db upgrade
```

## Notes

- **Free tier**: Service sleeps after 15 min inactivity (first request takes ~30s)
- **Upgrade**: $7/mo keeps service always on
- **Logs**: View real-time logs in Render dashboard
- **Environment vars**: Can update anytime without redeploying

## Monitoring

Render dashboard shows:
- Deploy status
- Service health
- CPU/memory usage
- Request logs
- Error logs
