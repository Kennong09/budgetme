import { supabase } from './supabaseClient';
import { Provider, Session, User } from '@supabase/supabase-js';
import { EmailMonitoringService } from '../services/emailMonitoringService';
import { EmailDeliveryConfigService } from '../services/emailDeliveryConfigService';
import { storeTimeoutRecovery } from './signupRecovery';
import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

export type AuthError = {
  message: string;
};

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// Email/Password authentication
export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:signin:${email}`,
    async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return {
        user: data?.user || null,
        session: data?.session || null,
        error: error ? { message: error.message } : null,
      };
    }
  );
};

export const signUpWithEmail = async (email: string, password: string, metadata: { full_name: string }): Promise<AuthResponse> => {
  // Get site URL from environment or fallback to current origin
  const siteUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
  
  // Fix double slash in redirect URL
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  
  console.log('Signing up user:', { email, siteUrl: normalizedSiteUrl, timestamp: new Date().toISOString() });
  
  // Check rate limiting for signup attempts
  const signupKey = `budgetme_last_signup_${email}`;
  const lastSignup = localStorage.getItem(signupKey);
  
  if (lastSignup) {
    const signupCheck = EmailDeliveryConfigService.isSignupAllowed(lastSignup);
    
    if (!signupCheck.allowed) {
      console.warn('Rate limited - signup attempt too soon:', { waitTime: signupCheck.waitTime });
      return {
        user: null,
        session: null,
        error: { message: `Please wait ${signupCheck.waitTime} seconds before trying to sign up again` }
      };
    }
  }
  
  // Use Supabase rate limiter for signup
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:signup:${email}`,
    async () => {
      // Implement timeout and retry logic
      const maxRetries = 3; // Increase retry attempts
      const timeoutDuration = 30000; // Reduce timeout to 30 seconds for better UX
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Signup attempt ${attempt}/${maxRetries}:`, { email, timestamp: new Date().toISOString() });
          
          // Create a timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutDuration);
          });
          
          // Prepare signup options without directly using 'data' property name
          const signupOptions: any = EmailDeliveryConfigService.getOptimizedAuthOptions(normalizedSiteUrl);
          signupOptions.data = metadata;
          
          // Race between the signup request and timeout
          const signupPromise = supabase.auth.signUp({
            email,
            password,
            options: signupOptions
          });
          
          // Fixed: Changed variable name from 'data' to 'signupResponse' to avoid conflict
          const { data: signupResponse, error } = await Promise.race([
            signupPromise,
            timeoutPromise
          ]);
        
          if (error) {
            console.error(`Sign up error (attempt ${attempt}):`, {
              message: error.message,
              status: error.status,
              timestamp: new Date().toISOString()
            });
            
            // Handle specific rate limit errors with better messaging
            if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
              return {
                user: null,
                session: null,
                error: { 
                  message: 'Too many signup attempts. Please wait a few minutes before trying again, or contact support if this persists.' 
                }
              };
            }
            
            // Handle timeout and server errors - retry if not last attempt
            // Fixed: Added proper checks for error.status being defined
            if (error.status && (error.status === 504 || error.status === 502 || error.status >= 500) && attempt < maxRetries) {
              console.log(`Server error on attempt ${attempt}, retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
              continue; // Try again
            }
            
            // If it's the last attempt or non-retryable error, return the error
            let errorMessage = error.message;
            if (error.status === 504 || error.status === 502) {
              errorMessage = 'Server temporarily unavailable. Please try again in a moment. If the issue persists, your account may have been created - check your email.';
            } else if (error.status && error.status >= 500) {
              // Fixed: Added proper check for error.status being defined
              errorMessage = 'Server error. Please try again in a moment.';
            } else if (!errorMessage || errorMessage === '{}') {
              errorMessage = 'An unexpected error occurred during signup. Please try again.';
            }
            
            return {
              user: null,
              session: null,
              error: { message: errorMessage }
            };
          } else {
            console.log('Sign up success:', {
              userId: signupResponse?.user?.id,
              emailConfirmed: signupResponse?.user?.email_confirmed_at,
              timestamp: new Date().toISOString(),
              emailDeliveryExpected: true,
              attempt: attempt
            });
            
            // Update signup rate limiting timestamp
            localStorage.setItem(signupKey, Date.now().toString());
            
            // Track email delivery attempt
            if (signupResponse?.user && !signupResponse.user.email_confirmed_at) {
              console.log('Email verification required - tracking delivery');
              // Store email delivery timestamp for monitoring
              localStorage.setItem('budgetme_email_sent_at', new Date().toISOString());
              localStorage.setItem('budgetme_email_address', email);
              // Track with monitoring service
              EmailMonitoringService.trackEmailSent(email);
              
              // Log additional diagnostic information
              console.log('Email tracking initiated for:', email);
              console.log('Expected redirect URL:', normalizedSiteUrl + '/auth/callback');
            }
            
            return {
              user: signupResponse?.user || null,
              session: signupResponse?.session || null,
              error: null,
            };
          }
        } catch (attemptError: any) {
          console.error(`Signup attempt ${attempt} failed:`, attemptError);
          
          // Handle timeout errors
          if (attemptError.message === 'REQUEST_TIMEOUT') {
            if (attempt < maxRetries) {
              console.log(`Timeout on attempt ${attempt}, retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue; // Try again
            } else {
              // Store timeout recovery information
              storeTimeoutRecovery(email, new Date());
              
              return {
                user: null,
                session: null,
                error: { 
                  message: 'Request timed out. Please try again in a moment. If the issue persists, your account may have been created - check your email.' 
                }
              };
            }
          }
          
          // Handle other unexpected errors - retry if not last attempt
          if (attempt < maxRetries) {
            console.log(`Unexpected error on attempt ${attempt}, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // Last attempt failed
          return {
            user: null,
            session: null,
            error: { message: 'An unexpected error occurred during signup. Please try again.' }
          };
        }
      }
      
      // This should never be reached, but just in case
      return {
        user: null,
        session: null,
        error: { message: 'Signup failed after multiple attempts. Please try again.' }
      };
    }
  );
};

// OAuth authentication
export const signInWithProvider = async (provider: Provider): Promise<void> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:oauth:${provider}`,
    async () => {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'google' ? 'email profile' : undefined,
        },
      });
    }
  );
};

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    'auth:signout',
    async () => {
      const { error } = await supabase.auth.signOut();
      return {
        error: error ? { message: error.message } : null,
      };
    }
  );
};

// Reset password
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:reset:${email}`,
    async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      return {
        error: error ? { message: error.message } : null,
      };
    }
  );
};

// Enhanced resend verification email with rate limiting and monitoring
export const resendVerificationEmail = async (email: string): Promise<{ error: AuthError | null; rateLimited?: boolean }> => {
  // Get site URL from environment or fallback to current origin
  const siteUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
  
  console.log('Attempting to resend verification email:', { email, siteUrl, timestamp: new Date().toISOString() });
  
  // Check rate limiting using config service
  const lastSentKey = `budgetme_last_resend_${email}`;
  const lastSent = localStorage.getItem(lastSentKey);
  
  if (lastSent) {
    const resendCheck = EmailDeliveryConfigService.isResendAllowed(lastSent);
    
    if (!resendCheck.allowed) {
      console.warn('Rate limited - resend attempt too soon:', { waitTime: resendCheck.waitTime });
      return {
        error: { message: `Please wait ${resendCheck.waitTime} seconds before resending` },
        rateLimited: true
      };
    }
  }
  
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:resend:${email}`,
    async () => {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: EmailDeliveryConfigService.getOptimizedAuthOptions(siteUrl),
        });
        
        if (error) {
          console.error('Resend verification email error:', {
            message: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
          });
          
          // Provide specific guidance for email delivery issues
          let errorMessage = error.message;
          if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
            errorMessage = 'Too many resend attempts. Please wait a few minutes before trying again.';
          } else if (error.status && (error.status === 504 || error.status === 502 || error.status >= 500)) {
            errorMessage = 'Server temporarily unavailable. Please try again in a moment.';
          } else if (!errorMessage || errorMessage === '{}') {
            errorMessage = 'Failed to resend verification email. Please check your email address and try again.';
          }
          
          return {
            error: { message: errorMessage },
            rateLimited: error.status === 429
          };
        } else {
          console.log('Resend verification email success:', {
            email,
            timestamp: new Date().toISOString()
          });
          
          // Update rate limiting timestamp
          localStorage.setItem(lastSentKey, Date.now().toString());
          localStorage.setItem('budgetme_email_sent_at', new Date().toISOString());
          // Track with monitoring service
          EmailMonitoringService.trackEmailResent(email);
          
          // Log diagnostic information
          console.log('Email resend tracked for:', email);
          console.log('Expected redirect URL:', siteUrl + '/auth/callback');
        }
        
        return {
          error: null,
          rateLimited: false
        };
      } catch (unexpectedError) {
        console.error('Unexpected resend error:', unexpectedError);
        return {
          error: { message: 'An unexpected error occurred while resending email. Please try again later.' },
          rateLimited: false
        };
      }
    }
  );
};

// Get current session
export const getCurrentSession = async (): Promise<Session | null> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    'auth:getsession',
    async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  );
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    'auth:getuser',
    async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  );
};

// Update user email
export const updateUserEmail = async (email: string): Promise<AuthResponse> => {
  return SupabaseRateLimiter.executeWithRateLimit(
    `auth:updateemail:${email}`,
    async () => {
      const { data, error } = await supabase.auth.updateUser({ email });
      
      return {
        user: data?.user || null,
        session: null, // updateUser doesn't return a session object
        error: error ? { message: error.message } : null,
      };
    }
  );
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

// Setup auth state change listener
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}; 