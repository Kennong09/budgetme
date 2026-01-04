import { supabase } from '../../../utils/supabaseClient';
import { Goal } from '../types';
import { GoalContributionAuditService } from '../../../services/database/goalContributionAuditService';

/**
 * Robust Goals Data Access Layer
 * Implements fallback mechanisms when goal_details view is unavailable
 */
export class GoalsDataService {
  private static instance: GoalsDataService;
  private fallbackMode: boolean = false;
  private lastError: string | null = null;

  private constructor() {}

  public static getInstance(): GoalsDataService {
    if (!GoalsDataService.instance) {
      GoalsDataService.instance = new GoalsDataService();
    }
    return GoalsDataService.instance;
  }

  /**
   * Fetch goals with automatic fallback mechanism
   */
  async fetchGoals(userId: string): Promise<{ data: Goal[] | null; error: Error | null }> {
    try {
      // First, try to use the enhanced goal_details view
      const enhancedResult = await this.fetchFromGoalDetails(userId);
      
      if (enhancedResult.data) {
        this.fallbackMode = false;
        this.lastError = null;
        return enhancedResult;
      }

      // If goal_details fails, fall back to basic goals table
      console.warn('goal_details view unavailable, falling back to basic goals table');
      const fallbackResult = await this.fetchFromGoalsTable(userId);
      
      if (fallbackResult.data) {
        this.fallbackMode = true;
        return {
          data: this.enhanceBasicGoalsData(fallbackResult.data),
          error: null
        };
      }

      // If both fail, return error
      return {
        data: null,
        error: new Error('Both goal_details view and goals table are unavailable')
      };

    } catch (error) {
      console.error('GoalsDataService: Unexpected error in fetchGoals:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }

  /**
   * Fetch a single goal by ID with automatic fallback mechanism
   */
  async fetchGoalById(goalId: string, userId: string): Promise<{ data: Goal | null; error: Error | null }> {
    try {
      // First, try to use the enhanced goal_details view
      const enhancedResult = await this.fetchSingleFromGoalDetails(goalId, userId);
      
      if (enhancedResult.data) {
        this.fallbackMode = false;
        this.lastError = null;
        return enhancedResult;
      }

      // If goal_details fails, fall back to basic goals table
      console.warn('goal_details view unavailable for single goal, falling back to basic goals table');
      const fallbackResult = await this.fetchSingleFromGoalsTable(goalId, userId);
      
      if (fallbackResult.data) {
        this.fallbackMode = true;
        const enhancedGoals = this.enhanceBasicGoalsData([fallbackResult.data]);
        return {
          data: enhancedGoals[0] || null,
          error: null
        };
      }

      // If both fail, return error
      return {
        data: null,
        error: new Error('Goal not found or access denied')
      };

    } catch (error) {
      console.error('GoalsDataService: Unexpected error in fetchGoalById:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }

  /**
   * Fetch shared goals for family members with fallback
   * Note: Direct query is now handled in useGoals.ts hook for better performance
   */
  async fetchSharedGoals(userId: string, familyId: string): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .eq('family_id', familyId)
        .eq('is_family_goal', true)
        .neq('user_id', userId);

      if (error) {
        throw new Error(`Error fetching shared goals: ${error.message}`);
      }

      return { data, error: null };
    } catch (error) {
      console.error('GoalsDataService: Error fetching shared goals:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch shared goals')
      };
    }
  }

  /**
   * Try to fetch single goal from goal_details view (enhanced data)
   */
  private async fetchSingleFromGoalDetails(goalId: string, userId: string): Promise<{ data: Goal | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('goal_details')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (error) {
        // Check if it's a missing table/view error
        if (error.message.includes('does not exist') || 
            error.message.includes('not found') ||
            error.message.includes('schema cache') ||
            error.code === 'PGRST116') { // No rows returned
          console.warn('goal_details view not available or goal not found:', error.message);
          return { data: null, error: null }; // Allow fallback
        }
        throw new Error(`goal_details single query failed: ${error.message}`);
      }

      return { data: data as Goal, error: null };
    } catch (error) {
      console.error('GoalsDataService: Error fetching single goal from goal_details:', error);
      return { data: null, error: null }; // Allow fallback
    }
  }

  /**
   * Fallback: fetch single goal from basic goals table
   */
  private async fetchSingleFromGoalsTable(goalId: string, userId: string): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - goal not found or access denied
          return { data: null, error: new Error('Goal not found or access denied') };
        }
        throw new Error(`goals table single query failed: ${error.message}`);
      }

      return { data, error: null };
    } catch (error) {
      console.error('GoalsDataService: Error fetching single goal from goals table:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch single goal from goals table')
      };
    }
  }

  /**
   * Try to fetch from goal_details view (enhanced data)
   */
  private async fetchFromGoalDetails(userId: string): Promise<{ data: Goal[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('goal_details')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        // Check if it's a missing table/view error
        if (error.message.includes('does not exist') || 
            error.message.includes('not found') ||
            error.message.includes('schema cache')) {
          console.warn('goal_details view not available:', error.message);
          return { data: null, error: null }; // Don't treat as fatal error
        }
        throw new Error(`goal_details query failed: ${error.message}`);
      }

      return { data: data as Goal[], error: null };
    } catch (error) {
      console.error('GoalsDataService: Error fetching from goal_details:', error);
      return { data: null, error: null }; // Allow fallback
    }
  }

  /**
   * Fallback: fetch from basic goals table
   */
  private async fetchFromGoalsTable(userId: string): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`goals table query failed: ${error.message}`);
      }

      return { data, error: null };
    } catch (error) {
      console.error('GoalsDataService: Error fetching from goals table:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch from goals table')
      };
    }
  }

  /**
   * Enhance basic goals data with calculated fields
   */
  private enhanceBasicGoalsData(basicGoals: any[]): Goal[] {
    return basicGoals.map(goal => {
      const remaining = Math.max(0, goal.target_amount - goal.current_amount);
      const percentage = this.safePercentage(goal.current_amount, goal.target_amount);
      
      return {
        ...goal,
        // Ensure compatibility with Goal interface
        remaining,
        percentage,
        remaining_amount: remaining, // Keep for compatibility
        percentage_complete: percentage, // Keep for compatibility
        progress_status: this.calculateProgressStatus(
          goal.current_amount, 
          goal.target_amount
        ),
        formatted_target: this.formatCurrency(goal.target_amount),
        formatted_current: this.formatCurrency(goal.current_amount),
        formatted_remaining: this.formatCurrency(remaining),
        contribution_count: 0, // Would need separate query to get accurate count
        is_overdue: this.checkIfOverdue(goal.target_date),
      };
    });
  }

  /**
   * Safe percentage calculation (avoiding division by zero)
   */
  private safePercentage(current: number, target: number): number {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  /**
   * Calculate progress status based on percentage
   */
  private calculateProgressStatus(current: number, target: number): string {
    const percentage = this.safePercentage(current, target);
    
    if (current >= target) return 'completed';
    if (percentage >= 75) return 'near_completion';
    if (percentage >= 25) return 'in_progress';
    return 'getting_started';
  }

  /**
   * Simple currency formatting - PHP ONLY
   */
  private formatCurrency(amount: number): string {
    try {
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      return '₱' + formatted;
    } catch {
      return `₱${amount.toFixed(2)}`; // Fallback formatting
    }
  }

  /**
   * Check if goal is overdue based on target date
   */
  private checkIfOverdue(targetDate: string | null): boolean {
    if (!targetDate) return false;
    const today = new Date();
    const target = new Date(targetDate);
    return target < today;
  }

  /**
   * Health check for the data service
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'error';
    details: {
      goalDetailsAvailable: boolean;
      goalsTableAvailable: boolean;
      fallbackMode: boolean;
      lastError: string | null;
    };
  }> {
    const details = {
      goalDetailsAvailable: false,
      goalsTableAvailable: false,
      fallbackMode: this.fallbackMode,
      lastError: this.lastError
    };

    try {
      // Test goal_details view
      const { error: detailsError } = await supabase
        .from('goal_details')
        .select('id')
        .limit(1);

      details.goalDetailsAvailable = !detailsError;

      // Test goals table
      const { error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .limit(1);

      details.goalsTableAvailable = !goalsError;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'error';
      if (details.goalDetailsAvailable && details.goalsTableAvailable) {
        status = 'healthy';
      } else if (details.goalsTableAvailable) {
        status = 'degraded';
      } else {
        status = 'error';
      }

      return { status, details };

    } catch (error) {
      details.lastError = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'error', details };
    }
  }

  /**
   * Create a goal contribution with validation
   */
  async createGoalContribution(
    goalId: string, 
    userId: string, 
    contributionData: {
      amount: number;
      account_id: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // First validate the goal exists and is editable
      const goalResult = await this.fetchGoalById(goalId, userId);
      
      if (!goalResult.data) {
        return {
          success: false,
          error: goalResult.error?.message || 'Goal not found or access denied'
        };
      }

      const goal = goalResult.data;

      // Validate contribution amount
      if (contributionData.amount <= 0) {
        return {
          success: false,
          error: 'Contribution amount must be greater than zero'
        };
      }

      // Check if contribution would exceed the goal target
      const newCurrentAmount = (goal.current_amount || 0) + contributionData.amount;
      if (newCurrentAmount > goal.target_amount) {
        const maxContribution = goal.target_amount - (goal.current_amount || 0);
        return {
          success: false,
          error: `Contribution would exceed goal target. Maximum contribution: ${this.formatCurrency(maxContribution)}`
        };
      }

      // Validate account exists and belongs to user
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('id', contributionData.account_id)
        .eq('user_id', userId)
        .single();

      if (accountError || !account) {
        return {
          success: false,
          error: 'Selected account not found or access denied'
        };
      }

      // Check if account has sufficient balance
      if (account.balance < contributionData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in selected account'
        };
      }

      // Perform the contribution transaction
      const { data: contribution, error: contributionError } = await supabase
        .rpc('contribute_to_goal', {
          p_goal_id: goalId,
          p_amount: contributionData.amount,
          p_account_id: contributionData.account_id,
          p_notes: contributionData.notes || `Contribution to goal`,
          p_user_id: userId
        });

      if (contributionError) {
        console.error('Goal contribution RPC error:', contributionError);
        return {
          success: false,
          error: contributionError.message || 'Failed to create goal contribution'
        };
      }

      return {
        success: true,
        data: contribution
      };

    } catch (error) {
      console.error('GoalsDataService: Error creating goal contribution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current service state
   */
  getServiceState() {
    return {
      fallbackMode: this.fallbackMode,
      lastError: this.lastError
    };
  }
}

// Export singleton instance
export const goalsDataService = GoalsDataService.getInstance();