import { supabase } from './supabaseClient';

/**
 * Signup Recovery Utilities
 * 
 * Helps handle scenarios where signup requests timeout but the account
 * may have been created successfully on the server.
 */

export interface SignupRecoveryInfo {
  accountExists: boolean;
  isConfirmed: boolean;
  needsVerification: boolean;
  canSignIn: boolean;
  email: string;
}

/**
 * Check if an account exists for the given email after a timeout
 * This attempts to determine if a signup succeeded despite a timeout error
 */
export const checkAccountAfterTimeout = async (
  email: string
): Promise<SignupRecoveryInfo> => {
  try {
    // First, try to sign in with a dummy password to check if account exists
    // This will fail but give us information about the account state
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy-password-to-check-existence'
    });

    if (signInError) {
      // Analyze the error to determine account state
      const errorMessage = signInError.message.toLowerCase();
      
      if (errorMessage.includes('invalid login credentials') || 
          errorMessage.includes('invalid credentials')) {
        // Account likely doesn't exist or wrong password
        return {
          accountExists: false,
          isConfirmed: false,
          needsVerification: false,
          canSignIn: false,
          email
        };
      } else if (errorMessage.includes('email not confirmed') ||
                 errorMessage.includes('signup confirmation')) {
        // Account exists but not confirmed
        return {
          accountExists: true,
          isConfirmed: false,
          needsVerification: true,
          canSignIn: false,
          email
        };
      } else if (errorMessage.includes('too many') || 
                 errorMessage.includes('rate limit')) {
        // Rate limited - can't determine state
        return {
          accountExists: false, // Unknown state
          isConfirmed: false,
          needsVerification: true, // Assume needs verification for safety
          canSignIn: false,
          email
        };
      } else if (errorMessage.includes('server') || 
                 errorMessage.includes('gateway') ||
                 errorMessage.includes('timeout') ||
                 signInError.status === 504 ||
                 signInError.status === 502 ||
                 (signInError.status && signInError.status >= 500)) {
        // Server issues - can't determine state reliably
        return {
          accountExists: false, // Unknown state
          isConfirmed: false,
          needsVerification: true, // Assume needs verification for safety
          canSignIn: false,
          email
        };
      }
    }

    // If no error, account exists and is confirmed (unlikely with dummy password)
    return {
      accountExists: true,
      isConfirmed: true,
      needsVerification: false,
      canSignIn: true,
      email
    };

  } catch (error: any) {
    console.error('Error checking account after timeout:', error);
    
    // If it's a server error, we can't determine the state
    if (error.status === 504 || error.status === 502 || (error.status && error.status >= 500)) {
      return {
        accountExists: false, // Unknown state
        isConfirmed: false,
        needsVerification: true, // Assume needs verification for safety
        canSignIn: false,
        email
      };
    }
    
    // Default to safe assumption: account might exist and need verification
    return {
      accountExists: false, // Unknown, so assume false
      isConfirmed: false,
      needsVerification: true,
      canSignIn: false,
      email
    };
  }
};

/**
 * Suggest next steps for user after a timeout error
 */
export const getTimeoutRecoverySteps = (recoveryInfo: SignupRecoveryInfo): string[] => {
  const steps: string[] = [];

  if (recoveryInfo.accountExists) {
    if (recoveryInfo.needsVerification) {
      steps.push('Check your email for a verification link');
      steps.push('Click the verification link to activate your account');
      steps.push('Try signing in after verification');
    } else if (recoveryInfo.canSignIn) {
      steps.push('Try signing in with your email and password');
    }
  } else {
    steps.push('Check your email - a verification link may have been sent');
    steps.push('Wait 2-3 minutes for the email to arrive');
    steps.push('If no email arrives, try signing up again');
  }

  steps.push('Contact support if you continue having issues');
  return steps;
};

/**
 * Store timeout recovery information for later use
 */
export const storeTimeoutRecovery = (email: string, timestamp: Date): void => {
  try {
    const recoveryData = {
      email,
      timestamp: timestamp.toISOString(),
      reason: 'signup_timeout'
    };
    
    localStorage.setItem(`budgetme_timeout_recovery_${email}`, JSON.stringify(recoveryData));
    
    // Clean up old recovery data (older than 1 hour)
    const keys = Object.keys(localStorage);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    keys.forEach(key => {
      if (key.startsWith('budgetme_timeout_recovery_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const recoveryTime = new Date(data.timestamp).getTime();
          
          if (recoveryTime < oneHourAgo) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Remove invalid entries
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to store timeout recovery info:', error);
  }
};

/**
 * Get stored timeout recovery information
 */
export const getStoredTimeoutRecovery = (email: string): { email: string; timestamp: string; reason: string } | null => {
  try {
    const stored = localStorage.getItem(`budgetme_timeout_recovery_${email}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to get stored timeout recovery info:', error);
    return null;
  }
};

/**
 * Clear timeout recovery information after successful resolution
 */
export const clearTimeoutRecovery = (email: string): void => {
  try {
    localStorage.removeItem(`budgetme_timeout_recovery_${email}`);
  } catch (error) {
    console.warn('Failed to clear timeout recovery info:', error);
  }
};