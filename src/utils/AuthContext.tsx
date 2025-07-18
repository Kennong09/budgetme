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
  AuthError
} from './authService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  logout: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
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
  
  // Refs to track if toasts have been shown to prevent duplicates
  const initialSessionLoaded = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const toastsShown = useRef({
    signIn: false,
    signUp: false,
    resetPassword: false,
    error: false
  });

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        setSession(currentSession);
        
        if (currentSession) {
          // Store the session ID to track if it changes
          sessionIdRef.current = currentSession.access_token;
          
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          
          // Session exists, user is authenticated
          if (currentUser) {
            setSignInSuccess(true);
            
            // If user is on login or signup page, redirect to dashboard
            const currentPath = window.location.pathname;
            if ((currentPath === '/login' || currentPath === '/signup' || currentPath === '/') && !currentPath.startsWith('/admin')) {
              window.location.href = '/dashboard';
            }
          }
        }
        
        // Mark initialization as complete regardless of session state
        initialSessionLoaded.current = true;
      } catch (err) {
        console.error('Error initializing auth:', err);
        // Even on error, mark initialization as complete to prevent loading issues
        initialSessionLoaded.current = true;
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = onAuthStateChange((event, session) => {
      // Check if this is a new session or just a focus change
      const isNewSession = session && (!sessionIdRef.current || sessionIdRef.current !== session.access_token);
      
      // Update the session reference if it changed
      if (session) {
        sessionIdRef.current = session.access_token;
      } else {
        sessionIdRef.current = null;
      }
      
      setSession(session);
      setUser(session?.user || null);
      
      // Only show toasts for actual auth state changes, not tab focus changes
      if (initialSessionLoaded.current) {
        if (event === 'SIGNED_IN' && isNewSession) {
          // Check if the user signed in with OAuth (emails are auto-verified)
          const isOAuthUser = session?.user?.app_metadata?.provider && 
                             session.user.app_metadata.provider !== 'email';
                             
          // For OAuth users like Google, we don't need to show email verification
          if (isOAuthUser) {
            // OAuth sign-in, email is already verified
            if (!toastsShown.current.signIn) {
              const providerName = session?.user?.app_metadata?.provider || 'OAuth';
              showSuccessToast('Successfully Signed In with ' + 
                (providerName.charAt(0).toUpperCase() + 
                providerName.slice(1)));
              toastsShown.current.signIn = true;
            }
            setSignInSuccess(true);
            // Close verification modal if it was open
            if (showEmailVerificationModal) {
              setShowEmailVerificationModal(false);
            }
            
            // Redirect to dashboard after OAuth sign-in, but don't redirect if coming from admin area
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/admin')) {
              window.location.href = '/dashboard';
            }
          } else {
            // Regular email sign-in
            if (!toastsShown.current.signIn) {
              showSuccessToast('Successfully Signed In!');
              toastsShown.current.signIn = true;
            }
            setSignInSuccess(true);
            
            // Redirect to dashboard after email sign-in, but don't redirect if coming from admin area
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/admin')) {
              window.location.href = '/dashboard';
            }
          }
        } else if (event === 'SIGNED_OUT') {
          showSuccessToast('Successfully Signed Out');
          setSignInSuccess(false);
          // Reset toast flags on sign out
          toastsShown.current = {
            signIn: false,
            signUp: false,
            resetPassword: false,
            error: false
          };
        } else if (event === 'USER_UPDATED') {
          showSuccessToast('Your profile has been updated');
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccessToast('Password recovery initiated');
        }
      } else {
        // No longer need to set this here since we set it during initialization
        // initialSessionLoaded.current = true;
      }
    });

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [showSuccessToast]);

  // Reset success and error states after showing toasts
  useEffect(() => {
    if (signInSuccess && toastsShown.current.signIn) {
      // Reset after a delay to ensure the UI has time to react
      const timer = setTimeout(() => {
        setSignInSuccess(false);
        toastsShown.current.signIn = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [signInSuccess]);

  useEffect(() => {
    if (signUpSuccess && !toastsShown.current.signUp) {
      toastsShown.current.signUp = true;
      // Reset after a delay
      const timer = setTimeout(() => {
        setSignUpSuccess(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [signUpSuccess]);

  useEffect(() => {
    if (resetPasswordSuccess && !toastsShown.current.resetPassword) {
      toastsShown.current.resetPassword = true;
      // Reset after a delay
      const timer = setTimeout(() => {
        setResetPasswordSuccess(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [resetPasswordSuccess]);

  useEffect(() => {
    if (error && !toastsShown.current.error) {
      showErrorToast(error);
      toastsShown.current.error = true;
      // Reset error after toast is shown
      const timer = setTimeout(() => {
        clearError();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [error, showErrorToast]);

  const handleAuthError = (error: AuthError | null) => {
    if (error) {
      setError(error.message);
      return error.message;
    }
    return null;
  };

  const clearError = () => {
    setError(null);
    toastsShown.current.error = false;
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await signInWithEmail(email, password);
      
      if (response.error) {
        handleAuthError(response.error);
      } else {
        setUser(response.user);
        setSession(response.session);
        setSignInSuccess(true);
        toastsShown.current.signIn = false; // Allow sign-in toast to show
        
        // Redirect to dashboard after successful login
        window.location.href = '/dashboard';
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign in';
      setError(errorMessage);
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    clearError();
    toastsShown.current.signUp = false; // Reset signup toast flag
    
    try {
      const response = await signUpWithEmail(email, password, { full_name: fullName });
      
      if (response.error) {
        handleAuthError(response.error);
      } else {
        // Always show verification modal first, regardless of email confirmation settings
        setVerificationEmail(email);
        setShowEmailVerificationModal(true);
        setSignUpSuccess(true);
        
        // Don't set user and session after signup until email is confirmed
        // This prevents auto-redirection to dashboard
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign up';
      setError(errorMessage);
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    clearError();
    try {
      // OAuth providers like Google automatically verify emails
      // No need to show email verification modal
      await signInWithProvider(provider);
      
      // Note: The actual sign-in state update happens in the auth state change listener
      // We don't need to manually update user/session here
    } catch (err) {
      const errorMessage = `An unexpected error occurred during ${provider} sign in`;
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error(`${provider} sign in error:`, err);
    }
  };

  const logout = async () => {
    setLoading(true);
    clearError();
    
    try {
      const { error } = await signOut();
      if (error) {
        handleAuthError(error);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during logout';
      setError(errorMessage);
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetUserPassword = async (email: string) => {
    setLoading(true);
    clearError();
    toastsShown.current.resetPassword = false; // Reset password reset toast flag
    
    try {
      const { error } = await resetPassword(email);
      if (error) {
        handleAuthError(error);
      } else {
        setResetPasswordSuccess(true);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during password reset';
      setError(errorMessage);
      console.error('Password reset error:', err);
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