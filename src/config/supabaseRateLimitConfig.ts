/**
 * Supabase Rate Limit Configuration
 * 
 * Configuration for Supabase rate limiting across the application
 */

import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

// Configure rate limiting based on Supabase free tier limits
// https://supabase.com/docs/guides/platform/rate-limits
SupabaseRateLimiter.configure({
  // Supabase free tier allows ~30,000 requests per day
  // For a web app, we'll set more conservative limits per user
  maxRequests: 100,           // 100 requests per time window per user
  timeWindow: 60000,         // 1 minute time window
  retryDelay: 1000,          // 1 second delay between retries
  maxRetries: 3              // 3 retries for failed requests
});

// Different rate limits for different operations
export const RATE_LIMIT_KEYS = {
  AUTH_SIGNUP: 'auth:signup',
  AUTH_SIGNIN: 'auth:signin',
  AUTH_SIGNOUT: 'auth:signout',
  AUTH_RESET_PASSWORD: 'auth:reset',
  AUTH_RESEND: 'auth:resend',
  AUTH_UPDATE_EMAIL: 'auth:updateemail',
  AUTH_GET_SESSION: 'auth:getsession',
  AUTH_GET_USER: 'auth:getuser',
  AUTH_OAUTH: 'auth:oauth',
  
  DB_READ: 'db:read',
  DB_WRITE: 'db:write',
  DB_DELETE: 'db:delete',
  
  STORAGE_UPLOAD: 'storage:upload',
  STORAGE_DOWNLOAD: 'storage:download',
  
  FUNCTIONS_INVOKE: 'functions:invoke'
};

// Operation-specific rate limits
export const OPERATION_RATE_LIMITS = {
  // Auth operations - more conservative limits
  auth: {
    maxRequests: 10,          // 10 auth requests per minute
    timeWindow: 60000,       // 1 minute
  },
  
  // Database operations
  db: {
    maxRequests: 50,          // 50 DB requests per minute
    timeWindow: 60000,       // 1 minute
  },
  
  // Storage operations
  storage: {
    maxRequests: 30,          // 30 storage requests per minute
    timeWindow: 60000,       // 1 minute
  },
  
  // Functions operations
  functions: {
    maxRequests: 20,          // 20 function calls per minute
    timeWindow: 60000,       // 1 minute
  }
};

console.log('Supabase Rate Limit Configuration loaded');