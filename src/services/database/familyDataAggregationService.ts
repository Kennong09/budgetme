import { supabase } from '../../utils/supabaseClient';
import { familyService } from './familyService';

// Types for family data aggregation
export interface CategoryExpenseData {
  category_id: string;
  category_name: string;
  category_color?: string;
  category_icon?: string;
  total_amount: number;
  transaction_count: number;
  percentage_of_total: number;
  monthly_budget?: number;
  variance?: number;
  family_member_contributions: FamilyMemberContribution[];
}

export interface FamilyMemberContribution {
  user_id: string;
  full_name: string;
  amount: number;
  percentage: number;
}

export interface FamilyFinancialSummary {
  total_family_income: number;
  total_family_expenses: number;
  budget_utilization: number;
  savings_rate: number;
  expense_trend: MonthlyTrend[];
  healthMetrics: FamilyHealthMetrics;
  member_count: number;
}

export interface FamilyHealthMetrics {
  financial_health_score: number;
  expense_control_score: number;
  savings_discipline_score: number;
  budget_planning_score: number;
  overall_grade: string;
  overall_status: string;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface MemberActivityData {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  activity_type: 'transaction' | 'goal_contribution' | 'budget_update';
  activity_description: string;
  amount?: number;
  timestamp: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Family Data Aggregation Service
 * 
 * Centralizes family-scoped data aggregation with optimized query patterns.
 * Provides real-time data synchronization and cache management for family dashboard metrics.
 */
export class FamilyDataAggregationService {
  private static instance: FamilyDataAggregationService;
  private subscriptions: Map<string, any> = new Map();

  public static getInstance(): FamilyDataAggregationService {
    if (!FamilyDataAggregationService.instance) {
      FamilyDataAggregationService.instance = new FamilyDataAggregationService();
    }
    return FamilyDataAggregationService.instance;
  }

  /**
   * Get family expense breakdown by category with member contributions
   */
  async getFamilyExpenseByCategory(
    familyId: string, 
    dateRange: DateRange
  ): Promise<CategoryExpenseData[]> {
    try {
      // First validate family membership and get member IDs
      const familyMembers = await familyService.getFamilyMembers(familyId);
      if (!familyMembers || familyMembers.length === 0) {
        throw new Error('No family members found');
      }

      const memberUserIds = familyMembers.map(member => member.user_id);

      // Execute the aggregation query
      const { data: categoryData, error } = await supabase.rpc('get_family_expense_by_category', {
        p_family_id: familyId,
        p_user_ids: memberUserIds,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) {
        console.warn('RPC function failed, falling back to manual aggregation:', error);
        return await this.getFamilyExpenseByCategoryFallback(familyId, memberUserIds, dateRange);
      }

      // Enhance data with member contribution details
      const enhancedData = await this.enhanceCategoryDataWithContributions(
        categoryData || [], 
        memberUserIds, 
        familyMembers,
        dateRange
      );

      return enhancedData;
    } catch (error) {
      console.error('Error in getFamilyExpenseByCategory:', error);
      throw error;
    }
  }

  /**
   * Fallback method for category expense aggregation
   */
  private async getFamilyExpenseByCategoryFallback(
    familyId: string,
    memberUserIds: string[],
    dateRange: DateRange
  ): Promise<CategoryExpenseData[]> {
    try {
      // Get total family expenses for percentage calculation
      const { data: totalExpenseResult, error: totalError } = await supabase
        .from('transactions')
        .select('amount')
        .in('user_id', memberUserIds)
        .eq('type', 'expense')
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);

      if (totalError) throw totalError;

      const totalFamilyExpenses = totalExpenseResult?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Get expense categories with transaction aggregation
      const { data: categoryExpenses, error: categoryError } = await supabase
        .from('expense_categories')
        .select(`
          id,
          category_name,
          color,
          icon,
          monthly_budget,
          transactions!inner(
            amount,
            user_id,
            date
          )
        `)
        .in('user_id', memberUserIds)
        .gte('transactions.date', dateRange.startDate)
        .lte('transactions.date', dateRange.endDate)
        .eq('transactions.type', 'expense');

      if (categoryError) throw categoryError;

      // Process and aggregate the data
      const aggregatedData = this.processCategoryAggregation(
        categoryExpenses || [],
        totalFamilyExpenses
      );

      return aggregatedData;
    } catch (error) {
      console.error('Error in fallback category aggregation:', error);
      return [];
    }
  }

  /**
   * Process category aggregation from raw data
   */
  private processCategoryAggregation(
    categoryExpenses: any[],
    totalFamilyExpenses: number
  ): CategoryExpenseData[] {
    const categoryMap = new Map<string, CategoryExpenseData>();

    categoryExpenses.forEach(category => {
      const categoryId = category.id;
      const transactions = Array.isArray(category.transactions) ? category.transactions : [];
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: category.category_name,
          category_color: category.color,
          category_icon: category.icon,
          total_amount: 0,
          transaction_count: 0,
          percentage_of_total: 0,
          monthly_budget: category.monthly_budget,
          variance: 0,
          family_member_contributions: []
        });
      }

      const categoryData = categoryMap.get(categoryId)!;
      
      transactions.forEach((transaction: any) => {
        categoryData.total_amount += transaction.amount;
        categoryData.transaction_count += 1;
      });

      // Calculate percentage and variance
      categoryData.percentage_of_total = totalFamilyExpenses > 0 
        ? (categoryData.total_amount / totalFamilyExpenses) * 100 
        : 0;
      
      categoryData.variance = categoryData.monthly_budget 
        ? categoryData.total_amount - categoryData.monthly_budget
        : 0;
    });

    return Array.from(categoryMap.values())
      .filter(category => category.total_amount > 0)
      .sort((a, b) => b.total_amount - a.total_amount);
  }

  /**
   * Enhance category data with member contribution breakdown
   */
  private async enhanceCategoryDataWithContributions(
    categoryData: CategoryExpenseData[],
    memberUserIds: string[],
    familyMembers: any[],
    dateRange: DateRange
  ): Promise<CategoryExpenseData[]> {
    try {
      for (const category of categoryData) {
        // Get member contributions for this category
        const { data: contributionData, error } = await supabase
          .from('transactions')
          .select('user_id, amount')
          .in('user_id', memberUserIds)
          .eq('expense_category_id', category.category_id)
          .eq('type', 'expense')
          .gte('date', dateRange.startDate)
          .lte('date', dateRange.endDate);

        if (!error && contributionData) {
          const contributionMap = new Map<string, number>();
          
          contributionData.forEach(transaction => {
            const current = contributionMap.get(transaction.user_id) || 0;
            contributionMap.set(transaction.user_id, current + transaction.amount);
          });

          category.family_member_contributions = Array.from(contributionMap.entries())
            .map(([userId, amount]) => {
              const member = familyMembers.find(m => m.user_id === userId);
              return {
                user_id: userId,
                full_name: member?.full_name || 'Unknown Member',
                amount: amount,
                percentage: category.total_amount > 0 ? (amount / category.total_amount) * 100 : 0
              };
            })
            .sort((a, b) => b.amount - a.amount);
        }
      }

      return categoryData;
    } catch (error) {
      console.error('Error enhancing category data with contributions:', error);
      return categoryData;
    }
  }

  /**
   * Get comprehensive family financial summary
   */
  async getFamilyFinancialSummary(
    familyId: string, 
    period: 'current' | 'last_month' | 'last_quarter' = 'current'
  ): Promise<FamilyFinancialSummary> {
    try {
      // Get family members
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        throw new Error('No family members found');
      }

      // Calculate date range based on period
      const dateRange = this.calculateDateRange(period);

      // Try RPC function first
      const { data: summaryData, error: rpcError } = await supabase.rpc('get_family_financial_summary', {
        p_family_id: familyId,
        p_user_ids: memberUserIds,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (!rpcError && summaryData) {
        return {
          ...summaryData,
          member_count: familyMembers.length,
          healthMetrics: this.calculateHealthMetrics(summaryData)
        };
      }

      // Fallback to manual calculation
      return await this.getFamilyFinancialSummaryFallback(familyId, memberUserIds, dateRange, familyMembers.length);
    } catch (error) {
      console.error('Error in getFamilyFinancialSummary:', error);
      throw error;
    }
  }

  /**
   * Fallback method for financial summary calculation
   */
  private async getFamilyFinancialSummaryFallback(
    familyId: string,
    memberUserIds: string[],
    dateRange: DateRange,
    memberCount: number
  ): Promise<FamilyFinancialSummary> {
    try {
      // Get income and expense transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .in('user_id', memberUserIds)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .in('type', ['income', 'expense']);

      if (error) throw error;

      const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

      // Get budget data for utilization calculation
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('amount, spent')
        .in('user_id', memberUserIds)
        .eq('status', 'active');

      const totalBudgetAllocated = budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
      const totalBudgetSpent = budgets?.reduce((sum, b) => sum + (b.spent || 0), 0) || 0;
      const budgetUtilization = totalBudgetAllocated > 0 ? (totalBudgetSpent / totalBudgetAllocated) * 100 : 0;

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      // Calculate monthly trends
      const expenseTrend = this.calculateMonthlyTrends(transactions || []);

      // Calculate health metrics
      const healthMetrics = this.calculateHealthMetrics({
        total_family_income: totalIncome,
        total_family_expenses: totalExpenses,
        budget_utilization: budgetUtilization,
        savings_rate: savingsRate
      });

      return {
        total_family_income: totalIncome,
        total_family_expenses: totalExpenses,
        budget_utilization: budgetUtilization,
        savings_rate: savingsRate,
        expense_trend: expenseTrend,
        healthMetrics: healthMetrics,
        member_count: memberCount
      };
    } catch (error) {
      console.error('Error in financial summary fallback:', error);
      throw error;
    }
  }

  /**
   * Calculate health metrics from financial data
   */
  private calculateHealthMetrics(data: any): FamilyHealthMetrics {
    let healthScore = 0;
    let expenseControlScore = 0;
    let savingsDisciplineScore = 0;
    let budgetPlanningScore = 0;

    // Savings rate scoring (0-40 points)
    if (data.savings_rate >= 20) healthScore += 40;
    else if (data.savings_rate >= 10) healthScore += 30;
    else if (data.savings_rate >= 5) healthScore += 20;
    else healthScore += 10;

    savingsDisciplineScore = Math.min(100, data.savings_rate * 5);

    // Budget utilization scoring (0-30 points)
    if (data.budget_utilization <= 80) {
      healthScore += 30;
      budgetPlanningScore += 40;
    } else if (data.budget_utilization <= 100) {
      healthScore += 20;
      budgetPlanningScore += 30;
    } else {
      healthScore += 5;
      budgetPlanningScore += 10;
    }

    // Expense control scoring (0-30 points)
    const expenseRatio = data.total_family_income > 0 ? (data.total_family_expenses / data.total_family_income) * 100 : 100;
    if (expenseRatio <= 50) {
      healthScore += 30;
      expenseControlScore = 100;
    } else if (expenseRatio <= 70) {
      healthScore += 25;
      expenseControlScore = 80;
    } else if (expenseRatio <= 80) {
      healthScore += 15;
      expenseControlScore = 60;
    } else {
      healthScore += 5;
      expenseControlScore = 30;
    }

    // Determine overall grade and status
    let overallGrade = 'F';
    let overallStatus = 'Critical';

    if (healthScore >= 90) {
      overallGrade = 'A+';
      overallStatus = 'Excellent';
    } else if (healthScore >= 80) {
      overallGrade = 'A';
      overallStatus = 'Very Good';
    } else if (healthScore >= 70) {
      overallGrade = 'B';
      overallStatus = 'Good';
    } else if (healthScore >= 60) {
      overallGrade = 'C';
      overallStatus = 'Fair';
    } else if (healthScore >= 50) {
      overallGrade = 'D';
      overallStatus = 'Needs Improvement';
    }

    return {
      financial_health_score: healthScore,
      expense_control_score: expenseControlScore,
      savings_discipline_score: savingsDisciplineScore,
      budget_planning_score: budgetPlanningScore + (data.budget_utilization > 0 ? 60 : 0), // Bonus for having budgets
      overall_grade: overallGrade,
      overall_status: overallStatus
    };
  }

  /**
   * Calculate monthly expense trends
   */
  private calculateMonthlyTrends(transactions: any[]): MonthlyTrend[] {
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(transaction => {
      const month = new Date(transaction.date).toISOString().substring(0, 7); // YYYY-MM format
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { income: 0, expenses: 0 });
      }

      const monthData = monthlyData.get(month)!;
      if (transaction.type === 'income') {
        monthData.income += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthData.expenses += transaction.amount;
      }
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        savings: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  /**
   * Get recent family member activity
   */
  async getFamilyMemberActivity(
    familyId: string, 
    limit: number = 10
  ): Promise<MemberActivityData[]> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return [];
      }

      // Get recent transactions
      const { data: recentTransactions, error: txError } = await supabase
        .from('transactions')
        .select('user_id, amount, type, description, created_at')
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (txError) {
        console.warn('Error fetching recent transactions:', txError);
      }

      // Get recent goal contributions
      const { data: recentContributions, error: contribError } = await supabase
        .from('goal_contributions')
        .select(`
          user_id, 
          amount, 
          contribution_date,
          goals (
            goal_name
          )
        `)
        .in('user_id', memberUserIds)
        .order('contribution_date', { ascending: false })
        .limit(limit);

      if (contribError) {
        console.warn('Error fetching recent contributions:', contribError);
      }

      // Combine and format activity data
      const activities: MemberActivityData[] = [];

      // Add transactions
      recentTransactions?.forEach(tx => {
        const member = familyMembers.find(m => m.user_id === tx.user_id);
        activities.push({
          user_id: tx.user_id,
          full_name: member?.full_name || 'Unknown Member',
          avatar_url: member?.avatar_url,
          activity_type: 'transaction',
          activity_description: `${tx.type === 'income' ? 'Received' : 'Spent'} ₱${tx.amount.toLocaleString()} - ${tx.description}`,
          amount: tx.amount,
          timestamp: tx.created_at
        });
      });

      // Add goal contributions
      recentContributions?.forEach(contrib => {
        const member = familyMembers.find(m => m.user_id === contrib.user_id);
        activities.push({
          user_id: contrib.user_id,
          full_name: member?.full_name || 'Unknown Member',
          avatar_url: member?.avatar_url,
          activity_type: 'goal_contribution',
          activity_description: `Contributed ₱${contrib.amount.toLocaleString()} to ${(contrib.goals as any)?.goal_name || 'Unknown Goal'}`,
          amount: contrib.amount,
          timestamp: contrib.contribution_date
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getFamilyMemberActivity:', error);
      return [];
    }
  }

  /**
   * Setup real-time subscription for family data changes
   */
  subscribeFamilyDataChanges(
    familyId: string, 
    callback: (data: any) => void
  ): () => void {
    const subscriptionKey = `family_data_${familyId}`;
    
    // Clean up existing subscription
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe();
    }

    const channel = supabase
      .channel(`family-data-${familyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, async () => {
        // Refresh family financial data when transactions change
        try {
          const summary = await this.getFamilyFinancialSummary(familyId);
          callback({ type: 'financial_summary', data: summary });
        } catch (error) {
          console.error('Error refreshing family data:', error);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goal_contributions'
      }, async () => {
        // Refresh family activity when goal contributions change
        try {
          const activity = await this.getFamilyMemberActivity(familyId);
          callback({ type: 'member_activity', data: activity });
        } catch (error) {
          console.error('Error refreshing family activity:', error);
        }
      })
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(period: 'current' | 'last_month' | 'last_quarter'): DateRange {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarterStartMonth = currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        startDate = new Date(lastQuarterYear, lastQuarterStartMonth, 1);
        endDate = new Date(lastQuarterYear, lastQuarterStartMonth + 3, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
}

// Export singleton instance
export const familyDataAggregationService = FamilyDataAggregationService.getInstance();
export default familyDataAggregationService;