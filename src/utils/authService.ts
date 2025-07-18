import { supabase } from './supabaseClient';
import { Provider, Session, User } from '@supabase/supabase-js';

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error ? { message: error.message } : null,
  };
};

export const signUpWithEmail = async (email: string, password: string, metadata: { full_name: string }): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error ? { message: error.message } : null,
  };
};

// OAuth authentication
export const signInWithProvider = async (provider: Provider): Promise<void> => {
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: provider === 'google' ? 'email profile' : undefined,
    },
  });
};

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return {
    error: error ? { message: error.message } : null,
  };
};

// Reset password
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  return {
    error: error ? { message: error.message } : null,
  };
};

// Resend verification email
export const resendVerificationEmail = async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  return {
    error: error ? { message: error.message } : null,
  };
};

// Get current session
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

// Update user email
export const updateUserEmail = async (email: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.updateUser({ email });
  
  return {
    user: data?.user || null,
    session: null, // updateUser doesn't return a session object
    error: error ? { message: error.message } : null,
  };
};

// Setup auth state change listener
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}; 