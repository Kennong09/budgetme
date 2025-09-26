import { supabase } from '../../utils/supabaseClient';

// Goal Service for handling goal operations with Supabase
export class GoalService {
  
  /**
   * Validate if a goal exists and belongs to the user
   * @param goalId - The goal ID to validate
   * @param userId - The user ID to check ownership
   * @returns Promise<{ exists: boolean; goal?: any; error?: string }>
   */
  static async validateGoalExists(
    goalId: string, 
    userId: string
  ): Promise<{ exists: boolean; goal?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { exists: false };
        }
        console.error('Goal validation error:', error);
        return { 
          exists: false, 
          error: error.message 
        };
      }
      
      return { 
        exists: true, 
        goal: data 
      };
    } catch (error) {
      console.error('Goal validation exception:', error);
      return { 
        exists: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate goal contribution prerequisites
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @param contributionAmount - The contribution amount
   * @returns Promise<{ valid: boolean; goal?: any; error?: string }>
   */
  static async validateGoalContribution(
    goalId: string, 
    userId: string, 
    contributionAmount: number
  ): Promise<{ valid: boolean; goal?: any; error?: string }> {
    try {
      // First validate the goal exists
      const goalValidation = await this.validateGoalExists(goalId, userId);
      
      if (!goalValidation.exists) {
        return {
          valid: false,
          error: goalValidation.error || 'Goal does not exist or does not belong to the user'
        };
      }

      const goal = goalValidation.goal;

      // Check if goal is in a valid state for contributions
      if (goal.status === 'completed') {
        return {
          valid: false,
          error: 'Cannot contribute to a completed goal'
        };
      }

      if (goal.status === 'cancelled') {
        return {
          valid: false,
          error: 'Cannot contribute to a cancelled goal'
        };
      }

      if (contributionAmount <= 0) {
        return {
          valid: false,
          error: 'Contribution amount must be greater than zero'
        };
      }

      // Check if contribution would exceed the goal target
      const newCurrentAmount = goal.current_amount + contributionAmount;
      if (newCurrentAmount > goal.target_amount) {
        const maxContribution = goal.target_amount - goal.current_amount;
        return {
          valid: false,
          error: `Contribution would exceed goal target. Maximum contribution: ${maxContribution}`
        };
      }

      return {
        valid: true,
        goal
      };
    } catch (error) {
      console.error('Goal contribution validation exception:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all goals for a user with validation
   * @param userId - The user ID
   * @returns Promise<{ success: boolean; goals?: any[]; error?: string }>
   */
  static async getUserGoals(userId: string): Promise<{ success: boolean; goals?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user goals:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        goals: data || []
      };
    } catch (error) {
      console.error('Get user goals exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if any transactions reference non-existent goals for a user
   * @param userId - The user ID
   * @returns Promise<{ hasInvalidReferences: boolean; invalidTransactionIds?: string[]; error?: string }>
   */
  static async checkInvalidGoalReferences(
    userId: string
  ): Promise<{ hasInvalidReferences: boolean; invalidTransactionIds?: string[]; error?: string }> {
    try {
      // Get all goal IDs for the user
      const { data: userGoals, error: goalError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId);

      if (goalError) {
        console.error('Error fetching user goals for validation:', goalError);
        return {
          hasInvalidReferences: false,
          error: goalError.message
        };
      }

      const validGoalIds = new Set(userGoals?.map(g => g.id) || []);

      // Get all transactions with goal references for the user
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, goal_id')
        .eq('user_id', userId)
        .not('goal_id', 'is', null);

      if (txError) {
        console.error('Error fetching transactions for validation:', txError);
        return {
          hasInvalidReferences: false,
          error: txError.message
        };
      }

      // Find transactions with invalid goal references
      const invalidTransactionIds = transactions
        ?.filter(tx => !validGoalIds.has(tx.goal_id))
        .map(tx => tx.id) || [];

      return {
        hasInvalidReferences: invalidTransactionIds.length > 0,
        invalidTransactionIds
      };
    } catch (error) {
      console.error('Invalid goal reference check exception:', error);
      return {
        hasInvalidReferences: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
