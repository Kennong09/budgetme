# 🚀 Quick Vercel Deployment Guide

## ✅ Deployment Status: SUCCESSFUL!

**Your API is now live at**: https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app

⚠️ **Note**: Your deployment may have authentication protection enabled. If you see an authentication page, you'll need to:
1. **Disable Protection**: Go to your Vercel dashboard → Project Settings → Deployment Protection → Disable
2. **Or Access via Vercel Dashboard**: Click the deployment URL from your Vercel dashboard

## Option 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from prediction_api directory
```bash
cd prediction_api
vercel
```

Follow prompts:
- **Set up and deploy?** → Y
- **Link to existing project?** → N
- **Project name** → budgetme-prediction-api
- **Directory** → ./

### Step 4: Set Environment Variables
After deployment, go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Step 5: Redeploy with Environment Variables
```bash
vercel --prod
```

## Option 2: Deploy via Vercel Dashboard

1. **Go to** [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. **Set Root Directory** to `prediction_api`
4. **Add Environment Variables** (see Step 4 above)
5. **Deploy**

## 🔒 Disable Deployment Protection (If Needed)

If you encounter an authentication page:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project: **prediction-api**
3. Go to **Settings** → **Deployment Protection**
4. **Disable** protection for easier testing
5. **Alternative**: Set specific bypass methods if needed

## Test Your Deployment

Once protection is disabled (or you're authenticated), visit these URLs:
- `https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app/` - Root endpoint
- `https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app/health` - Health check
- `https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app/docs` - API documentation
- `https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app/api/v1/predictions/test` - Test endpoint

## Files Created for Vercel

- `vercel.json` - Vercel configuration
- `api/index.py` - Serverless entry point
- `requirements-minimal.txt` - Lightweight dependencies
- `.vercelignore` - Files to exclude from deployment

## ✅ Next Steps

1. **Disable deployment protection** for easier access
2. **Set environment variables** for Supabase integration
3. **Update your frontend** to use the new API URL:
   ```javascript
   const PREDICTION_API_URL = 'https://prediction-1bt6s1f6h-kcprsnlcc-personal-projects.vercel.app';
   ```
4. **Test all endpoints** to ensure functionality

## Need Help?

- Check `VERCEL_DEPLOYMENT.md` for detailed guide
- Use `deploy-vercel.bat` (Windows) or `deploy-vercel.sh` (Linux/Mac)
- Visit [vercel.com/docs](https://vercel.com/docs) for Vercel documentation