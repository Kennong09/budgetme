import { supabase } from '../../utils/supabaseClient';
import { TransactionService } from './transactionService';

/**
 * Enhanced Transaction Service with Schema-Aware Category Mapping
 * 
 * This service handles the schema mapping between the component interface (single category_id)
 * and the database schema (separate income_category_id/expense_category_id columns).
 * 
 * Key Features:
 * - Automatic mapping between category_id and appropriate schema columns
 * - Validation to ensure category matches transaction type
 * - Fallback mechanisms for different schema states
 * - Backward compatibility with existing components
 */
export class EnhancedTransactionService extends TransactionService {

  /**
   * Fetch transaction with category mapping for component interface
   */
  static async fetchTransactionForEdit(transactionId: string, userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found or access denied'
        };
      }

      // Map schema columns to component interface
      const mappedTransaction = this.mapDatabaseToComponent(transaction);

      return {
        success: true,
        data: mappedTransaction
      };

    } catch (error) {
      console.error('Enhanced Transaction Service: Error fetching transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update transaction with schema-aware category mapping
   */
  static async updateTransactionWithMapping(
    transactionId: string,
    userId: string,
    transactionData: {
      type: 'income' | 'expense' | 'contribution';
      amount: number;
      date: string;
      account_id: string;
      category_id: string;
      goal_id?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate that category exists and matches transaction type
      const categoryValidation = await this.validateCategoryMatch(
        transactionData.category_id,
        transactionData.type,
        userId
      );

      if (!categoryValidation.valid) {
        return {
          success: false,
          error: categoryValidation.error || 'Invalid category selection'
        };
      }

      // Map component interface to database schema
      const dbData = this.mapComponentToDatabase(transactionData);

      // Update the transaction
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('transactions')
        .update(dbData)
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // Map back to component interface for response
      const mappedResponse = this.mapDatabaseToComponent(updatedTransaction);

      return {
        success: true,
        data: mappedResponse
      };

    } catch (error) {
      console.error('Enhanced Transaction Service: Error updating transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create transaction with schema-aware category mapping
   */
  static async createTransactionWithMapping(
    userId: string,
    transactionData: {
      type: 'income' | 'expense' | 'contribution';
      amount: number;
      date: string;
      account_id: string;
      category_id: string;
      goal_id?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate that category exists and matches transaction type
      const categoryValidation = await this.validateCategoryMatch(
        transactionData.category_id,
        transactionData.type,
        userId
      );

      if (!categoryValidation.valid) {
        return {
          success: false,
          error: categoryValidation.error || 'Invalid category selection'
        };
      }

      // Map component interface to database schema
      const dbData = {
        ...this.mapComponentToDatabase(transactionData),
        user_id: userId
      };

      // Create the transaction
      const { data: newTransaction, error: createError } = await supabase
        .from('transactions')
        .insert(dbData)
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: createError.message
        };
      }

      // Map back to component interface for response
      const mappedResponse = this.mapDatabaseToComponent(newTransaction);

      return {
        success: true,
        data: mappedResponse
      };

    } catch (error) {
      console.error('Enhanced Transaction Service: Error creating transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Map database transaction to component interface (income_category_id/expense_category_id -> category_id)
   */
  private static mapDatabaseToComponent(dbTransaction: any): any {
    const mapped = { ...dbTransaction };

    // Map the appropriate category column to category_id for component use
    if (dbTransaction.type === 'income' && dbTransaction.income_category_id) {
      mapped.category_id = dbTransaction.income_category_id;
    } else if ((dbTransaction.type === 'expense' || dbTransaction.type === 'contribution') && dbTransaction.expense_category_id) {
      mapped.category_id = dbTransaction.expense_category_id;
    } else {
      // Fallback for legacy data or missing category
      mapped.category_id = dbTransaction.category_id || '';
    }

    return mapped;
  }

  /**
   * Map component interface to database schema (category_id -> income_category_id/expense_category_id)
   */
  private static mapComponentToDatabase(componentData: {
    type: 'income' | 'expense' | 'contribution';
    category_id?: string;
    [key: string]: any;
  }): any {
    const mapped = { ...componentData };

    // Remove the component's category_id field if it exists
    if ('category_id' in mapped) {
      delete mapped.category_id;
    }

    // Map to appropriate database column based on transaction type
    if (componentData.type === 'income') {
      mapped.income_category_id = componentData.category_id;
      mapped.expense_category_id = null; // Ensure other category is null
    } else if (componentData.type === 'expense' || componentData.type === 'contribution') {
      mapped.expense_category_id = componentData.category_id;
      mapped.income_category_id = null; // Ensure other category is null
    }

    return mapped;
  }

  /**
   * Validate that the selected category matches the transaction type
   */
  private static async validateCategoryMatch(
    categoryId: string,
    transactionType: 'income' | 'expense' | 'contribution',
    userId: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!categoryId) {
      return { valid: false, error: 'Category is required' };
    }

    try {
      if (transactionType === 'income') {
        // Check if category exists in income_categories
        const { data, error } = await supabase
          .from('income_categories')
          .select('id')
          .eq('id', categoryId)
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          return {
            valid: false,
            error: 'Selected category is not a valid income category'
          };
        }
      } else if (transactionType === 'expense' || transactionType === 'contribution') {
        // Check if category exists in expense_categories
        const { data, error } = await supabase
          .from('expense_categories')
          .select('id')
          .eq('id', categoryId)
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          return {
            valid: false,
            error: 'Selected category is not a valid expense category'
          };
        }
      }

      return { valid: true };

    } catch (error) {
      console.error('Enhanced Transaction Service: Error validating category:', error);
      return {
        valid: false,
        error: 'Error validating category selection'
      };
    }
  }

  /**
   * Fetch transactions with category mapping (for lists and reports)
   */
  static async fetchTransactionsWithMapping(
    userId: string,
    filters?: {
      type?: 'income' | 'expense' | 'all';
      account_id?: string;
      category_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ success: boolean; data?: any[]; count?: number; error?: string }> {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Apply filters
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.account_id) {
        query = query.eq('account_id', filters.account_id);
      }

      if (filters?.category_id) {
        // Apply category filter based on all transactions that have this category
        // regardless of whether it's stored in income_category_id or expense_category_id
        query = query.or(`income_category_id.eq.${filters.category_id},expense_category_id.eq.${filters.category_id}`);
      }

      if (filters?.start_date) {
        query = query.gte('date', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('date', filters.end_date);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data: transactions, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Map all transactions to component interface
      const mappedTransactions = transactions?.map(tx => this.mapDatabaseToComponent(tx)) || [];

      return {
        success: true,
        data: mappedTransactions,
        count: count || 0
      };

    } catch (error) {
      console.error('Enhanced Transaction Service: Error fetching transactions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}