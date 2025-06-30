import { createClient } from '@supabase/supabase-js';

// Try to get values from environment variables first
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzQ5MzYsImV4cCI6MjA2NDg1MDkzNn0.RhHY62oiflpKuv6jcV6xkXiCWerrAodRibQDP0TxXrM';

// Logging for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Key is set' : 'Key is missing');

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 