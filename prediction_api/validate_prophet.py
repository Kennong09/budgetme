#!/usr/bin/env python3
"""
Prophet Integration Validation Script
Tests the complete Prophet prediction system with realistic transaction data
"""

import sys
import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models.prophet_forecaster import ProphetFinancialForecaster
from models.schemas import TimeframeEnum, SeasonalityMode
from services.usage_service import UsageTrackingService
from utils.logger import prediction_logger
from utils.exceptions import ErrorHandler

class ProphetValidationSuite:
    """Comprehensive validation suite for Prophet integration"""
    
    def __init__(self):
        self.results = {
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "errors": [],
            "performance_metrics": {},
            "model_accuracy": {},
            "validation_details": []
        }
    
    def generate_realistic_transaction_data(self, days: int = 180) -> List[Dict[str, Any]]:
        """Generate realistic transaction data for testing"""
        print(f"Generating {days} days of realistic transaction data...")
        
        transactions = []
        base_date = datetime.now() - timedelta(days=days)
        
        # Define realistic spending patterns
        categories = {
            "salary": {"type": "income", "frequency": 30, "amount_range": (4000, 6000)},
            "groceries": {"type": "expense", "frequency": 3, "amount_range": (50, 150)},
            "utilities": {"type": "expense", "frequency": 30, "amount_range": (100, 300)},
            "rent": {"type": "expense", "frequency": 30, "amount_range": (1200, 1800)},
            "transportation": {"type": "expense", "frequency": 7, "amount_range": (20, 80)},
            "entertainment": {"type": "expense", "frequency": 10, "amount_range": (30, 120)},
            "healthcare": {"type": "expense", "frequency": 60, "amount_range": (50, 200)},
            "shopping": {"type": "expense", "frequency": 14, "amount_range": (40, 200)},
            "restaurants": {"type": "expense", "frequency": 5, "amount_range": (25, 100)},
            "insurance": {"type": "expense", "frequency": 30, "amount_range": (200, 400)},
        }
        
        # Generate transactions
        for day in range(days):
            current_date = base_date + timedelta(days=day)
            
            # Determine transactions for this day
            for category, config in categories.items():
                # Check if transaction should occur based on frequency
                if day % config["frequency"] == 0:
                    # Add some randomness
                    if np.random.random() < 0.8:  # 80% chance of transaction
                        amount = np.random.uniform(*config["amount_range"])
                        
                        # Add seasonal variations
                        if category == "utilities":
                            # Higher in winter months
                            month = current_date.month
                            if month in [12, 1, 2, 6, 7, 8]:  # Winter/Summer peaks
                                amount *= 1.3
                        elif category == "entertainment":
                            # Higher on weekends and holidays
                            if current_date.weekday() >= 5:  # Weekend
                                amount *= 1.5
                        elif category == "groceries":
                            # Slightly higher on weekends
                            if current_date.weekday() >= 5:
                                amount *= 1.2
                        
                        transactions.append({
                            "date": current_date.isoformat(),
                            "amount": round(amount, 2),
                            "type": config["type"],
                            "category": category,
                            "description": f"{category.title()} transaction on {current_date.strftime('%Y-%m-%d')}"
                        })
        
        print(f"Generated {len(transactions)} transactions")
        return transactions
    
    def test_data_preprocessing(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test transaction data preprocessing"""
        print("\n🔄 Testing data preprocessing...")
        
        try:
            forecaster = ProphetFinancialForecaster()
            
            # Test preprocessing
            start_time = datetime.now()
            prophet_df = forecaster.preprocess_transaction_data(transactions)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Validation checks
            assert isinstance(prophet_df, pd.DataFrame), "Result should be DataFrame"
            assert 'ds' in prophet_df.columns, "Missing 'ds' column"
            assert 'y' in prophet_df.columns, "Missing 'y' column"
            assert len(prophet_df) > 0, "DataFrame should not be empty"
            assert len(prophet_df) <= len(set(t['date'][:10] for t in transactions)), "Should aggregate by day"
            
            # Check data types
            assert pd.api.types.is_datetime64_any_dtype(prophet_df['ds']), "'ds' should be datetime"
            assert pd.api.types.is_numeric_dtype(prophet_df['y']), "'y' should be numeric"
            
            # Performance check
            assert processing_time < 5.0, f"Processing took too long: {processing_time}s"
            
            self.results["performance_metrics"]["preprocessing_time"] = processing_time
            self.results["validation_details"].append({
                "test": "data_preprocessing",
                "status": "passed",
                "details": {
                    "input_transactions": len(transactions),
                    "output_rows": len(prophet_df),
                    "processing_time": processing_time,
                    "date_range": f"{prophet_df['ds'].min()} to {prophet_df['ds'].max()}"
                }
            })
            
            print("✅ Data preprocessing test passed")
            return True
            
        except Exception as e:
            error_msg = f"Data preprocessing failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            self.results["validation_details"].append({
                "test": "data_preprocessing",
                "status": "failed",
                "error": error_msg
            })
            return False
    
    def test_model_training(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test Prophet model training"""
        print("\n🎯 Testing model training...")
        
        try:
            forecaster = ProphetFinancialForecaster(
                seasonality_mode='additive',
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False
            )
            
            # Preprocess data
            prophet_df = forecaster.preprocess_transaction_data(transactions)
            
            # Test training
            start_time = datetime.now()
            training_result = forecaster.train_model(prophet_df)
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Validation checks
            assert training_result is not None, "Training result should not be None"
            assert 'metrics' in training_result, "Training result should contain metrics"
            assert 'data_points' in training_result, "Training result should contain data points"
            assert forecaster.model is not None, "Model should be trained"
            
            # Check metrics
            metrics = training_result['metrics']
            assert 'mae' in metrics, "Missing MAE metric"
            assert 'mape' in metrics, "Missing MAPE metric"
            assert 'rmse' in metrics, "Missing RMSE metric"
            
            # Quality checks
            assert metrics['mape'] < 1.0, f"MAPE too high: {metrics['mape']}"  # Less than 100%
            assert metrics['mae'] > 0, f"MAE should be positive: {metrics['mae']}"
            assert training_time < 30.0, f"Training took too long: {training_time}s"
            
            self.results["performance_metrics"]["training_time"] = training_time
            self.results["model_accuracy"] = metrics
            self.results["validation_details"].append({
                "test": "model_training",
                "status": "passed",
                "details": {
                    "training_time": training_time,
                    "data_points": training_result['data_points'],
                    "metrics": metrics
                }
            })
            
            print(f"✅ Model training test passed")
            print(f"   📊 MAE: {metrics['mae']:.2f}")
            print(f"   📊 MAPE: {metrics['mape']:.2%}")
            print(f"   📊 RMSE: {metrics['rmse']:.2f}")
            print(f"   ⏱️  Training time: {training_time:.2f}s")
            
            return True
            
        except Exception as e:
            error_msg = f"Model training failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            self.results["validation_details"].append({
                "test": "model_training",
                "status": "failed",
                "error": error_msg
            })
            return False
    
    def test_forecast_generation(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test forecast generation for different timeframes"""
        print("\n🔮 Testing forecast generation...")
        
        try:
            forecaster = ProphetFinancialForecaster()
            
            # Preprocess and train
            prophet_df = forecaster.preprocess_transaction_data(transactions)
            forecaster.train_model(prophet_df)
            
            # Test different timeframes
            timeframes = [30, 90, 365]  # 1 month, 3 months, 1 year
            
            for periods in timeframes:
                start_time = datetime.now()
                forecast = forecaster.generate_forecast(
                    periods=periods,
                    freq='D',
                    include_history=False
                )
                forecast_time = (datetime.now() - start_time).total_seconds()
                
                # Validation checks
                assert isinstance(forecast, pd.DataFrame), "Forecast should be DataFrame"
                assert len(forecast) == periods, f"Forecast should have {periods} rows"
                assert 'ds' in forecast.columns, "Missing 'ds' column"
                assert 'yhat' in forecast.columns, "Missing 'yhat' column"
                assert 'yhat_lower' in forecast.columns, "Missing 'yhat_lower' column"
                assert 'yhat_upper' in forecast.columns, "Missing 'yhat_upper' column"
                assert 'confidence_score' in forecast.columns, "Missing confidence scores"
                
                # Quality checks
                assert all(forecast['yhat_lower'] <= forecast['yhat']), "Lower bound should be <= prediction"
                assert all(forecast['yhat'] <= forecast['yhat_upper']), "Prediction should be <= upper bound"
                assert all(0 <= conf <= 1 for conf in forecast['confidence_score']), "Confidence should be 0-1"
                assert forecast_time < 10.0, f"Forecast generation took too long: {forecast_time}s"
                
                self.results["validation_details"].append({
                    "test": f"forecast_generation_{periods}d",
                    "status": "passed",
                    "details": {
                        "periods": periods,
                        "forecast_time": forecast_time,
                        "avg_confidence": forecast['confidence_score'].mean(),
                        "prediction_range": {
                            "min": forecast['yhat'].min(),
                            "max": forecast['yhat'].max()
                        }
                    }
                })
                
                print(f"✅ {periods}-day forecast generated successfully")
                print(f"   ⏱️  Generation time: {forecast_time:.2f}s")
                print(f"   📈 Avg confidence: {forecast['confidence_score'].mean():.2%}")
            
            return True
            
        except Exception as e:
            error_msg = f"Forecast generation failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            self.results["validation_details"].append({
                "test": "forecast_generation",
                "status": "failed",
                "error": error_msg
            })
            return False
    
    def test_category_forecasts(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test category-specific forecasting"""
        print("\n🏷️  Testing category forecasts...")
        
        try:
            forecaster = ProphetFinancialForecaster()
            
            # Generate category forecasts
            start_time = datetime.now()
            category_forecasts = forecaster.get_category_forecasts(transactions, periods=90)
            forecast_time = (datetime.now() - start_time).total_seconds()
            
            # Validation checks
            assert isinstance(category_forecasts, dict), "Category forecasts should be dict"
            assert len(category_forecasts) > 0, "Should have category forecasts"
            
            # Check each category
            for category, forecast_data in category_forecasts.items():
                assert 'historical_average' in forecast_data, f"Missing historical_average for {category}"
                assert 'predicted_average' in forecast_data, f"Missing predicted_average for {category}"
                assert 'confidence' in forecast_data, f"Missing confidence for {category}"
                assert 'trend' in forecast_data, f"Missing trend for {category}"
                
                # Quality checks
                assert 0 <= forecast_data['confidence'] <= 1, f"Invalid confidence for {category}"
                assert forecast_data['trend'] in ['increasing', 'decreasing', 'stable'], f"Invalid trend for {category}"
                assert forecast_data['historical_average'] >= 0, f"Negative historical average for {category}"
                assert forecast_data['predicted_average'] >= 0, f"Negative predicted average for {category}"
            
            self.results["validation_details"].append({
                "test": "category_forecasts",
                "status": "passed",
                "details": {
                    "categories_count": len(category_forecasts),
                    "forecast_time": forecast_time,
                    "categories": list(category_forecasts.keys())
                }
            })
            
            print(f"✅ Category forecasts generated successfully")
            print(f"   📊 Categories: {len(category_forecasts)}")
            print(f"   ⏱️  Generation time: {forecast_time:.2f}s")
            
            return True
            
        except Exception as e:
            error_msg = f"Category forecasts failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            self.results["validation_details"].append({
                "test": "category_forecasts",
                "status": "failed",
                "error": error_msg
            })
            return False
    
    def test_error_handling(self) -> bool:
        """Test error handling with invalid data"""
        print("\n🚨 Testing error handling...")
        
        try:
            forecaster = ProphetFinancialForecaster()
            
            # Test 1: Empty data
            try:
                forecaster.preprocess_transaction_data([])
                print("✅ Empty data handled gracefully")
            except Exception as e:
                print(f"❌ Empty data not handled: {e}")
                return False
            
            # Test 2: Invalid data format
            try:
                invalid_data = [{"invalid": "data"}]
                forecaster.preprocess_transaction_data(invalid_data)
                print("❌ Invalid data should have raised an error")
                return False
            except Exception:
                print("✅ Invalid data rejected appropriately")
            
            # Test 3: Insufficient data for training
            try:
                minimal_data = [{
                    "date": "2024-01-01",
                    "amount": 100,
                    "type": "expense",
                    "category": "test"
                }]
                prophet_df = forecaster.preprocess_transaction_data(minimal_data)
                forecaster.train_model(prophet_df)
                print("❌ Insufficient data should have raised an error")
                return False
            except Exception:
                print("✅ Insufficient data rejected appropriately")
            
            # Test 4: Forecast without training
            try:
                new_forecaster = ProphetFinancialForecaster()
                new_forecaster.generate_forecast(periods=30)
                print("❌ Forecast without training should have raised an error")
                return False
            except ValueError:
                print("✅ Forecast without training rejected appropriately")
            
            self.results["validation_details"].append({
                "test": "error_handling",
                "status": "passed",
                "details": "All error conditions handled appropriately"
            })
            
            return True
            
        except Exception as e:
            error_msg = f"Error handling test failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            return False
    
    def test_performance_benchmarks(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test performance benchmarks"""
        print("\n⚡ Testing performance benchmarks...")
        
        try:
            # Test with different data sizes
            data_sizes = [30, 90, 180, 365]  # Days of data
            
            for days in data_sizes:
                print(f"   Testing with {days} days of data...")
                
                # Generate subset of data
                subset_transactions = [
                    t for t in transactions 
                    if datetime.fromisoformat(t['date']) >= datetime.now() - timedelta(days=days)
                ]
                
                if len(subset_transactions) < 10:
                    continue
                
                forecaster = ProphetFinancialForecaster()
                
                # Measure total time
                start_time = datetime.now()
                
                # Full workflow
                prophet_df = forecaster.preprocess_transaction_data(subset_transactions)
                training_result = forecaster.train_model(prophet_df)
                forecast = forecaster.generate_forecast(periods=90)
                
                total_time = (datetime.now() - start_time).total_seconds()
                
                # Performance assertions
                assert total_time < 60.0, f"Total workflow too slow for {days} days: {total_time}s"
                
                self.results["performance_metrics"][f"workflow_{days}d"] = {
                    "total_time": total_time,
                    "transactions": len(subset_transactions),
                    "time_per_transaction": total_time / len(subset_transactions)
                }
                
                print(f"     ⏱️  Total time: {total_time:.2f}s")
                print(f"     📊 Transactions: {len(subset_transactions)}")
            
            print("✅ Performance benchmarks passed")
            return True
            
        except Exception as e:
            error_msg = f"Performance benchmarks failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            return False
    
    def test_data_quality_validation(self, transactions: List[Dict[str, Any]]) -> bool:
        """Test data quality validation"""
        print("\n🔍 Testing data quality validation...")
        
        try:
            # Test validation methods
            ErrorHandler.validate_data_sufficiency(len(transactions), minimum_required=30)
            print("✅ Data sufficiency validation passed")
            
            # Test timeframe validation
            for timeframe in ["months_3", "months_6", "year_1"]:
                ErrorHandler.validate_timeframe(timeframe)
            print("✅ Timeframe validation passed")
            
            # Test with invalid timeframe
            try:
                ErrorHandler.validate_timeframe("invalid_timeframe")
                print("❌ Invalid timeframe should have been rejected")
                return False
            except Exception:
                print("✅ Invalid timeframe rejected appropriately")
            
            self.results["validation_details"].append({
                "test": "data_quality_validation",
                "status": "passed",
                "details": "All validation methods working correctly"
            })
            
            return True
            
        except Exception as e:
            error_msg = f"Data quality validation failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.results["errors"].append(error_msg)
            return False
    
    def run_validation_suite(self) -> Dict[str, Any]:
        """Run the complete validation suite"""
        print("=" * 80)
        print("🚀 PROPHET INTEGRATION VALIDATION SUITE")
        print("=" * 80)
        
        # Generate test data
        transactions = self.generate_realistic_transaction_data(days=180)
        
        # Define test cases
        test_cases = [
            ("Data Preprocessing", lambda: self.test_data_preprocessing(transactions)),
            ("Model Training", lambda: self.test_model_training(transactions)),
            ("Forecast Generation", lambda: self.test_forecast_generation(transactions)),
            ("Category Forecasts", lambda: self.test_category_forecasts(transactions)),
            ("Error Handling", lambda: self.test_error_handling()),
            ("Performance Benchmarks", lambda: self.test_performance_benchmarks(transactions)),
            ("Data Quality Validation", lambda: self.test_data_quality_validation(transactions))
        ]
        
        # Run tests
        for test_name, test_func in test_cases:
            self.results["tests_run"] += 1
            try:
                if test_func():
                    self.results["tests_passed"] += 1
                else:
                    self.results["tests_failed"] += 1
            except Exception as e:
                print(f"❌ {test_name} crashed: {str(e)}")
                self.results["tests_failed"] += 1
                self.results["errors"].append(f"{test_name}: {str(e)}")
        
        # Generate summary
        self.generate_validation_report()
        
        return self.results
    
    def generate_validation_report(self):
        """Generate validation report"""
        print("\n" + "=" * 80)
        print("📊 VALIDATION REPORT")
        print("=" * 80)
        
        # Test summary
        total_tests = self.results["tests_run"]
        passed_tests = self.results["tests_passed"]
        failed_tests = self.results["tests_failed"]
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Tests Run: {total_tests}")
        print(f"Tests Passed: {passed_tests}")
        print(f"Tests Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Performance metrics
        if self.results["performance_metrics"]:
            print("\n📈 PERFORMANCE METRICS:")
            for metric, value in self.results["performance_metrics"].items():
                if isinstance(value, dict):
                    print(f"  {metric}:")
                    for k, v in value.items():
                        print(f"    {k}: {v}")
                else:
                    print(f"  {metric}: {value}")
        
        # Model accuracy
        if self.results["model_accuracy"]:
            print("\n🎯 MODEL ACCURACY:")
            for metric, value in self.results["model_accuracy"].items():
                if metric == "mape":
                    print(f"  {metric.upper()}: {value:.2%}")
                else:
                    print(f"  {metric.upper()}: {value:.2f}")
        
        # Errors
        if self.results["errors"]:
            print("\n🚨 ERRORS:")
            for error in self.results["errors"]:
                print(f"  - {error}")
        
        # Overall status
        print("\n" + "=" * 80)
        if failed_tests == 0:
            print("🎉 ALL TESTS PASSED! Prophet integration is working correctly.")
        else:
            print(f"⚠️  {failed_tests} TESTS FAILED. Please review the errors above.")
        print("=" * 80)
        
        # Save detailed report
        report_file = "prophet_validation_report.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"\n📄 Detailed report saved to: {report_file}")

def main():
    """Main validation function"""
    validator = ProphetValidationSuite()
    results = validator.run_validation_suite()
    
    # Exit code based on results
    if results["tests_failed"] == 0:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure

if __name__ == "__main__":
    main()