/**
 * Utility functions for prediction service integration with SQL schema
 * Provides initialization and helper methods for prediction functionality
 */

import { supabase } from '../../utils/supabaseClient';

export class PredictionUtils {
  /**
   * Initialize prediction system for a new user
   * Creates necessary usage tracking records
   */
  static async initializePredictionForUser(userId: string): Promise<boolean> {
    try {
      // Create usage limits record
      const { data, error } = await supabase
        .from('prediction_usage_limits')
        .upsert({
          user_id: userId,
          tier: 'free',
          prophet_daily_limit: 10,
          ai_insights_daily_limit: 5,
          total_daily_limit: 20
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error initializing prediction for user:', error);
        return false;
      }

      console.log(`Prediction system initialized for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Database error initializing prediction for user:', error);
      return false;
    }
  }

  /**
   * Get user's current usage statistics
   */
  static async getUserUsageStats(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('prediction_usage_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting user usage stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Get recent prediction activity for a user
   */
  static async getRecentPredictionActivity(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('recent_prediction_activity')
        .select('*')
        .eq('user_id', userId)
        .order('request_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent prediction activity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error getting prediction activity:', error);
      return [];
    }
  }

  /**
   * Cleanup expired predictions (should be run periodically)
   */
  static async cleanupExpiredPredictions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_predictions');

      if (error) {
        console.error('Error cleaning up expired predictions:', error);
        return 0;
      }

      console.log(`Cleaned up ${data} expired prediction records`);
      return data || 0;
    } catch (error) {
      console.error('Database error cleaning up predictions:', error);
      return 0;
    }
  }

  /**
   * Validate prediction service functions are available
   */
  static async validatePredictionFunctions(): Promise<boolean> {
    try {
      // Test that key functions exist
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      // Test usage check function
      const { error: usageError } = await supabase.rpc('can_make_prediction_request', {
        p_user_id: testUserId,
        p_service_type: 'prophet'
      });

      if (usageError && !usageError.message.includes('does not exist')) {
        console.log('Prediction functions are available');
        return true;
      }

      console.warn('Prediction functions may not be available:', usageError?.message);
      return false;
    } catch (error) {
      console.error('Error validating prediction functions:', error);
      return false;
    }
  }

  /**
   * Get usage limits for different tiers
   */
  static getUsageLimitsForTier(tier: string = 'free'): any {
    const limits = {
      free: {
        prophet_daily_limit: 5,
        ai_insights_daily_limit: 3,
        total_daily_limit: 10
      },
      basic: {
        prophet_daily_limit: 20,
        ai_insights_daily_limit: 10,
        total_daily_limit: 50
      },
      premium: {
        prophet_daily_limit: 100,
        ai_insights_daily_limit: 50,
        total_daily_limit: 200
      },
      enterprise: {
        prophet_daily_limit: -1, // Unlimited
        ai_insights_daily_limit: -1,
        total_daily_limit: -1
      }
    };

    return limits[tier as keyof typeof limits] || limits.free;
  }

  /**
   * Upgrade user's prediction tier
   */
  static async upgradeUserTier(userId: string, newTier: string): Promise<boolean> {
    try {
      const limits = this.getUsageLimitsForTier(newTier);
      
      const { data, error } = await supabase
        .from('prediction_usage_limits')
        .update({
          tier: newTier,
          prophet_daily_limit: limits.prophet_daily_limit,
          ai_insights_daily_limit: limits.ai_insights_daily_limit,
          total_daily_limit: limits.total_daily_limit,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error upgrading user tier:', error);
        return false;
      }

      console.log(`User ${userId} upgraded to ${newTier} tier`);
      return true;
    } catch (error) {
      console.error('Database error upgrading user tier:', error);
      return false;
    }
  }

  /**
   * Reset user's daily usage counters (for testing or admin purposes)
   */
  static async resetUserUsage(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('prediction_usage_limits')
        .update({
          prophet_daily_count: 0,
          ai_insights_daily_count: 0,
          total_requests_today: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          rate_limit_remaining: 60,
          rate_limit_reset_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting user usage:', error);
        return false;
      }

      console.log(`Reset usage counters for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Database error resetting user usage:', error);
      return false;
    }
  }
}

// Export utility functions for direct use
export const initializePredictionForUser = PredictionUtils.initializePredictionForUser;
export const getUserUsageStats = PredictionUtils.getUserUsageStats;
export const getRecentPredictionActivity = PredictionUtils.getRecentPredictionActivity;
export const cleanupExpiredPredictions = PredictionUtils.cleanupExpiredPredictions;
export const validatePredictionFunctions = PredictionUtils.validatePredictionFunctions;
export const upgradeUserTier = PredictionUtils.upgradeUserTier;
export const resetUserUsage = PredictionUtils.resetUserUsage;