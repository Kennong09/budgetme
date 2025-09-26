/**
 * useRateLimiter Hook
 * 
 * A React hook for using the Supabase rate limiter in components
 */

import { useState, useCallback } from 'react';
import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

export const useRateLimiter = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [waitTime, setWaitTime] = useState<number | undefined>(undefined);

  /**
   * Execute a function with rate limiting
   */
  const executeWithLimit = useCallback(async <T,>(
    key: string,
    fn: () => Promise<T>,
    options?: { retries?: number }
  ): Promise<T> => {
    try {
      setIsRateLimited(false);
      setWaitTime(undefined);
      
      const result = await SupabaseRateLimiter.executeWithRateLimit(key, fn, options);
      return result;
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.message?.includes('Rate limit exceeded') || error.message?.includes('Please try again')) {
        const rateCheck = SupabaseRateLimiter.isRequestAllowed(key);
        setIsRateLimited(true);
        setWaitTime(rateCheck.waitTime);
      }
      throw error;
    }
  }, []);

  /**
   * Check if a request is allowed
   */
  const checkRateLimit = useCallback((key: string) => {
    return SupabaseRateLimiter.isRequestAllowed(key);
  }, []);

  /**
   * Get rate limit status
   */
  const getRateLimitStatus = useCallback((key: string) => {
    return SupabaseRateLimiter.getRateLimitStatus(key);
  }, []);

  /**
   * Reset rate limit for a key
   */
  const resetRateLimit = useCallback((key: string) => {
    SupabaseRateLimiter.resetRateLimit(key);
    setIsRateLimited(false);
    setWaitTime(undefined);
  }, []);

  return {
    executeWithLimit,
    checkRateLimit,
    getRateLimitStatus,
    resetRateLimit,
    isRateLimited,
    waitTime
  };
};