"""
Prophet Forecasting Service for BudgetMe Financial Predictions
Handles data preprocessing, model training, and forecast generation
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class ProphetFinancialForecaster:
    """
    Facebook Prophet-based financial forecasting service for BudgetMe
    """
    
    def __init__(self, 
                 seasonality_mode: str = 'additive',
                 yearly_seasonality: bool = True,
                 weekly_seasonality: bool = False,
                 daily_seasonality: bool = False):
        """
        Initialize the Prophet forecaster
        
        Args:
            seasonality_mode: 'additive' or 'multiplicative'
            yearly_seasonality: Enable yearly seasonal patterns
            weekly_seasonality: Enable weekly seasonal patterns
            daily_seasonality: Enable daily seasonal patterns
        """
        self.seasonality_mode = seasonality_mode
        self.yearly_seasonality = yearly_seasonality
        self.weekly_seasonality = weekly_seasonality
        self.daily_seasonality = daily_seasonality
        self.model = None
        self.model_fitted = False
        
    def preprocess_transaction_data(self, transactions: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Preprocess transaction data for Prophet model
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            DataFrame with 'ds' (date) and 'y' (value) columns for Prophet
        """
        try:
            if not transactions:
                raise ValueError("No transaction data provided")
            
            # Convert to DataFrame
            df = pd.DataFrame(transactions)
            
            # Ensure required columns exist
            required_columns = ['date', 'amount', 'type']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Convert date column to datetime
            df['date'] = pd.to_datetime(df['date'])
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            
            # Remove rows with invalid amounts
            df = df.dropna(subset=['amount'])
            
            # Group by date and calculate net flow (income - expenses)
            daily_data = []
            
            for date in df['date'].dt.date.unique():
                day_transactions = df[df['date'].dt.date == date]
                
                income = day_transactions[day_transactions['type'] == 'income']['amount'].sum()
                expenses = day_transactions[day_transactions['type'] == 'expense']['amount'].sum()
                net_flow = income - expenses
                
                daily_data.append({
                    'ds': pd.to_datetime(date),
                    'y': net_flow,
                    'income': income,
                    'expenses': expenses
                })
            
            # Convert to DataFrame and sort by date
            prophet_df = pd.DataFrame(daily_data)
            prophet_df = prophet_df.sort_values('ds').reset_index(drop=True)
            
            # Fill missing dates with 0 values if there are gaps
            if len(prophet_df) > 1:
                full_date_range = pd.date_range(
                    start=prophet_df['ds'].min(),
                    end=prophet_df['ds'].max(),
                    freq='D'
                )
                
                prophet_df = prophet_df.set_index('ds').reindex(full_date_range, fill_value=0).reset_index()
                prophet_df.rename(columns={'index': 'ds'}, inplace=True)
            
            logger.info(f"Preprocessed {len(prophet_df)} data points for Prophet model")
            return prophet_df
            
        except Exception as e:
            logger.error(f"Error preprocessing transaction data: {str(e)}")
            raise
    
    def detect_outliers(self, df: pd.DataFrame, threshold: float = 3.0) -> pd.DataFrame:
        """
        Detect and handle outliers in the data using z-score method
        
        Args:
            df: DataFrame with Prophet format
            threshold: Z-score threshold for outlier detection
            
        Returns:
            DataFrame with outliers handled
        """
        try:
            if len(df) < 3:
                return df
            
            # Calculate z-scores
            z_scores = np.abs((df['y'] - df['y'].mean()) / df['y'].std())
            
            # Identify outliers
            outliers = z_scores > threshold
            
            if outliers.any():
                logger.info(f"Detected {outliers.sum()} outliers in the data")
                
                # Cap outliers at the threshold percentiles
                lower_percentile = df['y'].quantile(0.05)
                upper_percentile = df['y'].quantile(0.95)
                
                df.loc[df['y'] < lower_percentile, 'y'] = lower_percentile
                df.loc[df['y'] > upper_percentile, 'y'] = upper_percentile
            
            return df
            
        except Exception as e:
            logger.error(f"Error detecting outliers: {str(e)}")
            return df
    
    def create_prophet_model(self) -> Prophet:
        """
        Create and configure Prophet model with financial-specific settings
        
        Returns:
            Configured Prophet model
        """
        try:
            model = Prophet(
                seasonality_mode=self.seasonality_mode,
                yearly_seasonality=self.yearly_seasonality,
                weekly_seasonality=self.weekly_seasonality,
                daily_seasonality=self.daily_seasonality,
                changepoint_prior_scale=0.05,  # Conservative changepoint detection
                seasonality_prior_scale=10.0,   # Flexible seasonality
                interval_width=0.80,            # 80% confidence intervals
                uncertainty_samples=1000        # Better uncertainty estimation
            )
            
            # Add custom seasonalities for financial patterns
            if len(pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')) > 365:
                model.add_seasonality(
                    name='monthly',
                    period=30.5,
                    fourier_order=5
                )
            
            return model
            
        except Exception as e:
            logger.error(f"Error creating Prophet model: {str(e)}")
            raise
    
    def train_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the Prophet model on the provided data
        
        Args:
            df: DataFrame with Prophet format (ds, y columns)
            
        Returns:
            Dictionary containing model metrics and status
        """
        try:
            if len(df) < 7:
                raise ValueError("Insufficient data for training (minimum 7 data points required)")
            
            # Handle outliers
            df_clean = self.detect_outliers(df)
            
            # Create and train model
            self.model = self.create_prophet_model()
            
            logger.info("Training Prophet model...")
            self.model.fit(df_clean)
            self.model_fitted = True
            
            # Calculate model performance metrics if enough data
            metrics = {}
            if len(df_clean) >= 14:  # Need at least 2 weeks for cross-validation
                try:
                    cv_results = cross_validation(
                        self.model, 
                        initial='7 days',
                        period='1 days', 
                        horizon='3 days'
                    )
                    metrics = performance_metrics(cv_results)
                    
                    # Calculate average metrics
                    avg_metrics = {
                        'mae': float(metrics['mae'].mean()),
                        'mape': float(metrics['mape'].mean()),
                        'rmse': float(metrics['rmse'].mean())
                    }
                    
                except Exception as cv_error:
                    logger.warning(f"Cross-validation failed: {str(cv_error)}")
                    avg_metrics = {'mae': 0, 'mape': 0, 'rmse': 0}
            else:
                avg_metrics = {'mae': 0, 'mape': 0, 'rmse': 0}
            
            logger.info("Prophet model training completed successfully")
            
            return {
                'status': 'success',
                'data_points': len(df_clean),
                'metrics': avg_metrics,
                'seasonality_mode': self.seasonality_mode
            }
            
        except Exception as e:
            logger.error(f"Error training Prophet model: {str(e)}")
            raise
    
    def generate_forecast(self, 
                         periods: int = 90,
                         freq: str = 'D',
                         include_history: bool = True) -> pd.DataFrame:
        """
        Generate financial forecasts using the trained Prophet model
        
        Args:
            periods: Number of periods to forecast
            freq: Frequency of forecast ('D' for daily, 'W' for weekly, 'M' for monthly)
            include_history: Whether to include historical data in forecast
            
        Returns:
            DataFrame with forecast results
        """
        try:
            if not self.model_fitted:
                raise ValueError("Model must be trained before generating forecasts")
            
            # Create future dataframe
            future = self.model.make_future_dataframe(
                periods=periods,
                freq=freq,
                include_history=include_history
            )
            
            # Generate forecast
            logger.info(f"Generating {periods}-period forecast...")
            forecast = self.model.predict(future)
            
            # Add additional columns for better interpretation
            forecast['confidence_width'] = forecast['yhat_upper'] - forecast['yhat_lower']
            forecast['confidence_score'] = 1 - (forecast['confidence_width'] / forecast['yhat'].abs().clip(lower=1))
            forecast['confidence_score'] = forecast['confidence_score'].clip(0, 1)
            
            # Categorize trend direction
            forecast['trend_direction'] = np.where(
                forecast['trend'].diff() > 0, 'increasing',
                np.where(forecast['trend'].diff() < 0, 'decreasing', 'stable')
            )
            
            logger.info(f"Forecast generated for {len(forecast)} data points")
            return forecast
            
        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            raise
    
    def get_category_forecasts(self, 
                              transactions: List[Dict[str, Any]],
                              periods: int = 90,
                              monthly_income_prediction: Optional[float] = None) -> Dict[str, Dict[str, Any]]:
        """
        Generate category-specific forecasts with monthly averages
        
        This method ensures category forecasts:
        1. Return monthly averages (not daily or cumulative totals)
        2. Align with monthly income predictions for consistency
        3. Apply realistic 2-3% annual growth rates
        
        Args:
            transactions: List of transaction dictionaries with category information
            periods: Number of periods to forecast (in days)
            monthly_income_prediction: Optional predicted monthly income to align expense categories
            
        Returns:
            Dictionary with category forecasts (monthly averages)
        """
        try:
            df = pd.DataFrame(transactions)
            
            if 'category' not in df.columns:
                logger.warning("No category information found in transactions")
                return {}
            
            category_forecasts = {}
            
            # Calculate number of months for the forecast period
            forecast_months = max(1, periods / 30)
            
            # Separate expense categories from income categories
            expense_categories = []
            income_categories = []
            
            # Group by category and generate forecasts
            for category in df['category'].unique():
                if pd.isna(category):
                    continue
                    
                category_data = df[df['category'] == category].copy()
                
                if len(category_data) < 7:  # Skip categories with insufficient data
                    continue
                
                # Determine if this is an expense or income category
                is_expense = (category_data['type'] == 'expense').any()
                
                try:
                    # Preprocess category data
                    category_prophet_df = self.preprocess_transaction_data(category_data.to_dict('records'))
                    
                    # Calculate historical monthly average
                    date_range_days = (category_prophet_df['ds'].max() - category_prophet_df['ds'].min()).days
                    historical_months = max(1, date_range_days / 30)
                    
                    # For expenses, use absolute values; for income, use actual values
                    if is_expense:
                        historical_total = abs(category_data['amount'].sum())
                    else:
                        historical_total = category_data['amount'].sum()
                    
                    historical_monthly_avg = historical_total / historical_months
                    
                    # Apply realistic 2-3% annual growth rate
                    annual_growth_rate = 0.025  # 2.5% annual growth
                    monthly_growth_rate = annual_growth_rate / 12
                    
                    # Calculate predicted monthly average with realistic growth
                    # Growth is applied over the forecast period
                    predicted_monthly_avg = historical_monthly_avg * (1 + monthly_growth_rate * forecast_months)
                    
                    # Cap growth at 3% annually to ensure realism
                    max_growth = historical_monthly_avg * (1 + 0.03 * (forecast_months / 12))
                    predicted_monthly_avg = min(predicted_monthly_avg, max_growth)
                    
                    # Determine trend based on monthly averages
                    trend = 'stable'
                    growth_rate = (predicted_monthly_avg - historical_monthly_avg) / historical_monthly_avg if historical_monthly_avg > 0 else 0
                    
                    if growth_rate > 0.05:  # >5% increase
                        trend = 'increasing'
                    elif growth_rate < -0.05:  # >5% decrease
                        trend = 'decreasing'
                    
                    # Calculate confidence based on data consistency
                    # More data points = higher confidence
                    confidence = min(0.95, 0.6 + (len(category_data) / 100))
                    
                    category_forecast = {
                        'historical_average': float(historical_monthly_avg),
                        'predicted_average': float(predicted_monthly_avg),
                        'confidence': float(confidence),
                        'trend': trend,
                        'data_points': len(category_data),
                        'is_expense': is_expense
                    }
                    
                    category_forecasts[category] = category_forecast
                    
                    # Track expense and income categories separately
                    if is_expense:
                        expense_categories.append(category_forecast)
                    else:
                        income_categories.append(category_forecast)
                    
                except Exception as category_error:
                    logger.warning(f"Failed to forecast category {category}: {str(category_error)}")
                    continue
            
            # Ensure category totals align with monthly income predictions
            if monthly_income_prediction and expense_categories:
                # Calculate total predicted expenses from all categories
                total_predicted_expenses = sum(cat['predicted_average'] for cat in expense_categories)
                
                # If total expenses exceed 90% of predicted income, scale them down
                # This ensures realistic expense predictions that align with income
                max_reasonable_expenses = monthly_income_prediction * 0.90  # 90% of income
                
                if total_predicted_expenses > max_reasonable_expenses:
                    scaling_factor = max_reasonable_expenses / total_predicted_expenses
                    logger.info(f"Scaling expense categories by {scaling_factor:.2f} to align with income prediction")
                    
                    # Scale down all expense category predictions proportionally
                    for category, forecast in category_forecasts.items():
                        if forecast.get('is_expense', False):
                            forecast['predicted_average'] = float(forecast['predicted_average'] * scaling_factor)
                            # Update trend if scaling significantly changed the prediction
                            new_growth = (forecast['predicted_average'] - forecast['historical_average']) / forecast['historical_average']
                            if abs(new_growth) < 0.05:
                                forecast['trend'] = 'stable'
            
            logger.info(f"Generated monthly average forecasts for {len(category_forecasts)} categories")
            logger.info(f"Expense categories: {len(expense_categories)}, Income categories: {len(income_categories)}")
            
            return category_forecasts
            
        except Exception as e:
            logger.error(f"Error generating category forecasts: {str(e)}")
            return {}

def create_financial_forecaster(config: Dict[str, Any] = None) -> ProphetFinancialForecaster:
    """
    Factory function to create a configured ProphetFinancialForecaster
    
    Args:
        config: Configuration dictionary with model parameters
        
    Returns:
        Configured ProphetFinancialForecaster instance
    """
    if config is None:
        config = {}
    
    return ProphetFinancialForecaster(
        seasonality_mode=config.get('seasonality_mode', 'additive'),
        yearly_seasonality=config.get('yearly_seasonality', True),
        weekly_seasonality=config.get('weekly_seasonality', False),
        daily_seasonality=config.get('daily_seasonality', False)
    )