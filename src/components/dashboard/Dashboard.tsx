import React, { useState, useEffect, useRef, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import HighchartsReact from "highcharts-react-official";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getCurrentMonthDates,
} from "../../utils/helpers";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { supabase } from "../../utils/supabaseClient";
import ErrorBoundary from "../ErrorBoundary";

// Import initialized Highcharts from utils
import Highcharts from "../../utils/highchartsInit";
import { Budget } from "../../types";

// Import dashboard components
import BudgetProgress from "./BudgetProgress";
import RecentTransactions from "./RecentTransactions";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import SB Admin theme-related styles
import "./dashboard.css";

// Import Animate.css
import "animate.css";

// Define Transaction type to match the one in RecentTransactions.tsx
interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category: string;
  category_id?: string;
  account_id: string;
  goal_id?: string;
  created_at: string;
  updated_at: string;
}

// Define types for Supabase data
interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  status: string;
  created_at: string;
}

interface Category {
  id: string;
  user_id: string;
  category_name: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
}

interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: string;
  status: string;
  created_at: string;
}

interface BudgetItem {
  id: string;
  category: string;
  name?: string;
  amount: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success";
}

interface UserData {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
  transactions: Transaction[];
  summaryData: {
    income: number;
    expenses: number;
    balance: number;
    savingsRate: number;
  };
}

interface MonthlyDataPoint {
  data: number[];
  label: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

interface MonthlyData {
  labels: string[];
  datasets: MonthlyDataPoint[];
}

interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

interface HighchartsConfig {
  chart: {
    type: string;
    style: {
      fontFamily: string;
    };
    backgroundColor: string;
    animation: {
      duration: number;
    };
    height: number;
  };
  title: {
    text: string | null;
  };
  xAxis: {
    categories: string[];
    crosshair: boolean;
    labels: {
      style: {
        color: string;
      };
    };
  };
  yAxis: {
    min: number;
    title: {
      text: string | null;
    };
    gridLineColor: string;
    gridLineDashStyle: string;
    labels: {
      formatter: () => string;
      style: {
        color: string;
      };
    };
  };
  tooltip: {
    headerFormat: string;
    pointFormat: string;
    footerFormat: string;
    shared: boolean;
    useHTML: boolean;
    style: {
      fontSize: string;
      fontFamily: string;
    };
    valuePrefix: string;
  };
  plotOptions: {
    column: {
      pointPadding: number;
      borderWidth: number;
      borderRadius: number;
    };
    series: {
      animation: {
        duration: number;
      };
    };
  };
  credits: {
    enabled: boolean;
  };
  series: Array<{
    name: string;
    data: number[];
    color: string;
    type: string;
  }>;
}

interface PieChartConfig {
  chart: {
    type: string;
    backgroundColor: string;
    style: {
      fontFamily: string;
    };
    height: number;
  };
  title: {
    text: string | null;
  };
  tooltip: {
    pointFormat: string;
    valuePrefix: string;
    useHTML?: boolean;
  };
  plotOptions: {
    pie: {
      allowPointSelect: boolean;
      cursor: string;
      dataLabels: {
        enabled: boolean;
        format: string;
        style: {
          fontWeight: string;
        };
        connectorWidth?: number;
        distance?: number;
      };
      showInLegend: boolean;
      size: string;
      point?: {
        events: {
          click: Function;
        };
      };
    };
  };
  legend: {
    enabled?: boolean;
    align?: string;
    verticalAlign?: string;
    layout?: string;
    itemStyle?: {
      fontWeight: string;
    };
  };
  series: Array<{
    name: string;
    colorByPoint: boolean;
    data: Array<{
      name: string;
      y: number;
      sliced?: boolean;
      selected?: boolean;
    }>;
  }>;
  credits: {
    enabled: boolean;
  };
}

interface InsightData {
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "danger";
  icon: string;
}

interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}

interface Invitation {
  id: number;
  family_id: number;
  family_name: string;
  inviter_user_id: string;
  inviter_email: string;
}

const Dashboard: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [monthlyData, setMonthlyData] = useState<HighchartsConfig | null>(null);
  const [categoryData, setCategoryData] = useState<PieChartConfig | null>(null);
  const [budgetProgress, setBudgetProgress] = useState<BudgetItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [monthRangeText, setMonthRangeText] = useState<string>("");
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [subscriptionEstablished, setSubscriptionEstablished] = useState<boolean>(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);

  // Create refs for Highcharts instances to avoid duplicates
  const monthlyChartRef = useRef<any>(null);
  const categoryChartRef = useRef<any>(null);

  // Get current month's date range
  const { firstDay, lastDay } = getCurrentMonthDates();

  // Check if Highcharts is loaded
  useEffect(() => {
    if (window.Highcharts) {
      setHighchartsLoaded(true);
    } else {
      const checkHighcharts = setInterval(() => {
        if (window.Highcharts) {
          setHighchartsLoaded(true);
          clearInterval(checkHighcharts);
        }
      }, 100);

      return () => clearInterval(checkHighcharts);
    }
  }, []);

  // Fetch user data from Supabase
  const fetchUserData = async () => {
    if (!user) {
      navigate("/auth/login");
      return;
    }

    try {
      console.log('Starting to fetch dashboard data for user:', user.id);
      setLoading(true);
      
      // Fetch user's accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
        
      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        throw accountsError;
      }
      
      console.log('Accounts data:', accountsData?.length || 0, 'accounts found');
      
      // Fetch income categories
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_categories')
        .select('*')
        .eq('user_id', user.id);
        
      if (incomeError) {
        console.error('Error fetching income categories:', incomeError);
        throw incomeError;
      }
      
      console.log('Income categories data:', incomeData?.length || 0, 'categories found');
      
      // Fetch expense categories
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id);
        
      if (expenseError) {
        console.error('Error fetching expense categories:', expenseError);
        throw expenseError;
      }
      
      console.log('Expense categories data:', expenseData?.length || 0, 'categories found');
      
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        throw goalsError;
      }
      
      console.log('Goals data:', goalsData?.length || 0, 'goals found');
      
      // Get current month's date range for transactions
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      console.log('Fetching transactions from', firstDayOfMonth, 'to', lastDayOfMonth);
      
      // Fetch recent transactions (limited to 30 days)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50);
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        throw transactionsError;
      }
      
      console.log('Transactions data:', transactionsData?.length || 0, 'transactions found');
      
      // Fetch budget progress data
      console.log('Fetching budget data...');
      let budgetsData = null;
      let budgetsError = null;
      
      try {
        const result = await supabase
          .from('budget_details')
          .select('*')
          .eq('user_id', user.id)
          .order('percentage', { ascending: false });
        
        budgetsData = result.data;
        budgetsError = result.error;
      } catch (err) {
        console.error('Error in budget details query:', err);
        
        // Try alternative query if view doesn't exist
        const fallbackResult = await supabase
          .from('budgets')
          .select(`
            *,
            expense_categories!budgets_category_id_fkey(category_name)
          `)
          .eq('user_id', user.id);
        
        budgetsData = fallbackResult.data;
        budgetsError = fallbackResult.error;
      }
      
      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
      }
      
      console.log('Budgets data:', budgetsData?.length || 0, 'budgets found');
      
      // Get pending family invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('family_invitations')
        .select('*, family:family_id(family_name)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending');
        
      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
        // Continue without invitations data rather than throwing
      }
      
      // Format invitations data
      const formattedInvitations: Invitation[] = (invitationsData || []).map(inv => ({
        id: inv.id,
        family_id: inv.family_id,
        family_name: inv.family?.family_name || 'Unknown Family',
        inviter_user_id: inv.inviter_id,
        inviter_email: inv.inviter_email || 'Unknown'
      }));
      
      // Format budget data for the BudgetProgress component
      const formattedBudgetData: BudgetItem[] = (budgetsData || []).map(budget => {
        // Calculate status based on percentage
        let status: "success" | "warning" | "danger" = "success";
        let percentage = 0;
        let spent = 0;
        let amount = 0;
        let remaining = 0;
        let category = '';
        
        // Handle different data structures (budget_details view vs budgets table)
        if ('percentage' in budget) {
          // Data from budget_details view
          percentage = budget.percentage || 0;
          spent = budget.spent || 0;
          amount = budget.amount || 0;
          remaining = budget.remaining || 0;
          category = budget.category_name || '';
        } else {
          // Data from budgets table with joined categories
          amount = budget.amount || 0;
          spent = budget.spent || 0;
          remaining = amount - spent;
          percentage = amount > 0 ? (spent / amount) * 100 : 0;
          category = budget.expense_categories?.category_name || budget.name || '';
        }
        
        if (percentage >= 100) {
          status = "danger";
        } else if (percentage >= 80) {
          status = "warning";
        }
        
        return {
          id: budget.id,
          category: category,
          name: category,
          amount: amount,
          spent: spent,
          remaining: remaining,
          percentage: percentage,
          status: status
        };
      });
      
      // Calculate monthly income and expenses
      const currentMonthTransactions = transactionsData?.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(firstDayOfMonth) && txDate <= new Date(lastDayOfMonth);
      }) || [];
      
      const income = currentMonthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const expenses = currentMonthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
      
      // Create user data object
      const dashboardUserData: UserData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        },
        accounts: accountsData || [],
        incomeCategories: incomeData || [],
        expenseCategories: expenseData || [],
        goals: goalsData || [],
        transactions: transactionsData || [],
        summaryData: {
          income,
          expenses,
          balance: income - expenses,
          savingsRate
        }
      };
      
      // Update state with fetch data
      setUserData(dashboardUserData);
      setPendingInvites(formattedInvitations);
      setBudgetProgress(formattedBudgetData);
      
      console.log('Budget progress data:', formattedBudgetData.length, 'items');
      
      // Set recent transactions
      const sortedTransactions = [...(transactionsData || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 5);
      setRecentTransactions(sortedTransactions);
      
      console.log('Recent transactions:', sortedTransactions.length, 'items');
      
      // Calculate and set monthly spending data
      const calculatedMonthlyData = calculateMonthlyData(user.id, transactionsData || []);
      setMonthlyData(formatMonthlyDataForHighcharts(calculatedMonthlyData));
      
      console.log('Monthly data calculated');
      
      // Set category data for expenses pie chart
      const calculatedCategoryData = calculateCategoryData(user.id, firstDayOfMonth, lastDayOfMonth, transactionsData || [], expenseData || []);
      setCategoryData(formatCategoryDataForHighcharts(calculatedCategoryData));
      
      console.log('Category data calculated');
      
      // Generate insights
      generateInsights(income, expenses, savingsRate, formattedBudgetData, transactionsData || []);
      
      console.log('Insights generated');
      
      // Calculate transaction trends
      if (transactionsData && transactionsData.length > 0 && expenseData) {
        calculateTransactionTrends(transactionsData, expenseData);
        console.log('Trends calculated');
      } else {
        console.log('Not enough data to calculate trends');
        setTrends([]);
      }
      
      // Set month range text for the chart title
      setMonthRangeText(getMonthRangeText(new Date()));

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      showErrorToast(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    if (!user || subscriptionEstablished) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    // Subscribe to transactions table changes
    const subscription = supabase
      .channel('dashboard-transactions-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Transaction change received:', payload);
        // Refresh data when transactions change
        fetchUserData();
      })
      .subscribe((status) => {
        console.log('Transaction subscription status:', status);
      });

    // Subscribe to account balance changes
    const accountSubscription = supabase
      .channel('dashboard-account-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'accounts',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Account change received:', payload);
        // Refresh data when accounts change
        fetchUserData();
      })
      .subscribe((status) => {
        console.log('Account subscription status:', status);
      });

    // Subscribe to goal changes
    const goalSubscription = supabase
      .channel('dashboard-goal-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Goal change received:', payload);
        // Refresh data when goals change
        fetchUserData();
      })
      .subscribe((status) => {
        console.log('Goal subscription status:', status);
      });
      
    // Subscribe to budget changes
    const budgetSubscription = supabase
      .channel('dashboard-budget-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'budgets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Budget change received:', payload);
        // Refresh data when budgets change
        fetchUserData();
      })
      .subscribe((status) => {
        console.log('Budget subscription status:', status);
      });

    // Subscribe to invitation changes
    const invitationSubscription = supabase
      .channel('dashboard-invitation-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'family_invitations',
        filter: `invitee_id=eq.${user.id}`
      }, (payload) => {
        console.log('Invitation change received:', payload);
        // Refresh data when invitations change
        fetchUserData();
      })
      .subscribe((status) => {
        console.log('Invitation subscription status:', status);
      });

    setSubscriptionEstablished(true);

    // Store subscriptions for cleanup
    setActiveSubscriptions([
      subscription,
      accountSubscription,
      goalSubscription,
      budgetSubscription,
      invitationSubscription
    ]);

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions');
      [subscription, accountSubscription, goalSubscription, budgetSubscription, invitationSubscription]
        .forEach(sub => supabase.removeChannel(sub));
    };
  };
  
  // Fetch initial data on component mount
  useEffect(() => {
    fetchUserData();
  }, [user]);
  
  // Set up real-time subscriptions after fetching initial data
  useEffect(() => {
    if (user && !loading && !subscriptionEstablished) {
      console.log('Setting up real-time subscriptions after initial data fetch');
      const cleanup = setupRealtimeSubscription();
      
      // Return cleanup function
      return cleanup;
    }
  }, [user, loading, subscriptionEstablished]);
  
  // Clean up subscriptions when component unmounts
  useEffect(() => {
    return () => {
      if (activeSubscriptions.length > 0) {
        console.log('Component unmounting, cleaning up subscriptions');
        activeSubscriptions.forEach(sub => {
          supabase.removeChannel(sub);
        });
      }
    };
  }, [activeSubscriptions]);
  
  // Auto-hide welcome message
  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => {
      clearTimeout(welcomeTimer);
    };
  }, []);

  // Get month range text for chart title
  const getMonthRangeText = (currentDate: Date): string => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const currentMonth = months[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();
    
    // Calculate start month (4 months before)
    const startDate = new Date(currentDate);
    startDate.setMonth(currentDate.getMonth() - 4);
    const startMonth = months[startDate.getMonth()];
    const startYear = startDate.getFullYear();
    
    // Create range text
    return startYear === currentYear 
      ? `${startMonth}-${currentMonth} ${currentYear}` 
      : `${startMonth} ${startYear}-${currentMonth} ${currentYear}`;
  };

  // Helper function to check if spending is consistent
  const checkConsistentSpending = (transactions: Transaction[]): boolean => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = today.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get current month expenses
    const currentMonthExpenses = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === currentMonth &&
             txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    // Get previous month expenses
    const previousMonthExpenses = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === previousMonth &&
             txDate.getFullYear() === previousYear;
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    // If there's no data for either month, return false
    if (currentMonthExpenses === 0 || previousMonthExpenses === 0) {
      return false;
    }
    
    // Calculate percentage difference
    const percentDifference = Math.abs(currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses * 100;
    
    // Consider spending consistent if it's within 10% of previous month
    return percentDifference <= 10;
  };
  
  // Helper function to calculate debt reduction percentage
  const calculateDebtReduction = (transactions: Transaction[]): number => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = today.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get current month debt payments (we'll consider any transaction with "debt" or "loan" in notes)
    const currentMonthDebt = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === currentMonth &&
             txDate.getFullYear() === currentYear &&
             (tx.notes?.toLowerCase().includes('debt') || 
              tx.notes?.toLowerCase().includes('loan') ||
              tx.category?.toLowerCase().includes('debt') ||
              tx.category?.toLowerCase().includes('loan'));
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    // Get previous month debt payments
    const previousMonthDebt = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === previousMonth &&
             txDate.getFullYear() === previousYear &&
             (tx.notes?.toLowerCase().includes('debt') || 
              tx.notes?.toLowerCase().includes('loan') ||
              tx.category?.toLowerCase().includes('debt') ||
              tx.category?.toLowerCase().includes('loan'));
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    // If there's no data for either month, return 0
    if (currentMonthDebt === 0 || previousMonthDebt === 0) {
      return 0;
    }
    
    // Calculate percentage change
    // Positive value means debt reduction, negative means debt increase
    return ((previousMonthDebt - currentMonthDebt) / previousMonthDebt) * 100;
  };

  // Calculate monthly data from transactions
  const calculateMonthlyData = (userId: string, transactions: Transaction[]): MonthlyData => {
    const months = [
      "January", "February", "March", "April", "May",
      "June", "July", "August", "September", "October",
      "November", "December"
    ];
    
    const currentDate = new Date();
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    
    // Generate data for past 4 months plus current month
    for (let i = 4; i >= 0; i--) {
      // Calculate month by subtracting i months from current date
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthName = months[monthDate.getMonth()];
      labels.push(monthName);
      
      // Get transactions for this month
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
      // Calculate income and expenses
      const monthlyIncome = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const monthlyExpenses = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      incomeData.push(monthlyIncome);
      expenseData.push(monthlyExpenses);
    }
    
    return {
      labels: labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "#4CAF50",
          borderColor: "#4CAF50",
          borderWidth: 1,
        },
        {
          label: "Expenses",
          data: expenseData,
          backgroundColor: "#F44336",
          borderColor: "#F44336",
          borderWidth: 1,
        },
      ],
    };
  };

  // Calculate category data from transactions
  const calculateCategoryData = (userId: string, startDate: string, endDate: string, transactions: Transaction[], expenseCategories: Category[]): CategoryData => {
    // Filter transactions for the current month and type expense
    const expenseTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate >= new Date(startDate) && 
             txDate <= new Date(endDate);
    });
    
    // Group by category
    const categoryMap = new Map<string, number>();
    const categoryNames = new Map<string, string>();
    
    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        // Add to category total
        const currentTotal = categoryMap.get(tx.category_id) || 0;
        const amount = parseFloat(tx.amount.toString()) || 0;
        categoryMap.set(tx.category_id, currentTotal + amount);
        
        // Store category name
        const category = expenseCategories.find(cat => cat.id === tx.category_id);
        if (category) {
          categoryNames.set(tx.category_id, category.category_name);
        } else {
          categoryNames.set(tx.category_id, 'Uncategorized');
        }
      }
    });
    
    // Prepare data for chart
    const labels: string[] = [];
    const data: number[] = [];
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#7BC225"];
    
    let colorIndex = 0;
    const backgroundColor: string[] = [];
    
    categoryMap.forEach((amount, categoryId) => {
      labels.push(categoryNames.get(categoryId) || `Category ${categoryId}`);
      data.push(amount);
      backgroundColor.push(colors[colorIndex % colors.length]);
      colorIndex++;
    });
    
    return {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColor,
        },
      ],
    };
  };
  
  // Helper function to get category name
  const getCategoryName = (categoryId: number): string => {
    // Map of category IDs to names - in real app, you'd fetch this from your categories data
    const categoryNames: {[key: number]: string} = {
      1: "Housing",
      2: "Utilities",
      3: "Groceries",
      4: "Transportation",
      5: "Dining Out",
      6: "Entertainment",
      7: "Healthcare",
      8: "Education",
      9: "Shopping",
      10: "Personal Care",
      11: "Travel",
      12: "Subscriptions",
    };
    
    return categoryNames[categoryId] || `Category ${categoryId}`;
  };

  // Generate insights based on financial data
  const generateInsights = (
    income: number, 
    expenses: number, 
    savingsRate: number, 
    budgetData: BudgetItem[],
    transactions: Transaction[]
  ): void => {
    const newInsights: InsightData[] = [];
    
    // Only proceed if we have actual transaction data
    if (!transactions || transactions.length === 0) {
      setInsights([]);
      return;
    }
    
    // Find unusually large transactions
    const unusualTransactions = transactions.filter(tx => {
      const amount = parseFloat(tx.amount.toString());
      // Transactions over $1,000 that are labeled as subscriptions or have 'subscription' in notes
      return amount > 1000 && 
        (tx.category_id === 'subscription' || 
         (tx.notes && tx.notes.toLowerCase().includes('subscription')));
    });
    
    if (unusualTransactions.length > 0) {
      // Find large subscription
      const largeSubscription = unusualTransactions.find(tx => {
        const amount = parseFloat(tx.amount.toString());
        return amount > 10000;
      });
      
      if (largeSubscription) {
        newInsights.push({
          title: "Critical: Unusual subscription charge",
          description: `There's an unusually large subscription charge of ${formatCurrency(Number(largeSubscription.amount))} on ${formatDate(largeSubscription.date)}. Please verify this transaction.`,
          type: "danger",
          icon: "fa-exclamation-circle",
        });
      } else if (unusualTransactions.length > 0) {
        newInsights.push({
          title: "Unusual spending detected",
          description: `Found ${unusualTransactions.length} ${unusualTransactions.length === 1 ? 'transaction' : 'transactions'} that ${unusualTransactions.length === 1 ? 'doesn\'t' : 'don\'t'} match your typical spending pattern.`,
          type: "warning",
          icon: "fa-exclamation-circle",
        });
      }
    }
    
    // Budget insights
    const overBudgetCategories = budgetData.filter(budget => 
      budget.spent > budget.amount
    );
    
    if (overBudgetCategories.length > 0) {
      newInsights.push({
        title: `Over budget in ${overBudgetCategories.length} ${overBudgetCategories.length === 1 ? 'category' : 'categories'}`,
        description: `You've exceeded your budget in ${overBudgetCategories.map(b => b.category).join(', ')}. Consider adjusting your spending or your budget amounts.`,
        type: "danger",
        icon: "fa-exclamation-triangle",
      });
    }
    
    // Income vs expenses insight
    if (income < expenses) {
      newInsights.push({
        title: "Spending exceeds income",
        description: `You spent ${formatCurrency(expenses - income)} more than you earned this month. Review your expenses to identify areas to cut back.`,
        type: "danger",
        icon: "fa-arrow-trend-down",
      });
    } else if (income > expenses && savingsRate >= 20) {
      newInsights.push({
        title: "Great savings rate!",
        description: `You're saving ${formatPercentage(savingsRate)} of your income, which meets or exceeds the recommended 20%.`,
        type: "success",
        icon: "fa-piggy-bank",
      });
    } else if (income > expenses && savingsRate < 20) {
      newInsights.push({
        title: "Improve your savings",
        description: `Your current savings rate is ${formatPercentage(savingsRate)}. Try to save at least 20% of your income for financial security.`,
        type: "info",
        icon: "fa-chart-line",
      });
    }
    
    // Calculate if spending is consistent
    // We'll consider it consistent if total expense hasn't changed more than 10% from previous month
    // Only show this insight if we have at least 2 months of data
    const currentDate = new Date();
    const previousMonthDate = new Date();
    previousMonthDate.setMonth(currentDate.getMonth() - 1);
    
    const currentMonthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentDate.getMonth() && 
             txDate.getFullYear() === currentDate.getFullYear();
    });
    
    const previousMonthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === previousMonthDate.getMonth() && 
             txDate.getFullYear() === previousMonthDate.getFullYear();
    });
    
    // Only add consistency insight if we have data for both current and previous month
    if (currentMonthTransactions.length > 0 && previousMonthTransactions.length > 0) {
      const isSpendingConsistent = checkConsistentSpending(transactions);
      if (isSpendingConsistent && newInsights.length < 3) {
        newInsights.push({
          title: "Consistent spending habits",
          description: "Your spending patterns are consistent with previous months, which is great for financial planning.",
          type: "info",
          icon: "fa-clock",
        });
      } else if (!isSpendingConsistent && newInsights.length < 3) {
        newInsights.push({
          title: "Spending pattern changes",
          description: "Your spending patterns have changed significantly from last month. Review your budget categories.",
          type: "info",
          icon: "fa-chart-line",
        });
      }
    }
    
    // Calculate debt reduction
    const debtReductionPercent = calculateDebtReduction(transactions);
    if (debtReductionPercent > 10 && newInsights.length < 3) {
      newInsights.push({
        title: "Great progress on debt!",
        description: `You've reduced your debt by ${formatPercentage(debtReductionPercent)} compared to last month.`,
        type: "success",
        icon: "fa-credit-card",
      });
    } else if (debtReductionPercent < -5 && newInsights.length < 3) {
      newInsights.push({
        title: "Increasing debt",
        description: `Your debt has increased by ${formatPercentage(Math.abs(debtReductionPercent))} compared to last month.`,
        type: "warning",
        icon: "fa-credit-card",
      });
    }
    
    // Add a positive insight if we don't have many
    if (newInsights.length < 2 && income > expenses) {
      newInsights.push({
        title: "Positive cash flow",
        description: `You have a positive balance of ${formatCurrency(income - expenses)} this month. Keep up the good work!`,
        type: "success",
        icon: "fa-sack-dollar",
      });
    }
    
    // Limit insights to 3 to avoid cluttering the UI
    setInsights(newInsights.slice(0, 3));
  };

  // Calculate transaction trends
  const calculateTransactionTrends = (transactions: Transaction[], expenseCategories: Category[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = today.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get spending by category for current month
    const currentMonthSpending = new Map<string, number>();
    transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === currentMonth &&
             txDate.getFullYear() === currentYear;
    }).forEach(tx => {
      if (tx.category_id) {
        const amount = parseFloat(tx.amount.toString()) || 0;
        const current = currentMonthSpending.get(tx.category_id) || 0;
        currentMonthSpending.set(tx.category_id, current + amount);
      }
    });
    
    // Get spending by category for previous month
    const previousMonthSpending = new Map<string, number>();
    transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === previousMonth &&
             txDate.getFullYear() === previousYear;
    }).forEach(tx => {
      if (tx.category_id) {
        const amount = parseFloat(tx.amount.toString()) || 0;
        const current = previousMonthSpending.get(tx.category_id) || 0;
        previousMonthSpending.set(tx.category_id, current + amount);
      }
    });
    
    // Calculate trends
    const trendData: TrendData[] = [];
    
    // Process categories with data in current or previous month
    const allCategories = new Set([
      ...Array.from(currentMonthSpending.keys()),
      ...Array.from(previousMonthSpending.keys())
    ]);
    
    allCategories.forEach(categoryId => {
      const currentAmount = currentMonthSpending.get(categoryId) || 0;
      const previousAmount = previousMonthSpending.get(categoryId) || 0;
      
      // Skip categories with no spending in either month
      if (currentAmount === 0 && previousAmount === 0) return;
      
      // Find category name
      const category = expenseCategories.find(c => c.id === categoryId);
      const categoryName = category ? category.category_name : 'Other';
      
      // Calculate percentage change
      let change = 0;
      if (previousAmount > 0) {
        change = ((currentAmount - previousAmount) / previousAmount) * 100;
      } else if (currentAmount > 0) {
        change = 100; // New spending category
      }
      
      trendData.push({
        category: categoryName,
        change,
        previousAmount,
        currentAmount
      });
    });
    
    // Sort by absolute change amount
    trendData.sort((a, b) => 
      Math.abs(b.currentAmount - b.previousAmount) - Math.abs(a.currentAmount - a.previousAmount)
    );
    
    // Take top 4 categories with most significant changes
    setTrends(trendData.slice(0, 4));
  };

  const handleAcceptInvite = async (inviteId: number) => {
    if (!user) {
      showErrorToast('You must be logged in to accept invitations');
      return;
    }
    
    try {
      // Update invitation status
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      
      if (error) throw error;
      
      // Get the invitation details
      const { data: inviteData, error: fetchError } = await supabase
        .from('family_invitations')
        .select('family_id, families:family_id(family_name)')
        .eq('id', inviteId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Add user to family_members table
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: inviteData?.family_id,
          user_id: user.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // Get family name from the nested object
      const familyName = inviteData?.families?.[0]?.family_name || 'the family';
      showSuccessToast(`You are now a member of ${familyName}`);
      
      // Update state
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      showErrorToast(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvite = async (inviteId: number) => {
    if (!user) {
      showErrorToast('You must be logged in to reject invitations');
      return;
    }
    
    try {
      // Update invitation status
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'rejected' })
        .eq('id', inviteId);
      
      if (error) throw error;
      
      showSuccessToast('Invitation rejected');
      
      // Update state
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
      
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      showErrorToast(error.message || 'Failed to reject invitation');
    }
  };

  // Format monthly data for Highcharts
  const formatMonthlyDataForHighcharts = (
    data: MonthlyData | null
  ): HighchartsConfig | null => {
    if (!data || !data.datasets || !data.labels) return null;
    
    // Check if we have any non-zero data
    const hasNonZeroData = data.datasets.some(dataset => 
      dataset.data && dataset.data.length > 0 && dataset.data.some(value => value > 0)
    );
    
    if (!hasNonZeroData) return null;

    const categories = data.labels;

    const series = [
      {
        name: "Income",
        data: data.datasets[0].data,
        color: "#4e73df",
        type: "column",
      },
      {
        name: "Expenses",
        data: data.datasets[1].data,
        color: "#e74a3b",
        type: "column",
      },
    ];

    return {
      chart: {
        type: "column",
        style: {
          fontFamily:
            'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        },
        backgroundColor: "transparent",
        animation: {
          duration: 1000,
        },
        height: 350,
      },
      title: {
        text: null, // Remove the title as it's redundant with the card header
      },
      xAxis: {
        categories: categories,
        crosshair: true,
        labels: {
          style: {
            color: "#858796",
          },
        },
      },
      yAxis: {
        min: 0,
        title: {
          text: null,
        },
        gridLineColor: "#eaecf4",
        gridLineDashStyle: "dash",
        labels: {
          formatter: function () {
            // Use 'this' as any to avoid TypeScript errors with Highcharts
            return formatCurrency((this as any).value).replace("$", "$");
          },
          style: {
            color: "#858796",
          },
        },
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat:
          '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>{point.y:,.2f}</b></td></tr>',
        footerFormat: "</table>",
        shared: true,
        useHTML: true,
        style: {
          fontSize: "12px",
          fontFamily:
            'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        },
        valuePrefix: "$",
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 5,
        },
        series: {
          animation: {
            duration: 1000,
          },
        },
      },
      credits: {
        enabled: false,
      },
      series: series,
    };
  };

  // Format category data for Highcharts pie chart
  const formatCategoryDataForHighcharts = (
    data: CategoryData | null
  ): PieChartConfig | null => {
    if (!data || !data.datasets || !data.labels || data.labels.length === 0 || data.datasets[0].data.length === 0) return null;

    // Check if all values are zero
    const hasNonZeroValues = data.datasets[0].data.some(value => value > 0);
    if (!hasNonZeroValues) return null;

    // Get actual categoryIds matching the labels from expenseCategories
    const getCategoryIdFromName = (categoryName: string): string => {
      if (!userData || !userData.expenseCategories) return "";
      
      const category = userData.expenseCategories.find(
        cat => cat.category_name === categoryName
      );
      
      return category ? category.id : "";
    };

    const pieData = data.labels.map((label, index) => ({
      name: label,
      y: data.datasets[0].data[index],
      // First segment slightly pulled out
      sliced: index === 0,
      selected: index === 0
    }));

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: {
          fontFamily:
            'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        },
        height: 350,
      },
      title: {
        text: null,
      },
      tooltip: {
        pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}',
        valuePrefix: "$",
        useHTML: true,
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
            style: {
              fontWeight: "normal",
            },
            // Remove connection lines by setting distance to 0
            connectorWidth: 0,
            distance: 30
          },
          showInLegend: false,
          size: '85%'
        },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          name: "Spending",
          colorByPoint: true,
          data: pieData,
        },
      ],
      credits: {
        enabled: false,
      },
    };
  };

  const monthlyChartCallback = (chart: any): void => {
    // Save the chart instance
    if (monthlyChartRef.current) {
      monthlyChartRef.current.chart = chart;
    }
  };

  const categoryChartCallback = (chart: any): void => {
    // Save the chart instance
    if (categoryChartRef.current) {
      categoryChartRef.current.chart = chart;
    }
  };

  // Updated toggle tip function to position tooltips correctly below each info icon
  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        // Get the position of the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate position accounting for scroll
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  // Add a function to toggle expanded insight
  const toggleInsightExpand = (insightTitle: string) => {
    if (expandedInsight === insightTitle) {
      setExpandedInsight(null);
    } else {
      setExpandedInsight(insightTitle);
    }
  };



  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Dashboard
          </h5>
          <p className="text-gray-500">Please wait while we prepare your financial summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="alert alert-info shadow-sm animate__animated animate__fadeIn">
          <h4 className="alert-heading">You have pending family invitations!</h4>
          {pendingInvites.map(invite => {
              const inviter = invite.inviter_email || "another user";
              return (
                  <div key={invite.id} className="d-flex justify-content-between align-items-center mb-2">
                      <p className="mb-0">
                          You have been invited by <strong>{inviter}</strong> to join the <strong>{invite.family_name}</strong>.
                      </p>
                      <div>
                          <button className="btn btn-success btn-sm mr-2" onClick={() => handleAcceptInvite(invite.id)}>Accept</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectInvite(invite.id)}>Reject</button>
                      </div>
                  </div>
              );
          })}
        </div>
      )}

      {/* Welcome message */}
      {showWelcome && userData && (
        <div
          className="alert animate__animated animate__fadeIn shadow-sm border-0"
          role="alert"
          style={{ borderLeft: '4px solid #6366f1', borderRadius: '8px', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent)' }}
        >
          <button
            type="button"
            className="close"
            onClick={() => setShowWelcome(false)}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <div className="d-flex align-items-center">
            <div className="welcome-icon mr-3" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
              <i className="fas fa-chart-line fa-2x text-primary"></i>
            </div>
            <div>
              <h4 className="alert-heading font-weight-bold mb-1 text-gray-800">
                Welcome back, {userData.user.name}!
              </h4>
              <p className="mb-0 text-gray-600">Here's a summary of your finances. You're doing great!</p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Insights */}
      {insights.length > 0 ? (
        <div className="row mb-4">
          <div className="col-12">
            <h6 className="text-xs font-weight-bold text-primary text-uppercase mb-3">
              Financial Insights
            </h6>
            <div className="row">
              {insights.map((insight, index) => (
                <div 
                  key={`insight-${index}`} 
                  className={`col-md-${12 / insights.length} mb-2 ${index === 0 ?   'new-insight' : ''}`}
                >
                  <div className={`card insight-card border-left-${insight.type} shadow-sm h-100 py-2 animate__animated animate__fadeIn`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className={`text-xs font-weight-bold text-${insight.type} text-uppercase mb-1`}>
                            {insight.title}
                          </div>
                          <div className="h6 mb-0 font-weight-normal text-gray-800">
                            {insight.description}
                          </div>
                          {expandedInsight === insight.title && (
                            <div className="mt-3 text-sm text-gray-600 animate__animated animate__fadeIn">
                              {insight.type === 'success' && (
                                <p>Keep up the good work! Maintaining this habit will help you reach your financial goals faster.</p>
                              )}
                              {insight.type === 'warning' && (
                                <p>Consider reviewing your budget to address this issue before it affects your financial health.</p>
                              )}
                              {insight.type === 'danger' && (
                                <p>This requires immediate attention. Visit the Budget section to make adjustments to your spending plan.</p>
                              )}
                              {insight.type === 'info' && (
                                <p>This information can help you make better financial decisions going forward.</p>
                              )}
                            </div>
                          )}
                          <div 
                            className="insight-action"
                            onClick={() => toggleInsightExpand(insight.title)}
                          >
                            {expandedInsight === insight.title ? 'Show less' : 'Learn more'}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className={`fas ${insight.icon} fa-2x text-gray-300`}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        userData && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm border-left-info">
                <div className="card-body p-4">
                  <div className="text-center">
                    <i className="fas fa-lightbulb fa-3x text-gray-300 mb-3"></i>
                    <h5 className="text-gray-700 mb-2">No Financial Insights Yet</h5>
                    <p className="text-gray-500 mb-3">
                      As you add more transactions over time, we'll analyze your financial patterns and provide personalized insights to help you improve your financial health.
                    </p>
                    <Link to="/transactions/add" className="btn btn-sm btn-primary shadow-sm">
                      <i className="fas fa-plus fa-sm mr-1"></i> Add More Transactions
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 dashboard-actions">
        <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
        <Link
          to="/reports"
          className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm"
        >
          <i className="fas fa-download fa-sm text-white-50 mr-2"></i>
          Generate Report
        </Link>
      </div>

      {/* Content Row - Summary Cards */}
      <div className="row summary-cards">
        {/* Income Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Monthly Income
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('income', e)}
                        aria-label="Income information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {userData && formatCurrency(userData.summaryData.income)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center">
                    Monthly Expenses
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('expenses', e)}
                        aria-label="Expenses information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {userData && formatCurrency(userData.summaryData.expenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Balance
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('balance', e)}
                        aria-label="Balance information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {userData && formatCurrency(userData.summaryData.balance)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Savings Rate
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('savings', e)}
                        aria-label="Savings rate information"
                      ></i>
                    </div>
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto">
                      <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                        {userData &&
                          formatPercentage(userData.summaryData.savingsRate)}
                      </div>
                    </div>
                    <div className="col">
                      <div className="progress progress-sm mr-2">
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{
                            width: `${userData ? Math.min(userData.summaryData.savingsRate, 100) : 0}%`,
                          }}
                          aria-valuenow={
                            userData
                              ? Math.min(userData.summaryData.savingsRate, 100)
                              : 0
                          }
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-percentage fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Row - Charts */}
      <div className="row">
        {/* Monthly Spending/Income Chart */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Monthly Overview ({monthRangeText})
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('monthlyChart', e)}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {highchartsLoaded && monthlyData && monthlyData.series && monthlyData.series.some(series => series.data && series.data.length > 0 && series.data.some(value => value > 0)) ? (
                <ErrorBoundary>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={monthlyData}
                    ref={monthlyChartRef}
                    callback={monthlyChartCallback}
                  />
                  <div className="mt-3 text-xs text-gray-500">
                    <i className="fas fa-lightbulb text-warning mr-1"></i>
                    <strong>Tip:</strong> Hover over the bars to see exact amounts. Click on a bar to see transaction details for that month.
                  </div>
                </ErrorBoundary>
              ) : (
                <div className="text-center p-5">
                  <div className="mb-3">
                    <i className="fas fa-chart-bar fa-3x text-gray-300 mb-2"></i>
                  </div>
                  <h5 className="text-gray-700 mb-2">No Monthly Data Available</h5>
                  <p className="text-gray-500 mb-3">Add transactions to see your monthly income and expense trends.</p>
                  <div className="mt-2">
                    <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                      <i className="fas fa-plus fa-sm mr-2"></i>Add Your First Transaction
                    </Link>
                    {userData?.transactions.length === 0 && (
                      <div className="mt-3 small text-gray-500">
                        <i className="fas fa-info-circle mr-1"></i> 
                        You need at least one transaction to generate monthly trends
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Spending by Category
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('categoryChart', e)}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body pie-chart-container">
              {highchartsLoaded && categoryData && categoryData.series && categoryData.series[0] && categoryData.series[0].data && categoryData.series[0].data.length > 0 ? (
                <ErrorBoundary>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={categoryData}
                    ref={categoryChartRef}
                    callback={categoryChartCallback}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    <i className="fas fa-lightbulb text-warning mr-1"></i>
                    <strong>Tip:</strong> Click on a category to see detailed transactions.
                  </div>
                </ErrorBoundary>
              ) : (
                <div className="text-center p-5">
                  <div className="mb-3">
                    <i className="fas fa-chart-pie fa-3x text-gray-300 mb-2"></i>
                  </div>
                  <h5 className="text-gray-700 mb-2">No Spending Data</h5>
                  <p className="text-gray-500 mb-3">Add expense transactions to see your spending distribution by category.</p>
                  <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                    <i className="fas fa-plus fa-sm mr-2"></i>Record an Expense
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Trends */}
      {trends.length > 0 ? (
        <div className="row">
          <div className="col-12 mb-4">
            <div className="card shadow h-100">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Monthly Spending Trends
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('trends', e)}
                    ></i>
                  </div>
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {trends.map((trend, index) => (
                    <div key={`trend-${index}`} className="col-lg-3 col-md-6 mb-4">
                      <div className={`card border-left-${trend.change < 0 ? 'success' : 'danger'} shadow-sm h-100 py-2`}>
                        <div className="card-body">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-uppercase mb-1 text-gray-600">
                                {trend.category}
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800">
                                {trend.change < 0 ? '↓' : '↑'} {formatPercentage(Math.abs(trend.change))}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(trend.currentAmount)} vs {formatCurrency(trend.previousAmount)}
                              </div>
                            </div>
                            <div className="col-auto">
                              <i className={`fas fa-arrow-${trend.change < 0 ? 'down' : 'up'} fa-2x ${trend.change < 0 ? 'text-success' : 'text-danger'}`}></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        userData && userData.transactions.length > 1 && (
          <div className="row">
            <div className="col-12 mb-4">
              <div className="card shadow h-100">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Monthly Spending Trends</h6>
                </div>
                <div className="card-body">
                  <div className="text-center py-4">
                    <i className="fas fa-chart-line fa-3x text-gray-300 mb-3"></i>
                    <h5 className="text-gray-700 mb-2">Not Enough Data for Trends</h5>
                    <p className="text-gray-500 mb-4">
                      We need at least two months of transaction data to calculate spending trends.
                      <br />Continue adding transactions to see how your spending patterns change over time.
                    </p>
                    <div className="mt-4">
                      <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                        <i className="fas fa-plus fa-sm mr-2"></i>Add More Transactions
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Content Row - Budget Progress and Recent Transactions */}
      <div className="row">
        {/* Budget Progress */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4 h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Budget Progress
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('budget', e)}
                  ></i>
                </div>
              </h6>
              <Link to="/budgets" className="btn btn-sm btn-primary">
                Manage Budgets
              </Link>
            </div>
            <div className="card-body">
              {/* Scrollable budget progress */}
              <div style={{ maxHeight: '445px', overflowY: 'auto' }}>
                <BudgetProgress 
                  budgets={budgetProgress}
                  onBudgetItemClick={(budget) => {
                    // Navigate to transactions page with category filter only
                    window.location.href = `/transactions?categoryId=${budget.id}&month=5&year=2025`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4 h-100 recent-transactions">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Recent Transactions
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('transactions', e)}
                  ></i>
                </div>
              </h6>
              <Link to="/transactions?month=5&year=2025" className="btn btn-sm btn-primary">
                View All
              </Link>
            </div>
            <div className="card-body">
              <RecentTransactions 
                transactions={recentTransactions}
                categories={userData?.expenseCategories} 
                accounts={userData?.accounts}
                goals={userData?.goals}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global tooltip that appears based on activeTip state */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px` 
          }}
        >
          {activeTip === 'income' && (
            <>
              <div className="tip-title">Monthly Income</div>
              <p className="tip-description">
                Shows your total income from all sources during the current month including salary, investments, and other revenue streams. Track how your income changes over time to help with financial planning.
              </p>
            </>
          )}
          {activeTip === 'expenses' && (
            <>
              <div className="tip-title">Monthly Expenses</div>
              <p className="tip-description">
                Displays your total spending this month across all categories. Monitoring your expenses helps identify areas where you might be overspending and opportunities to save more money.
              </p>
            </>
          )}
          {activeTip === 'balance' && (
            <>
              <div className="tip-title">Monthly Balance</div>
              <p className="tip-description">
                The difference between your income and expenses for the current month. A positive balance means you're saving money, while a negative balance indicates you're spending more than you earn.
              </p>
            </>
          )}
          {activeTip === 'savings' && (
            <>
              <div className="tip-title">Savings Rate</div>
              <p className="tip-description">
                The percentage of your income that you're saving. Financial experts recommend saving at least 20% of your income to build wealth and prepare for emergencies. Higher rates accelerate your progress toward financial goals.
              </p>
            </>
          )}
          {activeTip === 'monthlyChart' && (
            <>
              <div className="tip-title">Monthly Income vs. Expenses</div>
              <p className="tip-description">
                This chart compares your monthly income (blue bars) and expenses (red bars) over time. The gap between them represents your savings. Larger gaps indicate stronger financial health. Click on any month to see detailed transactions.
              </p>
            </>
          )}
          {activeTip === 'categoryChart' && (
            <>
              <div className="tip-title">Spending by Category</div>
              <p className="tip-description">
                This breakdown shows where your money is going. Larger segments represent categories where you spend more. Click on any segment to analyze detailed transactions for that category and identify potential savings opportunities.
              </p>
            </>
          )}
          {activeTip === 'trends' && (
            <>
              <div className="tip-title">Monthly Spending Trends</div>
              <p className="tip-description">
                See how your spending is changing compared to previous periods. Green arrows indicate decreased spending, while red arrows show increased spending. Use this information to identify and address concerning trends early.
              </p>
            </>
          )}
          {activeTip === 'budget' && (
            <>
              <div className="tip-title">Budget Progress</div>
              <p className="tip-description">
                Track your spending against your budget limits for each category. Green bars indicate you're well under budget, yellow means you're approaching your limit, and red shows where you've exceeded your budget allocations.
              </p>
            </>
          )}
          {activeTip === 'transactions' && (
            <>
              <div className="tip-title">Recent Transactions</div>
              <p className="tip-description">
                Your most recent financial activities. Green entries represent income, while red entries show expenses. Click on any transaction to view details, edit information, or categorize it properly for better tracking.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
