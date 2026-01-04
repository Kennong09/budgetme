import { supabase } from './supabaseClient';
import { env } from './env';

// Optimize token refresh based on page visibility
export const initializeSessionPersistence = () => {
  if (typeof window === 'undefined') return;

  let isVisible = !document.hidden;

  const handleVisibilityChange = () => {
    const wasVisible = isVisible;
    isVisible = !document.hidden;

    if (env.AUTH_DEBUG) {
      console.log(`[SESSION PERSISTENCE] Page visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
    }

    if (isVisible && !wasVisible) {
      // Page became visible - start auto refresh
      supabase.auth.startAutoRefresh();
      
      // Check session validity when page becomes visible
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn('[SESSION PERSISTENCE] Error checking session on visibility change:', error);
        } else if (env.AUTH_DEBUG) {
          console.log(`[SESSION PERSISTENCE] Session check on visibility change:`, {
            hasSession: !!session,
            userId: session?.user?.id,
            expiresAt: session?.expires_at
          });
        }
      });
    } else if (!isVisible && wasVisible) {
      // Page became hidden - stop auto refresh to save resources
      supabase.auth.stopAutoRefresh();
    }
  };

  // Set up visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Set up beforeunload to ensure tokens are persisted
  const handleBeforeUnload = () => {
    if (env.AUTH_DEBUG) {
      console.log('[SESSION PERSISTENCE] Page unloading, ensuring session persistence');
    }
    // Force a session check to ensure tokens are stored
    supabase.auth.getSession();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

// Function to manually refresh session
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[SESSION PERSISTENCE] Error refreshing session:', error);
      return { success: false, error };
    }
    
    if (env.AUTH_DEBUG) {
      console.log('[SESSION PERSISTENCE] Session refreshed successfully:', {
        hasSession: !!data.session,
        userId: data.session?.user?.id
      });
    }
    
    return { success: true, session: data.session };
  } catch (error) {
    console.error('[SESSION PERSISTENCE] Unexpected error refreshing session:', error);
    return { success: false, error };
  }
};

// Function to check if session is expired or about to expire
export const isSessionExpired = (session: any) => {
  if (!session?.expires_at) return true;
  
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  return expiresAt <= fiveMinutesFromNow;
};