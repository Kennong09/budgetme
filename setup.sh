#!/bin/bash

# BudgetMe Prophet AI Integration - Development Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Helper functions
print_step() {
    echo -e \"${BLUE}[STEP]${NC} $1\"
}

print_success() {
    echo -e \"${GREEN}[SUCCESS]${NC} $1\"
}

print_warning() {
    echo -e \"${YELLOW}[WARNING]${NC} $1\"
}

print_error() {
    echo -e \"${RED}[ERROR]${NC} $1\"
}

# Check if command exists
command_exists() {
    command -v \"$1\" >/dev/null 2>&1
}

# Main setup function
setup_budgetme_prophet() {
    echo -e \"${BLUE}==========================================${NC}\"
    echo -e \"${BLUE}  BudgetMe Prophet AI Integration Setup  ${NC}\"
    echo -e \"${BLUE}==========================================${NC}\"
    echo

    # Check prerequisites
    print_step \"Checking prerequisites...\"
    
    # Check Node.js
    if ! command_exists node; then
        print_error \"Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/\"
        exit 1
    fi
    
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ \"$node_version\" -lt 16 ]; then
        print_error \"Node.js version 16+ required. Current version: $(node --version)\"
        exit 1
    fi
    print_success \"Node.js $(node --version) detected\"
    
    # Check Python
    if ! command_exists python3; then
        print_error \"Python 3 is not installed. Please install Python 3.8+ from https://python.org/\"
        exit 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if ! python3 -c \"import sys; exit(0 if sys.version_info >= (3, 8) else 1)\"; then
        print_error \"Python 3.8+ required. Current version: $(python3 --version)\"
        exit 1
    fi
    print_success \"Python $(python3 --version) detected\"
    
    # Check Git
    if ! command_exists git; then
        print_warning \"Git is not installed. Some features may not work properly.\"
    else
        print_success \"Git $(git --version | cut -d' ' -f3) detected\"
    fi

    # Setup environment files
    print_step \"Setting up environment configuration...\"
    
    # Copy example environment files
    if [ ! -f \".env\" ]; then
        if [ -f \".env.example\" ]; then
            cp .env.example .env
            print_success \"Created .env from .env.example\"
        else
            print_warning \".env.example not found, creating basic .env\"
            cat > .env << EOF
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
EOF
        fi
    else
        print_success \".env file already exists\"
    fi
    
    # Setup prediction API environment
    if [ ! -f \"prediction_api/.env\" ]; then
        cp prediction_api/.env.example prediction_api/.env 2>/dev/null || {
            print_warning \"prediction_api/.env.example not found, creating basic file\"
            mkdir -p prediction_api
            cat > prediction_api/.env << EOF
# FastAPI Prediction Service Environment
HOST=127.0.0.1
PORT=8000
DEBUG=True

# Copy these from your main .env file
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
EOF
        }
        print_success \"Created prediction_api/.env\"
    fi

    # Install frontend dependencies
    print_step \"Installing frontend dependencies...\"
    if [ -f \"package.json\" ]; then
        npm install
        print_success \"Frontend dependencies installed\"
    else
        print_error \"package.json not found. Are you in the correct directory?\"
        exit 1
    fi

    # Setup Python virtual environment and install dependencies
    print_step \"Setting up Python environment for prediction service...\"
    
    cd prediction_api
    
    # Create virtual environment if it doesn't exist
    if [ ! -d \"venv\" ]; then
        python3 -m venv venv
        print_success \"Created Python virtual environment\"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python dependencies
    if [ -f \"requirements.txt\" ]; then
        pip install -r requirements.txt
        print_success \"Python dependencies installed\"
    else
        print_error \"requirements.txt not found in prediction_api directory\"
        exit 1
    fi
    
    # Verify key packages
    python -c \"import fastapi, prophet, pandas, supabase\" 2>/dev/null && {
        print_success \"Key Python packages verified\"
    } || {
        print_error \"Some Python packages failed to import\"
        exit 1
    }
    
    cd ..

    # Database setup (optional)
    print_step \"Database setup...\"
    print_warning \"Database migration should be run manually:\"
    echo \"  1. Apply prediction tables: npm run prisma:migrate\"
    echo \"  2. Or run SQL directly: Execute sql/create-prediction-tables.sql\"

    # Final setup verification
    print_step \"Verifying setup...\"
    
    # Check if all required files exist
    required_files=(
        \"package.json\"
        \"prediction_api/main.py\"
        \"prediction_api/requirements.txt\"
        \"prediction_api/venv\"
        \".env\"
        \"prediction_api/.env\"
    )
    
    for file in \"${required_files[@]}\"; do
        if [ -e \"$file\" ]; then
            print_success \"✓ $file\"
        else
            print_error \"✗ $file (missing)\"
        fi
    done

    # Success message
    echo
    echo -e \"${GREEN}==========================================${NC}\"
    echo -e \"${GREEN}          Setup Complete! 🎉            ${NC}\"
    echo -e \"${GREEN}==========================================${NC}\"
    echo
    echo \"Next steps:\"
    echo \"1. Configure your .env files with actual API keys:\"
    echo \"   - Supabase URL and keys\"
    echo \"   - OpenRouter API key for AI insights\"
    echo
    echo \"2. Start the development servers:\"
    echo \"   Frontend: npm start\"
    echo \"   Backend:  npm run prediction-api:start\"
    echo \"   Both:     npm run dev:full\"
    echo
    echo \"3. Or use Docker:\"
    echo \"   docker-compose up -d\"
    echo
    echo \"4. Access the application:\"
    echo \"   Frontend: http://localhost:3000\"
    echo \"   API:      http://localhost:8000\"
    echo \"   API Docs: http://localhost:8000/docs\"
    echo
    print_warning \"Remember to configure your environment variables before starting!\"
}

# Run setup if script is executed directly
if [ \"${BASH_SOURCE[0]}\" == \"${0}\" ]; then
    setup_budgetme_prophet
fi