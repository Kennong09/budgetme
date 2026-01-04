"""
Data models and types for the BudgetMe AI Prediction Service
Uses Pydantic for data validation and serialization
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, date
from enum import Enum

class TimeframeEnum(str, Enum):
    """Supported forecast timeframes"""
    MONTHS_3 = "months_3"
    MONTHS_6 = "months_6" 
    YEAR_1 = "year_1"

class TransactionTypeEnum(str, Enum):
    """Transaction types"""
    INCOME = "income"
    EXPENSE = "expense"

class TrendEnum(str, Enum):
    """Trend directions"""
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"

class SeasonalityModeEnum(str, Enum):
    """Prophet seasonality modes"""
    ADDITIVE = "additive"
    MULTIPLICATIVE = "multiplicative"

# =====================================================
# Request Models
# =====================================================

class TransactionData(BaseModel):
    """Individual transaction data"""
    date: Union[datetime, str]
    amount: float = Field(..., gt=0, description="Transaction amount (must be positive)")
    type: TransactionTypeEnum
    category: Optional[str] = None
    description: Optional[str] = None
    
    @validator('date', pre=True)
    def parse_date(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                try:
                    return datetime.strptime(v, '%Y-%m-%d')
                except ValueError:
                    raise ValueError(f"Invalid date format: {v}")
        return v

class PredictionRequest(BaseModel):
    """Request for generating predictions"""
    user_id: str = Field(..., description="User identifier")
    transaction_data: List[TransactionData] = Field(..., description="At least 7 transactions required")
    timeframe: TimeframeEnum = Field(default=TimeframeEnum.MONTHS_3, description="Prediction timeframe")
    seasonality_mode: SeasonalityModeEnum = Field(default=SeasonalityModeEnum.ADDITIVE, description="Prophet seasonality mode")
    include_categories: bool = Field(default=True, description="Include category-specific forecasts")
    include_insights: bool = Field(default=True, description="Include AI-generated insights")
    
    @validator('transaction_data')
    def validate_transaction_data(cls, v):
        if len(v) < 7:
            raise ValueError("At least 7 transactions are required for meaningful predictions")
        
        # Check date range
        dates = [t.date for t in v]
        min_date = min(dates)
        max_date = max(dates)
        date_range = (max_date - min_date).days
        
        if date_range < 7:
            raise ValueError("Transaction data must span at least 7 days")
            
        return v

# =====================================================
# Response Models
# =====================================================

class ProphetPredictionPoint(BaseModel):
    """Individual prediction data point"""
    date: datetime
    predicted: float = Field(..., description="Predicted value")
    upper: float = Field(..., description="Upper confidence bound")
    lower: float = Field(..., description="Lower confidence bound")
    trend: float = Field(..., description="Trend component")
    seasonal: Optional[float] = Field(None, description="Seasonal component")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")

class CategoryForecast(BaseModel):
    """Category-specific forecast data"""
    category: str
    historical_average: float
    predicted_average: float
    confidence: float = Field(..., ge=0, le=1)
    trend: TrendEnum
    data_points: int
    forecast_data: Optional[List[Dict[str, Any]]] = None

class ModelAccuracy(BaseModel):
    """Model performance metrics"""
    mae: float = Field(..., description="Mean Absolute Error")
    mape: float = Field(..., description="Mean Absolute Percentage Error") 
    rmse: float = Field(..., description="Root Mean Square Error")
    data_points: int = Field(..., description="Number of data points used for training")

class AIInsight(BaseModel):
    """AI-generated financial insight"""
    title: str
    description: str
    category: str
    confidence: float = Field(..., ge=0, le=1)
    recommendation: Optional[str] = None

class UserFinancialProfile(BaseModel):
    """User's financial profile summary"""
    avg_monthly_income: float
    avg_monthly_expenses: float
    savings_rate: float = Field(..., ge=-1, le=1, description="Savings rate as percentage (-1 to 1)")
    spending_categories: List[str]
    transaction_count: int

class MonthlyPrediction(BaseModel):
    """Monthly aggregated prediction data point"""
    month: str = Field(..., description="Month in YYYY-MM format")
    predicted: float = Field(..., description="Predicted monthly total")
    upper: float = Field(..., description="Upper confidence bound")
    lower: float = Field(..., description="Lower confidence bound")
    trend: float = Field(..., description="Trend component")
    seasonal: float = Field(..., description="Seasonal component")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    data_points: int = Field(..., description="Number of daily points aggregated")

class PredictionResponse(BaseModel):
    """Complete prediction response"""
    user_id: str
    timeframe: TimeframeEnum
    generated_at: datetime
    expires_at: datetime
    
    # Prediction data
    predictions: List[ProphetPredictionPoint]
    monthly_predictions: Optional[List[MonthlyPrediction]] = Field(None, description="Monthly aggregated predictions")
    aggregation_method: Optional[str] = Field(None, description="Aggregation method used (daily or monthly)")
    category_forecasts: Dict[str, CategoryForecast]
    
    # Model information
    model_accuracy: ModelAccuracy
    confidence_score: float = Field(..., ge=0, le=1)
    
    # User context
    user_profile: UserFinancialProfile
    
    # AI insights
    insights: List[AIInsight]
    
    # Usage information
    usage_count: int
    max_usage: int
    reset_date: datetime

# =====================================================
# Usage Tracking Models
# =====================================================

class UsageStatus(BaseModel):
    """Current usage status for a user"""
    user_id: str
    current_usage: int
    max_usage: int
    reset_date: datetime
    exceeded: bool
    remaining: int

class UsageUpdateRequest(BaseModel):
    """Request to update usage count"""
    user_id: str
    increment_by: int = Field(default=1, ge=1, description="Amount to increment usage by")

# =====================================================
# Database Models
# =====================================================

class PredictionUsageDB(BaseModel):
    """Database model for prediction usage tracking"""
    id: str
    user_id: str
    usage_count: int
    max_usage: int
    reset_date: datetime
    created_at: datetime
    updated_at: datetime

class PredictionResultDB(BaseModel):
    """Database model for cached prediction results"""
    id: str
    user_id: str
    prediction_data: Dict[str, Any]
    ai_insights: Optional[Dict[str, Any]]
    timeframe: str
    confidence_score: Optional[float]
    model_accuracy: Optional[Dict[str, Any]]
    generated_at: datetime
    expires_at: datetime

# =====================================================
# Error Models
# =====================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: bool = True
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    error: bool = True
    detail: str = "Validation error"
    validation_errors: List[Dict[str, Any]]
    timestamp: datetime = Field(default_factory=datetime.now)

class UsageLimitError(BaseModel):
    """Usage limit exceeded error"""
    error: bool = True
    detail: str = "Usage limit exceeded"
    current_usage: int
    max_usage: int
    reset_date: datetime
    timestamp: datetime = Field(default_factory=datetime.now)

# =====================================================
# Configuration Models
# =====================================================

class ProphetConfig(BaseModel):
    """Prophet model configuration"""
    seasonality_mode: SeasonalityModeEnum = SeasonalityModeEnum.ADDITIVE
    yearly_seasonality: bool = True
    weekly_seasonality: bool = False
    daily_seasonality: bool = False
    changepoint_prior_scale: float = Field(default=0.05, gt=0, le=1)
    seasonality_prior_scale: float = Field(default=10.0, gt=0)
    interval_width: float = Field(default=0.80, gt=0, le=1)

class ServiceConfig(BaseModel):
    """Service configuration"""
    max_predictions_per_month: int = Field(default=5, ge=1)
    prediction_cache_ttl_hours: int = Field(default=24, ge=1)
    min_transaction_count: int = Field(default=7, ge=3)
    max_forecast_days: int = Field(default=365, ge=1)

# =====================================================
# Utility Functions
# =====================================================

def get_timeframe_days(timeframe: TimeframeEnum) -> int:
    """Get number of days for a given timeframe"""
    timeframe_mapping = {
        TimeframeEnum.MONTHS_3: 90,
        TimeframeEnum.MONTHS_6: 180,
        TimeframeEnum.YEAR_1: 365
    }
    return timeframe_mapping.get(timeframe, 90)

def get_forecast_frequency(timeframe: TimeframeEnum) -> str:
    """Get appropriate forecast frequency for timeframe"""
    frequency_mapping = {
        TimeframeEnum.MONTHS_3: 'D',  # Daily for 3 months
        TimeframeEnum.MONTHS_6: 'W',  # Weekly for 6 months
        TimeframeEnum.YEAR_1: 'M'     # Monthly for 1 year
    }
    return frequency_mapping.get(timeframe, 'D')