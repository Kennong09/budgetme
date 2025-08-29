import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
// Service role key for bypassing RLS in admin functions
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: REACT_APP_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: REACT_APP_SUPABASE_ANON_KEY');
}

if (!supabaseServiceKey) {
  console.warn('Missing REACT_APP_SUPABASE_SERVICE_KEY - admin functions will not be available');
}

// Use singleton pattern to ensure only one instance of each client exists
let _supabase: SupabaseClient | undefined;
let _supabaseAdmin: SupabaseClient | undefined;

// Create the Supabase client with enhanced auth configuration
export const supabase = (() => {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'budgetme-auth', // Specific storage key for this app
        debug: false
      },
      global: {
        headers: {
          'x-application-name': 'budgetme'
        }
      }
    });
  }
  return _supabase;
})();

// Create a separate client with service role for admin operations
// This bypasses RLS policies to access all data
export const supabaseAdmin = (() => {
  if (!_supabaseAdmin && supabaseServiceKey) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false, // Prevent URL detection for admin client
        storageKey: 'budgetme-admin-auth', // Different storage key for admin
        storage: {
          // Use a custom storage to completely isolate admin client
          getItem: (key) => null,
          setItem: (key, value) => {},
          removeItem: (key) => {}
        }
      },
      global: {
        headers: {
          'x-application-name': 'budgetme-admin'
        }
      }
    });
  }
  
  if (!supabaseServiceKey) {
    // Throw an error during module loading if service key is missing
    // This prevents the admin routes from even loading
    throw new Error('REACT_APP_SUPABASE_SERVICE_KEY is required for admin functionality');
  }
  
  return _supabaseAdmin as SupabaseClient;
})(); 