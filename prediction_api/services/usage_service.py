"""
Usage Tracking Service for BudgetMe AI Prediction Limits
Manages user prediction quotas with monthly reset functionality
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from supabase.client import create_client, Client
import os
from models.schemas import UsageStatus, UsageUpdateRequest, PredictionUsageDB

logger = logging.getLogger(__name__)

class UsageTrackingService:
    """
    Service for tracking and managing user prediction usage limits
    """
    
    def __init__(self, supabase_url: str, supabase_key: str, max_usage: int = 5):
        """
        Initialize usage tracking service
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
            max_usage: Maximum predictions per month (default: 5)
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.max_usage = max_usage
        
    async def get_user_usage(self, user_id: str) -> UsageStatus:
        """
        Get current usage status for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            UsageStatus object with current usage information
        """
        try:
            # Query user usage from database
            result = self.supabase.table('prediction_usage') \
                .select('*') \
                .eq('user_id', user_id) \
                .execute()
            
            if not result.data:
                # Initialize usage record for new user
                await self._initialize_user_usage(user_id)
                return UsageStatus(
                    user_id=user_id,
                    current_usage=0,
                    max_usage=self.max_usage,
                    reset_date=datetime.now() + timedelta(days=30),
                    exceeded=False,
                    remaining=self.max_usage
                )
            
            usage_data = result.data[0]
            current_usage = usage_data['usage_count']
            reset_date = datetime.fromisoformat(usage_data['reset_date'].replace('Z', '+00:00'))
            
            # Check if reset is needed
            if datetime.now() > reset_date:
                await self._reset_user_usage(user_id)
                current_usage = 0
                reset_date = datetime.now() + timedelta(days=30)
            
            exceeded = current_usage >= self.max_usage
            remaining = max(0, self.max_usage - current_usage)
            
            return UsageStatus(
                user_id=user_id,
                current_usage=current_usage,
                max_usage=self.max_usage,
                reset_date=reset_date,
                exceeded=exceeded,
                remaining=remaining
            )
            
        except Exception as e:
            logger.error(f"Error getting user usage for {user_id}: {str(e)}")
            raise
    
    async def increment_usage(self, user_id: str, increment_by: int = 1) -> UsageStatus:
        """
        Increment user's prediction usage count
        
        Args:
            user_id: User identifier
            increment_by: Amount to increment by (default: 1)
            
        Returns:
            Updated UsageStatus
        """
        try:
            # Get current usage
            current_status = await self.get_user_usage(user_id)
            
            # Check if increment would exceed limit
            new_usage = current_status.current_usage + increment_by
            if new_usage > self.max_usage:
                logger.warning(f"Usage increment would exceed limit for user {user_id}")
                # Return current status without incrementing
                return current_status
            
            # Update usage count in database
            result = self.supabase.table('prediction_usage') \
                .update({
                    'usage_count': new_usage,
                    'updated_at': datetime.now().isoformat()
                }) \
                .eq('user_id', user_id) \
                .execute()
            
            if not result.data:
                raise Exception("Failed to update usage count")
            
            # Return updated status
            return UsageStatus(
                user_id=user_id,
                current_usage=new_usage,
                max_usage=self.max_usage,
                reset_date=current_status.reset_date,
                exceeded=new_usage >= self.max_usage,
                remaining=max(0, self.max_usage - new_usage)
            )
            
        except Exception as e:
            logger.error(f"Error incrementing usage for {user_id}: {str(e)}")
            raise
    
    async def check_usage_limit(self, user_id: str) -> bool:
        """
        Check if user has exceeded their usage limit
        
        Args:
            user_id: User identifier
            
        Returns:
            True if user can make another prediction, False if limit exceeded
        """
        try:
            status = await self.get_user_usage(user_id)
            return not status.exceeded
            
        except Exception as e:
            logger.error(f"Error checking usage limit for {user_id}: {str(e)}")
            # Default to allowing usage if there's an error
            return True
    
    async def reset_usage_for_user(self, user_id: str) -> UsageStatus:
        """
        Manually reset usage for a specific user (admin function)
        
        Args:
            user_id: User identifier
            
        Returns:
            Updated UsageStatus
        """
        try:
            await self._reset_user_usage(user_id)
            return await self.get_user_usage(user_id)
            
        except Exception as e:
            logger.error(f"Error resetting usage for {user_id}: {str(e)}")
            raise
    
    async def _initialize_user_usage(self, user_id: str) -> None:
        """
        Initialize usage tracking for a new user
        
        Args:
            user_id: User identifier
        """
        try:
            reset_date = datetime.now() + timedelta(days=30)
            
            result = self.supabase.table('prediction_usage') \
                .insert({
                    'user_id': user_id,
                    'usage_count': 0,
                    'max_usage': self.max_usage,
                    'reset_date': reset_date.isoformat(),
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }) \
                .execute()
            
            if not result.data:
                raise Exception("Failed to initialize user usage")
                
            logger.info(f"Initialized usage tracking for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error initializing usage for {user_id}: {str(e)}")
            raise
    
    async def _reset_user_usage(self, user_id: str) -> None:
        """
        Reset usage count and update reset date for a user
        
        Args:
            user_id: User identifier
        """
        try:
            new_reset_date = datetime.now() + timedelta(days=30)
            
            result = self.supabase.table('prediction_usage') \
                .update({
                    'usage_count': 0,
                    'reset_date': new_reset_date.isoformat(),
                    'updated_at': datetime.now().isoformat()
                }) \
                .eq('user_id', user_id) \
                .execute()
            
            if not result.data:
                raise Exception("Failed to reset user usage")
                
            logger.info(f"Reset usage for user {user_id}, new reset date: {new_reset_date}")
            
        except Exception as e:
            logger.error(f"Error resetting usage for {user_id}: {str(e)}")
            raise
    
    async def cleanup_expired_usage_records(self) -> int:
        """
        Cleanup and reset usage for all users whose reset date has passed
        
        Returns:
            Number of records updated
        """
        try:
            current_time = datetime.now().isoformat()
            
            # Get all users whose reset date has passed
            result = self.supabase.table('prediction_usage') \
                .select('user_id') \
                .lt('reset_date', current_time) \
                .execute()
            
            if not result.data:
                return 0
            
            # Reset usage for each expired user
            updated_count = 0
            for record in result.data:
                try:
                    await self._reset_user_usage(record['user_id'])
                    updated_count += 1
                except Exception as e:
                    logger.error(f"Failed to reset usage for user {record['user_id']}: {str(e)}")
            
            logger.info(f"Reset usage for {updated_count} users")
            return updated_count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return 0
    
    async def get_usage_statistics(self) -> Dict[str, Any]:
        """
        Get usage statistics across all users
        
        Returns:
            Dictionary with usage statistics
        """
        try:
            # Get all usage records
            result = self.supabase.table('prediction_usage') \
                .select('usage_count, max_usage, reset_date') \
                .execute()
            
            if not result.data:
                return {
                    'total_users': 0,
                    'average_usage': 0,
                    'users_at_limit': 0,
                    'users_over_limit': 0
                }
            
            total_users = len(result.data)
            total_usage = sum(record['usage_count'] for record in result.data)
            average_usage = total_usage / total_users if total_users > 0 else 0
            
            users_at_limit = len([r for r in result.data if r['usage_count'] >= r['max_usage']])
            users_over_limit = len([r for r in result.data if r['usage_count'] > r['max_usage']])
            
            # Count users needing reset
            current_time = datetime.now()
            users_needing_reset = len([
                r for r in result.data 
                if datetime.fromisoformat(r['reset_date'].replace('Z', '+00:00')) < current_time
            ])
            
            return {
                'total_users': total_users,
                'average_usage': round(average_usage, 2),
                'users_at_limit': users_at_limit,
                'users_over_limit': users_over_limit,
                'users_needing_reset': users_needing_reset,
                'max_usage_per_user': self.max_usage
            }
            
        except Exception as e:
            logger.error(f"Error getting usage statistics: {str(e)}")
            return {}

# Factory function to create usage service
def create_usage_service(max_usage: Optional[int] = None) -> UsageTrackingService:
    """
    Create a UsageTrackingService instance with environment configuration
    
    Args:
        max_usage: Override default max usage limit
        
    Returns:
        Configured UsageTrackingService instance
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
    
    max_usage = max_usage or int(os.getenv('MAX_PREDICTIONS_PER_MONTH', 5))
    
    return UsageTrackingService(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        max_usage=max_usage
    )