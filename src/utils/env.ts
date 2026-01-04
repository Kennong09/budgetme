/**
 * Environment variable compatibility layer for Vite migration
 * Supports both VITE_ and REACT_APP_ prefixes for backwards compatibility
 */

// Helper to get env var with fallback from both Vite and CRA formats
const getEnv = (key: string): string | undefined => {
  // Try Vite format first (import.meta.env)
  const viteKey = `VITE_${key}`;
  const craKey = `REACT_APP_${key}`;
  
  // Check import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envObj = import.meta.env as unknown as Record<string, string | undefined>;
    if (envObj[viteKey]) return envObj[viteKey];
    if (envObj[craKey]) return envObj[craKey];
  }
  
  // Fallback to process.env (CRA/Node)
  if (typeof process !== 'undefined' && process.env) {
    const processEnv = process.env as Record<string, string | undefined>;
    if (processEnv[viteKey]) return processEnv[viteKey];
    if (processEnv[craKey]) return processEnv[craKey];
  }
  
  return undefined;
};

// Get Vite-specific env properties safely
const getViteEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env as { DEV?: boolean; PROD?: boolean; MODE?: string };
  }
  return {};
};

const viteEnv = getViteEnv();

// Environment variables
export const env = {
  // Supabase
  SUPABASE_URL: getEnv('SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || '',
  SUPABASE_SERVICE_KEY: getEnv('SUPABASE_SERVICE_KEY') || '',
  
  // API URLs
  SITE_URL: getEnv('SITE_URL') || (typeof window !== 'undefined' ? window.location.origin : ''),
  PREDICTION_API_URL: getEnv('PREDICTION_API_URL') || 'https://prediction-api-rust.vercel.app',
  PROPHET_API_URL: getEnv('PROPHET_API_URL') || 'https://prediction-api-rust.vercel.app',
  
  // Feature flags
  AUTH_DEBUG: getEnv('AUTH_DEBUG') === 'true',
  
  // API Keys
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY') || '',
  
  // Mode
  isDev: viteEnv.DEV ?? process.env.NODE_ENV === 'development',
  isProd: viteEnv.PROD ?? process.env.NODE_ENV === 'production',
  mode: viteEnv.MODE ?? process.env.NODE_ENV ?? 'development'
};

export default env;
