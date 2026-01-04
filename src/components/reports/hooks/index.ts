import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { supabase } from '../../../utils/supabaseClient';
import { ReportType, TimeframeType, ChartType, FormatType } from '../components/ReportControls';
import { getCurrentUserData, getTotalIncome, getTotalExpenses } from '../../../data/mockData';

// Interfaces
interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category_id?: number;
  expense_category_id?: string;
  income_category_id?: string;
  account_id: string;
  created_at: string;
  updated_at?: string;
  goal_id?: string;
}

interface Budget {
  id: string;
  user_id: string;
  category_id: number;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  spent: number;
  remaining: number;
  percentage: number;
  created_at: string;
  updated_at?: string;
  category_name?: string;
}

interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percentage: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at?: string;
  family_id?: string;
}

interface Category {
  id: number | string;
  category_name: string;
  type: "income" | "expense";
  icon?: string;
  created_at: string;
  updated_at?: string;
}

interface SpendingDataItem {
  name: string;
  value: number;
  color: string;
}

interface IncomeExpenseDataItem {
  name: string;
  income: number;
  expenses: number;
  contributions: number;
}

interface SavingsDataItem {
  name: string;
  income: number;
  expenses: number;
  savings: number;
  rate: number;
}

interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}

interface BudgetRelationship {
  totalBudgetAllocated: number;
  totalSpentOnGoals: number;
  percentageBudgetToGoals: number;
  goalTransactionsCount: number;
}

// Hook for managing report data fetching and state
export const useReportData = (timeframe: TimeframeType, reportType: ReportType) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [userData, setUserData] = useState<any>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Fetch functions
  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('transactions')
        .select('*');
        
      const now = new Date();
      let startDate: Date;
      
      switch(timeframe) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      query = query
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching transactions:', error);
        showErrorToast('Failed to load transaction data');
        return;
      }
      
      setTransactions(data || []);
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
      showErrorToast('An error occurred while loading transaction data');
    }
  };
  
  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('budget_details')
        .select('*');
        
      const now = new Date();
      let startDate: Date;
      
      switch(timeframe) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      query = query
        .gte('start_date', startDate.toISOString())
        .eq('user_id', user.id);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching budgets:', error);
        showErrorToast('Failed to load budget data');
        return;
      }
      
      setBudgets(data || []);
    } catch (err) {
      console.error('Error in fetchBudgets:', err);
      showErrorToast('An error occurred while loading budget data');
    }
  };
  
  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching goals:', error);
        showErrorToast('Failed to load goal data');
        return;
      }
      
      setGoals(data || []);
    } catch (err) {
      console.error('Error in fetchGoals:', err);
      showErrorToast('An error occurred while loading goal data');
    }
  };
  
  const fetchCategories = async () => {
    try {
      const { data: incomeCategories, error: incomeError } = await supabase
        .from('income_categories')
        .select('*');
        
      const { data: expenseCategories, error: expenseError } = await supabase
        .from('expense_categories')
        .select('*');
      
      if (incomeError || expenseError) {
        console.error('Error fetching categories:', incomeError || expenseError);
        showErrorToast('Failed to load category data');
        return;
      }
      
      const formattedIncomeCategories = (incomeCategories || []).map(cat => ({
        ...cat,
        type: 'income' as const
      }));
      
      const formattedExpenseCategories = (expenseCategories || []).map(cat => ({
        ...cat,
        type: 'expense' as const
      }));
      
      setCategories([...formattedIncomeCategories, ...formattedExpenseCategories]);
    } catch (err) {
      console.error('Error in fetchCategories:', err);
      showErrorToast('An error occurred while loading category data');
    }
  };

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = () => {
    if (!user) return;
    
    if (subscriptionsRef.current.length > 0) {
      subscriptionsRef.current.forEach((subscription: any) => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
    }
    
    const timestamp = Date.now();
    
    const transactionSubscription = supabase
      .channel(`transaction-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchTransactions();
      })
      .subscribe();
    
    const budgetSubscription = supabase
      .channel(`budget-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchBudgets();
      })
      .subscribe();
    
    const goalSubscription = supabase
      .channel(`goal-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchGoals();
      })
      .subscribe();
    
    subscriptionsRef.current = [
      transactionSubscription,
      budgetSubscription,
      goalSubscription
    ];
  };

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        await Promise.all([
          fetchTransactions(),
          fetchBudgets(),
          fetchGoals(),
          fetchCategories()
        ]);
      } catch (err) {
        console.error('Error fetching report data:', err);
        showErrorToast('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setupRealtimeSubscriptions();
    
    return () => {
      if (subscriptionsRef.current.length > 0) {
        subscriptionsRef.current.forEach((subscription: any) => {
          supabase.removeChannel(subscription);
        });
        subscriptionsRef.current = [];
      }
    };
  }, [user, timeframe, reportType]);

  return {
    transactions,
    budgets,
    goals,
    categories,
    userData,
    loading,
    fetchTransactions,
    fetchBudgets,
    fetchGoals,
    fetchCategories
  };
};

// Hook for managing report settings and filters
export const useReportSettings = () => {
  const [reportType, setReportType] = useState<ReportType>("spending");
  const [timeframe, setTimeframe] = useState<TimeframeType>("month");
  const [format, setFormat] = useState<FormatType>("chart");
  const [chartType, setChartType] = useState<ChartType>("pie");

  const getDefaultChartType = (reportType: ReportType): ChartType => {
    switch (reportType) {
      case "spending":
        return "pie";
      case "income-expense":
        return "column";
      case "trends":
        return "line";
      case "goals":
        return "column";
      case "predictions":
        return "line";
      default:
        return "column";
    }
  };

  useEffect(() => {
    const defaultChart = getDefaultChartType(reportType);
    setChartType(defaultChart);
  }, [reportType]);

  return {
    reportType,
    timeframe,
    format,
    chartType,
    setReportType,
    setTimeframe,
    setFormat,
    setChartType
  };
};

// Hook for managing tooltips
export const useTooltips = () => {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  const closeTip = () => {
    setActiveTip(null);
    setTooltipPosition(null);
  };

  return {
    activeTip,
    tooltipPosition,
    toggleTip,
    closeTip
  };
};

// Email functionality removed - use direct export options instead

// Helper function to get the actual category ID from a transaction
export const getTransactionCategoryId = (transaction: Transaction): string | number | undefined => {
  // Check for the new structure first (expense_category_id or income_category_id)
  if (transaction.type === 'expense' && transaction.expense_category_id) {
    return transaction.expense_category_id;
  }
  if (transaction.type === 'income' && transaction.income_category_id) {
    return transaction.income_category_id;
  }
  // Fallback to old structure
  return transaction.category_id;
};

// Helper function to get category name
export const getCategoryName = (categoryId: number | string, categories: Category[]): string => {
  const category = categories.find(cat => cat.id === categoryId || cat.id.toString() === categoryId.toString());
  return category ? category.category_name : `Category ${categoryId}`;
};

// Hook for summary data calculation
export const useSummaryData = (transactions: Transaction[], budgets: Budget[], goals: Goal[]) => {
  const getCurrentMonthData = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Calculate from actual transactions instead of mock data
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= firstDay && transactionDate <= lastDay;
    });
    
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    
    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings,
      savingsRate
    };
  };

  return {
    totalTransactions: transactions.length,
    activeBudgets: budgets.length,
    activeGoals: goals.length,
    lastUpdated: new Date().toLocaleTimeString(),
    monthlyFinancials: getCurrentMonthData()
  };
};

export type {
  Transaction,
  Budget,
  Goal,
  Category,
  SpendingDataItem,
  IncomeExpenseDataItem,
  SavingsDataItem,
  TrendData,
  BudgetRelationship
};