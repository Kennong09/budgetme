import { supabase } from '../../utils/supabaseClient';

// Transaction Service for handling transaction operations with Supabase
export class TransactionService {
  
  /**
   * Validate if a goal exists and belongs to the user
   * @param goalId - The goal ID to validate
   * @param userId - The user ID to check ownership
   * @returns Promise<boolean> - true if goal exists and belongs to user
   */
  static async validateGoalReference(goalId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('id')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Goal validation error:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Goal validation exception:', error);
      return false;
    }
  }

  /**
   * Create a transaction with goal validation
   * @param transactionData - Transaction data including optional goal_id
   * @returns Promise with transaction creation result
   */
  static async createTransaction(transactionData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate goal reference if goal_id is provided
      if (transactionData.goal_id) {
        const isValidGoal = await this.validateGoalReference(
          transactionData.goal_id, 
          transactionData.user_id
        );
        
        if (!isValidGoal) {
          return {
            success: false,
            error: 'Invalid goal reference: Goal does not exist or does not belong to the user'
          };
        }
      }

      // Create the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        console.error('Transaction creation error:', error);
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
      console.error('Transaction creation exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a transaction with goal validation
   * @param transactionId - ID of transaction to update
   * @param updateData - Data to update including optional goal_id
   * @param userId - User ID for validation
   * @returns Promise with update result
   */
  static async updateTransaction(
    transactionId: string, 
    updateData: any, 
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate goal reference if goal_id is being updated
      if (updateData.goal_id) {
        const isValidGoal = await this.validateGoalReference(
          updateData.goal_id, 
          userId
        );
        
        if (!isValidGoal) {
          return {
            success: false,
            error: 'Invalid goal reference: Goal does not exist or does not belong to the user'
          };
        }
      }

      // Update the transaction
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .eq('user_id', userId) // Ensure user owns the transaction
        .select()
        .single();

      if (error) {
        console.error('Transaction update error:', error);
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
      console.error('Transaction update exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cleanup invalid goal references in transactions
   * This can be called periodically or when goals are deleted
   * @param userId - User ID to cleanup transactions for
   * @returns Promise with cleanup result
   */
  static async cleanupInvalidGoalReferences(userId: string): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
    try {
      // Find transactions with goal_id that don't have corresponding goals
      const { data: invalidTransactions, error: findError } = await supabase
        .from('transactions')
        .select('id, goal_id')
        .eq('user_id', userId)
        .not('goal_id', 'is', null);

      if (findError) {
        console.error('Error finding transactions for cleanup:', findError);
        return {
          success: false,
          cleanedCount: 0,
          error: findError.message
        };
      }

      if (!invalidTransactions || invalidTransactions.length === 0) {
        return {
          success: true,
          cleanedCount: 0
        };
      }

      // Check which goal IDs are valid
      const goalIds = Array.from(new Set(invalidTransactions.map(tx => tx.goal_id)));
      const { data: validGoals, error: goalError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .in('id', goalIds);

      if (goalError) {
        console.error('Error checking valid goals:', goalError);
        return {
          success: false,
          cleanedCount: 0,
          error: goalError.message
        };
      }

      const validGoalIds = new Set(validGoals?.map(g => g.id) || []);
      const transactionsToClean = invalidTransactions.filter(
        tx => !validGoalIds.has(tx.goal_id)
      );

      if (transactionsToClean.length === 0) {
        return {
          success: true,
          cleanedCount: 0
        };
      }

      // Clean up invalid references
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ goal_id: null })
        .in('id', transactionsToClean.map(tx => tx.id));

      if (updateError) {
        console.error('Error cleaning up transactions:', updateError);
        return {
          success: false,
          cleanedCount: 0,
          error: updateError.message
        };
      }

      return {
        success: true,
        cleanedCount: transactionsToClean.length
      };
    } catch (error) {
      console.error('Cleanup exception:', error);
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
