import { createClient } from '@supabase/supabase-js';

// Try to get values from environment variables first
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzQ5MzYsImV4cCI6MjA2NDg1MDkzNn0.RhHY62oiflpKuv6jcV6xkXiCWerrAodRibQDP0TxXrM';
// Service role key for bypassing RLS in admin functions
// For security, this should be kept in environment variables in production
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI3NDkzNiwiZXhwIjoyMDY0ODUwOTM2fQ.q4BiRHda6IsomEWMqc0O_MPy6LRBkoyLr3Ip0BBETu8';

// Use singleton pattern to ensure only one instance of each client exists
let _supabase;
let _supabaseAdmin;

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
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'budgetme-admin-auth' // Different storage key for admin
      },
      global: {
        headers: {
          'x-application-name': 'budgetme-admin'
        }
      }
    });
  }
  return _supabaseAdmin;
})(); 