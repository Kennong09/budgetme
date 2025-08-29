from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import random

app = FastAPI(
    title="BudgetMe Prediction API",
    description="Lightweight prediction service for BudgetMe",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "BudgetMe Prediction API",
        "status": "healthy",
        "platform": "Vercel",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "prediction-api",
        "platform": "Vercel",
        "timestamp": datetime.now().isoformat()
    }

# Vercel handler
handler = app