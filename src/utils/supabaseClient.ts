import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Environment variables from compatibility layer
const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;
// Service role key for bypassing RLS in admin functions
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: SUPABASE_URL (VITE_SUPABASE_URL or REACT_APP_SUPABASE_URL)');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: SUPABASE_ANON_KEY (VITE_SUPABASE_ANON_KEY or REACT_APP_SUPABASE_ANON_KEY)');
}

if (!supabaseServiceKey) {
  console.warn('Missing SUPABASE_SERVICE_KEY - admin functions will not be available');
}

// Determine environment for storage key namespacing
const getEnvironment = () => {
  // Check for production indicators
  const siteUrl = env.SITE_URL;
  const productionDomain = siteUrl.replace('https://', '').replace('http://', '');
  
  if (window.location.hostname === productionDomain || env.isProd) {
    return 'prod';
  }
  return 'dev';
};

// Create environment-specific storage key
const storageKey = `sb-budgetme-${getEnvironment()}-auth`;



// Clean up any conflicting auth tokens from previous versions
const cleanupOldTokens = () => {
  if (typeof window === 'undefined') return;
  
  const oldKeys = [
    'supabase.auth.token',
    'sb:token', 
    'budgetme-auth-token',
    `sb-${supabaseUrl?.replace('https://', '')}-auth-token`
  ];
  
  oldKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  });
};

// Initialize cleanup on first load
if (typeof window !== 'undefined') {
  cleanupOldTokens();
  
  // Suppress GoTrueClient multiple instances warning in development
  if (env.isDev) {
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Multiple GoTrueClient instances detected') || 
          message.includes('GoTrueClient')) {
        // Suppress this specific warning in development
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
  }
}

// Global singleton to prevent multiple client instances
declare global {
  interface Window {
    __supabase_client?: SupabaseClient;
  }
}

// Create singleton Supabase client with safe configuration
const createSupabaseClient = (): SupabaseClient => {
  // Prevent multiple instances in development (React Strict Mode)
  // Note: GoTrueClient warnings in dev mode are expected due to React strict rendering
  if (typeof window !== 'undefined' && window.__supabase_client) {
    return window.__supabase_client;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: storageKey,
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => {
          try {
            return window.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            // Silently fail if localStorage is not available
          }
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch {
            // Silently fail if localStorage is not available
          }
        }
      } : undefined,
      flowType: 'pkce', // Use PKCE flow for better security
      debug: env.isDev
    },
    global: {
      headers: {
        'X-Client-Info': 'budgetme-react-spa',
        'X-Client-Version': '1.0.0'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  });

  // Store in global window for singleton behavior
  if (typeof window !== 'undefined') {
    window.__supabase_client = client;
  }

  return client;
};

export const supabase = createSupabaseClient();

// Cleanup function to clear auth storage (useful for debugging)
export const clearAuthStorage = () => {
  try {
    const keysToRemove = [
      storageKey, // Current environment-specific key
      'sb-budgetme-dev-auth',
      'sb-budgetme-prod-auth',
      'budgetme-auth-token',
      'budgetme-admin-auth-token',
      `sb-${supabaseUrl?.replace('https://', '')}-auth-token`
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Auth storage cleared');
  } catch (error) {
    console.warn('Could not clear auth storage:', error);
  }
};

// Function to check storage health
export const checkStorageHealth = () => {
  try {
    const testKey = '__storage_health_test__';
    localStorage.setItem(testKey, 'test');
    const value = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return value === 'test';
  } catch {
    return false;
  }
};

// Singleton pattern for admin client to prevent multiple instances
let supabaseAdminInstance: SupabaseClient | null = null;

const getSupabaseAdminClient = (): SupabaseClient => {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY is required for admin functionality');
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'budgetme-admin-auth-token', // Different key to avoid conflicts
      storage: {
        // Use a dummy storage to completely isolate admin client
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    }
  });

  return supabaseAdminInstance;
};

// Create a separate client with service role for admin operations
// This bypasses RLS policies to access all data
// Returns null if service key is not available (graceful fallback)
export const supabaseAdmin = supabaseServiceKey ? getSupabaseAdminClient() : null;
