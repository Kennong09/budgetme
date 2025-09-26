/**
 * Supabase Rate Limit Utilities
 * 
 * Utility functions for implementing rate limiting in various parts of the application
 */

import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

/**
 * Rate limited database operations
 */
export const rateLimitedDbOperation = {
  select: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`db:select:${key}`, operation);
  },
  
  insert: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`db:insert:${key}`, operation);
  },
  
  update: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`db:update:${key}`, operation);
  },
  
  delete: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`db:delete:${key}`, operation);
  }
};

/**
 * Rate limited storage operations
 */
export const rateLimitedStorageOperation = {
  upload: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`storage:upload:${key}`, operation);
  },
  
  download: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`storage:download:${key}`, operation);
  }
};

/**
 * Rate limited function calls
 */
export const rateLimitedFunctionCall = {
  invoke: async <T>(key: string, operation: () => Promise<T>) => {
    return SupabaseRateLimiter.executeWithRateLimit(`functions:invoke:${key}`, operation);
  }
};

/**
 * Predefined rate limit keys for common operations
 */
export const RATE_LIMIT_KEYS = {
  // Auth operations
  AUTH_SIGNUP: (email: string) => `auth:signup:${email}`,
  AUTH_SIGNIN: (email: string) => `auth:signin:${email}`,
  AUTH_SIGNOUT: 'auth:signout',
  AUTH_RESET_PASSWORD: (email: string) => `auth:reset:${email}`,
  AUTH_RESEND: (email: string) => `auth:resend:${email}`,
  AUTH_UPDATE_EMAIL: (email: string) => `auth:updateemail:${email}`,
  AUTH_GET_SESSION: 'auth:getsession',
  AUTH_GET_USER: 'auth:getuser',
  AUTH_OAUTH: (provider: string) => `auth:oauth:${provider}`,
  
  // Database operations
  DB_SELECT: (table: string) => `db:select:${table}`,
  DB_INSERT: (table: string) => `db:insert:${table}`,
  DB_UPDATE: (table: string) => `db:update:${table}`,
  DB_DELETE: (table: string) => `db:delete:${table}`,
  
  // Storage operations
  STORAGE_UPLOAD: (bucket: string) => `storage:upload:${bucket}`,
  STORAGE_DOWNLOAD: (bucket: string) => `storage:download:${bucket}`,
  
  // Functions operations
  FUNCTIONS_INVOKE: (functionName: string) => `functions:invoke:${functionName}`,
  
  // Custom operations
  CUSTOM: (operation: string, identifier: string) => `custom:${operation}:${identifier}`
};

/**
 * Check if the application is approaching rate limits
 */
export const checkApproachingLimits = (key: string, threshold = 0.8) => {
  const status = SupabaseRateLimiter.getRateLimitStatus(key);
  const usagePercentage = status.count / status.maxRequests;
  
  return {
    approachingLimit: usagePercentage >= threshold,
    usagePercentage,
    ...status
  };
};

/**
 * Wait for rate limit to reset
 */
export const waitForRateLimitReset = async (key: string) => {
  const status = SupabaseRateLimiter.getRateLimitStatus(key);
  
  if (status.waitTime && status.waitTime > 0) {
    console.log(`Waiting ${status.waitTime} seconds for rate limit to reset for key: ${key}`);
    await new Promise(resolve => setTimeout(resolve, status.waitTime! * 1000));
  }
};

export default {
  rateLimitedDbOperation,
  rateLimitedStorageOperation,
  rateLimitedFunctionCall,
  RATE_LIMIT_KEYS,
  checkApproachingLimits,
  waitForRateLimitReset
};