import { supabase } from '../../utils/supabaseClient';

export interface TransactionAuditData {
  transaction_id: string;
  account_id: string;
  account_name?: string;
  amount: number;
  type: 'income' | 'expense' | 'contribution';
  category_id?: string;
  category_name?: string;
  goal_id?: string;
  goal_name?: string;
  description?: string;
  date: string;
  [key: string]: any;
}

export interface TransactionUpdateData {
  old_values: Partial<TransactionAuditData>;
  new_values: Partial<TransactionAuditData>;
  changes: Record<string, { old: any; new: any }>;
}

export class TransactionAuditService {
  
  /**
   * Log transaction creation activity
   */
  static async logTransactionCreated(
    userId: string,
    transactionData: TransactionAuditData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'transaction_created',
          activity_description: `${transactionData.type.charAt(0).toUpperCase() + transactionData.type.slice(1)} transaction created: ₱${transactionData.amount.toFixed(2)} - ${transactionData.description || 'No description'}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            transaction_id: transactionData.transaction_id,
            account_id: transactionData.account_id,
            account_name: transactionData.account_name,
            amount: transactionData.amount,
            transaction_type: transactionData.type,
            category_id: transactionData.category_id,
            category_name: transactionData.category_name,
            goal_id: transactionData.goal_id,
            goal_name: transactionData.goal_name,
            description: transactionData.description,
            transaction_date: transactionData.date,
            created_via: 'transaction_form'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging transaction creation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging transaction creation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log transaction update activity
   */
  static async logTransactionUpdated(
    userId: string,
    transactionId: string,
    updateData: TransactionUpdateData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      // Build change description
      const changesList = Object.entries(updateData.changes).map(([field, change]) => {
        const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${fieldLabel}: "${change.old}" → "${change.new}"`;
      });
      
      const changesText = changesList.join(', ');
      
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'transaction_updated',
          activity_description: `Transaction updated: ${changesText}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            transaction_id: transactionId,
            account_id: updateData.new_values.account_id || updateData.old_values.account_id,
            account_name: updateData.new_values.account_name || updateData.old_values.account_name,
            old_values: updateData.old_values,
            new_values: updateData.new_values,
            changes: updateData.changes,
            updated_via: 'transaction_form'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging transaction update:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging transaction update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log transaction deletion activity
   */
  static async logTransactionDeleted(
    userId: string,
    transactionData: TransactionAuditData,
    reason?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'transaction_deleted',
          activity_description: `${transactionData.type.charAt(0).toUpperCase() + transactionData.type.slice(1)} transaction deleted: ₱${transactionData.amount.toFixed(2)} - ${transactionData.description || 'No description'}${reason ? ` (${reason})` : ''}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            transaction_id: transactionData.transaction_id,
            account_id: transactionData.account_id,
            account_name: transactionData.account_name,
            amount: transactionData.amount,
            transaction_type: transactionData.type,
            category_id: transactionData.category_id,
            category_name: transactionData.category_name,
            goal_id: transactionData.goal_id,
            goal_name: transactionData.goal_name,
            description: transactionData.description,
            transaction_date: transactionData.date,
            deletion_reason: reason,
            deleted_via: 'transaction_interface'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging transaction deletion:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging transaction deletion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get transaction-related audit history for a specific account
   */
  static async getTransactionHistory(
    userId: string,
    accountId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      transactionTypes?: string[];
    } = {}
  ): Promise<{ 
    success: boolean; 
    data?: any[]; 
    totalCount?: number;
    error?: string 
  }> {
    
    try {
      const { 
        limit = 50, 
        offset = 0, 
        startDate, 
        endDate, 
        transactionTypes = ['transaction_created', 'transaction_updated', 'transaction_deleted']
      } = options;

      let query = supabase
        .from('system_activity_log')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .in('activity_type', transactionTypes)
        .contains('metadata', { account_id: accountId })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching transaction history:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data || [], 
        totalCount: count || 0 
      };
    } catch (error) {
      console.error('Exception fetching transaction history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Utility method to extract transaction data from various sources
   */
  static extractTransactionAuditData(
    transaction: any,
    account?: any,
    category?: any,
    goal?: any
  ): TransactionAuditData {
    return {
      transaction_id: transaction.id,
      account_id: transaction.account_id || account?.id,
      account_name: account?.account_name,
      amount: transaction.amount,
      type: transaction.type,
      category_id: transaction.income_category_id || transaction.expense_category_id || category?.id,
      category_name: category?.category_name,
      goal_id: transaction.goal_id || goal?.id,
      goal_name: goal?.goal_name,
      description: transaction.description || transaction.notes,
      date: transaction.date
    };
  }
}
