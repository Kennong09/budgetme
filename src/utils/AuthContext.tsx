import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Session, User, Provider } from '@supabase/supabase-js';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithProvider, 
  signOut, 
  resetPassword, 
  getCurrentUser, 
  getCurrentSession,
  onAuthStateChange,
  confirmEmailDelivered,
  AuthError
} from './authService';
import { useToast } from './ToastContext';
import { checkStorageHealth } from './supabaseClient';
import { initializeSessionPersistence } from './sessionPersistence';
import { prefetchIpAddress } from './ipService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  logout: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  setVerificationEmail: (email: string) => void;
  verificationEmail: string;
  showEmailVerificationModal: boolean;
  setShowEmailVerificationModal: (show: boolean) => void;
  resetPasswordSuccess: boolean;
  setResetPasswordSuccess: (success: boolean) => void;
  signUpSuccess: boolean;
  setSignUpSuccess: (success: boolean) => void;
  signInSuccess: boolean;
  setSignInSuccess: (success: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Component that will provide auth context using context API
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState<boolean>(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<boolean>(false);
  const [signUpSuccess, setSignUpSuccess] = useState<boolean>(false);
  const [signInSuccess, setSignInSuccess] = useState<boolean>(false);
  const [hasShownSignInToast, setHasShownSignInToast] = useState<boolean>(() => {
    // Check localStorage on initialization to persist across page refreshes
    return localStorage.getItem('hasShownSignInToast') === 'true';
  });
  
  // Use a ref to track if toast has been shown in this session to prevent double triggering
  const toastShownRef = useRef<boolean>(localStorage.getItem('hasShownSignInToast') === 'true');
  

  useEffect(() => {
    let mounted = true;
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Skip IP prefetch to prevent login delays
        // prefetchIpAddress();
        
        // Check storage health on initialization
        if (!checkStorageHealth()) {
          console.warn('localStorage is not available, sessions may not persist');
        }
        
        // Get initial session without forcing a refresh
        const currentSession = await getCurrentSession();
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          
          if (currentSession?.user) {
            setSignInSuccess(true);
          }
        }
        
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Initialize session persistence optimization
    const cleanupSessionPersistence = initializeSessionPersistence();

    // Set up auth state change listener with proper event handling
    const { data: authListener } = onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        provider: session?.user?.app_metadata?.provider 
      });
      
      // Update state for all events
      setSession(session);
      setUser(session?.user || null);
      
      // Handle specific events
      switch (event) {
        case 'INITIAL_SESSION':
          // Don't show toasts for initial session
          if (session?.user) {
            setSignInSuccess(true);
          }
          break;
          
        case 'SIGNED_IN':
          // Only show toast for actual sign-in events, not session restoration
          console.log('SIGNED_IN event:', { 
            hasShownSignInToast, 
            toastShownRef: toastShownRef.current,
            provider: session?.user?.app_metadata?.provider,
            userId: session?.user?.id 
          });
          
          // Use both state and ref to prevent double toasts
          if (!hasShownSignInToast && !toastShownRef.current) {
            const isOAuthUser = session?.user?.app_metadata?.provider && 
                               session.user.app_metadata.provider !== 'email';
                               
            if (isOAuthUser) {
              const providerName = session?.user?.app_metadata?.provider || 'OAuth';
              console.log('Showing OAuth toast for provider:', providerName);
              showSuccessToast('Successfully Signed In with ' + 
                (providerName.charAt(0).toUpperCase() + providerName.slice(1)));
            } else {
              console.log('Showing email toast');
              showSuccessToast('Successfully Signed In!');
            }
            
            // Set both state and ref to prevent future toasts
            setHasShownSignInToast(true);
            toastShownRef.current = true;
            // Persist the flag in localStorage to survive page refreshes
            localStorage.setItem('hasShownSignInToast', 'true');
            console.log('Toast flag set to true');
          } else {
            console.log('Toast already shown, skipping');
          }
          
          setSignInSuccess(true);
          
          // Close email verification modal if open
          if (showEmailVerificationModal) {
            setShowEmailVerificationModal(false);
          }
          
          // Redirect to appropriate dashboard after successful login (avoid immediate redirects that can cause conflicts)
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '/auth/callback') {
            setTimeout(async () => {
              if (mounted && !currentPath.startsWith('/admin')) {
                // Check if user is admin and redirect accordingly
                try {
                  const { isUserAdmin } = await import('./adminHelpers');
                  const isAdmin = await isUserAdmin();
                  if (isAdmin) {
                    window.location.href = '/admin/dashboard';
                  } else {
                    window.location.href = '/dashboard';
                  }
                } catch (adminCheckError) {
                  console.error('Error checking admin status:', adminCheckError);
                  window.location.href = '/dashboard';
                }
              }
            }, 500); // Increased delay to prevent race conditions
          }
          break;
        
        case 'SIGNED_OUT':
          showSuccessToast('Successfully Signed Out');
          setSignInSuccess(false);
          setHasShownSignInToast(false); // Reset toast flag on sign out
          toastShownRef.current = false; // Reset ref on sign out
          localStorage.removeItem('hasShownSignInToast'); // Clear localStorage flag
          // Clear any verification states
          setShowEmailVerificationModal(false);
          setSignUpSuccess(false);
          setResetPasswordSuccess(false);
          break;
          
        case 'USER_UPDATED':
          showSuccessToast('Your profile has been updated');
          break;
          
        case 'PASSWORD_RECOVERY':
          showSuccessToast('Password recovery initiated');
          break;
          
        case 'TOKEN_REFRESHED':
          // Silent refresh - no user notification needed
          console.log('Token refreshed successfully');
          break;
      }
    });

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
      cleanupSessionPersistence?.();
    };
  }, [showSuccessToast, showEmailVerificationModal]);

  const clearError = () => {
    setError(null);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setSignInSuccess(false);
    
    try {
      const response = await signInWithEmail(email, password);
      
      if (response.error) {
        // Handle email not confirmed error specifically
        if (response.error.message.includes('email') && 
            (response.error.message.includes('not confirmed') || 
             response.error.message.includes('not verified') ||
             response.error.message.includes('verify'))) {
          // Show email verification modal instead of generic error
          setVerificationEmail(email);
          setShowEmailVerificationModal(true);
          setError('Please verify your email before logging in. Check your inbox for the verification link.');
        } else {
          setError(response.error.message);
        }
      }
      // Let auth state listener handle success state
    } catch (error: any) {
      setError(error?.message || 'An unexpected error occurred during sign in');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    setError(null);
    setSignUpSuccess(false);
    
    try {
      const response = await signUpWithEmail(email, password, { full_name: fullName });
      
      if (response.error) {
        setError(response.error.message);
      } else {
        // Always show verification modal first, regardless of email confirmation settings
        setVerificationEmail(email);
        setShowEmailVerificationModal(true);
        setSignUpSuccess(true);
        
        // Don't set user and session after signup until email is confirmed
        // This prevents auto-redirection to dashboard
      }
    } catch (error: any) {
      setError(error?.message || 'An unexpected error occurred during sign up');
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    setError(null);
    try {
      await signInWithProvider(provider);
    } catch (error: any) {
      const errorMessage = error?.message || `An unexpected error occurred during ${provider} sign in`;
      setError(errorMessage);
      console.error(`${provider} sign in error:`, error);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await signOut();
      if (error) {
        setError(error.message);
      } else {
        // Clear local state
        setUser(null);
        setSession(null);
        setSignInSuccess(false);
      }
    } catch (error: any) {
      setError(error?.message || 'An unexpected error occurred during logout');
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetUserPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    setResetPasswordSuccess(false);
    
    try {
      const { error } = await resetPassword(email);
      if (error) {
        const message = error.message;
        setError(message);
        return { success: false, error: message };
      } else {
        setResetPasswordSuccess(true);
        return { success: true };
      }
    } catch (error: any) {
      const message = error?.message || 'An unexpected error occurred during password reset';
      setError(message);
      console.error('Password reset error:', error);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signInWithOAuth,
    logout,
    resetUserPassword,
    clearError,
    verificationEmail,
    setVerificationEmail,
    showEmailVerificationModal,
    setShowEmailVerificationModal,
    resetPasswordSuccess,
    setResetPasswordSuccess,
    signUpSuccess,
    setSignUpSuccess,
    signInSuccess,
    setSignInSuccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 