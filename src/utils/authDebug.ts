/**
 * Authentication Debug Utilities
 * 
 * Helper functions to debug and resolve authentication issues,
 * particularly PKCE flow problems and session management.
 */

import { supabase } from './supabaseClient';

export interface AuthDebugInfo {
  sessionExists: boolean;
  userId?: string;
  userEmail?: string;
  tokenValid: boolean;
  pkceStateExists: boolean;
  storageKeys: string[];
  authErrors: string[];
}

/**
 * Get comprehensive debug information about current auth state
 */
export const getAuthDebugInfo = async (): Promise<AuthDebugInfo> => {
  const debugInfo: AuthDebugInfo = {
    sessionExists: false,
    tokenValid: false,
    pkceStateExists: false,
    storageKeys: [],
    authErrors: []
  };

  try {
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      debugInfo.authErrors.push(`Session Error: ${sessionError.message}`);
    }

    if (sessionData?.session?.user) {
      debugInfo.sessionExists = true;
      debugInfo.userId = sessionData.session.user.id;
      debugInfo.userEmail = sessionData.session.user.email;
      debugInfo.tokenValid = true;
    }

    // Check localStorage for auth-related keys
    if (typeof window !== 'undefined') {
      const allKeys = Object.keys(localStorage);
      debugInfo.storageKeys = allKeys.filter(key => 
        key.includes('auth') || 
        key.includes('supabase') || 
        key.includes('sb-') ||
        key.includes('pkce') ||
        key.includes('budgetme')
      );

      // Check for PKCE state
      debugInfo.pkceStateExists = allKeys.some(key => 
        key.includes('pkce') || key.includes('code_verifier')
      );
    }

  } catch (error: any) {
    debugInfo.authErrors.push(`Debug Error: ${error.message}`);
  }

  return debugInfo;
};

/**
 * Clear all authentication state and storage
 */
export const clearAllAuthState = async (): Promise<void> => {
  try {
    // Don't call signOut here - it will trigger auth state changes
    // Just clear localStorage keys that might be causing issues
    
    if (typeof window !== 'undefined') {
      const allKeys = Object.keys(localStorage);
      
      // Only clear old/stale keys, not the current auth session
      const staleKeys = allKeys.filter(key => 
        // Clear old auth tokens but NOT the current Supabase auth storage
        (key.includes('-auth-token') && !key.includes('supabase.auth.token')) ||
        // Clear old budget me specific keys
        (key.includes('budgetme-auth') && !key.includes('sb-'))
      );

      staleKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`Cleared stale key: ${key}`);
        } catch (e) {
          console.warn(`Failed to remove key: ${key}`, e);
        }
      });

      console.log('Cleared stale auth state');
    }
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

/**
 * Reset PKCE flow state
 */
export const resetPKCEFlow = (): void => {
  if (typeof window === 'undefined') return;

  const allKeys = Object.keys(localStorage);
  const pkceKeys = allKeys.filter(key => 
    key.includes('pkce') || 
    key.includes('code_verifier') || 
    key.includes('state')
  );

  pkceKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`Removed PKCE key: ${key}`);
    } catch (e) {
      console.warn(`Failed to remove PKCE key: ${key}`, e);
    }
  });
};

/**
 * Check if current URL has auth-related parameters
 */
export const checkURLForAuthParams = (): {
  hasAuthParams: boolean;
  params: Record<string, string>;
  isPasswordReset: boolean;
} => {
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  
  const allParams: Record<string, string> = {};
  
  // Collect all auth-related params
  const searchEntries = Array.from(searchParams.entries());
  const hashEntries = Array.from(hashParams.entries());
  
  [...searchEntries, ...hashEntries].forEach(([key, value]) => {
    if (['code', 'access_token', 'refresh_token', 'error', 'next', 'token', 'type'].includes(key)) {
      allParams[key] = value;
    }
  });

  const hasAuthParams = Object.keys(allParams).length > 0;
  const isPasswordReset = allParams.next === '/reset-password' || allParams.type === 'recovery';

  return {
    hasAuthParams,
    params: allParams,
    isPasswordReset
  };
};

/**
 * Log auth debug info to console
 */
export const logAuthDebugInfo = async (): Promise<void> => {
  console.group('🔍 Auth Debug Information');
  
  const debugInfo = await getAuthDebugInfo();
  const urlInfo = checkURLForAuthParams();
  
  console.log('Session Info:', {
    exists: debugInfo.sessionExists,
    userId: debugInfo.userId,
    email: debugInfo.userEmail,
    tokenValid: debugInfo.tokenValid
  });
  
  console.log('Storage Info:', {
    pkceState: debugInfo.pkceStateExists,
    keys: debugInfo.storageKeys
  });
  
  console.log('URL Info:', urlInfo);
  
  if (debugInfo.authErrors.length > 0) {
    console.error('Auth Errors:', debugInfo.authErrors);
  }
  
  console.groupEnd();
};

// Expose debug functions to window in development
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    (window as any).authDebug = {
      getInfo: getAuthDebugInfo,
      clearAll: clearAllAuthState,
      resetPKCE: resetPKCEFlow,
      checkURL: checkURLForAuthParams,
      log: logAuthDebugInfo
    };
    
    console.log('🔧 Auth debug utilities available at window.authDebug');
  }
}