import { supabase } from './supabaseClient';
import { Provider, Session, User } from '@supabase/supabase-js';
import { EmailMonitoringService } from '../services/emailMonitoringService';
import { EmailDeliveryConfigService } from '../services/emailDeliveryConfigService';
import { storeTimeoutRecovery } from './signupRecovery';
import { getUserIpAddress } from './ipService';
import { env } from './env';

// Debug logging helper
const authDebug = (message: string, data?: any) => {
  if (env.AUTH_DEBUG || localStorage.getItem('AUTH_DEBUG') === 'true') {
    console.log(`[AUTH DEBUG] ${message}`, data || '');
  }
};

// Extend Window interface for debug functions
declare global {
  interface Window {
    enableAuthDebug?: () => void;
    disableAuthDebug?: () => void;
  }
}

// Enable debug mode in development
if (env.isDev && typeof window !== 'undefined') {
  window.enableAuthDebug = () => {
    localStorage.setItem('AUTH_DEBUG', 'true');
    console.log('🔍 Auth debug mode enabled. Reload to see debug logs.');
  };
  
  window.disableAuthDebug = () => {
    localStorage.removeItem('AUTH_DEBUG');
    console.log('🔍 Auth debug mode disabled.');
  };
}

export type AuthError = {
  message: string;
  code?: string;
  retryAfter?: string;
};

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// Helper function to normalize auth errors
function normalizeAuthError(error: any): string {
  const msg = error?.message || '';
  const code = error?.code || '';
  
  // Handle email confirmation errors
  if (/email.*not.*confirmed/i.test(msg) || code === 'email_not_confirmed') {
    return 'Please verify your email before logging in.';
  }
  
  // Handle invalid credentials
  if (/invalid login credentials|invalid credentials/i.test(msg) || code === 'invalid_credentials') {
    return 'Invalid email or password. If you haven\'t verified your email yet, please check your inbox.';
  }
  
  // Handle user not found (might be unverified)
  if (/user.*not.*found/i.test(msg) || code === 'user_not_found') {
    return 'Invalid email or password. If you recently signed up, please verify your email first.';
  }
  
  // Handle signup disabled
  if (/signup.*disabled/i.test(msg) || code === 'signup_disabled') {
    return 'New registrations are currently disabled. Please contact support.';
  }
  
  // Handle password reset specific errors
  if (/token.*expired|expired.*token/i.test(msg) || code === 'token_expired') {
    return 'This reset link has expired. Please request a new one.';
  }
  
  if (/invalid.*token|token.*invalid/i.test(msg) || code === 'invalid_token') {
    return 'This reset link is invalid or has already been used.';
  }
  
  // Handle rate limiting
  if (/too many requests|rate limit/i.test(msg) || code === 'too_many_requests' || error?.status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  
  // Handle session errors for password reset
  if (/session.*not.*found|no.*session/i.test(msg) || code === 'session_not_found') {
    return 'Reset session expired. Please use a fresh reset link from your email.';
  }
  
  // Handle weak password errors
  if (/password.*weak|weak.*password/i.test(msg) || code === 'weak_password') {
    return 'Password is too weak. Please choose a stronger password.';
  }
  
  // Handle same password error
  if (/same.*password|password.*same/i.test(msg) || code === 'same_password') {
    return 'New password cannot be the same as your current password.';
  }
  
  return msg || 'An error occurred. Please try again.';
}

// Email/Password authentication - simplified
export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('🔐 Attempting email sign-in:', { email, timestamp: new Date().toISOString() });
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Sign-in error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ Sign-in successful:', {
        userId: data?.user?.id,
        email: data?.user?.email,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      user: data?.user || null,
      session: data?.session || null,
      error: error ? { message: normalizeAuthError(error) } : null,
    };
  } catch (err: any) {
    console.error('💥 Unexpected sign-in error:', err);
    return {
      user: null,
      session: null,
      error: { message: 'An unexpected error occurred during sign-in. Please try again.' }
    };
  }
};

// Get consistent site URL across all auth functions
const getSiteUrl = (): string => {
  const siteUrl = env.SITE_URL;
  // Always remove trailing slash for consistency
  return siteUrl.replace(/\/$/, '');
};

export const signUpWithEmail = async (email: string, password: string, metadata: { full_name: string }): Promise<AuthResponse> => {
  const normalizedSiteUrl = getSiteUrl();
  
  console.log('Signing up user:', { email, siteUrl: normalizedSiteUrl, timestamp: new Date().toISOString() });
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: normalizedSiteUrl + '/auth/callback',
        data: metadata
      }
    });
    
    if (error) {
      console.error('Sign up error:', {
        message: error.message,
        status: error.status,
        timestamp: new Date().toISOString()
      });
      
      return {
        user: null,
        session: null,
        error: { message: normalizeAuthError(error) }
      };
    }
    
    console.log('Sign up success:', {
      userId: data?.user?.id,
      emailConfirmed: data?.user?.email_confirmed_at,
      timestamp: new Date().toISOString()
    });
    
    // Track email delivery attempt if email verification is required
    if (data?.user && !data.user.email_confirmed_at) {
      console.log('Email verification required - tracking delivery');
      EmailMonitoringService.trackEmailSent(email);
      console.log('Email tracking initiated for:', email);
      console.log('Expected redirect URL:', normalizedSiteUrl + '/auth/callback');
    }
    
    return {
      user: data?.user || null,
      session: data?.session || null,
      error: null,
    };
  } catch (error: any) {
    console.error('Unexpected signup error:', error);
    return {
      user: null,
      session: null,
      error: { message: 'An unexpected error occurred during signup. Please try again.' }
    };
  }
};

// OAuth authentication - simplified
export const signInWithProvider = async (provider: Provider): Promise<void> => {
  const siteUrl = getSiteUrl();
  console.log(`Initiating ${provider} OAuth with redirect to: ${siteUrl}/auth/callback`);
  
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      scopes: provider === 'google' ? 'email profile' : undefined,
      queryParams: provider === 'google' ? {
        access_type: 'offline',
        prompt: 'consent'
      } : undefined
    },
  });
};

// Sign out - simplified
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return {
    error: error ? { message: error.message } : null,
  };
};

// Reset password - with rate limiting and enhanced error handling
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    console.log('🔄 Starting password reset for:', email);
    
    // Temporarily bypass rate limiting to test core functionality
    // TODO: Re-enable after confirming basic auth works
    
    // Attempt the password reset directly
    const siteUrl = getSiteUrl();
    console.log('📤 Calling Supabase resetPasswordForEmail with redirectTo:', `${siteUrl}/reset-password`);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    console.log('📥 Supabase resetPasswordForEmail response:', { error });

    if (error) {
      console.error('❌ Password reset failed:', error);
      // Enhanced error handling for different Supabase Auth error codes
      let userFriendlyMessage = normalizeAuthError(error);
      
      // Handle specific Supabase Auth error codes
      switch (error.message?.toLowerCase()) {
        case 'rate limit exceeded':
        case 'too many requests':
          userFriendlyMessage = '🔒 Too many password reset requests detected. Please wait 5-10 minutes before trying again. This rate limit helps protect your account security.';
          break;
        case 'email not confirmed':
          userFriendlyMessage = 'Please verify your email address before requesting a password reset.';
          break;
        case 'user not found':
          // For security, don't reveal if email exists or not
          userFriendlyMessage = 'If this email is associated with an account, you will receive a password reset link shortly.';
          break;
        case 'email delivery failed':
        case 'smtp error':
          userFriendlyMessage = 'Unable to send email at this time. Please try again later or contact support.';
          break;
        case 'invalid email':
          userFriendlyMessage = 'Please enter a valid email address.';
          break;
        default:
          // Handle server errors and network issues
          const errorStatus = error?.status || error?.code;
          const errorMessage = error.message?.toLowerCase() || '';
          
          if (errorStatus === 504 || errorMessage.includes('gateway timeout') || errorMessage.includes('context deadline exceeded') || errorMessage.includes('processing this request timed out')) {
            userFriendlyMessage = '⚠️ Email service is experiencing delays due to SMTP configuration issues. The system is attempting to send your reset email, but it may take several minutes to arrive. Please check your inbox and spam folder.';
          } else if (errorStatus === 503 || errorMessage.includes('service unavailable')) {
            userFriendlyMessage = 'Service is temporarily unavailable. Please try again in a few minutes.';
          } else if (errorStatus === 502 || errorMessage.includes('bad gateway')) {
            userFriendlyMessage = 'Service is experiencing connectivity issues. Please try again shortly.';
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
            userFriendlyMessage = 'Network connection issue. Please check your internet connection and try again.';
          } else if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('for security purposes')) {
            userFriendlyMessage = '🔒 Rate limit reached for security purposes. Please wait a few minutes before trying again.';
          } else if (errorMessage.includes('email') || errorMessage.includes('mail')) {
            userFriendlyMessage = 'Unable to send email. Please check your email address and try again.';
          }
          break;
      }

      return {
        error: { message: userFriendlyMessage }
      };
    }

    console.log('✅ Password reset successful!');
    return { error: null };
    
  } catch (err: any) {
    console.error('Unexpected error during password reset:', err);
    return {
      error: { 
        message: 'An unexpected error occurred. Please try again later.' 
      }
    };
  }
};

// Resend verification email - simplified
export const resendVerificationEmail = async (email: string): Promise<{ error: AuthError | null; rateLimited?: boolean }> => {
  const siteUrl = getSiteUrl();
  console.log('Attempting to resend verification email:', { email, siteUrl, timestamp: new Date().toISOString() });
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: siteUrl + '/auth/callback',
      },
    });
    
    if (error) {
      console.error('Resend verification email error:', {
        message: error.message,
        status: error.status,
        timestamp: new Date().toISOString()
      });
      
      return {
        error: { message: normalizeAuthError(error) },
        rateLimited: error.status === 429
      };
    }
    
    console.log('Resend verification email success:', { email, timestamp: new Date().toISOString() });
    EmailMonitoringService.trackEmailResent(email);
    console.log('Email resend tracked for:', email);
    console.log('Expected redirect URL:', siteUrl + '/auth/callback');
    
    return {
      error: null,
      rateLimited: false
    };
  } catch (error) {
    console.error('Unexpected resend error:', error);
    return {
      error: { message: 'An unexpected error occurred while resending email. Please try again later.' },
      rateLimited: false
    };
  }
};

// Get current session - simplified
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// Get current user - simplified
export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

// Update user email - simplified
export const updateUserEmail = async (email: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.updateUser({ email });
  
  return {
    user: data?.user || null,
    session: null, // updateUser doesn't return a session object
    error: error ? { message: normalizeAuthError(error) } : null,
  };
};

// Email confirmation tracking
export const confirmEmailDelivered = (email: string): void => {
  EmailMonitoringService.confirmEmailDelivered(email);
  console.log('Email delivery confirmed for:', email);
};

// Get email delivery statistics
export const getEmailDeliveryStats = () => {
  return EmailMonitoringService.getDeliveryStats();
};

/**
 * Establishes an authenticated session for password reset flow
 * This function expects the user to have already been redirected through /auth/callback
 * which handles the PKCE flow and establishes the session
 */
export const establishSessionFromURL = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Checking for valid reset session...');
    
    // Wait a bit for any pending auth state changes to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we have a valid authenticated session
    const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting current session:', sessionError);
      
      // Handle specific session errors
      if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid')) {
        return {
          success: false,
          error: 'Your reset link has expired. Please request a new password reset link from your email.'
        };
      }
      
      return {
        success: false,
        error: normalizeAuthError(sessionError)
      };
    }
    
    if (currentSession?.session?.user) {
      console.log('Valid reset session found for user:', currentSession.session.user.email);
      
      // Verify this is actually a password recovery session by checking user metadata
      const user = currentSession.session.user;
      console.log('User session details:', {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role,
        lastSignInAt: user.last_sign_in_at
      });
      
      // Clean any remaining auth parameters from URL
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('error')) {
        const errorMsg = currentUrl.searchParams.get('error');
        console.error('Auth callback error:', errorMsg);
        return {
          success: false,
          error: errorMsg || 'Authentication failed'
        };
      }
      
      // Clean URL of any auth parameters but preserve error states
      const cleanUrl = new URL(window.location.origin + '/reset-password');
      window.history.replaceState({}, document.title, cleanUrl.toString());
      
      return { success: true };
    }
    
    // Try to refresh the session in case it's stale
    console.log('Attempting to refresh session...');
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData?.session?.user) {
        console.log('Session refresh successful for user:', refreshData.session.user.email);
        return { success: true };
      }
      
      if (refreshError) {
        console.log('Session refresh failed:', refreshError.message);
        
        // Handle specific refresh errors
        if (refreshError.message?.includes('expired') || refreshError.message?.includes('invalid')) {
          return {
            success: false,
            error: 'Your reset session has expired. Please request a new password reset link.'
          };
        }
      }
    } catch (refreshException: any) {
      console.error('Exception during session refresh:', refreshException);
    }
    
    // No valid session found - user needs to use fresh reset link
    console.log('No valid session found for password reset');
    return {
      success: false,
      error: 'Invalid or expired reset link. Please request a new password reset link from your email.'
    };
    
  } catch (error: any) {
    console.error('Error checking reset session:', error);
    return {
      success: false,
      error: 'Failed to verify reset session. Please request a new password reset.'
    };
  }
};

/**
 * Updates the current user's password
 * Requires an authenticated session (user must have clicked reset link)
 */
export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });
    
    if (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: normalizeAuthError(error)
      };
    }
    
    console.log('Password updated successfully');
    return { success: true };
    
  } catch (error: any) {
    console.error('Unexpected error updating password:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating your password. Please try again.'
    };
  }
};

// Setup auth state change listener
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
