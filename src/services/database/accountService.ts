import { supabase } from '../../utils/supabaseClient';
import { Account } from '../../components/settings/types';

/**
 * Account Service for handling account operations with Supabase
 * Provides comprehensive CRUD operations with proper validation and error handling
 */
export class AccountService {
  
  /**
   * Fetch all active accounts for a user
   */
  static async fetchUserAccounts(userId: string): Promise<{ 
    success: boolean; 
    data?: Account[]; 
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('is_default', { ascending: false })
        .order('account_name', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Exception fetching accounts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new account with validation
   */
  static async createAccount(accountData: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<{
    success: boolean;
    data?: Account;
    error?: string;
  }> {
    try {
      // Validate required fields
      if (!accountData.account_name?.trim()) {
        return {
          success: false,
          error: 'Account name is required'
        };
      }

      if (isNaN(accountData.balance)) {
        return {
          success: false,
          error: 'Please enter a valid balance amount'
        };
      }

      // Validate credit account balance constraint
      if (accountData.account_type === 'credit' && accountData.balance > 0) {
        return {
          success: false,
          error: 'Credit account balance must be zero or negative'
        };
      }

      // If setting as default, unset other defaults first
      if (accountData.is_default) {
        await this.unsetOtherDefaults(accountData.user_id);
      }

      // Create the account
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          initial_balance: accountData.balance, // Store initial balance
          currency: 'PHP', // Force to PHP as per business rules
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating account:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Exception creating account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing account
   */
  static async updateAccount(
    accountId: string, 
    accountData: Partial<Account>, 
    userId: string
  ): Promise<{
    success: boolean;
    data?: Account;
    error?: string;
  }> {
    try {
      // Validate account name if being updated
      if (accountData.account_name !== undefined && !accountData.account_name?.trim()) {
        return {
          success: false,
          error: 'Account name is required'
        };
      }

      // Validate balance if being updated
      if (accountData.balance !== undefined && isNaN(accountData.balance)) {
        return {
          success: false,
          error: 'Please enter a valid balance amount'
        };
      }

      // Validate credit account balance constraint
      if (accountData.account_type === 'credit' && accountData.balance !== undefined && accountData.balance > 0) {
        return {
          success: false,
          error: 'Credit account balance must be zero or negative'
        };
      }

      // If setting as default, unset other defaults first
      if (accountData.is_default) {
        await this.unsetOtherDefaults(userId, accountId);
      }

      // Update the account
      const { data, error } = await supabase
        .from('accounts')
        .update({
          ...accountData,
          currency: 'PHP', // Force to PHP as per business rules
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', userId) // Ensure user owns the account
        .select()
        .single();

      if (error) {
        console.error('Error updating account:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Exception updating account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Soft delete an account (set status to inactive)
   */
  static async deleteAccount(accountId: string, userId: string): Promise<{
    success: boolean;
    newDefaultAccountId?: string;
    error?: string;
  }> {
    try {
      // First check if user has more than one account
      const { data: userAccounts, error: fetchError } = await supabase
        .from('accounts')
        .select('id, is_default')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (fetchError) {
        return {
          success: false,
          error: fetchError.message
        };
      }

      if (!userAccounts || userAccounts.length <= 1) {
        return {
          success: false,
          error: 'You must have at least one active account'
        };
      }

      const accountToDelete = userAccounts.find(acc => acc.id === accountId);
      if (!accountToDelete) {
        return {
          success: false,
          error: 'Account not found'
        };
      }

      // Soft delete the account
      const { error: deleteError } = await supabase
        .from('accounts')
        .update({ 
          status: 'inactive', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message
        };
      }

      let newDefaultAccountId: string | undefined;

      // If the deleted account was default, set a new default
      if (accountToDelete.is_default) {
        const remainingAccounts = userAccounts.filter(acc => acc.id !== accountId);
        if (remainingAccounts.length > 0) {
          newDefaultAccountId = remainingAccounts[0].id;
          
          const { error: defaultError } = await supabase
            .from('accounts')
            .update({ 
              is_default: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', newDefaultAccountId)
            .eq('user_id', userId);

          if (defaultError) {
            console.warn('Failed to set new default account:', defaultError);
          }
        }
      }

      return {
        success: true,
        newDefaultAccountId
      };
    } catch (error) {
      console.error('Exception deleting account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate account ownership
   */
  static async validateAccountOwnership(accountId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error validating account ownership:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Exception validating account ownership:', error);
      return false;
    }
  }

  /**
   * Get account balance and transaction count
   */
  static async getAccountSummary(accountId: string, userId: string): Promise<{
    success: boolean;
    data?: {
      balance: number;
      transactionCount: number;
      lastTransactionDate?: string;
    };
    error?: string;
  }> {
    try {
      // Get account details
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError) {
        return {
          success: false,
          error: accountError.message
        };
      }

      // Get transaction statistics
      const { data: transactionStats, error: statsError } = await supabase
        .from('transactions')
        .select('date')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (statsError) {
        // If transactions table access fails, just return account balance
        return {
          success: true,
          data: {
            balance: account.balance,
            transactionCount: 0
          }
        };
      }

      return {
        success: true,
        data: {
          balance: account.balance,
          transactionCount: transactionStats?.length || 0,
          lastTransactionDate: transactionStats?.[0]?.date
        }
      };
    } catch (error) {
      console.error('Exception getting account summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper method to unset other default accounts
   */
  private static async unsetOtherDefaults(userId: string, excludeAccountId?: string): Promise<void> {
    try {
      let query = supabase
        .from('accounts')
        .update({ 
          is_default: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (excludeAccountId) {
        query = query.neq('id', excludeAccountId);
      }

      const { error } = await query;

      if (error) {
        console.warn('Failed to unset other default accounts:', error);
      }
    } catch (error) {
      console.warn('Exception unsetting other default accounts:', error);
    }
  }

  /**
   * Set a specific account as the default account
   * @param accountId - The account ID to set as default
   * @param userId - The user ID to check ownership
   * @returns Promise with operation result
   */
  static async setDefaultAccount(
    accountId: string, 
    userId: string
  ): Promise<{ success: boolean; data?: Account; error?: string }> {
    try {
      // Validate account ownership and status
      const { data: account, error: validationError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (validationError) {
        return {
          success: false,
          error: 'Account not found or access denied'
        };
      }

      if (!account) {
        return {
          success: false,
          error: 'Account is inactive and cannot be set as default'
        };
      }

      // If already default, return success
      if (account.is_default) {
        return {
          success: true,
          data: account
        };
      }

      // Unset other defaults first
      await this.unsetOtherDefaults(userId, accountId);

      // Set the new default
      const { data: updatedAccount, error: updateError } = await supabase
        .from('accounts')
        .update({ 
          is_default: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      return {
        success: true,
        data: updatedAccount
      };
    } catch (error) {
      console.error('Exception setting default account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the current default account for a user
   * @param userId - The user ID
   * @returns Promise with default account or null
   */
  static async getDefaultAccount(
    userId: string
  ): Promise<{ success: boolean; data?: Account | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || null
      };
    } catch (error) {
      console.error('Exception getting default account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensure user has at least one default account
   * Creates or promotes an account to default if none exists
   * @param userId - The user ID
   * @returns Promise with operation result
   */
  static async ensureDefaultAccount(
    userId: string
  ): Promise<{ success: boolean; data?: Account; error?: string }> {
    try {
      // Check if user has any default account
      const defaultResult = await this.getDefaultAccount(userId);
      
      if (!defaultResult.success) {
        return {
          success: false,
          error: defaultResult.error
        };
      }

      // If default account exists, return it
      if (defaultResult.data) {
        return {
          success: true,
          data: defaultResult.data
        };
      }

      // No default account exists, set the first active account as default
      const { data: firstAccount, error: firstError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstError) {
        return {
          success: false,
          error: 'No active accounts found to set as default'
        };
      }

      if (!firstAccount) {
        return {
          success: false,
          error: 'No accounts available to set as default'
        };
      }

      // Set the first account as default
      return await this.setDefaultAccount(firstAccount.id, userId);
    } catch (error) {
      console.error('Exception ensuring default account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensure user has at least one default account (legacy method for backward compatibility)
   */
  static async ensureDefaultAccountLegacy(userId: string): Promise<boolean> {
    const result = await this.ensureDefaultAccount(userId);
    return result.success;
  }
}