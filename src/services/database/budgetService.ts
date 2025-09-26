import { supabase } from '../../utils/supabaseClient';
import { formatCurrency, formatPercentage } from '../../utils/helpers';
import { logDataSourceUsage, logError, logUserAction, logInfo, logFallbackAttempt } from '../../utils/budgetLogger';

// Types for budget data
export interface BudgetItem {
  id: string;
  user_id: string;
  budget_name: string;
  description?: string;
  amount: number;
  spent: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  category_id?: string;
  category_name?: string;
  status: string;
  alert_threshold?: number;
  alert_enabled?: boolean;
  created_at: string;
  updated_at: string;
  
  // Calculated fields (from view or computed)
  remaining?: number;
  percentage_used?: number;
  status_indicator?: string;
  display_category?: string;
  category_icon?: string;
  category_color?: string;
  formatted_amount?: string;
  formatted_spent?: string;
  formatted_remaining?: string;
  period_status?: string;
  days_remaining?: number;
  unread_alerts?: number;
}

export interface CategoryInfo {
  id: string;
  category_name: string;
  icon?: string;
  color?: string;
}

export interface BudgetDataSource {
  source: 'view' | 'table_with_category' | 'table_only' | 'error';
  data: BudgetItem[];
  error?: string;
}

/**
 * Enhanced Budget Service with Fallback Strategy
 * 
 * This service implements a cascading data access strategy to handle
 * database schema inconsistencies and missing views/tables.
 * 
 * Fallback Priority:
 * 1. budget_details view (preferred - complete data with calculations)
 * 2. budgets table + expense_categories join (good - manual calculations)
 * 3. budgets table only (minimal - basic data)
 * 4. Error handling with user notification
 */
export class BudgetService {
  private static instance: BudgetService;
  
  public static getInstance(): BudgetService {
    if (!BudgetService.instance) {
      BudgetService.instance = new BudgetService();
    }
    return BudgetService.instance;
  }

  /**
   * Main method to fetch budget data with fallback strategy
   */
  async getBudgets(userId: string): Promise<BudgetDataSource> {
    const startTime = Date.now();
    logInfo('BudgetService', 'getBudgets_start', { userId, timestamp: startTime });
    
    // Try primary data source: budget_details view
    try {
      const viewResult = await this.fetchFromBudgetDetailsView(userId);
      if (viewResult.success) {
        const duration = Date.now() - startTime;
        logDataSourceUsage('BudgetService', 'view', true, undefined, { 
          recordCount: viewResult.data.length, 
          duration 
        });
        logInfo('BudgetService', 'getBudgets_success', { 
          source: 'view', 
          recordCount: viewResult.data.length,
          duration 
        });
        return {
          source: 'view',
          data: viewResult.data
        };
      }
    } catch (error) {
      // Expected behavior - log as fallback attempt, not error
      logFallbackAttempt('BudgetService', 'budget_details_view', 'budgets_with_category', 
        error instanceof Error ? error.message : 'View not available');
    }

    // Try secondary data source: budgets table with category join
    try {
      const tableWithCategoryResult = await this.fetchFromBudgetsWithCategory(userId);
      if (tableWithCategoryResult.success) {
        const enhancedData = this.enhanceBudgetData(tableWithCategoryResult.data);
        const duration = Date.now() - startTime;
        logDataSourceUsage('BudgetService', 'table_with_category', true, undefined, { 
          recordCount: enhancedData.length, 
          duration 
        });
        logInfo('BudgetService', 'getBudgets_success', { 
          source: 'table_with_category', 
          recordCount: enhancedData.length,
          duration 
        });
        return {
          source: 'table_with_category',
          data: enhancedData
        };
      }
    } catch (error) {
      // Expected fallback behavior
      logFallbackAttempt('BudgetService', 'budgets_with_category', 'budgets_only', 
        error instanceof Error ? error.message : 'Category join failed');
    }

    // Try tertiary data source: budgets table only
    try {
      const tableOnlyResult = await this.fetchFromBudgetsTableOnly(userId);
      if (tableOnlyResult.success) {
        const enhancedData = this.enhanceBudgetData(tableOnlyResult.data);
        const duration = Date.now() - startTime;
        logDataSourceUsage('BudgetService', 'table_only', true, undefined, { 
          recordCount: enhancedData.length, 
          duration 
        });
        logInfo('BudgetService', 'getBudgets_success', { 
          source: 'table_only', 
          recordCount: enhancedData.length,
          duration 
        });
        return {
          source: 'table_only',
          data: enhancedData
        };
      }
    } catch (error) {
      // This is now a real error since it's the final fallback
      logDataSourceUsage('BudgetService', 'table_only', false, error instanceof Error ? error.message : 'Unknown error');
      logError('BudgetService', 'fetchFromBudgetsTableOnly', error instanceof Error ? error : new Error(String(error)));
    }

    // All data sources failed
    const duration = Date.now() - startTime;
    const errorMessage = 'Unable to fetch budget data from any available source';
    logDataSourceUsage('BudgetService', 'error', false, errorMessage, { duration });
    logError('BudgetService', 'getBudgets_all_sources_failed', new Error(errorMessage), { 
      userId, 
      duration,
      attemptedSources: ['view', 'table_with_category', 'table_only']
    });
    
    return {
      source: 'error',
      data: [],
      error: errorMessage
    };
  }

  /**
   * Fetch single budget by ID with fallback strategy
   */
  async getBudgetById(budgetId: string, userId: string): Promise<BudgetDataSource> {
    console.log('BudgetService: Fetching budget by ID with fallback strategy:', budgetId);
    
    // Try primary data source: budget_details view
    try {
      const { data, error } = await supabase
        .from('budget_details')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();
        
      if (!error && data) {
        console.log('BudgetService: Successfully fetched budget from budget_details view');
        return {
          source: 'view',
          data: [data]
        };
      }
    } catch (error) {
      console.warn('BudgetService: budget_details view failed for single budget:', error);
    }

    // Try fallback: budgets table with category lookup
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          expense_categories (
            id,
            category_name,
            icon,
            color
          )
        `)
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();
        
      if (!budgetError && budgetData) {
        console.log('BudgetService: Successfully fetched budget from budgets table');
        return {
          source: 'table_with_category',
          data: this.enhanceBudgetData([budgetData])
        };
      }
    } catch (error) {
      console.warn('BudgetService: budgets table with category failed for single budget:', error);
    }

    // Try minimal fallback: budgets table only
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();
        
      if (!budgetError && budgetData) {
        console.log('BudgetService: Successfully fetched budget from budgets table (minimal)');
        return {
          source: 'table_only',
          data: this.enhanceBudgetData([budgetData])
        };
      }
    } catch (error) {
      console.error('BudgetService: All data sources failed for single budget:', error);
    }

    return {
      source: 'error',
      data: [],
      error: 'Unable to fetch budget data from any available source'
    };
  }

  /**
   * Primary data source: budget_details view
   */
  private async fetchFromBudgetDetailsView(userId: string): Promise<{ success: boolean; data: BudgetItem[] }> {
    const { data, error } = await supabase
      .from('budget_details')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      throw new Error(`budget_details view error: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  }

  /**
   * Secondary data source: budgets table with category join
   */
  private async fetchFromBudgetsWithCategory(userId: string): Promise<{ success: boolean; data: any[] }> {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        expense_categories (
          id,
          category_name,
          icon,
          color
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`budgets table with category join error: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  }

  /**
   * Tertiary data source: budgets table only
   */
  private async fetchFromBudgetsTableOnly(userId: string): Promise<{ success: boolean; data: any[] }> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`budgets table only error: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  }

  /**
   * Enhance budget data with calculated fields when view is not available
   */
  private enhanceBudgetData(rawData: any[]): BudgetItem[] {
    return rawData.map(budget => {
      const remaining = budget.amount - (budget.spent || 0);
      const percentageUsed = budget.amount > 0 ? (budget.spent || 0) / budget.amount * 100 : 0;
      
      // Determine status indicator
      let statusIndicator = 'good';
      if (percentageUsed >= 100) {
        statusIndicator = 'exceeded';
      } else if (percentageUsed >= (budget.alert_threshold * 100 || 80)) {
        statusIndicator = 'warning';
      } else if (percentageUsed >= 50) {
        statusIndicator = 'moderate';
      }
      
      // Calculate period status
      const currentDate = new Date();
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      let periodStatus = 'active';
      
      if (endDate < currentDate) {
        periodStatus = 'expired';
      } else if (startDate > currentDate) {
        periodStatus = 'future';
      }
      
      // Calculate days remaining
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Extract category information from joined data or use fallback
      let categoryInfo = {
        category_name: budget.category_name,
        category_icon: undefined as string | undefined,
        category_color: undefined as string | undefined
      };
      
      if (budget.expense_categories) {
        categoryInfo = {
          category_name: budget.expense_categories.category_name,
          category_icon: budget.expense_categories.icon,
          category_color: budget.expense_categories.color
        };
      }
      
      return {
        id: budget.id,
        user_id: budget.user_id,
        budget_name: budget.budget_name,
        description: budget.description,
        amount: budget.amount,
        spent: budget.spent || 0,
        currency: budget.currency || 'USD',
        period: budget.period,
        start_date: budget.start_date,
        end_date: budget.end_date,
        category_id: budget.category_id,
        category_name: categoryInfo.category_name,
        status: budget.status || 'active',
        alert_threshold: budget.alert_threshold,
        alert_enabled: budget.alert_enabled,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
        
        // Calculated fields
        remaining,
        percentage_used: percentageUsed,
        status_indicator: statusIndicator,
        display_category: categoryInfo.category_name || 'Uncategorized',
        category_icon: categoryInfo.category_icon,
        category_color: categoryInfo.category_color,
        formatted_amount: formatCurrency(budget.amount),
        formatted_spent: formatCurrency(budget.spent || 0),
        formatted_remaining: formatCurrency(remaining),
        period_status: periodStatus,
        days_remaining: daysRemaining,
        unread_alerts: 0 // Would need separate query for this
      };
    });
  }

  /**
   * Create budget with error handling and logging
   */
  async createBudget(budgetData: any, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();
    logUserAction('BudgetService', 'createBudget_start', true, { userId, budgetName: budgetData.budget_name });
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...budgetData,
          user_id: userId
        })
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      const duration = Date.now() - startTime;
      logUserAction('BudgetService', 'createBudget_success', true, { 
        budgetId: data.id, 
        budgetName: data.budget_name,
        duration 
      });
      
      return { success: true, data };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logError('BudgetService', 'createBudget', error instanceof Error ? error : new Error(errorMessage), {
        userId,
        budgetData: { ...budgetData, user_id: undefined }, // Don't log sensitive data
        duration
      });
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Update budget with error handling and logging
   */
  async updateBudget(budgetId: string, updates: any, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();
    logUserAction('BudgetService', 'updateBudget_start', true, { budgetId, userId });
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      const duration = Date.now() - startTime;
      logUserAction('BudgetService', 'updateBudget_success', true, { 
        budgetId, 
        duration,
        updatedFields: Object.keys(updates)
      });
      
      return { success: true, data };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logError('BudgetService', 'updateBudget', error instanceof Error ? error : new Error(errorMessage), {
        budgetId,
        userId,
        updates: Object.keys(updates),
        duration
      });
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Delete budget with error handling and logging
   */
  async deleteBudget(budgetId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    logUserAction('BudgetService', 'deleteBudget_start', true, { budgetId, userId });
    
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', userId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      const duration = Date.now() - startTime;
      logUserAction('BudgetService', 'deleteBudget_success', true, { 
        budgetId, 
        duration
      });
      
      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logError('BudgetService', 'deleteBudget', error instanceof Error ? error : new Error(errorMessage), {
        budgetId,
        userId,
        duration
      });
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Get available expense categories for budget creation
   */
  async getExpenseCategories(userId: string): Promise<{ success: boolean; data?: CategoryInfo[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, category_name, icon, color')
        .eq('user_id', userId)
        .order('category_name', { ascending: true });
        
      if (error) {
        throw new Error(error.message);
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('BudgetService: Error fetching expense categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get budgets filtered for transaction assignment
   * Filters by category compatibility, active status, and remaining amount
   */
  async getTransactionBudgets(
    userId: string, 
    categoryId?: string, 
    transactionType: 'income' | 'expense' = 'expense'
  ): Promise<BudgetDataSource> {
    const startTime = Date.now();
    logInfo('BudgetService', 'getTransactionBudgets_start', { userId, categoryId, transactionType });
    
    // Get all budgets first
    const allBudgetsResult = await this.getBudgets(userId);
    if (allBudgetsResult.source === 'error') {
      return allBudgetsResult;
    }
    
    // Filter budgets for transaction assignment
    const currentDate = new Date();
    const filteredBudgets = allBudgetsResult.data.filter(budget => {
      // Budget status is 'active'
      if (budget.status !== 'active') return false;
      
      // Current date falls within budget period
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      if (currentDate < startDate || currentDate > endDate) return false;
      
      // For expense transactions: budget category matches selected expense category
      if (transactionType === 'expense' && categoryId) {
        if (budget.category_id !== categoryId) return false;
      }
      
      // Budget has remaining allocation (amount - spent > 0)
      const remaining = budget.amount - (budget.spent || 0);
      if (remaining <= 0) return false;
      
      return true;
    });
    
    // Sort by relevance (remaining amount, proximity to threshold)
    const sortedBudgets = filteredBudgets.sort((a, b) => {
      const aRemaining = a.amount - (a.spent || 0);
      const bRemaining = b.amount - (b.spent || 0);
      const aPercentage = (a.spent || 0) / a.amount;
      const bPercentage = (b.spent || 0) / b.amount;
      
      // Sort by remaining amount desc, then by usage percentage asc
      if (aRemaining !== bRemaining) {
        return bRemaining - aRemaining;
      }
      return aPercentage - bPercentage;
    });
    
    const duration = Date.now() - startTime;
    logInfo('BudgetService', 'getTransactionBudgets_success', {
      userId,
      categoryId,
      transactionType,
      filteredCount: sortedBudgets.length,
      totalCount: allBudgetsResult.data.length,
      duration
    });
    
    return {
      source: allBudgetsResult.source,
      data: sortedBudgets
    };
  }

  /**
   * Calculate budget impact for a proposed transaction
   */
  calculateBudgetImpact(
    budget: BudgetItem, 
    transactionAmount: number
  ): {
    newSpent: number;
    newRemaining: number;
    newPercentage: number;
    wouldExceed: boolean;
    wouldTriggerThreshold: boolean;
    warnings: Array<{
      type: 'threshold' | 'overrun' | 'period_expiry';
      message: string;
      severity: 'info' | 'warning' | 'error';
    }>;
  } {
    const newSpent = (budget.spent || 0) + transactionAmount;
    const newRemaining = budget.amount - newSpent;
    const newPercentage = (newSpent / budget.amount) * 100;
    const wouldExceed = newSpent > budget.amount;
    const thresholdPercentage = (budget.alert_threshold || 0.8) * 100;
    const wouldTriggerThreshold = newPercentage >= thresholdPercentage;
    
    const warnings: Array<{
      type: 'threshold' | 'overrun' | 'period_expiry';
      message: string;
      severity: 'info' | 'warning' | 'error';
    }> = [];
    
    // Budget overrun alert
    if (wouldExceed) {
      warnings.push({
        type: 'overrun',
        message: `Transaction would exceed budget by ${formatCurrency(newSpent - budget.amount)}`,
        severity: 'error'
      });
    }
    // Budget threshold warning
    else if (wouldTriggerThreshold) {
      warnings.push({
        type: 'threshold',
        message: `Transaction would put budget at ${newPercentage.toFixed(1)}% utilization`,
        severity: 'warning'
      });
    }
    
    // Period expiry notice (within 7 days)
    const endDate = new Date(budget.end_date);
    const currentDate = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 7 && daysRemaining > 0) {
      warnings.push({
        type: 'period_expiry',
        message: `Budget period expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        severity: 'info'
      });
    }
    
    return {
      newSpent,
      newRemaining,
      newPercentage,
      wouldExceed,
      wouldTriggerThreshold,
      warnings
    };
  }

  /**
   * Setup real-time subscription for budget changes with fallback handling
   */
  setupBudgetSubscription(userId: string, onBudgetChange: (budgets: BudgetItem[]) => void): any {
    logInfo('BudgetService', 'setupBudgetSubscription', { userId });
    
    const channel = supabase
      .channel(`budget_updates_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        logInfo('BudgetService', 'budget_subscription_event', { 
          eventType: payload.eventType,
          budgetId: (payload.new as any)?.id || (payload.old as any)?.id
        });
        
        // Refresh data using fallback strategy
        try {
          const result = await this.getBudgets(userId);
          if (result.source !== 'error') {
            onBudgetChange(result.data);
            logInfo('BudgetService', 'budget_subscription_refresh_success', {
              source: result.source,
              recordCount: result.data.length
            });
          } else {
            logError('BudgetService', 'budget_subscription_refresh_failed', new Error(result.error || 'Unknown error'));
          }
        } catch (error) {
          logError('BudgetService', 'budget_subscription_error', error instanceof Error ? error : new Error(String(error)));
        }
      })
      .subscribe((status) => {
        logInfo('BudgetService', 'budget_subscription_status', { status });
      });
      
    return channel;
  }
}
