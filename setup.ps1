# BudgetMe Prophet AI Integration - Windows Setup Script
# PowerShell script for Windows development environment setup

Param(
    [switch]$SkipChecks,
    [switch]$Quiet
)

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = \"Stop\"

# Colors for output
function Write-Step { 
    param([string]$Message)
    Write-Host \"[STEP] $Message\" -ForegroundColor Blue
}

function Write-Success { 
    param([string]$Message)
    Write-Host \"[SUCCESS] $Message\" -ForegroundColor Green
}

function Write-Warning { 
    param([string]$Message)
    Write-Host \"[WARNING] $Message\" -ForegroundColor Yellow
}

function Write-Error { 
    param([string]$Message)
    Write-Host \"[ERROR] $Message\" -ForegroundColor Red
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Main setup function
function Start-ProphetSetup {
    Write-Host \"==========================================\" -ForegroundColor Blue
    Write-Host \"  BudgetMe Prophet AI Integration Setup  \" -ForegroundColor Blue
    Write-Host \"  Windows PowerShell Version             \" -ForegroundColor Blue
    Write-Host \"==========================================\" -ForegroundColor Blue
    Write-Host

    if (-not $SkipChecks) {
        # Check prerequisites
        Write-Step \"Checking prerequisites...\"
        
        # Check Node.js
        if (-not (Test-Command \"node\")) {
            Write-Error \"Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/\"
            exit 1
        }
        
        $nodeVersion = (node --version) -replace 'v', ''
        $nodeMajor = [int]($nodeVersion.Split('.')[0])
        if ($nodeMajor -lt 16) {
            Write-Error \"Node.js version 16+ required. Current version: $(node --version)\"
            exit 1
        }
        Write-Success \"Node.js $(node --version) detected\"
        
        # Check Python
        if (-not (Test-Command \"python\")) {
            Write-Error \"Python is not installed. Please install Python 3.8+ from https://python.org/\"
            exit 1
        }
        
        $pythonVersion = python --version
        Write-Success \"$pythonVersion detected\"
        
        # Check Git (optional)
        if (Test-Command \"git\") {
            Write-Success \"Git detected\"
        }
        else {
            Write-Warning \"Git is not installed. Some features may not work properly.\"
        }
    }

    # Setup environment files
    Write-Step \"Setting up environment configuration...\"
    
    # Create .env if it doesn't exist
    if (-not (Test-Path \".env\")) {
        if (Test-Path \".env.example\") {
            Copy-Item \".env.example\" \".env\"
            Write-Success \"Created .env from .env.example\"
        }
        else {
            Write-Warning \".env.example not found, creating basic .env\"
            @\"
# BudgetMe Environment Configuration

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# FastAPI Prediction Service
REACT_APP_PREDICTION_API_URL=http://localhost:8000

# OpenRouter API for AI Insights
REACT_APP_OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Prophet Configuration
PROPHET_SEASONALITY_MODE=additive
MAX_PREDICTIONS_PER_MONTH=5
PREDICTION_CACHE_TTL_HOURS=24
\"@ | Out-File -FilePath \".env\" -Encoding UTF8
        }
    }
    else {
        Write-Success \".env file already exists\"
    }
    
    # Setup prediction API environment
    if (-not (Test-Path \"prediction_api\\.env\")) {
        if (Test-Path \"prediction_api\\.env.example\") {
            Copy-Item \"prediction_api\\.env.example\" \"prediction_api\\.env\"
        }
        else {
            Write-Warning \"prediction_api\\.env.example not found, creating basic file\"
            if (-not (Test-Path \"prediction_api\")) {
                New-Item -ItemType Directory -Path \"prediction_api\" | Out-Null
            }
            @\"
# FastAPI Prediction Service Environment
HOST=127.0.0.1
PORT=8000
DEBUG=True

# Copy these from your main .env file
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
\"@ | Out-File -FilePath \"prediction_api\\.env\" -Encoding UTF8
        }
        Write-Success \"Created prediction_api\\.env\"
    }

    # Install frontend dependencies
    Write-Step \"Installing frontend dependencies...\"
    if (Test-Path \"package.json\") {
        if (-not $Quiet) {
            npm install
        }
        else {
            npm install --silent
        }
        Write-Success \"Frontend dependencies installed\"
    }
    else {
        Write-Error \"package.json not found. Are you in the correct directory?\"
        exit 1
    }

    # Setup Python environment
    Write-Step \"Setting up Python environment for prediction service...\"
    
    Push-Location \"prediction_api\"
    
    try {
        # Create virtual environment if it doesn't exist
        if (-not (Test-Path \"venv\")) {
            python -m venv venv
            Write-Success \"Created Python virtual environment\"
        }
        
        # Activate virtual environment
        & \".\\venv\\Scripts\\Activate.ps1\"
        
        # Upgrade pip
        python -m pip install --upgrade pip
        
        # Install Python dependencies
        if (Test-Path \"requirements.txt\") {
            if (-not $Quiet) {
                pip install -r requirements.txt
            }
            else {
                pip install -r requirements.txt --quiet
            }
            Write-Success \"Python dependencies installed\"
        }
        else {
            Write-Error \"requirements.txt not found in prediction_api directory\"
            exit 1
        }
        
        # Verify key packages
        try {
            python -c \"import fastapi, prophet, pandas, supabase\"
            Write-Success \"Key Python packages verified\"
        }
        catch {
            Write-Error \"Some Python packages failed to import\"
            exit 1
        }
    }
    finally {
        Pop-Location
    }

    # Database setup reminder
    Write-Step \"Database setup...\"
    Write-Warning \"Database migration should be run manually:\"
    Write-Host \"  1. Apply prediction tables: npm run prisma:migrate\"
    Write-Host \"  2. Or run SQL directly: Execute sql/create-prediction-tables.sql\"

    # Final verification
    Write-Step \"Verifying setup...\"
    
    $requiredFiles = @(
        \"package.json\",
        \"prediction_api\\main.py\",
        \"prediction_api\\requirements.txt\",
        \"prediction_api\\venv\",
        \".env\",
        \"prediction_api\\.env\"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success \"✓ $file\"
        }
        else {
            Write-Error \"✗ $file (missing)\"
        }
    }

    # Success message
    Write-Host
    Write-Host \"==========================================\" -ForegroundColor Green
    Write-Host \"          Setup Complete! 🎉            \" -ForegroundColor Green
    Write-Host \"==========================================\" -ForegroundColor Green
    Write-Host
    Write-Host \"Next steps:\"
    Write-Host \"1. Configure your .env files with actual API keys:\"
    Write-Host \"   - Supabase URL and keys\"
    Write-Host \"   - OpenRouter API key for AI insights\"
    Write-Host
    Write-Host \"2. Start the development servers:\"
    Write-Host \"   Frontend: npm start\"
    Write-Host \"   Backend:  npm run prediction-api:start\"
    Write-Host \"   Both:     npm run dev:full\"
    Write-Host
    Write-Host \"3. Or use Docker:\"
    Write-Host \"   docker-compose up -d\"
    Write-Host
    Write-Host \"4. Access the application:\"
    Write-Host \"   Frontend: http://localhost:3000\"
    Write-Host \"   API:      http://localhost:8000\"
    Write-Host \"   API Docs: http://localhost:8000/docs\"
    Write-Host
    Write-Warning \"Remember to configure your environment variables before starting!\"
}

# Handle script errors
trap {
    Write-Error \"Setup failed: $($_.Exception.Message)\"
    exit 1
}

# Run setup
Start-ProphetSetup