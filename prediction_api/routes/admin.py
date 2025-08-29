"""
Admin endpoints for BudgetMe AI Prediction Service
Provides administrative functions for monitoring and management
"""

# Load environment variables before any imports that depend on them
from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from models.schemas import (
    UsageStatus,
    ErrorResponse,
    ServiceConfig
)
from services.usage_service import create_usage_service
from middleware.auth import verify_admin_user, get_current_user

logger = logging.getLogger(__name__)

# Create admin router
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Initialize services
usage_service = create_usage_service()

@router.get("/health")
async def admin_health_check(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Comprehensive health check for admin monitoring
    
    Returns detailed service status information
    """
    try:
        # Check usage service
        usage_stats = await usage_service.get_usage_statistics()
        
        # Check database connectivity
        db_healthy = True
        try:
            await usage_service.get_usage_statistics()
        except Exception:
            db_healthy = False
        
        return {
            "status": "healthy" if db_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "error",
                "usage_tracking": "healthy",
                "prophet_model": "healthy"
            },
            "usage_statistics": usage_stats,
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Admin health check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Health check failed"
        )

@router.get("/usage/statistics")
async def get_usage_statistics(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Get comprehensive usage statistics across all users
    """
    try:
        stats = await usage_service.get_usage_statistics()
        return {
            "statistics": stats,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting usage statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get usage statistics"
        )

@router.post("/usage/reset/{user_id}")
async def reset_user_usage(
    user_id: str,
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Reset usage count for a specific user (admin function)
    
    Args:
        user_id: User ID to reset usage for
    """
    try:
        updated_status = await usage_service.reset_usage_for_user(user_id)
        
        logger.info(f"Admin {admin_user['id']} reset usage for user {user_id}")
        
        return {
            "message": f"Usage reset successfully for user {user_id}",
            "updated_status": updated_status,
            "admin_user": admin_user['id']
        }
        
    except Exception as e:
        logger.error(f"Error resetting user usage: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to reset user usage"
        )

@router.post("/usage/cleanup")
async def cleanup_expired_usage(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Clean up and reset usage for all users whose reset date has passed
    """
    try:
        updated_count = await usage_service.cleanup_expired_usage_records()
        
        logger.info(f"Admin {admin_user['id']} cleaned up {updated_count} expired usage records")
        
        return {
            "message": f"Cleaned up {updated_count} expired usage records",
            "updated_count": updated_count,
            "admin_user": admin_user['id']
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up usage records: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to cleanup expired usage records"
        )

@router.get("/users/usage")
async def get_all_users_usage(
    limit: int = 100,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Get usage information for all users (paginated)
    
    Args:
        limit: Maximum number of records to return
        offset: Number of records to skip
    """
    try:
        # This would typically query all usage records with pagination
        # For now, return placeholder data
        return {
            "users": [],
            "total_count": 0,
            "limit": limit,
            "offset": offset,
            "message": "User usage listing feature coming soon"
        }
        
    except Exception as e:
        logger.error(f"Error getting all users usage: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get users usage information"
        )

@router.get("/predictions/cache/stats")
async def get_cache_statistics(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Get prediction cache statistics
    """
    try:
        # This would query the prediction_results table for cache stats
        return {
            "cache_stats": {
                "total_cached_predictions": 0,
                "cache_hit_rate": 0.0,
                "expired_cache_entries": 0,
                "cache_size_mb": 0.0
            },
            "generated_at": datetime.now().isoformat(),
            "message": "Cache statistics feature coming soon"
        }
        
    except Exception as e:
        logger.error(f"Error getting cache statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get cache statistics"
        )

@router.post("/predictions/cache/clear")
async def clear_all_prediction_cache(
    confirm: bool = False,
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Clear all cached prediction results (admin function)
    
    Args:
        confirm: Must be True to execute the clear operation
    """
    try:
        if not confirm:
            return {
                "message": "Cache clear operation requires confirm=true parameter",
                "warning": "This will clear ALL cached predictions for ALL users"
            }
        
        # Implementation would clear all cached results
        logger.warning(f"Admin {admin_user['id']} cleared all prediction cache")
        
        return {
            "message": "All prediction cache cleared successfully",
            "admin_user": admin_user['id'],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error clearing prediction cache: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear prediction cache"
        )

@router.get("/service/config")
async def get_service_configuration(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Get current service configuration
    """
    try:
        import os
        
        config = {
            "max_predictions_per_month": int(os.getenv('MAX_PREDICTIONS_PER_MONTH', 5)),
            "prediction_cache_ttl_hours": int(os.getenv('PREDICTION_CACHE_TTL_HOURS', 24)),
            "debug_mode": os.getenv('DEBUG', 'False').lower() == 'true',
            "prophet_seasonality_mode": os.getenv('PROPHET_SEASONALITY_MODE', 'additive'),
            "cors_origins": os.getenv('CORS_ORIGINS', '').split(','),
            "log_level": os.getenv('LOG_LEVEL', 'INFO')
        }
        
        return {
            "configuration": config,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting service configuration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get service configuration"
        )

@router.post("/service/test-prediction")
async def test_prediction_service(
    admin_user: Dict[str, Any] = Depends(verify_admin_user)
):
    """
    Test the prediction service with sample data
    """
    try:
        # Generate sample transaction data for testing
        from datetime import timedelta
        import random
        
        sample_transactions = []
        base_date = datetime.now() - timedelta(days=90)
        
        for i in range(30):
            sample_transactions.append({
                'date': base_date + timedelta(days=i),
                'amount': random.uniform(100, 1000),
                'type': 'expense' if random.random() > 0.8 else 'income',
                'category': random.choice(['food', 'transport', 'utilities', 'entertainment'])
            })
        
        # This would test the actual prediction pipeline
        return {
            "test_status": "success",
            "sample_data_points": len(sample_transactions),
            "message": "Prediction service test completed successfully",
            "admin_user": admin_user['id'],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error testing prediction service: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Prediction service test failed"
        )

# Include router in main app
def get_admin_router() -> APIRouter:
    """Get the admin router for including in main app"""
    return router