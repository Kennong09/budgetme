#!/bin/bash

# BudgetMe Prediction API - Vercel Deployment Script

echo "🚀 BudgetMe Prediction API - Vercel Deployment"
echo "=============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI found"
fi

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found. Make sure you're in the prediction_api directory."
    exit 1
fi

echo "✅ Found vercel.json configuration"

# Check if api/index.py exists
if [ ! -f "api/index.py" ]; then
    echo "❌ api/index.py not found. Please ensure the file exists."
    exit 1
fi

echo "✅ Found api/index.py entry point"

# Copy minimal requirements as requirements.txt for deployment
if [ -f "requirements-minimal.txt" ]; then
    cp requirements-minimal.txt requirements.txt
    echo "✅ Using minimal requirements for deployment"
else
    echo "❌ requirements-minimal.txt not found"
    exit 1
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "   - Vercel CLI installed: ✅"
echo "   - Configuration files: ✅"
echo "   - Entry point ready: ✅"
echo "   - Dependencies ready: ✅"
echo ""

# Prompt for environment variables
echo "🔧 Environment Variables Setup"
echo "Please ensure these environment variables are set in your Vercel dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"  
echo "   - SUPABASE_SERVICE_KEY"
echo "   - OPENROUTER_API_KEY (optional)"
echo "   - CORS_ORIGINS"
echo ""

read -p "Have you set up the environment variables? (y/n): " env_confirm
if [ "$env_confirm" != "y" ] && [ "$env_confirm" != "Y" ]; then
    echo "Please set up environment variables first and run this script again."
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Next steps:"
echo "   1. Test your API at the provided URL"
echo "   2. Check /health endpoint"
echo "   3. Visit /docs for API documentation"
echo "   4. Update your frontend configuration with the new API URL"
echo ""
echo "📚 For troubleshooting, check VERCEL_DEPLOYMENT.md"