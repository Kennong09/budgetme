import { createClient } from '@supabase/supabase-js';

// Try to get values from environment variables first
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://rguoppydsikvbfvjxosq.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndW9wcHlkc2lrdmJmdmp4b3NxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU3NzgyNiwiZXhwIjoyMDY2MTUzODI2fQ.z1WjOyJgoGu-YlRzMZku9IhsxGgnQFFr9cMyPLyyrUI';

// Logging for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Key is set' : 'Key is missing');

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 