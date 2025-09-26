import { supabase } from '../../utils/supabaseClient';
import { BudgetService, BudgetItem } from './budgetService';
import { familyService } from './familyService';
import { logInfo, logError } from '../../utils/budgetLogger';

// Types for family budget operations
export interface FamilyBudgetPerformanceData {
  total_family_income: number;
  total_family_expenses: number;
  budget_utilization: number;
  savings_rate: number;
  category_performance: CategoryPerformanceData[];
  family_financial_health: number;
  expense_trend: ExpenseTrendData[];
  budget_efficiency: number;
  member_count: number;
}

export interface CategoryPerformanceData {
  category: string;
  category_color?: string;
  category_icon?: string;
  budget: number;
  actual: number;
  utilization: number;
  variance: number;
  status: 'under' | 'on_track' | 'over';
  member_contributions: MemberBudgetContribution[];
}

export interface MemberBudgetContribution {
  user_id: string;
  full_name: string;
  budget_allocated: number;
  amount_spent: number;
  utilization_percentage: number;
}

export interface BudgetUtilizationData {
  category_id: string;
  category_name: string;
  total_budget: number;
  total_spent: number;
  utilization_percentage: number;
  member_utilization: MemberBudgetUtilization[];
  is_over_budget: boolean;
  variance: number;
}

export interface MemberBudgetUtilization {
  user_id: string;
  full_name: string;
  budget: number;
  spent: number;
  percentage: number;
}

export interface BudgetTrendData {
  month: string;
  total_budget: number;
  total_spent: number;
  utilization_percentage: number;
  savings_achieved: number;
  categories: CategoryTrendData[];
}

export interface CategoryTrendData {
  category_name: string;
  budget: number;
  spent: number;
  utilization: number;
}

export interface ExpenseTrendData {
  month: string;
  planned: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

/**
 * Enhanced Family Budget Service
 * 
 * Extends the existing BudgetService with family-specific aggregation capabilities.
 * Provides comprehensive family budget performance analysis and member contribution tracking.
 */
export class FamilyBudgetService {
  private static instance: FamilyBudgetService;
  private budgetService: BudgetService;

  constructor() {
    this.budgetService = BudgetService.getInstance();
  }

  public static getInstance(): FamilyBudgetService {
    if (!FamilyBudgetService.instance) {
      FamilyBudgetService.instance = new FamilyBudgetService();
    }
    return FamilyBudgetService.instance;
  }

  /**
   * Get comprehensive family budget performance analysis
   */
  async getFamilyBudgetPerformance(
    familyId: string, 
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<FamilyBudgetPerformanceData> {
    const startTime = Date.now();
    logInfo('FamilyBudgetService', 'getFamilyBudgetPerformance_start', { familyId, period });

    try {
      // Get family members
      const familyMembers = await familyService.getFamilyMembers(familyId);
      if (!familyMembers || familyMembers.length === 0) {
        throw new Error('No family members found');
      }

      const memberUserIds = familyMembers.map(member => member.user_id);
      const dateRange = this.calculatePeriodDateRange(period);

      // Try RPC function for optimized performance
      const { data: performanceData, error: rpcError } = await supabase.rpc('get_family_budget_performance', {
        p_family_id: familyId,
        p_user_ids: memberUserIds,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (!rpcError && performanceData) {
        const duration = Date.now() - startTime;
        logInfo('FamilyBudgetService', 'getFamilyBudgetPerformance_rpc_success', { 
          familyId, 
          duration,
          memberCount: familyMembers.length 
        });
        
        return {
          ...performanceData,
          member_count: familyMembers.length
        };
      }

      // Fallback to manual calculation
      logInfo('FamilyBudgetService', 'getFamilyBudgetPerformance_fallback', { 
        familyId, 
        rpcError: rpcError?.message 
      });
      
      return await this.getFamilyBudgetPerformanceFallback(
        familyId, 
        memberUserIds, 
        familyMembers, 
        dateRange
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logError('FamilyBudgetService', 'getFamilyBudgetPerformance', 
        error instanceof Error ? error : new Error(String(error)), 
        { familyId, period, duration }
      );
      throw error;
    }
  }

  /**
   * Fallback method for family budget performance calculation
   */
  private async getFamilyBudgetPerformanceFallback(
    familyId: string,
    memberUserIds: string[],
    familyMembers: any[],
    dateRange: { startDate: string; endDate: string }
  ): Promise<FamilyBudgetPerformanceData> {
    try {
      // Initialize default values to prevent NaN issues
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalBudgetAllocated = 0;
      let totalBudgetSpent = 0;

      // Get family income and expenses with safe defaults
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, date, expense_category_id, user_id')
        .in('user_id', memberUserIds)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .in('type', ['income', 'expense']);

      if (txError) {
        console.warn('Error fetching transactions:', txError);
      }

      // Safe calculation of totals
      if (transactions && transactions.length > 0) {
        totalIncome = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        totalExpenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
      }

      // Get family budgets with safe defaults
      const familyBudgets = await this.getFamilyBudgets(memberUserIds);
      
      if (familyBudgets.length > 0) {
        totalBudgetAllocated = familyBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
        totalBudgetSpent = familyBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
      }

      // Calculate budget utilization with safe division
      const budgetUtilization = totalBudgetAllocated > 0 ? (totalBudgetSpent / totalBudgetAllocated) * 100 : 0;

      // Calculate savings rate with safe division
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      // Calculate budget efficiency (optimal around 80%)
      const budgetEfficiency = budgetUtilization > 0 ? Math.min(100, (100 - Math.abs(budgetUtilization - 80)) * 1.25) : 0;

      // Calculate family financial health score
      const financialHealth = this.calculateFamilyFinancialHealth({
        savingsRate,
        budgetUtilization,
        totalIncome,
        totalExpenses,
        budgetEfficiency
      });

      // Get category performance
      const categoryPerformance = await this.calculateCategoryPerformance(
        familyBudgets, 
        transactions || [], 
        familyMembers
      );

      // Calculate expense trends
      const expenseTrend = this.calculateExpenseTrends(transactions || [], familyBudgets);

      return {
        total_family_income: totalIncome,
        total_family_expenses: totalExpenses,
        budget_utilization: budgetUtilization,
        savings_rate: savingsRate,
        category_performance: categoryPerformance,
        family_financial_health: financialHealth,
        expense_trend: expenseTrend,
        budget_efficiency: budgetEfficiency,
        member_count: familyMembers.length
      };
    } catch (error) {
      console.error('Error in fallback budget performance calculation:', error);
      
      // Return safe default data structure to prevent crashes
      return {
        total_family_income: 0,
        total_family_expenses: 0,
        budget_utilization: 0,
        savings_rate: 0,
        category_performance: [],
        family_financial_health: 0,
        expense_trend: [],
        budget_efficiency: 0,
        member_count: familyMembers.length
      };
    }
  }

  /**
   * Get family budget utilization across categories
   */
  async getFamilyBudgetUtilization(familyId: string): Promise<BudgetUtilizationData[]> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return [];
      }

      // Get budgets with category information
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select(`
          *,
          expense_categories (
            id,
            category_name,
            color,
            icon
          )
        `)
        .in('user_id', memberUserIds)
        .eq('status', 'active');

      if (error) throw error;

      // Group by category and calculate utilization
      const categoryMap = new Map<string, BudgetUtilizationData>();

      budgetData?.forEach(budget => {
        const categoryId = budget.category_id;
        const categoryName = budget.expense_categories?.category_name || 'Uncategorized';
        
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            category_id: categoryId,
            category_name: categoryName,
            total_budget: 0,
            total_spent: 0,
            utilization_percentage: 0,
            member_utilization: [],
            is_over_budget: false,
            variance: 0
          });
        }

        const categoryData = categoryMap.get(categoryId)!;
        categoryData.total_budget += budget.amount;
        categoryData.total_spent += budget.spent || 0;

        // Add member utilization
        const member = familyMembers.find(m => m.user_id === budget.user_id);
        categoryData.member_utilization.push({
          user_id: budget.user_id,
          full_name: member?.full_name || 'Unknown Member',
          budget: budget.amount,
          spent: budget.spent || 0,
          percentage: budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0
        });
      });

      // Calculate final metrics for each category
      return Array.from(categoryMap.values()).map(category => {
        category.utilization_percentage = category.total_budget > 0 
          ? (category.total_spent / category.total_budget) * 100 
          : 0;
        category.is_over_budget = category.total_spent > category.total_budget;
        category.variance = category.total_spent - category.total_budget;
        
        return category;
      }).sort((a, b) => b.utilization_percentage - a.utilization_percentage);
    } catch (error) {
      console.error('Error in getFamilyBudgetUtilization:', error);
      throw error;
    }
  }

  /**
   * Get family budget trends over time
   */
  async getFamilyBudgetTrends(
    familyId: string, 
    months: number = 6
  ): Promise<BudgetTrendData[]> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return [];
      }

      const trends: BudgetTrendData[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format
        
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

        // Get budgets for this month
        const { data: budgets, error: budgetError } = await supabase
          .from('budgets')
          .select(`
            amount,
            spent,
            expense_categories (
              category_name
            )
          `)
          .in('user_id', memberUserIds)
          .gte('start_date', startDate)
          .lte('end_date', endDate);

        if (budgetError) {
          console.warn(`Error fetching budgets for ${monthStr}:`, budgetError);
          continue;
        }

        // Get transactions for this month
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('amount, type')
          .in('user_id', memberUserIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('type', ['income', 'expense']);

        if (txError) {
          console.warn(`Error fetching transactions for ${monthStr}:`, txError);
        }

        const totalBudget = budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
        const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent || 0), 0) || 0;
        const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

        // Calculate category breakdown
        const categoryMap = new Map<string, CategoryTrendData>();
        budgets?.forEach(budget => {
          const categoryName = budget.expense_categories?.[0]?.category_name || 'Uncategorized';
          
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              category_name: categoryName,
              budget: 0,
              spent: 0,
              utilization: 0
            });
          }

          const categoryData = categoryMap.get(categoryName)!;
          categoryData.budget += budget.amount;
          categoryData.spent += budget.spent || 0;
        });

        // Calculate utilization for each category
        Array.from(categoryMap.values()).forEach(category => {
          category.utilization = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
        });

        trends.push({
          month: monthStr,
          total_budget: totalBudget,
          total_spent: totalSpent,
          utilization_percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
          savings_achieved: totalIncome - totalExpenses,
          categories: Array.from(categoryMap.values())
        });
      }

      return trends;
    } catch (error) {
      console.error('Error in getFamilyBudgetTrends:', error);
      throw error;
    }
  }

  /**
   * Get all family budgets aggregated
   */
  private async getFamilyBudgets(memberUserIds: string[]): Promise<BudgetItem[]> {
    const allBudgets: BudgetItem[] = [];

    for (const userId of memberUserIds) {
      try {
        const budgetResult = await this.budgetService.getBudgets(userId);
        if (budgetResult.source !== 'error') {
          allBudgets.push(...budgetResult.data);
        }
      } catch (error) {
        console.warn(`Error fetching budgets for user ${userId}:`, error);
      }
    }

    return allBudgets;
  }

  /**
   * Calculate category performance with member contributions
   */
  private async calculateCategoryPerformance(
    budgets: BudgetItem[],
    transactions: any[],
    familyMembers: any[]
  ): Promise<CategoryPerformanceData[]> {
    const categoryMap = new Map<string, CategoryPerformanceData>();

    // Group budgets by category
    budgets.forEach(budget => {
      const categoryKey = budget.category_name || 'Uncategorized';
      
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          category: categoryKey,
          category_color: budget.category_color,
          category_icon: budget.category_icon,
          budget: 0,
          actual: 0,
          utilization: 0,
          variance: 0,
          status: 'on_track',
          member_contributions: []
        });
      }

      const categoryData = categoryMap.get(categoryKey)!;
      categoryData.budget += budget.amount;
      categoryData.actual += budget.spent || 0;

      // Add member contribution
      const member = familyMembers.find(m => m.user_id === budget.user_id);
      const existingContrib = categoryData.member_contributions.find(c => c.user_id === budget.user_id);
      
      if (existingContrib) {
        existingContrib.budget_allocated += budget.amount;
        existingContrib.amount_spent += budget.spent || 0;
      } else {
        categoryData.member_contributions.push({
          user_id: budget.user_id,
          full_name: member?.full_name || 'Unknown Member',
          budget_allocated: budget.amount,
          amount_spent: budget.spent || 0,
          utilization_percentage: 0 // Will be calculated below
        });
      }
    });

    // Calculate final metrics
    Array.from(categoryMap.values()).forEach(category => {
      category.utilization = category.budget > 0 ? (category.actual / category.budget) * 100 : 0;
      category.variance = category.actual - category.budget;
      
      if (category.utilization > 100) {
        category.status = 'over';
      } else if (category.utilization > 80) {
        category.status = 'on_track';
      } else {
        category.status = 'under';
      }

      // Calculate member utilization percentages
      category.member_contributions.forEach(contrib => {
        contrib.utilization_percentage = contrib.budget_allocated > 0 
          ? (contrib.amount_spent / contrib.budget_allocated) * 100 
          : 0;
      });

      // Sort members by utilization
      category.member_contributions.sort((a, b) => b.utilization_percentage - a.utilization_percentage);
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.utilization - a.utilization);
  }

  /**
   * Calculate family financial health score
   */
  private calculateFamilyFinancialHealth(data: {
    savingsRate: number;
    budgetUtilization: number;
    totalIncome: number;
    totalExpenses: number;
    budgetEfficiency: number;
  }): number {
    let healthScore = 0;

    // Savings rate contribution (0-40 points)
    if (data.savingsRate >= 20) healthScore += 40;
    else if (data.savingsRate >= 10) healthScore += 30;
    else if (data.savingsRate >= 5) healthScore += 20;
    else healthScore += 10;

    // Budget efficiency contribution (0-30 points)
    healthScore += (data.budgetEfficiency / 100) * 30;

    // Expense control contribution (0-30 points)
    const expenseRatio = data.totalIncome > 0 ? (data.totalExpenses / data.totalIncome) * 100 : 100;
    if (expenseRatio <= 50) healthScore += 30;
    else if (expenseRatio <= 70) healthScore += 25;
    else if (expenseRatio <= 80) healthScore += 15;
    else healthScore += 5;

    return Math.min(100, Math.round(healthScore));
  }

  /**
   * Calculate expense trends
   */
  private calculateExpenseTrends(
    transactions: any[],
    budgets: BudgetItem[]
  ): ExpenseTrendData[] {
    const monthlyData = new Map<string, { actual: number; planned: number }>();

    // Group transactions by month
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const month = new Date(transaction.date).toISOString().substring(0, 7);
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { actual: 0, planned: 0 });
      }
      
      monthlyData.get(month)!.actual += transaction.amount;
    });

    // Add budget data (planned amounts)
    budgets.forEach(budget => {
      const startMonth = new Date(budget.start_date).toISOString().substring(0, 7);
      
      if (!monthlyData.has(startMonth)) {
        monthlyData.set(startMonth, { actual: 0, planned: 0 });
      }
      
      monthlyData.get(startMonth)!.planned += budget.amount;
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => {
        const variance = data.actual - data.planned;
        const variancePercentage = data.planned > 0 ? (variance / data.planned) * 100 : 0;
        
        return {
          month,
          planned: data.planned,
          actual: data.actual,
          variance,
          variance_percentage: variancePercentage
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  /**
   * Calculate date range based on period
   */
  private calculatePeriodDateRange(period: 'monthly' | 'quarterly' | 'yearly'): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (period) {
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
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
export const familyBudgetService = FamilyBudgetService.getInstance();
export default familyBudgetService;