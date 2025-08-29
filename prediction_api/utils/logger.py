"""
Advanced logging configuration for BudgetMe Prophet Prediction Service
"""
import logging
import sys
import json
from datetime import datetime
from pathlib import Path
import traceback
from typing import Any, Dict, Optional
from functools import wraps
import os

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Create base log entry
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields if they exist
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = getattr(record, 'user_id', None)
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = getattr(record, 'request_id', None)
        if hasattr(record, 'prediction_type'):
            log_entry['prediction_type'] = getattr(record, 'prediction_type', None)
        if hasattr(record, 'timeframe'):
            log_entry['timeframe'] = getattr(record, 'timeframe', None)
        if hasattr(record, 'execution_time'):
            log_entry['execution_time_ms'] = getattr(record, 'execution_time', None)
        
        # Add exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry, default=str)

class PredictionLogger:
    """Centralized logging for prediction service"""
    
    def __init__(self):
        self.logger = logging.getLogger('prediction_service')
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup logging configuration"""
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Set logging level
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        self.logger.setLevel(getattr(logging, log_level))
        
        # Create logs directory
        logs_dir = Path('logs')
        logs_dir.mkdir(exist_ok=True)
        
        # Console handler with JSON formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(JSONFormatter())
        console_handler.setLevel(logging.INFO)
        
        # File handler for all logs
        file_handler = logging.FileHandler(
            logs_dir / f'prediction_service_{datetime.now().strftime("%Y%m%d")}.log'
        )
        file_handler.setFormatter(JSONFormatter())
        file_handler.setLevel(logging.DEBUG)
        
        # Error file handler
        error_handler = logging.FileHandler(
            logs_dir / f'prediction_errors_{datetime.now().strftime("%Y%m%d")}.log'
        )
        error_handler.setFormatter(JSONFormatter())
        error_handler.setLevel(logging.ERROR)
        
        # Add handlers
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(error_handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def info(self, message: str, **kwargs):
        """Log info message with extra context"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with extra context"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with extra context"""
        self.logger.error(message, extra=kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with extra context"""
        self.logger.debug(message, extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message with extra context"""
        self.logger.critical(message, extra=kwargs)
    
    def log_prediction_request(self, user_id: str, timeframe: str, request_id: str):
        """Log prediction request"""
        self.info(
            "Prediction request received",
            user_id=user_id,
            timeframe=timeframe,
            request_id=request_id,
            prediction_type="prophet_forecast"
        )
    
    def log_prediction_success(self, user_id: str, timeframe: str, request_id: str, 
                             execution_time: float, prediction_count: int):
        """Log successful prediction"""
        self.info(
            "Prediction completed successfully",
            user_id=user_id,
            timeframe=timeframe,
            request_id=request_id,
            execution_time=execution_time,
            prediction_count=prediction_count
        )
    
    def log_prediction_error(self, user_id: str, timeframe: str, request_id: str, 
                           error: Exception, execution_time: Optional[float] = None):
        """Log prediction error"""
        self.error(
            f"Prediction failed: {str(error)}",
            user_id=user_id,
            timeframe=timeframe,
            request_id=request_id,
            execution_time=execution_time,
            exc_info=True
        )
    
    def log_usage_check(self, user_id: str, current_usage: int, max_usage: int, 
                       request_id: str):
        """Log usage limit check"""
        self.debug(
            "Usage limit checked",
            user_id=user_id,
            current_usage=current_usage,
            max_usage=max_usage,
            request_id=request_id
        )
    
    def log_cache_hit(self, user_id: str, timeframe: str, request_id: str):
        """Log cache hit"""
        self.debug(
            "Prediction served from cache",
            user_id=user_id,
            timeframe=timeframe,
            request_id=request_id
        )
    
    def log_ai_insights_request(self, user_id: str, model: str, request_id: str):
        """Log AI insights request"""
        self.info(
            "AI insights request initiated",
            user_id=user_id,
            model=model,
            request_id=request_id
        )
    
    def log_ai_insights_success(self, user_id: str, model: str, request_id: str, 
                              execution_time: float, token_usage: Dict[str, int]):
        """Log successful AI insights generation"""
        self.info(
            "AI insights generated successfully",
            user_id=user_id,
            model=model,
            request_id=request_id,
            execution_time=execution_time,
            **token_usage
        )

# Global logger instance
prediction_logger = PredictionLogger()

def log_execution_time(func):
    """Decorator to log function execution time"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        request_id = kwargs.get('request_id', 'unknown')
        
        try:
            result = await func(*args, **kwargs)
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            prediction_logger.debug(
                f"Function {func.__name__} completed",
                execution_time=execution_time,
                request_id=request_id
            )
            
            return result
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            prediction_logger.error(
                f"Function {func.__name__} failed",
                execution_time=execution_time,
                request_id=request_id,
                exc_info=True
            )
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        request_id = kwargs.get('request_id', 'unknown')
        
        try:
            result = func(*args, **kwargs)
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            prediction_logger.debug(
                f"Function {func.__name__} completed",
                execution_time=execution_time,
                request_id=request_id
            )
            
            return result
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            prediction_logger.error(
                f"Function {func.__name__} failed",
                execution_time=execution_time,
                request_id=request_id,
                exc_info=True
            )
            raise
    
    # Return appropriate wrapper based on function type
    if hasattr(func, '__call__'):
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return func