import { supabase } from '../../utils/supabaseClient';
import { AccountAuditRecord } from '../../components/accounts/types/AccountSetupTypes';

/**
 * Account Audit Service for logging and retrieving account-related activities
 * Uses the existing system_activity_log table structure
 */
export class AccountAuditService {
  
  /**
   * Log account creation activity
   */
  static async logAccountCreated(
    userId: string,
    accountData: {
      account_id: string;
      account_name: string;
      account_type: string;
      initial_balance: number;
      [key: string]: any;
    },
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'account_created',
          activity_description: `Account "${accountData.account_name}" created successfully`,
          ip_address: ipAddress || null,
          user_agent: userAgent || navigator.userAgent,
          metadata: {
            created_via: 'account_setup_modal',
            ...accountData
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging account creation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging account creation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log account update activity
   */
  static async logAccountUpdated(
    userId: string,
    accountId: string,
    accountName: string,
    oldValues: any,
    newValues: any,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Determine what changed
      const changes = this.getChanges(oldValues, newValues);
      const changeDescription = this.formatChangeDescription(changes);

      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'account_updated',
          activity_description: `Account "${accountName}" updated: ${changeDescription}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || navigator.userAgent,
          metadata: {
            account_id: accountId,
            account_name: accountName,
            old_values: oldValues,
            new_values: newValues,
            changes: changes,
            updated_via: 'account_settings'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging account update:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging account update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log cash-in transaction activity
   */
  static async logCashIn(
    userId: string,
    cashInData: {
      account_id: string;
      account_name: string;
      amount: number;
      description: string;
      source?: string;
      transaction_id?: string;
      [key: string]: any;
    },
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'account_cash_in',
          activity_description: `Cash-in of ₱${cashInData.amount.toFixed(2)} to account "${cashInData.account_name}"`,
          ip_address: ipAddress || null,
          user_agent: userAgent || navigator.userAgent,
          metadata: {
            cash_in_via: 'account_setup_modal',
            ...cashInData
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging cash-in:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging cash-in:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log account deletion activity
   */
  static async logAccountDeleted(
    userId: string,
    accountData: {
      account_id: string;
      account_name: string;
      account_type: string;
      final_balance: number;
      [key: string]: any;
    },
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'account_deleted',
          activity_description: `Account "${accountData.account_name}" deleted with final balance of ₱${accountData.final_balance.toFixed(2)}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || navigator.userAgent,
          metadata: {
            deleted_via: 'account_settings',
            ...accountData
          },
          severity: 'warning',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging account deletion:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging account deletion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log balance change activity (for direct balance modifications)
   */
  static async logBalanceChange(
    userId: string,
    accountId: string,
    accountName: string,
    oldBalance: number,
    newBalance: number,
    reason: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const change = newBalance - oldBalance;
      const changeType = change > 0 ? 'increase' : 'decrease';
      
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'account_balance_change',
          activity_description: `Balance ${changeType} of ₱${Math.abs(change).toFixed(2)} for account "${accountName}": ${reason}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || navigator.userAgent,
          metadata: {
            account_id: accountId,
            account_name: accountName,
            old_balance: oldBalance,
            new_balance: newBalance,
            change_amount: change,
            change_type: changeType,
            reason: reason,
            changed_via: 'system_operation'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging balance change:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging balance change:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve comprehensive account audit history including transactions and goal contributions
   */
  static async getAccountHistory(
    userId: string,
    accountId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      activityTypes?: string[];
    } = {}
  ): Promise<{ 
    success: boolean; 
    data?: any[]; 
    totalCount?: number;
    error?: string 
  }> {
    try {
      // Default activity types include all account-related, transaction, and contribution activities
      const defaultActivityTypes = [
        'account_created', 'account_updated', 'account_cash_in', 'account_deleted', 'account_balance_change',
        'transaction_created', 'transaction_updated', 'transaction_deleted',
        'goal_contribution_created', 'goal_contribution_updated', 'goal_contribution_deleted'
      ];
      
      let query = supabase
        .from('system_activity_log')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .contains('metadata', { account_id: accountId });

      // Apply activity type filters (use defaults if none specified)
      const typesToFilter = options.activityTypes && options.activityTypes.length > 0 
        ? options.activityTypes 
        : defaultActivityTypes;
      
      query = query.in('activity_type', typesToFilter);

      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      // Order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching account history:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data || [], 
        totalCount: count || 0 
      };
    } catch (error) {
      console.error('Exception fetching account history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve all account-related activities for a user
   */
  static async getUserAccountActivities(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ 
    success: boolean; 
    data?: any[]; 
    totalCount?: number;
    error?: string 
  }> {
    try {
      const accountActivityTypes = [
        'account_created',
        'account_updated', 
        'account_cash_in',
        'account_deleted',
        'account_balance_change'
      ];

      let query = supabase
        .from('system_activity_log')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .in('activity_type', accountActivityTypes);

      // Apply filters
      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      // Order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching user account activities:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data || [], 
        totalCount: count || 0 
      };
    } catch (error) {
      console.error('Exception fetching user account activities:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Export account history to CSV format
   */
  static async exportAccountHistory(
    userId: string,
    accountId: string,
    options: {
      startDate?: string;
      endDate?: string;
      activityTypes?: string[];
    } = {}
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const historyResult = await this.getAccountHistory(userId, accountId, {
        ...options,
        limit: 10000 // Large limit for export
      });

      if (!historyResult.success || !historyResult.data) {
        return { 
          success: false, 
          error: historyResult.error || 'Failed to fetch history data' 
        };
      }

      // Convert to CSV
      const headers = [
        'Date',
        'Activity Type',
        'Description',
        'Account Name',
        'Amount',
        'Source/Reason',
        'IP Address',
        'User Agent'
      ];

      const csvData = historyResult.data.map(record => [
        new Date(record.created_at).toLocaleString('en-PH'),
        record.activity_type,
        record.activity_description,
        record.metadata?.account_name || '',
        record.metadata?.amount ? `₱${record.metadata.amount.toFixed(2)}` : '',
        record.metadata?.source || record.metadata?.reason || '',
        record.ip_address || '',
        record.user_agent || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      return { success: true, data: csvContent };
    } catch (error) {
      console.error('Exception exporting account history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Helper method to get changes between old and new values
   */
  private static getChanges(oldValues: any, newValues: any): { [key: string]: { old: any; new: any } } {
    const changes: { [key: string]: { old: any; new: any } } = {};
    
    const oldKeys = Object.keys(oldValues || {});
    const newKeys = Object.keys(newValues || {});
    const allKeys = [...oldKeys, ...newKeys].filter((key, index, arr) => arr.indexOf(key) === index);
    
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          old: oldValues[key],
          new: newValues[key]
        };
      }
    }
    
    return changes;
  }

  /**
   * Helper method to format change description
   */
  private static formatChangeDescription(changes: { [key: string]: { old: any; new: any } }): string {
    const descriptions = Object.entries(changes).map(([key, change]) => {
      const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `${fieldName}: "${change.old}" → "${change.new}"`;
    });

    return descriptions.join(', ');
  }

  // ===== RPC-based Methods (Using Database Functions) =====

  /**
   * Create account with automatic audit logging using RPC
   */
  static async createAccountWithAudit(
    accountData: {
      account_name: string;
      account_type: string;
      balance: number;
      currency?: string;
      is_default?: boolean;
      color?: string;
      description?: string;
      institution_name?: string;
      account_number_masked?: string;
    }
  ): Promise<{ success: boolean; account_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_account_with_audit', {
        p_account_name: accountData.account_name,
        p_account_type: accountData.account_type,
        p_initial_balance: accountData.balance,
        p_currency: accountData.currency || 'PHP',
        p_is_default: accountData.is_default || false,
        p_color: accountData.color || '#4e73df',
        p_description: accountData.description || null,
        p_institution_name: accountData.institution_name || null,
        p_account_number_masked: accountData.account_number_masked || null
      });

      if (error) {
        console.error('Error creating account with audit:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return { success: true, account_id: result.account_id };
        } else {
          return { success: false, error: result.message };
        }
      }

      return { success: false, error: 'Unexpected response format' };
    } catch (error) {
      console.error('Exception creating account with audit:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create cash-in transaction with automatic audit logging using RPC
   */
  static async createCashInWithAudit(
    accountId: string,
    amount: number,
    description: string,
    date?: string
  ): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_cash_in_transaction', {
        p_account_id: accountId,
        p_amount: amount,
        p_description: description,
        p_date: date || new Date().toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error creating cash-in transaction:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return { success: true, transaction_id: result.transaction_id };
        } else {
          return { success: false, error: result.message };
        }
      }

      return { success: false, error: 'Unexpected response format' };
    } catch (error) {
      console.error('Exception creating cash-in transaction:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get account audit history using RPC
   */
  static async getAccountAuditHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_account_audit_history', {
        p_account_id: accountId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching account audit history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Exception fetching account audit history:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get account transaction history using RPC
   */
  static async getAccountTransactionHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_account_transaction_history', {
        p_account_id: accountId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching account transaction history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Exception fetching account transaction history:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validate account setup data using RPC
   */
  static async validateAccountData(
    accountName: string,
    accountType: string,
    initialBalance: number = 0
  ): Promise<{ success: boolean; isValid?: boolean; errors?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('validate_account_setup_data', {
        p_account_name: accountName,
        p_account_type: accountType,
        p_initial_balance: initialBalance
      });

      if (error) {
        console.error('Error validating account data:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        return { 
          success: true, 
          isValid: result.is_valid,
          errors: result.errors
        };
      }

      return { success: false, error: 'Unexpected response format' };
    } catch (error) {
      console.error('Exception validating account data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get user accounts for setup modal using RPC
   */
  static async getUserAccountsForSetup(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_user_accounts_for_setup');

      if (error) {
        console.error('Error fetching user accounts:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Exception fetching user accounts:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
