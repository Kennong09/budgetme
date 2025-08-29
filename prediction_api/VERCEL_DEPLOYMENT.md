# BudgetMe Prediction API - Vercel Deployment Guide

## 🚀 Deploy to Vercel

This guide will help you deploy the BudgetMe AI Prediction Service to Vercel using serverless functions.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a Git repository
3. **Environment Variables**: Prepare your Supabase credentials

### Step 1: Prepare Your Repository

Ensure these files are in your `prediction_api` directory:
- `vercel.json` - Vercel configuration
- `api/index.py` - Serverless entry point
- `requirements-minimal.txt` - Lightweight dependencies

### Step 2: Deploy Using Vercel CLI

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Navigate to prediction_api directory**:
```bash
cd prediction_api
```

4. **Deploy**:
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (for new deployment)
- What's your project's name? **budgetme-prediction-api**
- In which directory is your code located? **./** (current directory)

### Step 3: Deploy Using Vercel Dashboard

1. **Connect GitHub**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**:
   - **Root Directory**: Set to `prediction_api`
   - **Framework Preset**: Other
   - **Build Command**: Leave empty (auto-detected)
   - **Output Directory**: Leave empty
   - **Install Command**: `pip install -r requirements-minimal.txt`

3. **Set Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   OPENROUTER_API_KEY=your_openrouter_api_key (optional)
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   ```

4. **Deploy**: Click "Deploy"

### Step 4: Verify Deployment

After deployment, test these endpoints:

1. **Health Check**:
```bash
curl https://your-app.vercel.app/health
```

2. **Root Endpoint**:
```bash
curl https://your-app.vercel.app/
```

3. **API Documentation**:
Visit: `https://your-app.vercel.app/docs`

### Important Notes

#### 🚨 Limitations

1. **Prophet Library**: The Facebook Prophet library is quite large and may exceed Vercel's serverless function size limits. The initial deployment uses a simplified version without Prophet.

2. **Cold Starts**: Serverless functions may have cold start delays for the first request.

3. **Execution Time**: Vercel has a 30-second execution limit for serverless functions (configurable in `vercel.json`).

#### 🔧 Optimizations

1. **Lightweight Version**: The `api/index.py` provides a lightweight version without heavy ML dependencies.

2. **Caching**: Consider implementing caching strategies for predictions.

3. **Background Processing**: For complex predictions, consider using background job queues.

#### 📈 Scaling Options

If you encounter limitations with Vercel serverless functions:

1. **Vercel Edge Functions**: For lighter workloads
2. **External ML API**: Move Prophet processing to a dedicated service
3. **Hybrid Approach**: Use Vercel for API routing and external service for ML

### Step 5: Configure Frontend

Update your frontend to use the new Vercel API URL:

```typescript
// In your frontend configuration
const PREDICTION_API_URL = 'https://your-prediction-api.vercel.app';
```

### Troubleshooting

#### Common Issues

1. **Build Failures**:
   - Check `requirements-minimal.txt` for compatibility
   - Ensure Python version is 3.11

2. **Function Size Limits**:
   - Use the minimal requirements file
   - Remove unused dependencies

3. **CORS Errors**:
   - Set `CORS_ORIGINS` environment variable
   - Include your frontend domain

4. **Environment Variables**:
   - Verify all required env vars are set in Vercel dashboard
   - Check variable names match exactly

#### Logs and Monitoring

- **Function Logs**: Available in Vercel dashboard under "Functions" tab
- **Real-time Logs**: Use `vercel logs` command
- **Analytics**: Available in Vercel dashboard

### Production Considerations

1. **Custom Domain**: Configure a custom domain in Vercel dashboard
2. **Monitoring**: Set up monitoring and alerting
3. **Rate Limiting**: Implement API rate limiting
4. **Security**: Use proper authentication tokens

### Alternative: Full Featured Deployment

For full Prophet functionality, consider:
1. **Railway**: Better support for ML libraries
2. **Render**: Optimized for Python ML applications
3. **DigitalOcean App Platform**: Supports larger applications

---

## 🆘 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test with the minimal API first
4. Consider alternative deployment platforms for ML-heavy workloads

**Next Steps**: Once basic deployment works, you can gradually add more features and dependencies.