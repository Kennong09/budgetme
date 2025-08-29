import { supabase } from './supabaseClient';
import { Account, UserProfile } from '../components/settings/types';

// User Profile Functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
};

export const createOrUpdateUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        name: profile.name,
        profile_picture: profile.profilePicture,
        // currency removed - always PHP
        language: profile.language,
        notification_email: profile.notifications?.email,
        notification_push: profile.notifications?.push,
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data, error };
  } else {
    // Create new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        name: profile.name,
        profile_picture: profile.profilePicture,
        // currency removed - always PHP
        language: profile.language,
        notification_email: profile.notifications?.email,
        notification_push: profile.notifications?.push,
      })
      .select()
      .single();
    
    return { data, error };
  }
};

// Account Functions
export const getAccounts = async (userId: string) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  
  return data || [];
};

export const createAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: account.user_id,
      account_name: account.account_name,
      account_type: account.account_type,
      balance: account.balance,
      // currency removed - always PHP
      status: account.status,
      is_default: account.is_default,
      color: account.color,
    })
    .select()
    .single();
  
  return { data, error };
};

export const updateAccount = async (accountId: string, updates: Partial<Account>) => {
  const { data, error } = await supabase
    .from('accounts')
    .update({
      account_name: updates.account_name,
      account_type: updates.account_type,
      balance: updates.balance,
      // currency removed - always PHP
      status: updates.status,
      is_default: updates.is_default,
      color: updates.color,
    })
    .eq('id', accountId)
    .select()
    .single();
  
  return { data, error };
};

export const deleteAccount = async (accountId: string) => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);
  
  return { error };
};

// Helper function to transform database response to app format
export const transformUserProfile = (dbProfile: any, accounts: Account[]): UserProfile => {
  return {
    name: dbProfile?.name || '',
    email: dbProfile?.email || '',
    profilePicture: dbProfile?.profile_picture || '',
    // currency removed - always PHP
    language: dbProfile?.language || 'en',
    notifications: {
      email: dbProfile?.notification_email ?? true,
      push: dbProfile?.notification_push ?? true,
    },
    accounts: accounts || [],
  };
};
