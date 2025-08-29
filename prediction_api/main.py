"""
FastAPI backend service for BudgetMe AI Predictions using Facebook Prophet
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from typing import Optional, List
import os
from dotenv import load_dotenv

# Import route modules
from routes.predictions import get_predictions_router
from routes.admin import get_admin_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="BudgetMe AI Prediction Service",
    description="Facebook Prophet-based financial forecasting API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(get_predictions_router())
app.include_router(get_admin_router())

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "BudgetMe AI Prediction Service",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test Prophet import
        from prophet import Prophet
        prophet_available = True
    except ImportError:
        prophet_available = False
    
    try:
        # Test database connection
        from services.usage_service import create_usage_service
        usage_service = create_usage_service()
        await usage_service.get_usage_statistics()
        db_connected = True
    except Exception:
        db_connected = False
    
    return {
        "status": "healthy" if prophet_available and db_connected else "degraded",
        "service": "prediction-api",
        "prophet_available": prophet_available,
        "database_connected": db_connected,
        "version": "1.0.0",
        "endpoints": {
            "predictions": "/api/v1/predictions",
            "admin": "/api/v1/admin",
            "docs": "/docs"
        }
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": True}
    )

# Vercel serverless function handler
handler = app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")  # Changed default to 0.0.0.0 for Render.com
    
    logger.info(f"Starting FastAPI server on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disabled reload for production
        log_level="info"
    )