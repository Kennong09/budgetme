import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

/**
 * Check if the current user has admin role
 * This leverages the Supabase is_admin_user() function we created
 * @returns {Promise<boolean>} True if the user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    // Call the Supabase function we created to check if user is admin
    const { data, error } = await supabase.rpc('is_admin_user');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data === true;
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
    const { data, error } = await supabase.rpc('add_admin_user', {
      user_id: userId
    });
    
    if (error) {
      console.error('Error adding admin role:', error);
      return false;
    }
    
    return data === true;
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
    const { data, error } = await supabase
      .from('admin_users')
      .select('id');
    
    if (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
    
    return data.map(user => user.id);
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