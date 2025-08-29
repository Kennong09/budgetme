"""
BudgetMe AI Prediction Service - Models Package
Contains Prophet forecasting models and Pydantic data schemas
"""

from .prophet_forecaster import ProphetFinancialForecaster, create_financial_forecaster
from .schemas import (
    # Enums
    TimeframeEnum,
    TransactionTypeEnum,
    TrendEnum,
    SeasonalityModeEnum,
    
    # Request Models
    TransactionData,
    PredictionRequest,
    
    # Response Models
    ProphetPredictionPoint,
    CategoryForecast,
    ModelAccuracy,
    AIInsight,
    UserFinancialProfile,
    PredictionResponse,
    
    # Usage Models
    UsageStatus,
    UsageUpdateRequest,
    
    # Database Models
    PredictionUsageDB,
    PredictionResultDB,
    
    # Error Models
    ErrorResponse,
    ValidationErrorResponse,
    UsageLimitError,
    
    # Configuration Models
    ProphetConfig,
    ServiceConfig,
    
    # Utility Functions
    get_timeframe_days,
    get_forecast_frequency
)

__all__ = [
    # Core Classes
    'ProphetFinancialForecaster',
    'create_financial_forecaster',
    
    # Enums
    'TimeframeEnum',
    'TransactionTypeEnum', 
    'TrendEnum',
    'SeasonalityModeEnum',
    
    # Request Models
    'TransactionData',
    'PredictionRequest',
    
    # Response Models
    'ProphetPredictionPoint',
    'CategoryForecast',
    'ModelAccuracy',
    'AIInsight',
    'UserFinancialProfile',
    'PredictionResponse',
    
    # Usage Models
    'UsageStatus',
    'UsageUpdateRequest',
    
    # Database Models
    'PredictionUsageDB',
    'PredictionResultDB',
    
    # Error Models
    'ErrorResponse',
    'ValidationErrorResponse',
    'UsageLimitError',
    
    # Configuration Models
    'ProphetConfig',
    'ServiceConfig',
    
    # Utilities
    'get_timeframe_days',
    'get_forecast_frequency'
]