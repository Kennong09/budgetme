import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

/**
 * Check if the current user has admin role
 * This first tries to use the Supabase RPC function, and falls back to direct query if that fails
 * @returns {Promise<boolean>} True if the user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    // Try to call the Supabase function to check if user is admin
    try {
      const { data, error } = await supabase.rpc('is_admin_user');
      
      if (!error) {
        return data === true;
      }
      // If there's an error (function doesn't exist), we'll fall through to the direct query
    } catch (rpcErr) {
      // RPC failed, continue to fallback
      console.warn('RPC method failed, using fallback query:', rpcErr);
    }
    
    // Fallback: Query the profiles table directly
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single();
    
    if (profileError) {
      console.error('Error checking admin role from profiles:', profileError);
      return false;
    }
    
    return profile?.role === 'admin';
  } catch (err) {
    console.error('Error in isUserAdmin:', err);
    return false;
  }
};

/**
 * Add admin role to a user
 * NOTE: This should only be callable by existing admins
 * @param {string} userId - The user ID to grant admin access
 * @returns {Promise<boolean>} Success status
 */
export const addAdminRole = async (userId: string): Promise<boolean> => {
  try {
    // Try RPC method first
    try {
      const { data, error } = await supabase.rpc('add_admin_user', {
        user_id: userId
      });
      
      if (!error) {
        return data === true;
      }
      // If RPC fails, continue to fallback
    } catch (rpcErr) {
      console.warn('RPC method failed, using fallback update:', rpcErr);
    }
    
    // Fallback: Update profiles table directly
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    
    if (error) {
      console.error('Error adding admin role:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in addAdminRole:', err);
    return false;
  }
};

/**
 * Remove admin role from a user
 * NOTE: This should only be callable by existing admins
 * @param {string} userId - The user ID to remove admin access from
 * @returns {Promise<boolean>} Success status
 */
export const removeAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('remove_admin_user', {
      user_id: userId
    });
    
    if (error) {
      console.error('Error removing admin role:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Error in removeAdminRole:', err);
    return false;
  }
};

/**
 * Get all users with admin role
 * @returns {Promise<string[]>} Array of admin user IDs
 */
export const getAdminUsers = async (): Promise<string[]> => {
  try {
    // Query the profiles table to get all admin users
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    
    if (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
    
    // Return an array of admin user IDs
    return data?.map(user => user.id) || [];
  } catch (err) {
    console.error('Error in getAdminUsers:', err);
    return [];
  }
};

/**
 * Check if a specific user has admin role (useful for displaying UI elements)
 * @param {User|null} user - The user object to check
 * @returns {Promise<boolean>} True if the user is an admin
 */
export const checkAdminStatus = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  return await isUserAdmin();
}; 