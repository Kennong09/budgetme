"""
Custom exceptions and error handling for BudgetMe Prophet Prediction Service
"""
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from enum import Enum
import traceback
from datetime import datetime

class ErrorCode(Enum):
    """Standardized error codes for the prediction service"""
    
    # Authentication & Authorization
    UNAUTHORIZED = "AUTH_001"
    INVALID_TOKEN = "AUTH_002"
    TOKEN_EXPIRED = "AUTH_003"
    INSUFFICIENT_PERMISSIONS = "AUTH_004"
    
    # Usage & Limits
    USAGE_LIMIT_EXCEEDED = "USAGE_001"
    QUOTA_EXHAUSTED = "USAGE_002"
    RATE_LIMIT_EXCEEDED = "USAGE_003"
    
    # Data & Validation
    INSUFFICIENT_DATA = "DATA_001"
    INVALID_TIMEFRAME = "DATA_002"
    DATA_QUALITY_POOR = "DATA_003"
    MISSING_REQUIRED_FIELDS = "DATA_004"
    INVALID_DATE_RANGE = "DATA_005"
    
    # Model & Prediction
    MODEL_TRAINING_FAILED = "MODEL_001"
    PREDICTION_GENERATION_FAILED = "MODEL_002"
    MODEL_ACCURACY_LOW = "MODEL_003"
    FORECASTING_ERROR = "MODEL_004"
    
    # External Services
    DATABASE_CONNECTION_FAILED = "EXT_001"
    SUPABASE_API_ERROR = "EXT_002"
    OPENROUTER_API_ERROR = "EXT_003"
    AI_SERVICE_UNAVAILABLE = "EXT_004"
    
    # System & Infrastructure
    INTERNAL_SERVER_ERROR = "SYS_001"
    SERVICE_UNAVAILABLE = "SYS_002"
    TIMEOUT_ERROR = "SYS_003"
    RESOURCE_EXHAUSTED = "SYS_004"
    CONFIGURATION_ERROR = "SYS_005"

class PredictionServiceException(Exception):
    """Base exception for prediction service"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.user_id = user_id
        self.request_id = request_id
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API response"""
        return {
            "error": {
                "code": self.error_code.value,
                "message": self.message,
                "details": self.details,
                "timestamp": self.timestamp.isoformat() + "Z",
                "request_id": self.request_id
            }
        }

class AuthenticationError(PredictionServiceException):
    """Authentication related errors"""
    
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(
            message,
            ErrorCode.UNAUTHORIZED,
            **kwargs
        )

class UsageLimitError(PredictionServiceException):
    """Usage limit related errors"""
    
    def __init__(
        self,
        current_usage: int,
        max_usage: int,
        reset_date: datetime,
        **kwargs
    ):
        message = f"Usage limit exceeded. Used {current_usage}/{max_usage}. Resets on {reset_date.strftime('%Y-%m-%d')}"
        details = {
            "current_usage": current_usage,
            "max_usage": max_usage,
            "reset_date": reset_date.isoformat() + "Z"
        }
        super().__init__(
            message,
            ErrorCode.USAGE_LIMIT_EXCEEDED,
            details=details,
            **kwargs
        )

class InsufficientDataError(PredictionServiceException):
    """Insufficient data for prediction"""
    
    def __init__(
        self,
        required_points: int,
        available_points: int,
        **kwargs
    ):
        message = f"Insufficient data for prediction. Need at least {required_points} data points, but only {available_points} available"
        details = {
            "required_points": required_points,
            "available_points": available_points
        }
        super().__init__(
            message,
            ErrorCode.INSUFFICIENT_DATA,
            details=details,
            **kwargs
        )

class ModelTrainingError(PredictionServiceException):
    """Model training related errors"""
    
    def __init__(self, model_type: str = "Prophet", **kwargs):
        message = f"{model_type} model training failed"
        details = {"model_type": model_type}
        super().__init__(
            message,
            ErrorCode.MODEL_TRAINING_FAILED,
            details=details,
            **kwargs
        )

class PredictionGenerationError(PredictionServiceException):
    """Prediction generation errors"""
    
    def __init__(self, timeframe: str, **kwargs):
        message = f"Failed to generate predictions for timeframe: {timeframe}"
        details = {"timeframe": timeframe}
        super().__init__(
            message,
            ErrorCode.PREDICTION_GENERATION_FAILED,
            details=details,
            **kwargs
        )

class RateLimitError(PredictionServiceException):
    """Rate limiting errors from external APIs"""
    
    def __init__(
        self,
        service_name: str,
        retry_after: Optional[int] = None,
        **kwargs
    ):
        message = f"Rate limit exceeded for {service_name}"
        if retry_after:
            message += f". Retry after {retry_after} seconds"
        
        details = {
            "service": service_name,
            "retry_after": retry_after,
            "rate_limited": True
        }
        super().__init__(
            message,
            ErrorCode.RATE_LIMIT_EXCEEDED,
            details=details,
            **kwargs
        )

class ExternalServiceError(PredictionServiceException):
    """External service errors"""
    
    def __init__(
        self,
        service_name: str,
        original_error: Optional[Exception] = None,
        **kwargs
    ):
        message = f"External service error: {service_name}"
        details = {
            "service": service_name,
            "original_error": str(original_error) if original_error else None
        }
        super().__init__(
            message,
            ErrorCode.DATABASE_CONNECTION_FAILED if "database" in service_name.lower() 
            else ErrorCode.AI_SERVICE_UNAVAILABLE if "ai" in service_name.lower()
            else ErrorCode.SUPABASE_API_ERROR if "supabase" in service_name.lower()
            else ErrorCode.OPENROUTER_API_ERROR if "openrouter" in service_name.lower()
            else ErrorCode.SERVICE_UNAVAILABLE,
            details=details,
            **kwargs
        )

class ValidationError(PredictionServiceException):
    """Data validation errors"""
    
    def __init__(
        self,
        field: str,
        value: Any,
        expected: str,
        **kwargs
    ):
        message = f"Validation error for field '{field}': expected {expected}, got {value}"
        details = {
            "field": field,
            "value": str(value),
            "expected": expected
        }
        super().__init__(
            message,
            ErrorCode.INVALID_TIMEFRAME if field == "timeframe"
            else ErrorCode.MISSING_REQUIRED_FIELDS if value is None
            else ErrorCode.DATA_QUALITY_POOR,
            details=details,
            **kwargs
        )

def handle_prediction_exception(
    func_name: str,
    exception: Exception,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> PredictionServiceException:
    """Convert generic exceptions to PredictionServiceException"""
    
    if isinstance(exception, PredictionServiceException):
        return exception
    
    # Map common exceptions
    if isinstance(exception, (ConnectionError, TimeoutError)):
        return ExternalServiceError(
            "Database",
            original_error=exception,
            user_id=user_id,
            request_id=request_id
        )
    
    if isinstance(exception, ValueError):
        return ValidationError(
            "unknown",
            str(exception),
            "valid value",
            user_id=user_id,
            request_id=request_id
        )
    
    # Generic internal error
    return PredictionServiceException(
        f"Internal error in {func_name}: {str(exception)}",
        ErrorCode.INTERNAL_SERVER_ERROR,
        details={
            "function": func_name,
            "exception_type": type(exception).__name__,
            "traceback": traceback.format_exc()
        },
        user_id=user_id,
        request_id=request_id
    )

def exception_to_http_exception(exception: PredictionServiceException) -> HTTPException:
    """Convert PredictionServiceException to FastAPI HTTPException"""
    
    # Map error codes to HTTP status codes
    status_code_mapping = {
        ErrorCode.UNAUTHORIZED: status.HTTP_401_UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN: status.HTTP_401_UNAUTHORIZED,
        ErrorCode.TOKEN_EXPIRED: status.HTTP_401_UNAUTHORIZED,
        ErrorCode.INSUFFICIENT_PERMISSIONS: status.HTTP_403_FORBIDDEN,
        
        ErrorCode.USAGE_LIMIT_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
        ErrorCode.QUOTA_EXHAUSTED: status.HTTP_429_TOO_MANY_REQUESTS,
        ErrorCode.RATE_LIMIT_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
        
        ErrorCode.INSUFFICIENT_DATA: status.HTTP_400_BAD_REQUEST,
        ErrorCode.INVALID_TIMEFRAME: status.HTTP_400_BAD_REQUEST,
        ErrorCode.DATA_QUALITY_POOR: status.HTTP_400_BAD_REQUEST,
        ErrorCode.MISSING_REQUIRED_FIELDS: status.HTTP_400_BAD_REQUEST,
        ErrorCode.INVALID_DATE_RANGE: status.HTTP_400_BAD_REQUEST,
        
        ErrorCode.MODEL_TRAINING_FAILED: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.PREDICTION_GENERATION_FAILED: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.MODEL_ACCURACY_LOW: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.FORECASTING_ERROR: status.HTTP_422_UNPROCESSABLE_ENTITY,
        
        ErrorCode.DATABASE_CONNECTION_FAILED: status.HTTP_503_SERVICE_UNAVAILABLE,
        ErrorCode.SUPABASE_API_ERROR: status.HTTP_502_BAD_GATEWAY,
        ErrorCode.OPENROUTER_API_ERROR: status.HTTP_502_BAD_GATEWAY,
        ErrorCode.AI_SERVICE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
        
        ErrorCode.INTERNAL_SERVER_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
        ErrorCode.TIMEOUT_ERROR: status.HTTP_504_GATEWAY_TIMEOUT,
        ErrorCode.RESOURCE_EXHAUSTED: status.HTTP_507_INSUFFICIENT_STORAGE,
        ErrorCode.CONFIGURATION_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    status_code = status_code_mapping.get(
        exception.error_code,
        status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return HTTPException(
        status_code=status_code,
        detail=exception.to_dict()
    )

class ErrorHandler:
    """Centralized error handling for the prediction service"""
    
    @staticmethod
    def handle_route_exception(
        exception: Exception,
        func_name: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> HTTPException:
        """Handle exceptions in route handlers"""
        
        # Convert to PredictionServiceException if needed
        if not isinstance(exception, PredictionServiceException):
            exception = handle_prediction_exception(
                func_name, exception, user_id, request_id
            )
        
        # Log the error
        from .logger import prediction_logger
        prediction_logger.error(
            f"Route error in {func_name}",
            user_id=user_id,
            request_id=request_id,
            error_code=exception.error_code.value,
            exc_info=True
        )
        
        # Convert to HTTP exception
        return exception_to_http_exception(exception)
    
    @staticmethod
    def validate_timeframe(timeframe: str) -> None:
        """Validate timeframe parameter"""
        valid_timeframes = ['months_3', 'months_6', 'year_1']
        if timeframe not in valid_timeframes:
            raise ValidationError(
                "timeframe",
                timeframe,
                f"one of {valid_timeframes}"
            )
    
    @staticmethod
    def validate_data_sufficiency(data_points: int, minimum_required: int = 30) -> None:
        """Validate if there's enough data for prediction"""
        if data_points < minimum_required:
            raise InsufficientDataError(minimum_required, data_points)
    
    @staticmethod
    def check_model_accuracy(accuracy_score: float, minimum_threshold: float = 0.6) -> None:
        """Check if model accuracy meets minimum threshold"""
        if accuracy_score < minimum_threshold:
            raise PredictionServiceException(
                f"Model accuracy too low: {accuracy_score:.2f} < {minimum_threshold}",
                ErrorCode.MODEL_ACCURACY_LOW,
                details={
                    "accuracy_score": accuracy_score,
                    "minimum_threshold": minimum_threshold
                }
            )