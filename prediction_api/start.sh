#!/bin/bash
# Make this file executable with: chmod +x start.sh

# Start script for BudgetMe Prediction API on Render.com

# Set default values if environment variables are not set
export PORT=${PORT:-8000}
export HOST=${HOST:-0.0.0.0}
export WORKERS=${WORKERS:-1}

# Create logs directory if it doesn't exist
mkdir -p logs

# Print startup information
echo "Starting BudgetMe Prediction API..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "Workers: $WORKERS"
echo "Python version: $(python --version)"

# Start the application using uvicorn
exec python -m uvicorn main:app \
    --host $HOST \
    --port $PORT \
    --workers $WORKERS \
    --access-log \
    --no-use-colors \
    --log-level info