"""
AI Insights Service for BudgetMe Prophet Predictions
Integrates with OpenRouter API to generate contextual financial insights
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
import json
import os
from datetime import datetime, timedelta

from models.schemas import (
    AIInsight,
    ProphetPredictionPoint,
    CategoryForecast,
    UserFinancialProfile,
    ModelAccuracy
)
from utils.exceptions import RateLimitError

logger = logging.getLogger(__name__)

class AIInsightsService:
    """
    Service for generating AI-powered insights from Prophet predictions
    """
    
    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b:free"):
        """
        Initialize AI insights service
        
        Args:
            api_key: OpenRouter API key
            model: Model to use for insights generation
        """
        self.api_key = api_key
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1"
        self.timeout = 30.0
        
    async def generate_prophet_insights(
        self,
        predictions: List[ProphetPredictionPoint],
        user_profile: UserFinancialProfile,
        category_forecasts: Dict[str, CategoryForecast],
        model_accuracy: ModelAccuracy,
        timeframe: str
    ) -> List[AIInsight]:
        """
        Generate comprehensive AI insights from Prophet predictions
        
        Args:
            predictions: Prophet prediction data points
            user_profile: User's financial profile
            category_forecasts: Category-specific forecasts
            model_accuracy: Model performance metrics
            timeframe: Prediction timeframe
            
        Returns:
            List of AI insights with recommendations
        """
        try:
            # Prepare context for AI analysis
            context = self._build_analysis_context(
                predictions, user_profile, category_forecasts, model_accuracy, timeframe
            )
            
            # Generate insights in parallel for different aspects
            insights = await self._generate_insights_parallel(context)
            
            return insights
            
        except RateLimitError as e:
            logger.warning(f"Rate limit exceeded for OpenRouter API: {str(e)}")
            # Return a single insight explaining the rate limit
            return [AIInsight(
                title="AI Insights Temporarily Unavailable",
                description=f"AI insights are temporarily unavailable due to rate limiting. {e.message}",
                category="rate_limit",
                confidence=1.0,
                recommendation="Please try again later to generate AI-powered insights."
            )]
        except Exception as e:
            logger.error(f"Error generating Prophet insights: {str(e)}")
            return self._generate_fallback_insights(predictions, user_profile)
    
    def _build_analysis_context(
        self,
        predictions: List[ProphetPredictionPoint],
        user_profile: UserFinancialProfile,
        category_forecasts: Dict[str, CategoryForecast],
        model_accuracy: ModelAccuracy,
        timeframe: str
    ) -> Dict[str, Any]:
        """Build comprehensive context for AI analysis"""
        
        # Calculate key metrics
        predicted_values = [p.predicted for p in predictions]
        avg_predicted = sum(predicted_values) / len(predicted_values) if predicted_values else 0
        trend_direction = predictions[-1].trend - predictions[0].trend if len(predictions) > 1 else 0
        avg_confidence = sum(p.confidence for p in predictions) / len(predictions) if predictions else 0
        
        # Analyze category trends
        category_insights = []
        for category, forecast in category_forecasts.items():
            change = forecast.predicted_average - forecast.historical_average
            change_percent = (change / forecast.historical_average * 100) if forecast.historical_average > 0 else 0
            
            category_insights.append({
                "category": category,
                "historical_avg": forecast.historical_average,
                "predicted_avg": forecast.predicted_average,
                "change": change,
                "change_percent": change_percent,
                "trend": forecast.trend,
                "confidence": forecast.confidence
            })
        
        # Sort categories by impact
        category_insights.sort(key=lambda x: abs(x['change']), reverse=True)
        
        return {
            "timeframe": timeframe,
            "user_profile": {
                "monthly_income": user_profile.avg_monthly_income,
                "monthly_expenses": user_profile.avg_monthly_expenses,
                "savings_rate": user_profile.savings_rate,
                "transaction_count": user_profile.transaction_count
            },
            "predictions": {
                "average_predicted": avg_predicted,
                "trend_direction": trend_direction,
                "average_confidence": avg_confidence,
                "data_points": len(predictions),
                "first_prediction": predictions[0].predicted if predictions else 0,
                "last_prediction": predictions[-1].predicted if predictions else 0
            },
            "model_performance": {
                "mae": model_accuracy.mae,
                "mape": model_accuracy.mape,
                "rmse": model_accuracy.rmse,
                "data_points": model_accuracy.data_points
            },
            "category_analysis": category_insights[:5],  # Top 5 categories by impact
            "financial_health": self._assess_financial_health(user_profile, avg_predicted)
        }
    
    def _assess_financial_health(
        self, 
        user_profile: UserFinancialProfile, 
        avg_predicted: float
    ) -> Dict[str, Any]:
        """Assess user's financial health indicators"""
        
        # Calculate financial ratios
        savings_rate = user_profile.savings_rate
        expense_ratio = user_profile.avg_monthly_expenses / user_profile.avg_monthly_income if user_profile.avg_monthly_income > 0 else 1
        
        # Determine financial stability level
        if savings_rate >= 0.2:  # 20%+ savings rate
            stability = "excellent"
        elif savings_rate >= 0.1:  # 10-20% savings rate
            stability = "good"
        elif savings_rate >= 0:  # Breaking even
            stability = "fair"
        else:  # Spending more than earning
            stability = "poor"
        
        return {
            "stability_level": stability,
            "savings_rate": savings_rate,
            "expense_ratio": expense_ratio,
            "predicted_net_flow": avg_predicted,
            "emergency_fund_months": max(0, user_profile.savings_rate * user_profile.avg_monthly_income * 6) if user_profile.avg_monthly_expenses > 0 else 0
        }
    
    async def _generate_insights_parallel(self, context: Dict[str, Any]) -> List[AIInsight]:
        """Generate different types of insights in parallel"""
        
        # Define insight generation tasks
        tasks = [
            self._generate_trend_insight(context),
            self._generate_category_insight(context),
            self._generate_risk_insight(context),
            self._generate_opportunity_insight(context),
            self._generate_goal_insight(context)
        ]
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check for rate limiting first
        for result in results:
            if isinstance(result, RateLimitError):
                # If any task hit rate limit, propagate it
                raise result
        
        # Filter out exceptions and None results
        insights = []
        for result in results:
            if isinstance(result, AIInsight):
                insights.append(result)
            elif isinstance(result, Exception):
                logger.warning(f"Insight generation failed: {str(result)}")
        
        return insights
    
    async def _generate_trend_insight(self, context: Dict[str, Any]) -> Optional[AIInsight]:
        """Generate insight about financial trends"""
        try:
            prompt = f"""
            Analyze the financial trend data and provide insights:
            
            Financial Trend Analysis:
            - Timeframe: {context['timeframe']}
            - Average predicted monthly flow: ₱{context['predictions']['average_predicted']:.2f}
            - Trend direction: {context['predictions']['trend_direction']:.2f}
            - Model confidence: {context['predictions']['average_confidence']:.1%}
            - Current savings rate: {context['user_profile']['savings_rate']:.1%}
            
            Provide a concise trend insight (max 100 words) focusing on:
            1. What the trend indicates about financial direction
            2. Key factors driving the trend
            3. One specific actionable recommendation
            
            Format as JSON:
            {{
                "title": "Brief trend title",
                "description": "Trend analysis description",
                "recommendation": "Specific actionable advice"
            }}
            """
            
            response = await self._call_openrouter_api(prompt)
            return self._parse_insight_response(response, "trend", context['predictions']['average_confidence'])
            
        except RateLimitError:
            # Don't generate fallback for rate limiting - let it bubble up
            raise
        except Exception as e:
            logger.error(f"Error generating trend insight: {str(e)}")
            return self._create_fallback_trend_insight(context)
    
    async def _generate_category_insight(self, context: Dict[str, Any]) -> Optional[AIInsight]:
        """Generate insight about category spending patterns"""
        try:
            top_categories = context['category_analysis'][:3]
            
            prompt = f"""
            Analyze category spending patterns and provide insights:
            
            Top Category Changes:
            {json.dumps(top_categories, indent=2)}
            
            User Profile:
            - Monthly income: ₱{context['user_profile']['monthly_income']:.2f}
            - Monthly expenses: ₱{context['user_profile']['monthly_expenses']:.2f}
            
            Provide category insights (max 100 words) focusing on:
            1. Most significant category changes
            2. Spending pattern implications
            3. Specific optimization recommendation
            
            Format as JSON:
            {{
                "title": "Category spending insight title",
                "description": "Category analysis description",
                "recommendation": "Specific category optimization advice"
            }}
            """
            
            response = await self._call_openrouter_api(prompt)
            return self._parse_insight_response(response, "category", 0.8)
            
        except RateLimitError:
            # Don't generate fallback for rate limiting - let it bubble up
            raise
        except Exception as e:
            logger.error(f"Error generating category insight: {str(e)}")
            return self._create_fallback_category_insight(context)
    
    async def _generate_risk_insight(self, context: Dict[str, Any]) -> Optional[AIInsight]:
        """Generate insight about financial risks"""
        try:
            financial_health = context['financial_health']
            
            prompt = f"""
            Analyze financial risks based on this data:
            
            Financial Health Assessment:
            - Stability level: {financial_health['stability_level']}
            - Savings rate: {financial_health['savings_rate']:.1%}
            - Expense ratio: {financial_health['expense_ratio']:.1%}
            - Predicted net flow: ₱{financial_health['predicted_net_flow']:.2f}
            
            Model Performance:
            - Prediction accuracy (MAE): ₱{context['model_performance']['mae']:.2f}
            - Reliability (MAPE): {context['model_performance']['mape']:.1%}
            
            Provide risk assessment (max 100 words) focusing on:
            1. Primary financial risks identified
            2. Risk probability and impact
            3. Specific mitigation strategy
            
            Format as JSON:
            {{
                "title": "Financial risk insight title",
                "description": "Risk analysis description", 
                "recommendation": "Specific risk mitigation advice"
            }}
            """
            
            response = await self._call_openrouter_api(prompt)
            return self._parse_insight_response(response, "risk", 0.85)
            
        except RateLimitError:
            # Don't generate fallback for rate limiting - let it bubble up
            raise
        except Exception as e:
            logger.error(f"Error generating risk insight: {str(e)}")
            return self._create_fallback_risk_insight(context)
    
    async def _generate_opportunity_insight(self, context: Dict[str, Any]) -> Optional[AIInsight]:
        """Generate insight about financial opportunities"""
        try:
            prompt = f"""
            Identify financial opportunities based on this analysis:
            
            Current Financial Position:
            - Monthly income: ₱{context['user_profile']['monthly_income']:.2f}
            - Savings rate: {context['user_profile']['savings_rate']:.1%}
            - Predicted trend: {context['predictions']['trend_direction']:.2f}
            
            Category Performance:
            {json.dumps(context['category_analysis'][:2], indent=2)}
            
            Provide opportunity insights (max 100 words) focusing on:
            1. Specific opportunities for improvement
            2. Potential financial gains
            3. Actionable steps to capitalize
            
            Format as JSON:
            {{
                "title": "Financial opportunity title",
                "description": "Opportunity analysis description",
                "recommendation": "Specific action to take advantage"
            }}
            """
            
            response = await self._call_openrouter_api(prompt)
            return self._parse_insight_response(response, "opportunity", 0.75)
            
        except RateLimitError:
            # Don't generate fallback for rate limiting - let it bubble up
            raise
        except Exception as e:
            logger.error(f"Error generating opportunity insight: {str(e)}")
            return self._create_fallback_opportunity_insight(context)
    
    async def _generate_goal_insight(self, context: Dict[str, Any]) -> Optional[AIInsight]:
        """Generate insight about financial goals and planning"""
        try:
            predicted_flow = context['predictions']['average_predicted']
            timeframe = context['timeframe']
            
            prompt = f"""
            Provide financial goal recommendations based on:
            
            Financial Trajectory:
            - Predicted monthly flow: ₱{predicted_flow:.2f}
            - Timeframe: {timeframe}
            - Current savings rate: {context['user_profile']['savings_rate']:.1%}
            - Financial stability: {context['financial_health']['stability_level']}
            
            Provide goal-setting insights (max 100 words) focusing on:
            1. Realistic financial goals for this timeframe
            2. Goal achievability assessment
            3. Specific steps to reach goals
            
            Format as JSON:
            {{
                "title": "Financial goal insight title",
                "description": "Goal recommendations description",
                "recommendation": "Specific goal-setting advice"
            }}
            """
            
            response = await self._call_openrouter_api(prompt)
            return self._parse_insight_response(response, "goal", 0.8)
            
        except RateLimitError:
            # Don't generate fallback for rate limiting - let it bubble up
            raise
        except Exception as e:
            logger.error(f"Error generating goal insight: {str(e)}")
            return self._create_fallback_goal_insight(context)
    
    async def _call_openrouter_api(self, prompt: str) -> Dict[str, Any]:
        """Make API call to OpenRouter with proper rate limiting detection"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a financial advisor AI specializing in Prophet model interpretation and financial forecasting analysis. Provide concise, actionable insights in valid JSON format only."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                # Check for rate limiting
                if response.status_code == 429:
                    retry_after = response.headers.get('retry-after')
                    retry_seconds = int(retry_after) if retry_after else None
                    
                    logger.warning(f"OpenRouter API rate limit exceeded. Retry after: {retry_seconds}s")
                    raise RateLimitError(
                        service_name="OpenRouter API",
                        retry_after=retry_seconds
                    )
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    retry_after = e.response.headers.get('retry-after')
                    retry_seconds = int(retry_after) if retry_after else None
                    
                    logger.warning(f"OpenRouter API rate limit exceeded. Retry after: {retry_seconds}s")
                    raise RateLimitError(
                        service_name="OpenRouter API",
                        retry_after=retry_seconds
                    )
                else:
                    # Re-raise for other HTTP errors
                    raise
    
    def _parse_insight_response(
        self, 
        response: Dict[str, Any], 
        category: str, 
        confidence: float
    ) -> AIInsight:
        """Parse OpenRouter API response into AIInsight"""
        
        try:
            # Extract content from response
            content = response["choices"][0]["message"]["content"]
            
            # Parse JSON content
            insight_data = json.loads(content)
            
            return AIInsight(
                title=insight_data.get("title", f"{category.title()} Analysis"),
                description=insight_data.get("description", "AI analysis completed"),
                category=category,
                confidence=confidence,
                recommendation=insight_data.get("recommendation")
            )
            
        except Exception as e:
            logger.error(f"Error parsing insight response: {str(e)}")
            return AIInsight(
                title=f"{category.title()} Insight",
                description="AI analysis generated with limited context",
                category=category,
                confidence=0.6,
                recommendation="Review your financial data for more detailed insights"
            )
    
    def _generate_fallback_insights(
        self, 
        predictions: List[ProphetPredictionPoint], 
        user_profile: UserFinancialProfile
    ) -> List[AIInsight]:
        """Generate basic insights when AI service is unavailable"""
        
        insights = []
        
        if predictions:
            avg_predicted = sum(p.predicted for p in predictions) / len(predictions)
            
            # Basic trend insight
            if avg_predicted > 0:
                insights.append(AIInsight(
                    title="Positive Financial Trend",
                    description=f"Your financial forecast shows an average positive flow of ₱{avg_predicted:.2f}",
                    category="trend",
                    confidence=0.7,
                    recommendation="Consider increasing your savings or investments"
                ))
            else:
                insights.append(AIInsight(
                    title="Financial Caution Needed",
                    description=f"Your forecast indicates potential negative flow of ₱{avg_predicted:.2f}",
                    category="trend", 
                    confidence=0.7,
                    recommendation="Review and optimize your spending to improve cash flow"
                ))
        
        # Savings rate insight
        if user_profile.savings_rate > 0.1:
            insights.append(AIInsight(
                title="Strong Savings Performance",
                description=f"Your savings rate of {user_profile.savings_rate:.1%} is above average",
                category="savings",
                confidence=0.9,
                recommendation="Continue maintaining this healthy savings habit"
            ))
        
        return insights
    
    def _create_fallback_trend_insight(self, context: Dict[str, Any]) -> AIInsight:
        """Create fallback trend insight"""
        trend = context['predictions']['trend_direction']
        
        if trend > 0:
            return AIInsight(
                title="Upward Financial Trend",
                description="Your financial trajectory shows positive momentum",
                category="trend",
                confidence=0.7,
                recommendation="Capitalize on this trend by increasing savings"
            )
        else:
            return AIInsight(
                title="Financial Trend Caution",
                description="Your financial trend suggests careful monitoring is needed",
                category="trend",
                confidence=0.7,
                recommendation="Review spending patterns and identify optimization opportunities"
            )
    
    def _create_fallback_category_insight(self, context: Dict[str, Any]) -> AIInsight:
        """Create fallback category insight"""
        categories = context['category_analysis']
        
        if categories:
            top_category = categories[0]
            return AIInsight(
                title=f"{top_category['category'].title()} Spending Alert",
                description=f"Significant change detected in {top_category['category']} spending",
                category="category",
                confidence=0.7,
                recommendation=f"Review your {top_category['category']} budget allocation"
            )
        
        return AIInsight(
            title="Category Analysis",
            description="Monitor your spending categories for optimization opportunities",
            category="category",
            confidence=0.6,
            recommendation="Track spending patterns across different categories"
        )
    
    def _create_fallback_risk_insight(self, context: Dict[str, Any]) -> AIInsight:
        """Create fallback risk insight"""
        stability = context['financial_health']['stability_level']
        
        if stability == "poor":
            return AIInsight(
                title="Financial Risk Alert",
                description="Your financial stability requires immediate attention",
                category="risk",
                confidence=0.8,
                recommendation="Create an emergency budget and reduce discretionary spending"
            )
        else:
            return AIInsight(
                title="Financial Risk Assessment",
                description=f"Your financial stability is {stability}",
                category="risk",
                confidence=0.7,
                recommendation="Build an emergency fund for financial security"
            )
    
    def _create_fallback_opportunity_insight(self, context: Dict[str, Any]) -> AIInsight:
        """Create fallback opportunity insight"""
        savings_rate = context['user_profile']['savings_rate']
        
        if savings_rate < 0.1:
            return AIInsight(
                title="Savings Opportunity",
                description="Opportunity to improve your savings rate",
                category="opportunity",
                confidence=0.8,
                recommendation="Aim to save at least 10% of your income monthly"
            )
        else:
            return AIInsight(
                title="Investment Opportunity",
                description="Consider investing your savings for growth",
                category="opportunity",
                confidence=0.7,
                recommendation="Explore investment options suitable for your risk tolerance"
            )
    
    def _create_fallback_goal_insight(self, context: Dict[str, Any]) -> AIInsight:
        """Create fallback goal insight"""
        predicted_flow = context['predictions']['average_predicted']
        
        return AIInsight(
            title="Financial Goal Setting",
            description=f"Based on your predicted ₱{predicted_flow:.2f} monthly flow",
            category="goal",
            confidence=0.7,
            recommendation="Set specific, measurable financial goals for the next 6 months"
        )

# Factory function
def create_ai_insights_service() -> AIInsightsService:
    """Create AI insights service with environment configuration"""
    
    api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY must be set in environment")
    
    model = os.getenv('OPENROUTER_MODEL', 'openai/gpt-oss-120b:free')
    
    return AIInsightsService(api_key=api_key, model=model)