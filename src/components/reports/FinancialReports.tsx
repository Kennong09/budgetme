import React, { useState, useEffect, useRef, FC, FormEvent } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { supabase } from '../../utils/supabaseClient';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/helpers';
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import { getCurrentUserData, getTotalIncome, getTotalExpenses } from '../../data/mockData';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../utils/CurrencyContext';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import for PDF export
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have type definitions
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
// Import for CSV and Excel export
import * as XLSX from 'xlsx';

// Add zoomType to Highcharts chart options
declare module 'highcharts' {
  interface ChartOptions {
    zoomType?: 'x' | 'y' | 'xy';
  }
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
}

interface SavingsDataItem {
  name: string;
  rate: number;
}

// Proper reference for Highcharts component
interface ChartComponentProps {
  highcharts: typeof Highcharts;
  options: Highcharts.Options;
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

type ReportType = "spending" | "income-expense" | "savings" | "trends" | "goals" | "predictions";
type TimeframeType = "month" | "quarter" | "year";
type FormatType = "chart" | "table";
type ChartType = "bar" | "pie" | "line" | "area" | "column";

// Interfaces for Supabase data
interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  type: "income" | "expense";
  category_id?: number;
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
  id: number;
  category_name: string;
  type: "income" | "expense";
  icon?: string;
  created_at: string;
  updated_at?: string;
}

const FinancialReports: FC = () => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("spending");
  const [timeframe, setTimeframe] = useState<TimeframeType>("month");
  const [format, setFormat] = useState<FormatType>("chart");
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Supabase data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Original states
  const [userData, setUserData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [goalRelationship, setGoalRelationship] = useState<BudgetRelationship | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [chartOptions, setChartOptions] = useState<Highcharts.Options>({});
  
  // Modified subscription reference with useRef instead of state
  const subscriptionsRef = useRef<any[]>([]);
  
  // Fixed reference for Highcharts
  const chartRef = useRef<any>(null);

  // CSS for better mobile responsiveness
  const responsiveStyles = `
    @media (max-width: 576px) {
      .card-body {
        padding: 0.75rem;
      }
      
      .btn {
        padding: 0.375rem 0.5rem;
        font-size: 0.8rem;
      }
      
      .table-responsive {
        font-size: 0.8rem;
      }
      
      .h5 {
        font-size: 1rem;
      }
      
      .card-header {
        padding: 0.75rem;
      }
      
      .animate__animated {
        animation-duration: 0.5s;
      }
      
      .text-xs {
        font-size: 0.65rem;
      }
      
      .fa-2x {
        font-size: 1.5em;
      }
      
      .dropdown-menu {
        width: 100%;
        min-width: auto;
      }
    }

    @media (max-width: 768px) {
      .dropdown-menu {
        min-width: 180px;
      }
      
      .h3 {
        font-size: 1.5rem;
      }
      
      .d-sm-flex.align-items-center {
        flex-direction: column;
        align-items: flex-start !important;
      }
    }
  `;

  // Inject the CSS into the document
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = responsiveStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Function to determine default chart type based on report type
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

  // Update chart type when report type changes
  useEffect(() => {
    const defaultChart = getDefaultChartType(reportType);
    setChartType(defaultChart);
  }, [reportType]);

  // Function to toggle tooltips
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

  // Fetch data from Supabase
  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('transactions')
        .select('*');
        
      // Apply timeframe filter
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
        .gte('date', startDate.toISOString())
        .lte('date', now.toISOString())
        .eq('user_id', user.id);
      
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
        .from('budget_details') // Using the view that includes category names
        .select('*');
        
      // Apply timeframe filter
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
      // Fetch both income and expense categories
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
      
      // Combine and format categories
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

  // Fetch user data and initialize reports
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Fetch all required data
        await Promise.all([
          fetchTransactions(),
          fetchBudgets(),
          fetchGoals(),
          fetchCategories()
        ]);
        
        // Process data for reports after fetching
        processReportData();
        
      } catch (err) {
        console.error('Error fetching report data:', err);
        showErrorToast('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();
    
    // Cleanup subscriptions on unmount or dependency change
    return () => {
      if (subscriptionsRef.current.length > 0) {
        subscriptionsRef.current.forEach((subscription: any) => {
        supabase.removeChannel(subscription);
      });
        subscriptionsRef.current = [];
      }
    };
  }, [user, timeframe, reportType]);
  
  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = () => {
    if (!user) return;
    
    // Clear any existing subscriptions
    if (subscriptionsRef.current.length > 0) {
      subscriptionsRef.current.forEach((subscription: any) => {
      supabase.removeChannel(subscription);
    });
      subscriptionsRef.current = [];
    }
    
    // Create unique channel names with timestamp to avoid conflicts
    const timestamp = Date.now();
    
    // Transaction subscription
    const transactionSubscription = supabase
      .channel(`transaction-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchTransactions();
        processReportData();
      })
      .subscribe();
    
    // Budget subscription
    const budgetSubscription = supabase
      .channel(`budget-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchBudgets();
        processReportData();
      })
      .subscribe();
    
    // Goal subscription
    const goalSubscription = supabase
      .channel(`goal-changes-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchGoals();
        processReportData();
      })
      .subscribe();
    
    // Store subscriptions in ref
    subscriptionsRef.current = [
      transactionSubscription,
      budgetSubscription,
      goalSubscription
    ];
  };
  
  // Process data for reports based on fetched data
  const processReportData = () => {
    if (transactions.length === 0) return;
    
    // Process data based on report type
    switch (reportType) {
      case 'spending':
        processCategorySpendingData();
        break;
      case 'income-expense':
        processIncomeExpenseData();
        break;
      case 'savings':
        processSavingsData();
        break;
      case 'trends':
        processTrendsData();
        break;
      case 'goals':
        processGoalsData();
        break;
      case 'predictions':
        processPredictionsData();
        break;
    }
  };
  
  // Process category spending data
  const processCategorySpendingData = () => {
    // Filter expense transactions
    const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
    
    // Group by category
    const categorySpending: { [key: string]: number } = {};
    
    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        const categoryName = getCategoryName(tx.category_id);
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = 0;
        }
        categorySpending[categoryName] += tx.amount;
      }
    });
    
    // Format for chart
    const formattedData: SpendingDataItem[] = Object.keys(categorySpending).map((category, index) => {
      const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'];
      return {
        name: category,
        value: categorySpending[category],
        color: colors[index % colors.length]
      };
    });
    
    setCategoryData(formattedData);
    updateChartOptions();
  };
  
  // Process income vs expense data
  const processIncomeExpenseData = () => {
    // Group by month
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
    
    // Get date range based on timeframe
    const now = new Date();
    let startDate: Date;
    let months: number;
    
    switch(timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setMonth(startDate.getMonth() - 5); // Last 6 months
        months = 6;
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), 0, 1);
        months = 12;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 2, 0, 1);
        months = 36; // 3 years
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        months = 6;
    }
    
    // Initialize all months in the range
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    
    // Aggregate transactions by month
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        if (tx.type === 'income') {
          monthlyData[monthKey].income += tx.amount;
        } else {
          monthlyData[monthKey].expenses += tx.amount;
        }
      }
    });
    
    // Format for chart
    const formattedData: IncomeExpenseDataItem[] = Object.keys(monthlyData)
      .sort()
      .map(month => {
        // Format month for display
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const displayMonth = monthNames[parseInt(monthNum) - 1];
        
        return {
          name: `${displayMonth} ${year}`,
          income: monthlyData[month].income,
          expenses: monthlyData[month].expenses
        };
      });
    
    setMonthlyData(formattedData);
    updateChartOptions();
  };
  
  // Process savings rate data
  const processSavingsData = () => {
    // Group by month
    const monthlySavings: { [key: string]: { income: number; expenses: number; rate: number } } = {};
    
    // Get date range based on timeframe
    const now = new Date();
    let startDate: Date;
    let months: number;
    
    switch(timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setMonth(startDate.getMonth() - 5); // Last 6 months
        months = 6;
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), 0, 1);
        months = 12;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 2, 0, 1);
        months = 36; // 3 years
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        months = 6;
    }
    
    // Initialize all months in the range
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlySavings[monthKey] = { income: 0, expenses: 0, rate: 0 };
    }
    
    // Aggregate transactions by month
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlySavings[monthKey]) {
        if (tx.type === 'income') {
          monthlySavings[monthKey].income += tx.amount;
        } else {
          monthlySavings[monthKey].expenses += tx.amount;
        }
      }
    });
    
    // Calculate savings rate for each month
    Object.keys(monthlySavings).forEach(month => {
      const { income, expenses } = monthlySavings[month];
      monthlySavings[month].rate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    });
    
    // Format for chart
    const formattedData: SavingsDataItem[] = Object.keys(monthlySavings)
      .sort()
      .map(month => {
        // Format month for display
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const displayMonth = monthNames[parseInt(monthNum) - 1];
        
        return {
          name: `${displayMonth} ${year}`,
          rate: monthlySavings[month].rate
        };
      });
    
    // Set data for the savings rate chart
    setMonthlyData(formattedData);
    updateChartOptions();
  };
  
  // Process trends data
  const processTrendsData = () => {
    // Group transactions by category
    const categoryTotals: { [key: string]: { current: number; previous: number } } = {};
    
    // Determine time periods based on timeframe
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = new Date();
    let previousStart: Date;
    let previousEnd: Date;
    
    switch(timeframe) {
      case 'month':
        // Current month vs previous month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarter':
        // Current quarter vs previous quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
      case 'year':
        // Current year vs previous year
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear(), 0, 0);
        break;
      default:
        // Default to month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    
    // Filter transactions by period
    const currentTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= currentStart && txDate <= currentEnd;
    });
    
    const previousTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= previousStart && txDate <= previousEnd;
    });
    
    // Initialize categories
    const allCategories = new Set<number>();
    [...currentTransactions, ...previousTransactions].forEach(tx => {
      if (tx.category_id) {
        allCategories.add(tx.category_id);
      }
    });
    
    // Initialize category totals
    allCategories.forEach(categoryId => {
      const categoryName = getCategoryName(categoryId);
      categoryTotals[categoryName] = { current: 0, previous: 0 };
    });
    
    // Sum current period
    currentTransactions.forEach(tx => {
      if (tx.category_id) {
        const categoryName = getCategoryName(tx.category_id);
        categoryTotals[categoryName].current += tx.amount;
      }
    });
    
    // Sum previous period
    previousTransactions.forEach(tx => {
      if (tx.category_id) {
        const categoryName = getCategoryName(tx.category_id);
        categoryTotals[categoryName].previous += tx.amount;
      }
    });
    
    // Calculate trends
    const trends: TrendData[] = Object.keys(categoryTotals).map(category => {
      const { current, previous } = categoryTotals[category];
      const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
      
      return {
        category,
        change,
        previousAmount: previous,
        currentAmount: current
      };
    });
    
    // Sort by absolute change
    trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    setTrendsData(trends);
    updateChartOptions();
  };
  
  // Process goals data
  const processGoalsData = () => {
    if (goals.length === 0) return;
    
    // Calculate relationship between budgets and goals
    const goalTransactions = transactions.filter(tx => tx.goal_id);
    const totalBudgetAllocated = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpentOnGoals = goalTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    const relationship: BudgetRelationship = {
      totalBudgetAllocated,
      totalSpentOnGoals,
      percentageBudgetToGoals: totalBudgetAllocated > 0 ? (totalSpentOnGoals / totalBudgetAllocated) * 100 : 0,
      goalTransactionsCount: goalTransactions.length
    };
    
    setGoalRelationship(relationship);
    
    // Format goal data for display
    const formattedGoals = goals.map(goal => ({
      id: goal.id,
      name: goal.goal_name,
      target: goal.target_amount,
      current: goal.current_amount,
      percentage: (goal.current_amount / goal.target_amount) * 100,
      remaining: goal.target_amount - goal.current_amount,
      status: goal.status
    }));
    
    setBudgetData(formattedGoals);
    updateChartOptions();
  };
  
  // Process predictions data
  const processPredictionsData = () => {
    // This would typically involve more complex calculations
    // For now, we'll create simple projections based on past data
    
    // Group transactions by month
    const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};
    
    // Get transactions from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const yearTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= oneYearAgo;
    });
    
    // Group by month
    yearTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.type === 'income') {
        monthlyTotals[monthKey].income += tx.amount;
      } else {
        monthlyTotals[monthKey].expenses += tx.amount;
      }
    });
    
    // Calculate averages
    const months = Object.keys(monthlyTotals).length;
    const totalIncome = Object.values(monthlyTotals).reduce((sum, data) => sum + data.income, 0);
    const totalExpenses = Object.values(monthlyTotals).reduce((sum, data) => sum + data.expenses, 0);
    
    const avgMonthlyIncome = months > 0 ? totalIncome / months : 0;
    const avgMonthlyExpenses = months > 0 ? totalExpenses / months : 0;
    
    // Project for next 6 months
    const projections: IncomeExpenseDataItem[] = [];
    const now = new Date();
    
    for (let i = 1; i <= 6; i++) {
      const projectionDate = new Date(now);
      projectionDate.setMonth(now.getMonth() + i);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayMonth = monthNames[projectionDate.getMonth()];
      
      projections.push({
        name: `${displayMonth} ${projectionDate.getFullYear()}`,
        income: avgMonthlyIncome,
        expenses: avgMonthlyExpenses
      });
    }
    
    setMonthlyData(projections);
    updateChartOptions();
  };
  
  // Helper function to get category name
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.category_name : `Category ${categoryId}`;
  };
  
  // Update chart options based on current data and report type
  const updateChartOptions = () => {
    if (loading) return;

    // Define options as any to bypass TypeScript strict checking
    const options: any = {
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadPDF', 'downloadCSV']
          }
        }
      },
      chart: {
        height: 400,
        style: {
          fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        // Make chart responsive
        reflow: true,
        spacingBottom: 15,
        spacingTop: 10,
        spacingLeft: 10,
        spacingRight: 10
      },
      title: {
        text: ''
      },
      colors: [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', 
        '#6f42c1', '#5a5c69', '#858796', '#2e59d9', '#17a673'
      ],
      responsive: {
        rules: [{
          condition: {
            maxWidth: 500
          },
          chartOptions: {
            legend: {
              enabled: false
            },
            tooltip: {
              enabled: true
            }
          }
        }]
      }
    };

    // Configure chart based on report type
    switch (reportType) {
      case 'spending':
        if (categoryData && categoryData.length > 0) {
          if (chartType === 'pie') {
            options.chart.type = 'pie';
            options.tooltip = {
              pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b><br>Amount: <b>${point.y:,.2f}</b>'
            };
            options.plotOptions = {
              pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                  enabled: true,
                  format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                  style: {
                    textOutline: 'none'
                  }
                },
                showInLegend: true
              }
            };
            // Add responsive rules for small screens
            if (!options.responsive) {
              options.responsive = {
                rules: []
              };
            }
            options.responsive.rules.push({
              condition: {
                maxWidth: 500
              },
              chartOptions: {
                plotOptions: {
                  pie: {
                    dataLabels: {
                      enabled: false
                    },
                    showInLegend: true
                  }
                }
              }
            });
            options.series = [{
              name: 'Spending',
              colorByPoint: true,
              data: categoryData.map((item: SpendingDataItem) => ({
                name: item.name,
                y: item.value,
                color: item.color
              }))
            }];
          } else if (chartType === 'bar' || chartType === 'column') {
            options.chart.type = chartType;
            options.xAxis = {
              categories: categoryData.map((item: SpendingDataItem) => item.name),
              title: {
                text: null
              }
            };
            
            // Add responsive rules for x-axis labels
            if (!options.responsive) {
              options.responsive = {
                rules: []
              };
            }
            options.responsive.rules.push({
              condition: {
                maxWidth: 500
              },
              chartOptions: {
                xAxis: {
                  labels: {
                    rotation: -45,
                    style: {
                      fontSize: '10px'
                    }
                  }
                }
              }
            });
            options.yAxis = {
              title: {
                text: 'Amount ($)'
              }
            };
            options.tooltip = {
              formatter: function(this: any): string {
                return `<b>${this.x}</b><br>${this.series.name}: $${this.y.toFixed(2)}`;
              }
            };
            options.series = [{
              name: 'Spending',
              data: categoryData.map((item: SpendingDataItem) => ({
                y: item.value,
                color: item.color
              }))
            }];
          }
        }
        break;
        
      case 'income-expense':
        if (monthlyData && monthlyData.length > 0) {
          options.chart.type = chartType === 'pie' ? 'column' : chartType;
          options.xAxis = {
            categories: monthlyData.map((item: IncomeExpenseDataItem) => item.name)
          };
          options.yAxis = {
            title: {
              text: 'Amount ($)'
            }
          };
          options.tooltip = {
            shared: true,
            formatter: function(this: any): string {
              let tooltip = `<b>${this.x}</b><br>`;
              if (this.points) {
                this.points.forEach((point: any) => {
                  tooltip += `${point.series.name}: $${point.y.toFixed(2)}<br>`;
                });
              }
              return tooltip;
            }
          };
          options.plotOptions = {
            column: {
              grouping: true,
              shadow: false,
              borderWidth: 0
            }
          };
          options.series = [
            {
              name: 'Income',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.income),
              color: '#1cc88a'
            },
            {
              name: 'Expenses',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.expenses),
              color: '#e74a3b'
            }
          ];
        }
        break;
        
      case 'savings':
        if (monthlyData && monthlyData.length > 0) {
          options.chart.type = chartType === 'pie' ? 'line' : chartType;
          options.xAxis = {
            categories: monthlyData.map((item: SavingsDataItem) => item.name)
          };
          options.yAxis = {
            title: {
              text: 'Savings Rate (%)'
            },
            min: 0,
            max: 100
          };
          options.tooltip = {
            formatter: function(this: any): string {
              let tooltip = `<b>${this.x}</b><br>Savings Rate: ${this.y.toFixed(1)}%`;
              return tooltip;
            }
          };
          options.plotOptions = {
            line: {
              dataLabels: {
                enabled: true,
                format: '{y:.1f}%'
              }
            }
          };
          options.series = [{
            name: 'Savings Rate',
            data: monthlyData.map((item: SavingsDataItem) => item.rate),
            color: '#4e73df'
          }];
        }
        break;
        
      case 'trends':
        if (trendsData && trendsData.length > 0) {
          options.chart.type = chartType === 'pie' ? 'bar' : chartType;
          options.xAxis = {
            categories: trendsData.map(item => item.category),
              title: {
              text: null
            }
          };
          options.yAxis = {
              title: {
              text: 'Change (%)'
            }
          };
          options.tooltip = {
            formatter: function(this: any): string {
              const trend = trendsData.find(item => item.category === this.x);
              if (trend) {
                return `<b>${this.x}</b><br>` +
                  `Previous: $${trend.previousAmount.toFixed(2)}<br>` +
                  `Current: $${trend.currentAmount.toFixed(2)}<br>` +
                  `Change: ${this.y.toFixed(1)}%`;
              }
              return `<b>${this.x}</b><br>Change: ${this.y.toFixed(1)}%`;
            }
          };
          options.plotOptions = {
            bar: {
              dataLabels: {
                enabled: true,
                format: '{y:.1f}%'
              }
            }
          };
          options.series = [{
            name: 'Change',
            data: trendsData.map(item => ({
              y: item.change,
              color: item.change >= 0 ? '#1cc88a' : '#e74a3b'
            }))
          }];
        }
        break;
        
      case 'goals':
        if (budgetData && budgetData.length > 0) {
          options.chart.type = chartType === 'pie' ? 'column' : chartType;
          options.xAxis = {
            categories: budgetData.map((item: any) => item.name)
          };
          options.yAxis = {
            title: {
              text: 'Amount ($)'
            }
          };
          options.tooltip = {
            formatter: function(this: any): string {
              const goal = budgetData.find((item: any) => item.name === this.x);
              if (goal) {
                return `<b>${this.x}</b><br>` +
                  `Target: $${goal.target.toFixed(2)}<br>` +
                  `Current: $${goal.current.toFixed(2)}<br>` +
                  `Progress: ${(goal.current / goal.target * 100).toFixed(1)}%`;
              }
              return `<b>${this.x}</b><br>Amount: $${this.y.toFixed(2)}`;
            }
          };
          options.plotOptions = {
            column: {
              dataLabels: {
                enabled: true,
                format: '${y:,.0f}'
              }
            }
          };
          options.series = [
            {
              name: 'Target',
              data: budgetData.map((item: any) => item.target),
              color: '#4e73df'
            },
            {
              name: 'Current',
              data: budgetData.map((item: any) => item.current),
              color: '#1cc88a'
            }
          ];
        }
        break;
        
      case 'predictions':
        if (monthlyData && monthlyData.length > 0) {
          options.chart.type = chartType === 'pie' ? 'line' : chartType;
          options.xAxis = {
            categories: monthlyData.map((item: IncomeExpenseDataItem) => item.name)
          };
          options.yAxis = {
            title: {
              text: 'Amount ($)'
            }
          };
          options.tooltip = {
            shared: true,
            formatter: function(this: any): string {
              let tooltip = `<b>${this.x}</b><br>`;
              if (this.points) {
                this.points.forEach((point: any) => {
                  tooltip += `${point.series.name}: $${point.y.toFixed(2)}<br>`;
                });
              }
              return tooltip;
            }
          };
          options.plotOptions = {
            line: {
              marker: {
                symbol: 'circle'
              }
            }
          };
          options.series = [
            {
              name: 'Projected Income',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.income),
              color: '#1cc88a',
              dashStyle: 'shortdot'
            },
            {
              name: 'Projected Expenses',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.expenses),
              color: '#e74a3b',
              dashStyle: 'shortdot'
            }
          ];
        }
        break;
    }

    setChartOptions(options);
  };

  // Update chart options when data or chart type changes
  useEffect(() => {
    if (!loading) {
      updateChartOptions();
    }
  }, [reportType, chartType, categoryData, monthlyData, trendsData, budgetData, loading]);

  // Calculate summary data from actual data
  const getCurrentMonthData = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const totalIncome = getTotalIncome(1, firstDay.toISOString(), lastDay.toISOString());
    const totalExpenses = getTotalExpenses(1, firstDay.toISOString(), lastDay.toISOString());
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    
    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalIncome - totalExpenses,
      savingsRate
    };
  };
  
  const monthlyFinancials = getCurrentMonthData();

  // State for email modal
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [emailSending, setEmailSending] = useState<boolean>(false);

  // Handle report download
  const handleDownloadReport = (format: string): void => {
    switch (format) {
      case 'pdf':
        handleExportPDF();
        break;
      case 'csv':
        handleExportCSV();
        break;
      case 'excel':
        handleExportExcel();
        break;
      default:
        showErrorToast('Invalid export format selected');
    }
  };

  // Export to PDF
  const handleExportPDF = async (): Promise<void> => {
    try {
      showSuccessToast('Preparing PDF export...');
      
      const reportTitle = `${
        reportType === "spending" 
          ? "Spending by Category" 
          : reportType === "income-expense" 
            ? "Income vs Expenses" 
            : reportType === "trends"
              ? "Financial Trends"
              : reportType === "goals"
                ? "Goal Allocations"
                : reportType === "savings"
                  ? "Savings Rate"
                  : "Financial Projections"
      } - ${timeframe === "month" ? "Monthly" : timeframe === "quarter" ? "Quarterly" : "Yearly"}`;
      
      // Create the PDF document
      const doc = new jsPDF('landscape');
      
      // Add title
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 22);
      
      // Add date
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);
      
      if (format === "chart" && chartRef.current && chartRef.current.chart) {
        // Attempt to get the chart container
        const chartContainer = document.querySelector('.highcharts-container');
        
        if (chartContainer) {
          const canvas = await html2canvas(chartContainer as HTMLElement);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, 40, 270, 150);
        }
      } else if (format === "table") {
        // Get data for the table
        let tableData: any[] = [];
        let headers: string[] = [];
        
        switch (reportType) {
          case "spending":
            if (categoryData) {
              headers = ["Category", "Amount", "Percentage"];
              if (Array.isArray(categoryData)) {
                const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
                tableData = categoryData.map(item => [
                  item.name,
                  formatCurrency(item.value),
                  formatPercentage((item.value / total) * 100)
                ]);
              } else if (categoryData.labels && categoryData.datasets) {
                const total = categoryData.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
                tableData = categoryData.labels.map((label: string, index: number) => [
                  label,
                  formatCurrency(categoryData.datasets[0].data[index]),
                  formatPercentage((categoryData.datasets[0].data[index] / total) * 100)
                ]);
              }
            }
            break;
            
          case "income-expense":
            if (monthlyData) {
              headers = ["Month", "Income", "Expenses", "Savings", "Savings Rate"];
              if (Array.isArray(monthlyData)) {
                tableData = monthlyData.map(item => {
                  const savings = item.income - item.expenses;
                  const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
                  return [
                    item.name,
                    formatCurrency(item.income),
                    formatCurrency(item.expenses),
                    formatCurrency(savings),
                    formatPercentage(savingsRate)
                  ];
                });
              } else if (monthlyData.labels && monthlyData.datasets) {
                tableData = monthlyData.labels.map((label: string, index: number) => {
                  const income = monthlyData.datasets[0].data[index];
                  const expenses = monthlyData.datasets[1].data[index];
                  const savings = income - expenses;
                  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
                  return [
                    label,
                    formatCurrency(income),
                    formatCurrency(expenses),
                    formatCurrency(savings),
                    formatPercentage(savingsRate)
                  ];
                });
              }
            }
            break;
            
          case "trends":
            if (trendsData) {
              headers = ["Category", "Previous Amount", "Current Amount", "Change", "Change %"];
              tableData = trendsData.map(trend => [
                trend.category,
                formatCurrency(trend.previousAmount),
                formatCurrency(trend.currentAmount),
                formatCurrency(trend.currentAmount - trend.previousAmount),
                `${trend.change >= 0 ? "+" : ""}${trend.change.toFixed(2)}%`
              ]);
            }
            break;
            
          case "goals":
            if (goalRelationship) {
              headers = ["Metric", "Value"];
              tableData = [
                ["Total Budget Allocated", formatCurrency(goalRelationship.totalBudgetAllocated)],
                ["Total Spent on Goals", formatCurrency(goalRelationship.totalSpentOnGoals)],
                ["Percentage Budget to Goals", formatPercentage(goalRelationship.percentageBudgetToGoals)],
                ["Goal Transactions Count", goalRelationship.goalTransactionsCount.toString()]
              ];
            }
            break;
        }
        
        // Add table to PDF
        if (tableData.length > 0) {
          (doc as any).autoTable({
            head: [headers],
            body: tableData,
            startY: 40,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 10,
              cellPadding: 5
            },
            headStyles: {
              fillColor: [78, 115, 223],
              textColor: 255,
              fontStyle: 'bold'
            }
          });
        }
      }
      
      // Add summary data
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Monthly Summary:', 14, 200);
      
      doc.setFontSize(11);
      doc.text(`Income: ${formatCurrency(monthlyFinancials.income)}`, 14, 210);
      doc.text(`Expenses: ${formatCurrency(monthlyFinancials.expenses)}`, 14, 220);
      doc.text(`Savings: ${formatCurrency(monthlyFinancials.savings)}`, 14, 230);
      doc.text(`Savings Rate: ${formatPercentage(monthlyFinancials.savingsRate)}`, 14, 240);
      
      // Footer with app name
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Generated by BudgetMe App', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      
      // Save the PDF
      doc.save(`financial-report-${reportType}-${timeframe}.pdf`);
      
      // Show success message
      showSuccessToast('PDF report downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showErrorToast('Failed to generate PDF report. Please try again.');
    }
  };
  
  // Export to CSV
  const handleExportCSV = (): void => {
    try {
      let data: any[] = [];
      let fileName = `financial-report-${reportType}-${timeframe}.csv`;
      
      // Prepare data based on report type
      switch (reportType) {
        case "spending":
          if (categoryData) {
            if (Array.isArray(categoryData)) {
              const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
              data = categoryData.map(item => ({
                Category: item.name,
                Amount: item.value,
                Percentage: (item.value / total) * 100
              }));
            } else if (categoryData.labels && categoryData.datasets) {
              const total = categoryData.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
              data = categoryData.labels.map((label: string, index: number) => ({
                Category: label,
                Amount: categoryData.datasets[0].data[index],
                Percentage: (categoryData.datasets[0].data[index] / total) * 100
              }));
            }
          }
          break;
          
        case "income-expense":
          if (monthlyData) {
            if (Array.isArray(monthlyData)) {
              data = monthlyData.map(item => ({
                Month: item.name,
                Income: item.income,
                Expenses: item.expenses,
                Savings: item.income - item.expenses,
                SavingsRate: item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
              }));
            } else if (monthlyData.labels && monthlyData.datasets) {
              data = monthlyData.labels.map((label: string, index: number) => {
                const income = monthlyData.datasets[0].data[index];
                const expenses = monthlyData.datasets[1].data[index];
                const savings = income - expenses;
                const savingsRate = income > 0 ? (savings / income) * 100 : 0;
                return {
                  Month: label,
                  Income: income,
                  Expenses: expenses,
                  Savings: savings,
                  SavingsRate: savingsRate
                };
              });
            }
          }
          break;
          
        case "trends":
          if (trendsData) {
            data = trendsData.map(trend => ({
              Category: trend.category,
              PreviousAmount: trend.previousAmount,
              CurrentAmount: trend.currentAmount,
              Change: trend.currentAmount - trend.previousAmount,
              ChangePercent: trend.change
            }));
          }
          break;
          
        case "goals":
          if (goalRelationship) {
            data = [
              { Metric: "TotalBudgetAllocated", Value: goalRelationship.totalBudgetAllocated },
              { Metric: "TotalSpentOnGoals", Value: goalRelationship.totalSpentOnGoals },
              { Metric: "PercentageBudgetToGoals", Value: goalRelationship.percentageBudgetToGoals },
              { Metric: "GoalTransactionsCount", Value: goalRelationship.goalTransactionsCount }
            ];
          }
          break;
      }
      
      if (data.length === 0) {
        showErrorToast('No data available to export');
        return;
      }
      
      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      
      // Generate CSV
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      
      // Create download link
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccessToast('CSV report downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      showErrorToast('Failed to generate CSV report. Please try again.');
    }
  };
  
  // Export to Excel
  const handleExportExcel = (): void => {
    try {
      let data: any[] = [];
      let fileName = `financial-report-${reportType}-${timeframe}.xlsx`;
      
      // Prepare data based on report type
      switch (reportType) {
        case "spending":
          if (categoryData) {
            if (Array.isArray(categoryData)) {
              const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
              data = categoryData.map(item => ({
                Category: item.name,
                Amount: item.value,
                Percentage: (item.value / total) * 100
              }));
            } else if (categoryData.labels && categoryData.datasets) {
              const total = categoryData.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
              data = categoryData.labels.map((label: string, index: number) => ({
                Category: label,
                Amount: categoryData.datasets[0].data[index],
                Percentage: (categoryData.datasets[0].data[index] / total) * 100
              }));
            }
          }
          break;
          
        case "income-expense":
          if (monthlyData) {
            if (Array.isArray(monthlyData)) {
              data = monthlyData.map(item => ({
                Month: item.name,
                Income: item.income,
                Expenses: item.expenses,
                Savings: item.income - item.expenses,
                "Savings Rate (%)": item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
              }));
            } else if (monthlyData.labels && monthlyData.datasets) {
              data = monthlyData.labels.map((label: string, index: number) => {
                const income = monthlyData.datasets[0].data[index];
                const expenses = monthlyData.datasets[1].data[index];
                const savings = income - expenses;
                const savingsRate = income > 0 ? (savings / income) * 100 : 0;
                return {
                  Month: label,
                  Income: income,
                  Expenses: expenses,
                  Savings: savings,
                  "Savings Rate (%)": savingsRate
                };
              });
            }
          }
          break;
          
        case "trends":
          if (trendsData) {
            data = trendsData.map(trend => ({
              Category: trend.category,
              "Previous Amount": trend.previousAmount,
              "Current Amount": trend.currentAmount,
              "Change": trend.currentAmount - trend.previousAmount,
              "Change (%)": trend.change
            }));
          }
          break;
          
        case "goals":
          if (goalRelationship) {
            data = [
              { Metric: "Total Budget Allocated", Value: goalRelationship.totalBudgetAllocated },
              { Metric: "Total Spent on Goals", Value: goalRelationship.totalSpentOnGoals },
              { Metric: "Percentage Budget to Goals (%)", Value: goalRelationship.percentageBudgetToGoals },
              { Metric: "Goal Transactions Count", Value: goalRelationship.goalTransactionsCount }
            ];
          }
          break;
      }
      
      if (data.length === 0) {
        showErrorToast('No data available to export');
        return;
      }
      
      // Add report metadata
      const reportTitle = `${
        reportType === "spending" 
          ? "Spending by Category" 
          : reportType === "income-expense" 
            ? "Income vs Expenses" 
            : reportType === "trends"
              ? "Financial Trends"
              : "Goal Allocations"
      } - ${timeframe === "month" ? "Monthly" : timeframe === "quarter" ? "Quarterly" : "Yearly"}`;
      
      const metadata = [
        { Report: reportTitle },
        { Generated: new Date().toLocaleString() },
        { },
        { "Monthly Summary": "" },
        { "Income": monthlyFinancials.income },
        { "Expenses": monthlyFinancials.expenses },
        { "Savings": monthlyFinancials.savings },
        { "Savings Rate (%)": monthlyFinancials.savingsRate },
        { },
        { }
      ];
      
      // Convert metadata and data to worksheet
      const metadataWS = XLSX.utils.json_to_sheet(metadata);
      const dataWS = XLSX.utils.json_to_sheet(data);
      
      // Create workbook with two sheets
      const workbook = { 
        Sheets: { 
          'Report Info': metadataWS,
          'Data': dataWS 
        }, 
        SheetNames: ['Report Info', 'Data'] 
      };
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Create download link
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccessToast('Excel report downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      showErrorToast('Failed to generate Excel report. Please try again.');
    }
  };
  
  // Email report functionality
  const handleEmailReport = (): void => {
    setEmailSubject(`Financial Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`);
    setEmailMessage(`Please find attached the ${reportType} report for the ${timeframe} timeframe.`);
    setShowEmailModal(true);
  };
  
  const closeEmailModal = (): void => {
    setShowEmailModal(false);
  };
  
  const handleEmailSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!emailRecipient) {
      showErrorToast('Please enter a recipient email address');
      return;
    }
    
    setEmailSending(true);
    
    try {
      // In a real app, we would send this to a backend API
      // Here, we'll simulate the email sending process
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // If we had a serverless function or backend API:
      /*
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          recipient: emailRecipient,
          subject: emailSubject,
          message: emailMessage,
          reportType,
          timeframe,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      */
      
      setEmailSending(false);
      closeEmailModal();
      showSuccessToast(`Report sent successfully to ${emailRecipient}`);
      
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailSending(false);
      showErrorToast('Failed to send email. Please try again later.');
    }
  };

  // If no user is logged in, show a message
  if (!user) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="error mx-auto" data-text="401">401</div>
          <p className="lead text-gray-800 mb-5">Authentication Required</p>
          <p className="text-gray-500 mb-0">Please log in to view your financial reports.</p>
          <Link to="/login" className="btn btn-primary mt-3">
            <i className="fas fa-sign-in-alt mr-2"></i>Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
  return (
    <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
            </div>
          <p className="mt-3 text-gray-600">Loading your financial data...</p>
          </div>
        </div>
    );
  }

  // Data summary section
  const renderDataSummary = () => {
    return (
      <div className="row mb-4">
        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Transactions
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {transactions.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exchange-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Budgets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {budgets.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Active Goals
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {goals.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-bullseye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Data Last Updated
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clock fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add these handler functions before the return statement
  const handleReportTypeButtonClick = (type: string) => {
    setReportType(type as ReportType);
  };

  const handleTimeframeButtonClick = (time: string) => {
    setTimeframe(time as TimeframeType);
  };

  const handleFormatButtonClick = (fmt: string) => {
    setFormat(fmt as "chart" | "table");
  };

  const handleChartTypeButtonClick = (type: string) => {
    setChartType(type as ChartType);
  };

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Financial Reports</h1>
        <div className="d-flex flex-column flex-sm-row mt-3 mt-sm-0">
          <div className="dropdown mb-2 mb-sm-0 mr-0 mr-sm-2">
            <button 
              className="btn btn-primary dropdown-toggle shadow-sm animate__animated animate__fadeIn w-100"
              type="button"
              id="exportDropdown"
              data-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="fas fa-download fa-sm text-white-50 mr-2"></i>Export
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
              <button className="dropdown-item" onClick={() => handleDownloadReport('pdf')}>
                <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-gray-400"></i>PDF
              </button>
              <button className="dropdown-item" onClick={() => handleDownloadReport('csv')}>
                <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-gray-400"></i>CSV
              </button>
              <button className="dropdown-item" onClick={() => handleDownloadReport('excel')}>
                <i className="fas fa-file-excel fa-sm fa-fw mr-2 text-gray-400"></i>Excel
              </button>
            </div>
          </div>
          <button
            onClick={handleEmailReport}
            className="btn btn-secondary shadow-sm animate__animated animate__fadeIn w-100 w-sm-auto"
          >
            <i className="fas fa-envelope fa-sm text-white-50 mr-2"></i>Email
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {renderDataSummary()}

      {/* Report Controls */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Report Settings
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e: React.MouseEvent) => toggleTip('reportSettings', e)}
                aria-label="Report settings information"
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            {/* Report Type - Full width on xs, half width on md and up */}
            <div className="col-12 col-md-6 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Report Type</label>
              <div className="d-flex flex-wrap">
                <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" role="group">
                  <button 
                    className={`btn ${reportType === "spending" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("spending")}
                  >
                    <i className="fas fa-chart-pie fa-sm mr-1"></i> Spending
                  </button>
                  <button 
                    className={`btn ${reportType === "income-expense" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("income-expense")}
                  >
                    <i className="fas fa-exchange-alt fa-sm mr-1"></i> Income/Expense
                  </button>
                  <button 
                    className={`btn ${reportType === "savings" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("savings")}
                  >
                    <i className="fas fa-piggy-bank fa-sm mr-1"></i> Savings
                  </button>
                  <button 
                    className={`btn ${reportType === "trends" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("trends")}
                  >
                    <i className="fas fa-chart-line fa-sm mr-1"></i> Trends
                  </button>
                  <button 
                    className={`btn ${reportType === "goals" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("goals")}
                  >
                    <i className="fas fa-bullseye fa-sm mr-1"></i> Goals
                  </button>
                  <button 
                    className={`btn ${reportType === "predictions" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                    onClick={() => handleReportTypeButtonClick("predictions")}
                  >
                    <i className="fas fa-magic fa-sm mr-1"></i> Predictions
                  </button>
                </div>
                <div className="btn-group btn-group-toggle d-none d-sm-flex flex-wrap w-100" data-toggle="buttons">
                  <button 
                    className={`btn ${reportType === "spending" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                    onClick={() => handleReportTypeButtonClick("spending")}
                  >
                    <i className="fas fa-chart-pie fa-sm mr-1"></i> Spending
                  </button>
                  <button 
                    className={`btn ${reportType === "income-expense" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                    onClick={() => handleReportTypeButtonClick("income-expense")}
                  >
                    <i className="fas fa-exchange-alt fa-sm mr-1"></i> Income/Expense
                  </button>
                  <button 
                    className={`btn ${reportType === "savings" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                    onClick={() => handleReportTypeButtonClick("savings")}
                  >
                    <i className="fas fa-piggy-bank fa-sm mr-1"></i> Savings
                  </button>
                  <button 
                    className={`btn ${reportType === "trends" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                    onClick={() => handleReportTypeButtonClick("trends")}
                  >
                    <i className="fas fa-chart-line fa-sm mr-1"></i> Trends
                  </button>
                  <button 
                    className={`btn ${reportType === "goals" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                    onClick={() => handleReportTypeButtonClick("goals")}
                  >
                    <i className="fas fa-bullseye fa-sm mr-1"></i> Goals
                  </button>
                  <button 
                    className={`btn ${reportType === "predictions" ? "btn-primary" : "btn-outline-primary"} mb-2`}
                    onClick={() => handleReportTypeButtonClick("predictions")}
                  >
                    <i className="fas fa-magic fa-sm mr-1"></i> Predictions
                  </button>
                </div>
              </div>
            </div>
            {/* Timeframe - Half width on xs, quarter width on md and up */}
            <div className="col-6 col-md-3 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Timeframe</label>
              <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" data-toggle="buttons">
                <button 
                  className={`btn ${timeframe === "month" ? "btn-secondary" : "btn-outline-secondary"} mb-2 w-100`}
                  onClick={() => handleTimeframeButtonClick("month")}
                >
                  Month
                </button>
                <button 
                  className={`btn ${timeframe === "quarter" ? "btn-secondary" : "btn-outline-secondary"} mb-2 w-100`}
                  onClick={() => handleTimeframeButtonClick("quarter")}
                >
                  Quarter
                </button>
                <button 
                  className={`btn ${timeframe === "year" ? "btn-secondary" : "btn-outline-secondary"} w-100`}
                  onClick={() => handleTimeframeButtonClick("year")}
                >
                  Year
                </button>
              </div>
              <div className="btn-group btn-group-toggle d-none d-sm-flex w-100" data-toggle="buttons">
                <button 
                  className={`btn ${timeframe === "month" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => handleTimeframeButtonClick("month")}
                >
                  Month
                </button>
                <button 
                  className={`btn ${timeframe === "quarter" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => handleTimeframeButtonClick("quarter")}
                >
                  Quarter
                </button>
                <button 
                  className={`btn ${timeframe === "year" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => handleTimeframeButtonClick("year")}
                >
                  Year
                </button>
              </div>
            </div>
            {/* View Format - Half width on xs, quarter width on md and up */}
            <div className="col-6 col-md-3 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">View Format</label>
              <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" data-toggle="buttons">
                <button 
                  className={`btn ${format === "chart" ? "btn-info" : "btn-outline-info"} mb-2 w-100`}
                  onClick={() => handleFormatButtonClick("chart")}
                >
                  <i className="fas fa-chart-bar mr-1"></i> Chart
                </button>
                <button 
                  className={`btn ${format === "table" ? "btn-info" : "btn-outline-info"} w-100`}
                  onClick={() => handleFormatButtonClick("table")}
                >
                  <i className="fas fa-table mr-1"></i> Table
                </button>
              </div>
              <div className="btn-group btn-group-toggle d-none d-sm-flex w-100" data-toggle="buttons">
                <button 
                  className={`btn ${format === "chart" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => handleFormatButtonClick("chart")}
                >
                  <i className="fas fa-chart-bar mr-1"></i> Chart
                </button>
                <button 
                  className={`btn ${format === "table" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => handleFormatButtonClick("table")}
                >
                  <i className="fas fa-table mr-1"></i> Table
                </button>
              </div>
            </div>
          </div>
          {format === "chart" && (
            <div className="row mt-2">
              <div className="col-12 mb-4">
                <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Chart Type</label>
                {/* Chart Type buttons for mobile */}
                <div className="d-block d-sm-none">
                  {reportType === "spending" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </div>
                  )}
                  {reportType === "income-expense" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </div>
                  )}
                  {reportType === "trends" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </div>
                  )}
                  {reportType === "goals" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                    </div>
                  )}
                  {reportType === "savings" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </div>
                  )}
                  {reportType === "predictions" && (
                    <div className="btn-group-vertical btn-group-sm w-100">
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Chart Type buttons for desktop */}
                <div className="btn-group btn-group-toggle d-none d-sm-flex flex-wrap" data-toggle="buttons">
                  {reportType === "spending" && (
                    <>
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </>
                  )}
                  {reportType === "income-expense" && (
                    <>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </>
                  )}
                  {reportType === "trends" && (
                    <>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </>
                  )}
                  {reportType === "goals" && (
                    <>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                    </>
                  )}
                  {reportType === "savings" && (
                    <>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </>
                  )}
                  {reportType === "predictions" && (
                    <>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"} mr-2`}
                        onClick={() => handleChartTypeButtonClick("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => handleChartTypeButtonClick("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-2 small text-gray-600">
                  <i className="fas fa-info-circle mr-1"></i> 
                  Different chart types provide unique insights into your financial data.
                  <br className="d-none d-md-block" />
                  <span className="font-weight-bold d-md-inline-block">Auto-selected default chart type based on report type.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            {reportType === "spending" 
              ? "Spending by Category" 
              : reportType === "income-expense" 
              ? "Income vs Expenses" 
              : reportType === "trends"
              ? "Financial Trends"
              : reportType === "goals"
              ? "Goal Allocations"
              : reportType === "savings"
              ? "Savings Rate"
              : "Financial Projections"
            } ({timeframe === "month" 
              ? "Monthly" 
              : timeframe === "quarter" 
              ? "Quarterly" 
              : "Yearly"
            })
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e: React.MouseEvent) => toggleTip('reportContent', e)}
                aria-label="Report content information"
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          {format === "chart" ? (
            <div style={{ height: "auto", minHeight: "300px", maxHeight: "600px" }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
                ref={chartRef}
              />
            </div>
          ) : (
            <div className="table-responsive">
              {reportType === "spending" && categoryData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(categoryData) ? (
                      categoryData.map((item: SpendingDataItem, index: number) => {
                        const total = categoryData.reduce((sum: number, cat: SpendingDataItem) => sum + cat.value, 0);
                        return (
                          <tr key={`spending-${index}`}>
                            <td>{item.name}</td>
                            <td>{formatCurrency(item.value)}</td>
                            <td>{formatPercentage((item.value / total) * 100)}</td>
                          </tr>
                        );
                      })
                    ) : categoryData.labels && categoryData.datasets ? (
                      categoryData.labels.map((label: string, index: number) => {
                      const value = categoryData.datasets[0].data[index];
                      const total = categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                      return (
                        <tr key={`spending-${index}`}>
                          <td>{label}</td>
                          <td>{formatCurrency(value)}</td>
                          <td>{formatPercentage((value / total) * 100)}</td>
                        </tr>
                      );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center">No spending data available</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-weight-bold">
                      <th>Total</th>
                      <th>
                        {formatCurrency(
                          Array.isArray(categoryData)
                            ? categoryData.reduce((sum: number, cat: SpendingDataItem) => sum + cat.value, 0)
                            : categoryData.datasets && categoryData.datasets[0]
                              ? categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
                              : 0
                        )}
                      </th>
                      <th>100.00%</th>
                    </tr>
                  </tfoot>
                </table>
              )}

              {reportType === "income-expense" && monthlyData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Month</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Savings</th>
                      <th>Savings Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(monthlyData) ? (
                      monthlyData.map((item: IncomeExpenseDataItem, index: number) => {
                        const savings = item.income - item.expenses;
                        const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
                        return (
                          <tr key={`income-${index}`}>
                            <td>{item.name}</td>
                            <td>{formatCurrency(item.income)}</td>
                            <td>{formatCurrency(item.expenses)}</td>
                            <td className={savings >= 0 ? "text-success" : "text-danger"}>
                              {formatCurrency(savings)}
                            </td>
                            <td>{formatPercentage(savingsRate)}</td>
                          </tr>
                        );
                      })
                    ) : monthlyData.labels && monthlyData.datasets ? (
                      monthlyData.labels.map((label: string, index: number) => {
                      const income = monthlyData.datasets[0].data[index];
                      const expenses = monthlyData.datasets[1].data[index];
                      const savings = income - expenses;
                      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
                      return (
                        <tr key={`income-${index}`}>
                          <td>{label}</td>
                          <td>{formatCurrency(income)}</td>
                          <td>{formatCurrency(expenses)}</td>
                          <td className={savings >= 0 ? "text-success" : "text-danger"}>
                            {formatCurrency(savings)}
                          </td>
                          <td>{formatPercentage(savingsRate)}</td>
                        </tr>
                      );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center">No income/expense data available</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-weight-bold">
                      <th>Average</th>
                      <th>
                        {formatCurrency(
                          Array.isArray(monthlyData)
                            ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.income, 0) / monthlyData.length
                            : monthlyData.datasets && monthlyData.datasets[0]
                              ? monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) / monthlyData.datasets[0].data.length
                              : 0
                        )}
                      </th>
                      <th>
                        {formatCurrency(
                          Array.isArray(monthlyData)
                            ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.expenses, 0) / monthlyData.length
                            : monthlyData.datasets && monthlyData.datasets[1]
                              ? monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0) / monthlyData.datasets[1].data.length
                              : 0
                        )}
                      </th>
                      <th>
                        {formatCurrency(
                          Array.isArray(monthlyData)
                            ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + (item.income - item.expenses), 0) / monthlyData.length
                            : monthlyData.datasets && monthlyData.datasets[0] && monthlyData.datasets[1]
                              ? (monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) - 
                                monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0)) / monthlyData.datasets[0].data.length
                              : 0
                        )}
                      </th>
                      <th>
                        {formatPercentage(
                          Array.isArray(monthlyData)
                            ? (() => {
                                const totalIncome = monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.income, 0);
                                const totalExpenses = monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.expenses, 0);
                                return totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                              })()
                            : monthlyData.datasets && monthlyData.datasets[0] && monthlyData.datasets[1]
                              ? (() => {
                                  const totalIncome = monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                                  const totalExpenses = monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0);
                                  return totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                                })()
                              : 0
                        )}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              )}

              {reportType === "trends" && trendsData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Category</th>
                      <th>Previous Month</th>
                      <th>Current Month</th>
                      <th>Change</th>
                      <th>Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendsData.map((trend, index) => (
                      <tr key={`trend-${index}`}>
                        <td>{trend.category}</td>
                        <td>{formatCurrency(trend.previousAmount)}</td>
                        <td>{formatCurrency(trend.currentAmount)}</td>
                        <td className={trend.currentAmount - trend.previousAmount >= 0 ? "text-success" : "text-danger"}>
                          {trend.currentAmount - trend.previousAmount >= 0 ? "+" : ""}
                          {formatCurrency(trend.currentAmount - trend.previousAmount)}
                        </td>
                        <td className={trend.change >= 0 ? "text-success" : "text-danger"}>
                          {trend.change >= 0 ? "+" : ""}
                          {trend.change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === "goals" && goalRelationship && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Metric</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Budget Allocated</td>
                      <td>{formatCurrency(goalRelationship.totalBudgetAllocated)}</td>
                    </tr>
                    <tr>
                      <td>Total Spent on Goals</td>
                      <td>{formatCurrency(goalRelationship.totalSpentOnGoals)}</td>
                    </tr>
                    <tr>
                      <td>Percentage Budget to Goals</td>
                      <td>{formatPercentage(goalRelationship.percentageBudgetToGoals)}</td>
                    </tr>
                    <tr>
                      <td>Goal Transactions Count</td>
                      <td>{goalRelationship.goalTransactionsCount}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
          
          <div className="mt-3 text-center">
            <div className="small text-muted">
              <i className="fas fa-info-circle mr-1"></i> 
              This report was generated based on your transaction history. Data may be subject to rounding.
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip Component */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            zIndex: 1000,
            background: "white",
            border: "1px solid #e3e6f0",
            borderRadius: "0.35rem",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            padding: "1rem",
            maxWidth: "300px",
            transform: "translateX(-50%)",
            marginTop: "10px"
          }}
        >
          {/* Arrow element */}
          <div 
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid white"
            }}
          ></div>
          
          {/* Close button */}
          <button 
            onClick={() => setActiveTip(null)}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              color: "#858796"
            }}
          >
            <i className="fas fa-times"></i>
          </button>
          
          {activeTip === 'totalSpending' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Monthly Spending</div>
              <p className="tip-description text-gray-800 mb-0">
                Your total expenses for the current month. This includes all categories of spending recorded in the system.
              </p>
            </>
          )}
          
          {activeTip === 'totalIncome' && (
            <>
              <div className="tip-title font-weight-bold text-success mb-2">Monthly Income</div>
              <p className="tip-description text-gray-800 mb-0">
                Your total income for the current month from all sources, including salary, investments, and other income streams.
              </p>
            </>
          )}
          
          {activeTip === 'monthlySavings' && (
            <>
              <div className="tip-title font-weight-bold text-info mb-2">Monthly Savings</div>
              <p className="tip-description text-gray-800 mb-0">
                The difference between your income and expenses. This represents money you've kept rather than spent this month.
              </p>
            </>
          )}
          
          {activeTip === 'savingsRate' && (
            <>
              <div className="tip-title font-weight-bold text-warning mb-2">Savings Rate</div>
              <p className="tip-description text-gray-800 mb-0">
                The percentage of your income that you save. Financial experts recommend a savings rate of at least 20% of your income.
              </p>
            </>
          )}
          
          {activeTip === 'reportSettings' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Report Settings</div>
              <p className="tip-description text-gray-800 mb-0">
                Customize your financial report by selecting different report types, timeframes, and view formats to gain insights into your financial data.
              </p>
            </>
          )}
          
          {activeTip === 'reportContent' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Report Content</div>
              <p className="tip-description text-gray-800 mb-0">
                This report visualizes your financial data according to the selected filters. Use different chart types to gain different insights into your spending patterns and financial trends.
              </p>
            </>
          )}
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Email Financial Report</h5>
                <button type="button" className="close" onClick={closeEmailModal}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleEmailSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="emailRecipient">Recipient Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="emailRecipient"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emailSubject">Subject</label>
                    <input
                      type="text"
                      className="form-control"
                      id="emailSubject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emailMessage">Message</label>
                    <textarea
                      className="form-control"
                      id="emailMessage"
                      rows={3}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group mb-0">
                    <div className="custom-control custom-checkbox">
                      <input type="checkbox" className="custom-control-input" id="attachPDF" defaultChecked />
                      <label className="custom-control-label" htmlFor="attachPDF">
                        Attach report as PDF
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeEmailModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={emailSending}>
                    {emailSending ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : 'Send Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;