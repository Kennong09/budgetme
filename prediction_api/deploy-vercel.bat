@echo off
echo.
echo 🚀 BudgetMe Prediction API - Vercel Deployment
echo ==============================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
) else (
    echo ✅ Vercel CLI found
)

REM Check if we're in the right directory
if not exist "vercel.json" (
    echo ❌ vercel.json not found. Make sure you're in the prediction_api directory.
    pause
    exit /b 1
)

echo ✅ Found vercel.json configuration

REM Check if api/index.py exists
if not exist "api\index.py" (
    echo ❌ api\index.py not found. Please ensure the file exists.
    pause
    exit /b 1
)

echo ✅ Found api\index.py entry point

REM Copy minimal requirements as requirements.txt for deployment
if exist "requirements-minimal.txt" (
    copy requirements-minimal.txt requirements.txt >nul
    echo ✅ Using minimal requirements for deployment
) else (
    echo ❌ requirements-minimal.txt not found
    pause
    exit /b 1
)

echo.
echo 📋 Pre-deployment checklist:
echo    - Vercel CLI installed: ✅
echo    - Configuration files: ✅
echo    - Entry point ready: ✅
echo    - Dependencies ready: ✅
echo.

REM Prompt for environment variables
echo 🔧 Environment Variables Setup
echo Please ensure these environment variables are set in your Vercel dashboard:
echo    - SUPABASE_URL
echo    - SUPABASE_ANON_KEY
echo    - SUPABASE_SERVICE_KEY
echo    - OPENROUTER_API_KEY (optional)
echo    - CORS_ORIGINS
echo.

set /p env_confirm="Have you set up the environment variables? (y/n): "
if /i not "%env_confirm%"=="y" (
    echo Please set up environment variables first and run this script again.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting deployment...
echo.

REM Deploy to Vercel
vercel --prod

echo.
echo ✅ Deployment complete!
echo.
echo 🔍 Next steps:
echo    1. Test your API at the provided URL
echo    2. Check /health endpoint
echo    3. Visit /docs for API documentation
echo    4. Update your frontend configuration with the new API URL
echo.
echo 📚 For troubleshooting, check VERCEL_DEPLOYMENT.md
echo.
pause