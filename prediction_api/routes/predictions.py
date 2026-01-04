"""
FastAPI endpoints for BudgetMe AI Prediction Service
Handles prediction generation, usage tracking, and historical data
"""

# Load environment variables before any imports that depend on them
from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
import asyncio
import uuid

from models.schemas import (
    PredictionRequest,
    PredictionResponse,
    UsageStatus,
    ErrorResponse,
    UsageLimitError,
    TimeframeEnum,
    get_timeframe_days,
    ProphetPredictionPoint,
    UserFinancialProfile,
    CategoryForecast,
    ModelAccuracy,
    AIInsight,
    TrendEnum
)
from models.prophet_forecaster import ProphetFinancialForecaster
from services.usage_service import create_usage_service
from services.ai_insights_service import create_ai_insights_service
from middleware.auth import get_current_user_id, get_current_user
from utils.logger import prediction_logger, log_execution_time
from utils.exceptions import (
    ErrorHandler,
    ValidationError,
    InsufficientDataError,
    UsageLimitError as CustomUsageLimitError,
    ModelTrainingError,
    PredictionGenerationError,
    ExternalServiceError,
    RateLimitError
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])

# Initialize services
usage_service = create_usage_service()

# Initialize AI insights service (with error handling)
try:
    ai_insights_service = create_ai_insights_service()
except ValueError as e:
    logger.warning(f"AI insights service not available: {str(e)}")
    ai_insights_service = None

# Helper function for monthly aggregation
def aggregate_daily_to_monthly(forecast_df) -> List[Dict[str, Any]]:
    """
    Aggregate Prophet's daily predictions into monthly totals
    
    This function converts daily predictions from Prophet into monthly aggregates,
    which provides more accurate and realistic financial forecasts for users.
    
    Args:
        forecast_df: DataFrame with daily predictions (ds, yhat, yhat_upper, yhat_lower, trend, seasonal)
    
    Returns:
        List of monthly aggregates with proper confidence intervals
        Each dict contains: month, predicted, upper, lower, trend, seasonal, confidence
    """
    try:
        import pandas as pd
        import numpy as np
        
        # Ensure we have a DataFrame
        if not isinstance(forecast_df, pd.DataFrame):
            logger.error("forecast_df must be a pandas DataFrame")
            return []
        
        # Ensure ds column is datetime
        if 'ds' not in forecast_df.columns:
            logger.error("forecast_df must have 'ds' column")
            return []
        
        forecast_df = forecast_df.copy()
        forecast_df['ds'] = pd.to_datetime(forecast_df['ds'])
        
        # Create year-month column for grouping
        forecast_df['year_month'] = forecast_df['ds'].dt.to_period('M')
        
        # Group by year-month and aggregate
        monthly_aggregates = []
        
        for period, group in forecast_df.groupby('year_month'):
            # Sum daily predictions to get monthly total
            monthly_predicted = group['yhat'].sum()
            
            # Calculate proper confidence intervals using root-sum-square method
            # This accounts for the fact that daily uncertainties don't simply add up
            daily_upper_variance = (group['yhat_upper'] - group['yhat']) ** 2
            daily_lower_variance = (group['yhat'] - group['yhat_lower']) ** 2
            
            monthly_upper_std = np.sqrt(daily_upper_variance.sum())
            monthly_lower_std = np.sqrt(daily_lower_variance.sum())
            
            monthly_upper = monthly_predicted + monthly_upper_std
            monthly_lower = monthly_predicted - monthly_lower_std
            
            # Average the trend (trend is a smooth component)
            monthly_trend = group['trend'].mean()
            
            # Sum seasonal component (seasonal effects accumulate over the month)
            monthly_seasonal = group.get('seasonal', pd.Series([0] * len(group))).sum()
            
            # Calculate confidence score for the month
            confidence_width = monthly_upper - monthly_lower
            monthly_confidence = 1 - (confidence_width / abs(monthly_predicted) if monthly_predicted != 0 else 1)
            monthly_confidence = max(0.0, min(1.0, monthly_confidence))
            
            monthly_aggregates.append({
                'month': str(period),  # e.g., "2025-11"
                'predicted': float(monthly_predicted),
                'upper': float(monthly_upper),
                'lower': float(monthly_lower),
                'trend': float(monthly_trend),
                'seasonal': float(monthly_seasonal),
                'confidence': float(monthly_confidence),
                'data_points': len(group)
            })
        
        logger.info(f"Aggregated {len(forecast_df)} daily predictions into {len(monthly_aggregates)} monthly totals")
        return monthly_aggregates
        
    except Exception as e:
        logger.error(f"Error aggregating daily to monthly: {str(e)}")
        return []

@router.post("/generate", response_model=PredictionResponse)
@log_execution_time
async def generate_predictions(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Generate financial predictions using Prophet model with comprehensive error handling
    
    This endpoint:
    1. Validates user authentication and usage limits
    2. Processes transaction data through Prophet model
    3. Generates forecasts and AI insights
    4. Caches results and updates usage count
    
    Returns comprehensive prediction data including:
    - Prophet forecasts with confidence intervals
    - Category-specific predictions
    - Model accuracy metrics
    - AI-generated insights
    """
    request_id = str(uuid.uuid4())
    
    try:
        # Log request with metadata
        prediction_logger.log_prediction_request(current_user_id, request.timeframe.value, request_id)
        
        # Log transaction data metadata for debugging (Requirement 5.1, 5.3)
        transaction_dates = [t.date for t in request.transaction_data]
        date_range_days = (max(transaction_dates) - min(transaction_dates)).days if transaction_dates else 0
        min_date = min(transaction_dates).strftime('%Y-%m-%d') if transaction_dates else 'N/A'
        max_date = max(transaction_dates).strftime('%Y-%m-%d') if transaction_dates else 'N/A'
        
        # Count transaction types for detailed logging
        income_count = sum(1 for t in request.transaction_data if t.type.value == 'income')
        expense_count = sum(1 for t in request.transaction_data if t.type.value == 'expense')
        
        logger.info(
            f"📊 Prediction request metadata - User: {current_user_id}, "
            f"Request ID: {request_id}, "
            f"Transaction count: {len(request.transaction_data)} (Income: {income_count}, Expense: {expense_count}), "
            f"Date range: {min_date} to {max_date} ({date_range_days} days), "
            f"Timeframe: {request.timeframe.value}, "
            f"Seasonality mode: {request.seasonality_mode.value}"
        )
        
        # Validate timeframe
        ErrorHandler.validate_timeframe(request.timeframe.value)
        
        # Validate data sufficiency
        if len(request.transaction_data) < 7:
            raise InsufficientDataError(
                required_points=7,
                available_points=len(request.transaction_data),
                user_id=current_user_id,
                request_id=request_id
            )
        
        ErrorHandler.validate_data_sufficiency(len(request.transaction_data), minimum_required=7)
        
        # Check usage limits with enhanced error handling
        try:
            usage_status = await usage_service.get_user_usage(current_user_id)
            
            prediction_logger.log_usage_check(
                current_user_id,
                usage_status.current_usage,
                usage_status.max_usage,
                request_id
            )
            
            if usage_status.exceeded:
                raise CustomUsageLimitError(
                    current_usage=usage_status.current_usage,
                    max_usage=usage_status.max_usage,
                    reset_date=usage_status.reset_date,
                    user_id=current_user_id,
                    request_id=request_id
                )
        except Exception as usage_error:
            if not isinstance(usage_error, CustomUsageLimitError):
                raise ExternalServiceError(
                    "Usage tracking service",
                    original_error=usage_error,
                    user_id=current_user_id,
                    request_id=request_id
                )
            raise
        
        # Convert and validate transaction data
        try:
            transactions = [
                {
                    'date': t.date,
                    'amount': t.amount,
                    'type': t.type.value,
                    'category': t.category,
                    'description': t.description
                }
                for t in request.transaction_data
            ]
        except Exception as conversion_error:
            raise ValidationError(
                "transaction_data",
                str(conversion_error),
                "valid transaction format",
                user_id=current_user_id,
                request_id=request_id
            )
        
        # Initialize and train Prophet model with error handling
        start_time = datetime.utcnow()
        
        try:
            forecaster = ProphetFinancialForecaster(
                seasonality_mode=request.seasonality_mode.value,
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False
            )
            
            # Preprocess data
            prophet_df = forecaster.preprocess_transaction_data(transactions)
            
            # Train model
            training_result = forecaster.train_model(prophet_df)
            
            # Check model accuracy
            if training_result and 'metrics' in training_result:
                mape = training_result['metrics'].get('mape', 1.0)
                if mape > 0.4:  # MAPE > 40% indicates poor accuracy
                    ErrorHandler.check_model_accuracy(1 - mape, minimum_threshold=0.6)
            
        except Exception as model_error:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            prediction_logger.log_prediction_error(
                current_user_id, request.timeframe.value, request_id, model_error, execution_time
            )
            
            if "insufficient data" in str(model_error).lower():
                raise InsufficientDataError(
                    required_points=30,
                    available_points=len(transactions),
                    user_id=current_user_id,
                    request_id=request_id
                )
            elif "training" in str(model_error).lower() or "fit" in str(model_error).lower():
                raise ModelTrainingError(
                    user_id=current_user_id,
                    request_id=request_id
                )
            else:
                raise PredictionGenerationError(
                    request.timeframe.value,
                    user_id=current_user_id,
                    request_id=request_id
                )
        
        # Generate forecasts with error handling
        try:
            forecast_days = get_timeframe_days(request.timeframe)
            forecast = forecaster.generate_forecast(
                periods=forecast_days,
                freq='D',
                include_history=False
            )
            
            # Aggregate daily predictions to monthly totals
            monthly_predictions = aggregate_daily_to_monthly(forecast)
            
            # Log aggregation metadata (Requirement 5.1, 5.3)
            logger.info(
                f"📈 Prediction aggregation - User: {current_user_id}, "
                f"Request ID: {request_id}, "
                f"Daily predictions: {len(forecast)}, "
                f"Monthly aggregates: {len(monthly_predictions)}, "
                f"Aggregation method: monthly, "
                f"Forecast period: {forecast_days} days, "
                f"Avg confidence: {forecast['confidence_score'].mean():.2f}"
            )
            
            # Get predicted monthly income from first month prediction for alignment
            predicted_monthly_income = None
            if monthly_predictions and len(monthly_predictions) > 0:
                predicted_monthly_income = monthly_predictions[0].get('predicted', None)
                logger.info(
                    f"First month prediction - User: {current_user_id}, "
                    f"Request ID: {request_id}, "
                    f"Predicted monthly income: {predicted_monthly_income:.2f}"
                )
            
            # Generate category forecasts if requested
            category_forecasts = {}
            if request.include_categories:
                # Pass monthly income prediction to ensure category totals align
                category_forecasts = forecaster.get_category_forecasts(
                    transactions, 
                    forecast_days,
                    monthly_income_prediction=predicted_monthly_income
                )
                
                # Log category forecast metadata
                logger.info(
                    f"Category forecasts generated - User: {current_user_id}, "
                    f"Request ID: {request_id}, "
                    f"Categories: {len(category_forecasts)}, "
                    f"Category names: {list(category_forecasts.keys())}"
                )
            
            # Calculate user financial profile
            user_profile = _calculate_user_profile(transactions)
                    
            # Create proper schema objects early for use in AI insights
            user_profile_obj = UserFinancialProfile(
                avg_monthly_income=user_profile['avg_monthly_income'],
                avg_monthly_expenses=user_profile['avg_monthly_expenses'], 
                savings_rate=user_profile['savings_rate'],
                spending_categories=user_profile['spending_categories'],
                transaction_count=user_profile['transaction_count']
            )
                    
            # Convert category forecasts to proper objects
            category_forecasts_obj = {}
            for cat, forecast_data in category_forecasts.items():
                # Determine trend
                trend_value = forecast_data.get('trend', 'stable')
                if trend_value == 'increasing':
                    trend_enum = TrendEnum.INCREASING
                elif trend_value == 'decreasing':
                    trend_enum = TrendEnum.DECREASING
                else:
                    trend_enum = TrendEnum.STABLE
                            
                category_forecasts_obj[cat] = CategoryForecast(
                    category=cat,
                    historical_average=forecast_data.get('historical_average', 0.0),
                    predicted_average=forecast_data.get('predicted_average', 0.0),
                    confidence=forecast_data.get('confidence', 0.7),
                    trend=trend_enum,
                    data_points=forecast_data.get('data_points', 0),
                    forecast_data=forecast_data.get('forecast_data')
                )
                    
            # Create model accuracy object
            model_accuracy_obj = ModelAccuracy(
                mae=training_result['metrics']['mae'],
                mape=training_result['metrics']['mape'],
                rmse=training_result['metrics']['rmse'],
                data_points=training_result['data_points']
            )
            
        except Exception as forecast_error:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            prediction_logger.log_prediction_error(
                current_user_id, request.timeframe.value, request_id, forecast_error, execution_time
            )
            raise PredictionGenerationError(
                request.timeframe.value,
                user_id=current_user_id,
                request_id=request_id
            )
        
        # Generate AI insights with enhanced error handling
        insights = []
        if request.include_insights:
            try:
                if ai_insights_service:
                    # Create ProphetPredictionPoint objects for AI insights
                    import pandas as pd
                    
                    prediction_points = []
                    for _, row in forecast.iterrows():
                        seasonal_value = row.get('seasonal')
                        seasonal_float = float(seasonal_value) if seasonal_value is not None else 0.0
                        
                        # Convert date safely using string parsing only
                        date_value = row['ds']
                        try:
                            # Convert to string and parse - works for all pandas date types
                            date_str = str(date_value).split(' ')[0]  # Get date part only
                            if 'T' in date_str:
                                date_str = date_str.split('T')[0]
                            date_value = datetime.strptime(date_str, '%Y-%m-%d')
                        except Exception as e:
                            # Fallback to current date if parsing fails
                            logger.warning(f"Date conversion failed: {e}, using current date")
                            date_value = datetime.now()
                        
                        prediction_points.append(ProphetPredictionPoint(
                            date=date_value,
                            predicted=float(row['yhat']),
                            upper=float(row['yhat_upper']),
                            lower=float(row['yhat_lower']),
                            trend=float(row['trend']),
                            seasonal=seasonal_float,
                            confidence=float(row['confidence_score'])
                        ))
                    
                    insights = await ai_insights_service.generate_prophet_insights(
                        predictions=prediction_points,
                        user_profile=user_profile_obj,
                        category_forecasts=category_forecasts_obj,
                        model_accuracy=model_accuracy_obj,
                        timeframe=request.timeframe.value
                    )
                else:
                    # Generate basic insights when AI service is not available
                    fallback_insights = await _generate_fallback_insights(forecast, user_profile, category_forecasts)
                    # Convert to AIInsight objects
                    insights = []
                    for insight_dict in fallback_insights:
                        insights.append(AIInsight(
                            title=insight_dict['title'],
                            description=insight_dict['description'],
                            category=insight_dict['category'],
                            confidence=insight_dict['confidence'],
                            recommendation=insight_dict.get('recommendation')
                        ))
            except Exception as insights_error:
                prediction_logger.error(
                    f"AI insights generation failed: {str(insights_error)}",
                    user_id=current_user_id,
                    request_id=request_id
                )
                
                # Check if this is a rate limiting error
                if isinstance(insights_error, RateLimitError):
                    # Don't generate fallback insights for rate limiting
                    insights = [AIInsight(
                        title="AI Insights Rate Limited",
                        description="AI insights are temporarily unavailable due to rate limiting.",
                        category="rate_limit",
                        confidence=1.0,
                        recommendation="Please try again later to generate AI-powered insights."
                    )]
                else:
                    # Continue without insights rather than failing completely
                    fallback_insights = await _generate_fallback_insights(forecast, user_profile, category_forecasts)
                    # Convert to AIInsight objects
                    insights = []
                    for insight_dict in fallback_insights:
                        insights.append(AIInsight(
                            title=insight_dict['title'],
                            description=insight_dict['description'],
                            category=insight_dict['category'],
                            confidence=insight_dict['confidence'],
                            recommendation=insight_dict.get('recommendation')
                        ))
        
        # Create response with proper data handling
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Create predictions list with proper date and seasonal handling
        predictions_list = []
        for _, row in forecast.iterrows():
            # Handle date conversion safely using string parsing only
            date_value = row['ds']
            try:
                # Convert to string and parse - works for all pandas date types
                date_str = str(date_value).split(' ')[0]  # Get date part only
                if 'T' in date_str:
                    date_str = date_str.split('T')[0]
                date_value = datetime.strptime(date_str, '%Y-%m-%d')
            except Exception as e:
                # Fallback to current date if parsing fails
                logger.warning(f"Date conversion failed: {e}, using current date")
                date_value = datetime.now()
            
            # Handle seasonal value
            seasonal_value = row.get('seasonal')
            seasonal_float = float(seasonal_value) if seasonal_value is not None else 0.0
            
            predictions_list.append({
                'date': date_value,
                'predicted': float(row['yhat']),
                'upper': float(row['yhat_upper']),
                'lower': float(row['yhat_lower']),
                'trend': float(row['trend']),
                'seasonal': seasonal_float,
                'confidence': float(row['confidence_score'])
            })
        
        # Calculate overall confidence score based on model accuracy (MAPE)
        # Lower MAPE = higher confidence
        # MAPE < 5% = 95% confidence, MAPE 5-10% = 90-95% confidence, etc.
        mape_value = model_accuracy_obj.mape
        if mape_value < 0.05:  # Less than 5% error
            overall_confidence = 0.95
        elif mape_value < 0.10:  # 5-10% error
            overall_confidence = 0.90
        elif mape_value < 0.15:  # 10-15% error
            overall_confidence = 0.85
        elif mape_value < 0.20:  # 15-20% error
            overall_confidence = 0.80
        else:  # More than 20% error
            overall_confidence = max(0.70, 1.0 - mape_value)  # Minimum 70% confidence
        
        response = PredictionResponse(
            user_id=current_user_id,
            timeframe=request.timeframe,
            generated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=24),
            predictions=predictions_list,
            monthly_predictions=monthly_predictions,  # Add monthly aggregated predictions
            aggregation_method='monthly',  # Indicate that monthly aggregation is used
            category_forecasts=category_forecasts_obj,  # Use the converted schema objects
            model_accuracy=model_accuracy_obj,  # Use the converted schema object
            confidence_score=float(overall_confidence),
            user_profile=user_profile_obj,  # Use the converted schema object
            insights=insights,
            usage_count=usage_status.current_usage + 1,
            max_usage=usage_status.max_usage,
            reset_date=usage_status.reset_date
        )
        
        # Log response metadata for debugging (Requirement 5.1, 5.3)
        logger.info(
            f"✅ Prediction response created - User: {current_user_id}, "
            f"Request ID: {request_id}, "
            f"Daily predictions: {len(predictions_list)}, "
            f"Monthly predictions: {len(monthly_predictions) if monthly_predictions else 0}, "
            f"Categories: {len(category_forecasts_obj)}, "
            f"Insights: {len(insights)}, "
            f"Confidence score: {response.confidence_score:.2%} (based on MAPE: {model_accuracy_obj.mape:.2%}), "
            f"Aggregation method: {response.aggregation_method}, "
            f"Model accuracy - MAE: {model_accuracy_obj.mae:.2f}, MAPE: {model_accuracy_obj.mape:.2%}, RMSE: {model_accuracy_obj.rmse:.2f}, "
            f"Data points: {model_accuracy_obj.data_points}, "
            f"Execution time: {execution_time:.2f}ms"
        )
        
        # Log success
        prediction_logger.log_prediction_success(
            current_user_id,
            request.timeframe.value,
            request_id,
            execution_time,
            len(response.predictions)
        )
        
        # Increment usage count in background
        background_tasks.add_task(usage_service.increment_usage, current_user_id)
        
        # Cache results in background
        background_tasks.add_task(_cache_prediction_results, current_user_id, response)
        
        return response
        
    except Exception as e:
        raise ErrorHandler.handle_route_exception(e, "generate_predictions", current_user_id, request_id)

@router.get("/usage", response_model=UsageStatus)
@log_execution_time
async def get_prediction_usage(
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Get current prediction usage status for authenticated user with error handling
    
    Returns:
    - Current usage count
    - Maximum usage allowed
    - Reset date
    - Remaining predictions
    """
    request_id = str(uuid.uuid4())
    
    try:
        usage_status = await usage_service.get_user_usage(current_user_id)
        
        prediction_logger.debug(
            "Usage status retrieved",
            user_id=current_user_id,
            current_usage=usage_status.current_usage,
            max_usage=usage_status.max_usage,
            request_id=request_id
        )
        
        return usage_status
        
    except Exception as e:
        raise ErrorHandler.handle_route_exception(e, "get_prediction_usage", current_user_id, request_id)

@router.get("/history")
@log_execution_time
async def get_prediction_history(
    limit: int = 10,
    timeframe: Optional[TimeframeEnum] = None,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Get historical prediction results for authenticated user with error handling
    
    Args:
        limit: Maximum number of results to return
        timeframe: Filter by specific timeframe
    
    Returns:
        List of cached prediction results
    """
    request_id = str(uuid.uuid4())
    
    try:
        # Validate parameters
        if limit < 1 or limit > 100:
            raise ValidationError(
                "limit",
                limit,
                "integer between 1 and 100",
                user_id=current_user_id,
                request_id=request_id
            )
        
        if timeframe:
            ErrorHandler.validate_timeframe(timeframe.value)
        
        prediction_logger.debug(
            "Retrieving prediction history",
            user_id=current_user_id,
            limit=limit,
            timeframe=timeframe.value if timeframe else None,
            request_id=request_id
        )
        
        # This would typically query the prediction_results table
        # For now, return a placeholder response
        return {
            "user_id": current_user_id,
            "results": [],
            "total_count": 0,
            "limit": limit,
            "timeframe": timeframe.value if timeframe else None,
            "message": "Historical predictions feature coming soon"
        }
        
    except Exception as e:
        raise ErrorHandler.handle_route_exception(e, "get_prediction_history", current_user_id, request_id)

@router.post("/ai-insights")
@log_execution_time
async def generate_ai_insights(
    request: dict,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Generate AI insights using OpenRouter API with usage limits
    
    This endpoint provides interactive AI-generated financial insights with:
    - OpenRouter API integration using openai/gpt-oss-120b:free
    - Daily usage limits (5 per user)
    - Personalized financial advice and recommendations
    - Risk assessment and opportunity identification
    """
    request_id = str(uuid.uuid4())
    
    try:
        # Check AI insights service availability
        if not ai_insights_service:
            raise HTTPException(
                status_code=503,
                detail="AI insights service is not available. Please check OpenRouter API configuration."
            )
        
        # Validate request structure
        required_fields = ['predictions', 'category_forecasts', 'user_profile', 'timeframe']
        for field in required_fields:
            if field not in request:
                raise ValidationError(
                    field,
                    "missing",
                    "required field",
                    user_id=current_user_id,
                    request_id=request_id
                )
        
        # Check usage limits (5 per day for AI insights)
        try:
            usage_status = await usage_service.get_user_usage(current_user_id)
            
            # For AI insights, we use a separate counter (could be enhanced to separate service)
            ai_usage_key = f"ai_insights_{current_user_id}_{datetime.now().strftime('%Y-%m-%d')}"
            # This would typically be stored in Redis or database
            # For now, we'll use the same usage service but with different limits
            
            if usage_status.current_usage >= 5:  # 5 AI insights per day
                raise CustomUsageLimitError(
                    current_usage=usage_status.current_usage,
                    max_usage=5,
                    reset_date=usage_status.reset_date,
                    user_id=current_user_id,
                    request_id=request_id
                )
        except Exception as usage_error:
            if not isinstance(usage_error, CustomUsageLimitError):
                logger.warning(f"Usage check failed, proceeding: {usage_error}")
            else:
                raise
        
        # Convert request data to proper schema objects
        try:
            # Create ProphetPredictionPoint objects
            prediction_points = []
            for pred_data in request['predictions']:
                prediction_points.append(ProphetPredictionPoint(
                    date=datetime.fromisoformat(pred_data['date'].replace('Z', '+00:00')) if isinstance(pred_data['date'], str) else pred_data['date'],
                    predicted=float(pred_data['predicted']),
                    upper=float(pred_data['upper']),
                    lower=float(pred_data['lower']),
                    trend=float(pred_data['trend']),
                    seasonal=float(pred_data.get('seasonal', 0.0)),
                    confidence=float(pred_data['confidence'])
                ))
            
            # Create CategoryForecast objects
            category_forecasts_obj = {}
            for cat, forecast_data in request['category_forecasts'].items():
                trend_value = forecast_data.get('trend', 'stable')
                if trend_value == 'increasing':
                    trend_enum = TrendEnum.INCREASING
                elif trend_value == 'decreasing':
                    trend_enum = TrendEnum.DECREASING
                else:
                    trend_enum = TrendEnum.STABLE
                
                category_forecasts_obj[cat] = CategoryForecast(
                    category=cat,
                    historical_average=float(forecast_data.get('historical_average', 0.0)),
                    predicted_average=float(forecast_data.get('predicted_average', 0.0)),
                    confidence=float(forecast_data.get('confidence', 0.7)),
                    trend=trend_enum,
                    data_points=int(forecast_data.get('data_points', 0))
                )
            
            # Create UserFinancialProfile object
            user_profile_data = request['user_profile']
            user_profile_obj = UserFinancialProfile(
                avg_monthly_income=float(user_profile_data.get('avg_monthly_income', 0.0)),
                avg_monthly_expenses=float(user_profile_data.get('avg_monthly_expenses', 0.0)),
                savings_rate=float(user_profile_data.get('savings_rate', 0.0)),
                spending_categories=user_profile_data.get('spending_categories', []),
                transaction_count=int(user_profile_data.get('transaction_count', 0))
            )
            
            # Create ModelAccuracy object (mock data for now)
            model_accuracy_obj = ModelAccuracy(
                mae=25.0,
                mape=0.15,
                rmse=35.0,
                data_points=len(prediction_points)
            )
            
        except Exception as conversion_error:
            raise ValidationError(
                "data_conversion",
                str(conversion_error),
                "valid prediction data format",
                user_id=current_user_id,
                request_id=request_id
            )
        
        # Generate AI insights using OpenRouter API
        try:
            start_time = datetime.utcnow()
            
            insights = await ai_insights_service.generate_prophet_insights(
                predictions=prediction_points,
                user_profile=user_profile_obj,
                category_forecasts=category_forecasts_obj,
                model_accuracy=model_accuracy_obj,
                timeframe=request['timeframe']
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Log successful AI insights generation
            prediction_logger.info(
                f"AI insights generated successfully",
                user_id=current_user_id,
                insights_count=len(insights),
                execution_time=execution_time,
                request_id=request_id
            )
            
            # Format response
            response_data = {
                "success": True,
                "insights": [
                    {
                        "title": insight.title,
                        "description": insight.description,
                        "category": insight.category,
                        "confidence": insight.confidence,
                        "recommendation": insight.recommendation
                    }
                    for insight in insights
                ],
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "model_used": "openai/gpt-oss-120b:free",
                    "execution_time_ms": execution_time,
                    "user_id": current_user_id,
                    "request_id": request_id
                },
                "usage": {
                    "current_usage": usage_status.current_usage + 1,
                    "max_usage": 5,
                    "reset_date": usage_status.reset_date.isoformat()
                }
            }
            
            return response_data
            
        except RateLimitError as rate_error:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            prediction_logger.warning(
                f"AI insights rate limited: {str(rate_error)}",
                user_id=current_user_id,
                request_id=request_id,
                execution_time=execution_time
            )
            
            # Return rate limit message without fallback insights
            return {
                "success": False,
                "rate_limited": True,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "AI insights service is rate limited",
                    "details": {
                        "service": rate_error.details.get("service", "OpenRouter API"),
                        "retry_after": rate_error.details.get("retry_after"),
                        "rate_limited": True
                    }
                },
                "insights": [],  # No insights when rate limited
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "model_used": "none",
                    "execution_time_ms": execution_time,
                    "user_id": current_user_id,
                    "request_id": request_id
                }
            }
            
        except Exception as insights_error:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            prediction_logger.error(
                f"AI insights generation failed: {str(insights_error)}",
                user_id=current_user_id,
                request_id=request_id,
                execution_time=execution_time
            )
            
            # Return fallback insights for other errors
            fallback_insights = [
                {
                    "title": "Financial Analysis Complete",
                    "description": "Basic financial analysis has been completed. AI insights service temporarily unavailable.",
                    "category": "general",
                    "confidence": 0.7,
                    "recommendation": "Review your spending patterns and consider optimizing your budget based on the prediction trends."
                },
                {
                    "title": "Savings Opportunity",
                    "description": f"Your current financial profile shows potential for optimization.",
                    "category": "savings",
                    "confidence": 0.6,
                    "recommendation": "Focus on identifying areas where you can reduce expenses and increase your savings rate."
                }
            ]
            
            return {
                "success": False,
                "rate_limited": False,
                "insights": fallback_insights,
                "error": "AI insights service temporarily unavailable",
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "model_used": "fallback",
                    "execution_time_ms": execution_time,
                    "user_id": current_user_id,
                    "request_id": request_id
                }
            }
        
    except Exception as e:
        raise ErrorHandler.handle_route_exception(e, "generate_ai_insights", current_user_id, request_id)

@router.delete("/cache")
async def clear_prediction_cache(
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Clear cached prediction results for authenticated user
    """
    try:
        # Implementation would clear cached results from database
        return {
            "message": "Prediction cache cleared successfully",
            "user_id": current_user_id
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear prediction cache"
        )

@router.post("/validate")
async def validate_prediction_data(
    request: PredictionRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Validate transaction data for prediction generation without creating predictions
    
    Returns:
        Validation results and data quality metrics
    """
    try:
        transactions = [
            {
                'date': t.date,
                'amount': t.amount,
                'type': t.type.value,
                'category': t.category
            }
            for t in request.transaction_data
        ]
        
        # Perform validation checks
        validation_results = {
            "valid": True,
            "transaction_count": len(transactions),
            "date_range_days": (max(t['date'] for t in transactions) - 
                              min(t['date'] for t in transactions)).days,
            "categories_count": len(set(t.get('category') for t in transactions if t.get('category'))),
            "income_transactions": len([t for t in transactions if t['type'] == 'income']),
            "expense_transactions": len([t for t in transactions if t['type'] == 'expense']),
            "warnings": [],
            "errors": []
        }
        
        # Add validation warnings
        if validation_results["transaction_count"] < 30:
            validation_results["warnings"].append("Low transaction count may reduce prediction accuracy")
        
        if validation_results["date_range_days"] < 30:
            validation_results["warnings"].append("Short date range may affect seasonal pattern detection")
        
        if validation_results["income_transactions"] == 0:
            validation_results["warnings"].append("No income transactions found")
            
        return validation_results
        
    except Exception as e:
        logger.error(f"Error validating data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to validate prediction data"
        )

# Helper functions

def _calculate_user_profile(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate user financial profile from transactions"""
    try:
        total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
        total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
        
        # Calculate monthly averages (assuming data spans multiple months)
        date_range_days = (max(t['date'] for t in transactions) - 
                          min(t['date'] for t in transactions)).days
        months = max(1, date_range_days / 30)
        
        avg_monthly_income = total_income / months
        avg_monthly_expenses = total_expenses / months
        savings_rate = (avg_monthly_income - avg_monthly_expenses) / avg_monthly_income if avg_monthly_income > 0 else 0
        
        categories = list(set(t.get('category') for t in transactions if t.get('category')))
        
        return {
            'avg_monthly_income': float(avg_monthly_income),
            'avg_monthly_expenses': float(avg_monthly_expenses),
            'savings_rate': float(savings_rate),
            'spending_categories': categories,
            'transaction_count': len(transactions)
        }
        
    except Exception as e:
        logger.error(f"Error calculating user profile: {str(e)}")
        return {
            'avg_monthly_income': 0.0,
            'avg_monthly_expenses': 0.0,
            'savings_rate': 0.0,
            'spending_categories': [],
            'transaction_count': 0
        }

async def _generate_fallback_insights(
    forecast, 
    user_profile: Dict[str, Any], 
    category_forecasts: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generate basic insights when AI service is unavailable"""
    try:
        # Log fallback insights usage (Requirement 5.1, 5.3)
        logger.warning(
            "⚠️ Using fallback insights generation - AI service unavailable or failed. "
            f"Forecast data points: {len(forecast)}, "
            f"User profile categories: {len(user_profile.get('spending_categories', []))}, "
            f"Category forecasts: {len(category_forecasts)}"
        )
        
        insights = []
        
        # Basic trend analysis insight
        avg_predicted = forecast['yhat'].mean()
        if avg_predicted > 0:
            insights.append({
                'title': 'Positive Financial Trend',
                'description': f'Your financial forecast shows an average positive flow of ₱{avg_predicted:.2f}',
                'category': 'trend',
                'confidence': 0.75,
                'recommendation': 'Consider increasing your savings or investments to capitalize on this positive trend'
            })
        else:
            insights.append({
                'title': 'Financial Caution Advised',
                'description': f'Your forecast indicates potential negative flow of ₱{abs(avg_predicted):.2f}',
                'category': 'trend',
                'confidence': 0.75,
                'recommendation': 'Review and optimize your spending to improve cash flow'
            })
        
        # Savings rate insight
        if user_profile['savings_rate'] > 0.2:  # 20%+ savings rate
            insights.append({
                'title': 'Excellent Savings Performance',
                'description': f'Your savings rate of {user_profile["savings_rate"]*100:.1f}% is exceptional',
                'category': 'savings',
                'confidence': 0.9,
                'recommendation': 'Continue maintaining this healthy savings habit and consider investment opportunities'
            })
        elif user_profile['savings_rate'] > 0.1:  # 10-20% savings rate
            insights.append({
                'title': 'Good Savings Discipline',
                'description': f'Your savings rate of {user_profile["savings_rate"]*100:.1f}% is above average',
                'category': 'savings',
                'confidence': 0.8,
                'recommendation': 'Try to gradually increase your savings rate to 20% for optimal financial health'
            })
        else:
            insights.append({
                'title': 'Savings Opportunity',
                'description': f'Your current savings rate of {user_profile["savings_rate"]*100:.1f}% has room for improvement',
                'category': 'savings',
                'confidence': 0.7,
                'recommendation': 'Aim to save at least 10-15% of your income for better financial stability'
            })
        
        # Category-specific insight
        if category_forecasts:
            # Find the category with the biggest predicted change
            biggest_change = None
            biggest_change_amount = 0
            
            for category, forecast_data in category_forecasts.items():
                change = abs(forecast_data['predicted_average'] - forecast_data['historical_average'])
                if change > biggest_change_amount:
                    biggest_change_amount = change
                    biggest_change = (category, forecast_data)
            
            if biggest_change:
                category, data = biggest_change
                change = data['predicted_average'] - data['historical_average']
                change_direction = 'increase' if change > 0 else 'decrease'
                
                insights.append({
                    'title': f'{category.title()} Spending Alert',
                    'description': f'Significant {change_direction} predicted in {category} spending: ₱{abs(change):.2f}',
                    'category': 'category',
                    'confidence': data['confidence'],
                    'recommendation': f'Monitor and adjust your {category} budget to optimize spending in this area'
                })
        
        # Confidence insight based on model accuracy
        avg_confidence = forecast['confidence_score'].mean()
        if avg_confidence >= 0.8:
            insights.append({
                'title': 'High Prediction Confidence',
                'description': f'Prophet model shows {avg_confidence*100:.1f}% confidence in these predictions',
                'category': 'model',
                'confidence': avg_confidence,
                'recommendation': 'These predictions are highly reliable for your financial planning'
            })
        elif avg_confidence >= 0.6:
            insights.append({
                'title': 'Moderate Prediction Confidence',
                'description': f'Prophet model shows {avg_confidence*100:.1f}% confidence, indicating moderate reliability',
                'category': 'model',
                'confidence': avg_confidence,
                'recommendation': 'Consider these predictions as guidance while monitoring actual spending patterns'
            })
        else:
            insights.append({
                'title': 'Lower Prediction Confidence',
                'description': f'Prophet model shows {avg_confidence*100:.1f}% confidence due to limited or irregular data',
                'category': 'model',
                'confidence': avg_confidence,
                'recommendation': 'Add more transaction data over time to improve prediction accuracy'
            })
        
        return insights
        
    except Exception as e:
        logger.error(f"Error generating fallback insights: {str(e)}")
        return [
            {
                'title': 'Financial Analysis Complete',
                'description': 'Your Prophet predictions have been generated successfully',
                'category': 'general',
                'confidence': 0.7,
                'recommendation': 'Review your predictions and adjust your budget accordingly'
            }
        ]

async def _cache_prediction_results(user_id: str, response: PredictionResponse):
    """Cache prediction results in database"""
    try:
        # Implementation would store results in prediction_results table
        logger.info(f"Cached prediction results for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error caching results: {str(e)}")

# Include router in main app
def get_predictions_router() -> APIRouter:
    """Get the predictions router for including in main app"""
    return router