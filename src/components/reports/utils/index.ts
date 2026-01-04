import { formatCurrency, formatPercentage } from '../../../utils/helpers';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have type definitions
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import {
  ReportType,
  TimeframeType,
  ChartType
} from '../components/ReportControls';
import {
  Transaction,
  Category,
  SpendingDataItem,
  IncomeExpenseDataItem,
  SavingsDataItem,
  TrendData,
  BudgetRelationship,
  getCategoryName,
  getTransactionCategoryId
} from '../hooks';

// Data processing utilities

/**
 * Processes spending data and groups transactions by category.
 * Handles uncategorized transactions by grouping them under "Uncategorized".
 * 
 * @param transactions - Array of all transactions to process
 * @param categories - Available categories for grouping
 * @returns Array of spending data items with name, value, and color
 * 
 * @example
 * const spendingData = processSpendingData(transactions, categories);
 * // Returns: [{ name: "Food", value: 15000, color: "#4e73df" }, { name: "Uncategorized", value: 5000, color: "#858796" }]
 */
export const processSpendingData = (
  transactions: Transaction[],
  categories: Category[]
): SpendingDataItem[] => {
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  const categorySpending: { [key: string]: number } = {};
  let uncategorizedTotal = 0;
  
  // Process transactions - both categorized and uncategorized
  expenseTransactions.forEach(tx => {
    const categoryId = getTransactionCategoryId(tx);
    if (categoryId) {
      // Categorized transaction
      const categoryName = getCategoryName(categoryId, categories);
      if (!categorySpending[categoryName]) {
        categorySpending[categoryName] = 0;
      }
      categorySpending[categoryName] += tx.amount;
    } else {
      // Uncategorized transaction
      uncategorizedTotal += tx.amount;
    }
  });
  
  const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'];
  const result: SpendingDataItem[] = Object.keys(categorySpending).map((category, index) => ({
    name: category,
    value: categorySpending[category],
    color: colors[index % colors.length]
  }));
  
  // Add uncategorized as a separate category if there are any
  if (uncategorizedTotal > 0) {
    result.push({
      name: 'Uncategorized',
      value: uncategorizedTotal,
      color: '#858796' // Neutral gray for uncategorized
    });
  }
  
  return result;
};

/**
 * Processes income and expense data grouped by month.
 * Only counts 'income' and 'expense' transaction types.
 * Contribution transactions are excluded and handled separately in goals report.
 * 
 * @param transactions - Array of all transactions
 * @param timeframe - Time period to analyze ('month', 'quarter', or 'year')
 * @returns Array of monthly data with income and expenses
 * 
 * @example
 * const monthlyData = processIncomeExpenseData(transactions, 'month');
 * // Returns: [{ name: "Jun 2025", income: 65000, expenses: 44398 }, ...]
 */
export const processIncomeExpenseData = (
  transactions: Transaction[],
  timeframe: TimeframeType
): IncomeExpenseDataItem[] => {
  const monthlyData: { [key: string]: { income: number; expenses: number; contributions: number } } = {};
  
  // First, collect all unique months from transactions
  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, contributions: 0 };
    }
    
    if (tx.type === 'income') {
      monthlyData[monthKey].income += tx.amount;
    } else if (tx.type === 'expense') {
      monthlyData[monthKey].expenses += tx.amount;
    } else if (tx.type === 'contribution') {
      monthlyData[monthKey].contributions += tx.amount;
    }
  });
  
  // Sort months and limit based on timeframe
  const sortedMonths = Object.keys(monthlyData).sort();
  let limitedMonths: string[];
  
  switch(timeframe) {
    case 'month':
      limitedMonths = sortedMonths.slice(-6); // Last 6 months
      break;
    case 'quarter':
      limitedMonths = sortedMonths.slice(-12); // Last 12 months
      break;
    case 'year':
      limitedMonths = sortedMonths.slice(-36); // Last 36 months
      break;
    default:
      limitedMonths = sortedMonths.slice(-6);
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return limitedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const displayMonth = monthNames[parseInt(monthNum) - 1];
    
    return {
      name: `${displayMonth} ${year}`,
      income: monthlyData[month].income,
      expenses: monthlyData[month].expenses,
      contributions: monthlyData[month].contributions
    };
  });
};

/**
 * Calculates savings rate and related metrics for each month.
 * Includes income, expenses, savings amount, and savings rate percentage.
 * 
 * @param transactions - Array of all transactions
 * @param timeframe - Time period to analyze ('month', 'quarter', or 'year')
 * @returns Array of monthly savings data with all financial metrics
 * 
 * @example
 * const savingsData = processSavingsData(transactions, 'month');
 * // Returns: [{ name: "Jun 2025", income: 65000, expenses: 44398, savings: 20602, rate: 31.7 }, ...]
 */
export const processSavingsData = (
  transactions: Transaction[],
  timeframe: TimeframeType
): SavingsDataItem[] => {
  const incomeExpenseData = processIncomeExpenseData(transactions, timeframe);
  
  return incomeExpenseData.map(item => {
    const income = item.income || 0; // Add null guards
    const expenses = item.expenses || 0;
    const savings = income - expenses;
    const rate = income > 0 ? (savings / income) * 100 : 0;
    
    return {
      name: item.name,
      income,
      expenses,
      savings,
      rate: Math.round(rate * 10) / 10 // Round to 1 decimal
    };
  });
};

/**
 * Analyzes spending trends by comparing current and previous periods.
 * Handles both categorized and uncategorized transactions.
 * 
 * @param transactions - Array of all transactions
 * @param categories - Available categories for grouping
 * @param timeframe - Time period to analyze ('month', 'quarter', or 'year')
 * @returns Array of trend data showing changes per category including Uncategorized
 * 
 * @example
 * const trends = processTrendsData(transactions, categories, 'month');
 * // Returns: [{ category: "Food", change: 12.5, previousAmount: 8000, currentAmount: 9000 }, ...]
 */
export const processTrendsData = (
  transactions: Transaction[],
  categories: Category[],
  timeframe: TimeframeType
): TrendData[] => {
  const categoryTotals: { [key: string]: { current: number; previous: number } } = {};
  
  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date = new Date();
  let previousStart: Date;
  let previousEnd: Date;
  
  switch(timeframe) {
    case 'month':
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
      break;
    case 'year':
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear(), 0, 0);
      break;
    default:
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  
  const currentTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= currentStart && txDate <= currentEnd;
  });
  
  const previousTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= previousStart && txDate <= previousEnd;
  });
  
  const allCategories = new Set<string | number>();
  let hasUncategorized = false;
  
  [...currentTransactions, ...previousTransactions].forEach(tx => {
    const categoryId = getTransactionCategoryId(tx);
    if (categoryId) {
      allCategories.add(categoryId);
    } else {
      hasUncategorized = true;
    }
  });
  
  // Initialize category totals for categorized transactions
  allCategories.forEach(categoryId => {
    const categoryName = getCategoryName(categoryId, categories);
    categoryTotals[categoryName] = { current: 0, previous: 0 };
  });
  
  // Initialize uncategorized category if needed
  if (hasUncategorized) {
    categoryTotals['Uncategorized'] = { current: 0, previous: 0 };
  }
  
  // Process current period transactions
  currentTransactions.forEach(tx => {
    const categoryId = getTransactionCategoryId(tx);
    if (categoryId) {
      const categoryName = getCategoryName(categoryId, categories);
      categoryTotals[categoryName].current += tx.amount;
    } else {
      categoryTotals['Uncategorized'].current += tx.amount;
    }
  });
  
  // Process previous period transactions
  previousTransactions.forEach(tx => {
    const categoryId = getTransactionCategoryId(tx);
    if (categoryId) {
      const categoryName = getCategoryName(categoryId, categories);
      categoryTotals[categoryName].previous += tx.amount;
    } else {
      categoryTotals['Uncategorized'].previous += tx.amount;
    }
  });
  
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
  
  return trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
};

export const processGoalsData = (
  transactions: Transaction[],
  budgets: any[],
  goals: any[]
): { goalRelationship: BudgetRelationship; formattedGoals: any[] } => {
  const goalTransactions = transactions.filter(tx => tx.goal_id);
  const totalBudgetAllocated = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpentOnGoals = goalTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const goalRelationship: BudgetRelationship = {
    totalBudgetAllocated,
    totalSpentOnGoals,
    percentageBudgetToGoals: totalBudgetAllocated > 0 ? (totalSpentOnGoals / totalBudgetAllocated) * 100 : 0,
    goalTransactionsCount: goalTransactions.length
  };
  
  const formattedGoals = goals.map(goal => ({
    id: goal.id,
    name: goal.goal_name,
    target: goal.target_amount,
    current: goal.current_amount,
    percentage: (goal.current_amount / goal.target_amount) * 100,
    remaining: goal.target_amount - goal.current_amount,
    status: goal.status
  }));
  
  return { goalRelationship, formattedGoals };
};

export const processPredictionsData = (
  transactions: Transaction[]
): IncomeExpenseDataItem[] => {
  const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const yearTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= oneYearAgo;
  });
  
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
  
  const months = Object.keys(monthlyTotals).length;
  const totalIncome = Object.values(monthlyTotals).reduce((sum, data) => sum + data.income, 0);
  const totalExpenses = Object.values(monthlyTotals).reduce((sum, data) => sum + data.expenses, 0);
  
  const avgMonthlyIncome = months > 0 ? totalIncome / months : 0;
  const avgMonthlyExpenses = months > 0 ? totalExpenses / months : 0;
  
  const projections: IncomeExpenseDataItem[] = [];
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 1; i <= 6; i++) {
    const projectionDate = new Date(now);
    projectionDate.setMonth(now.getMonth() + i);
    
    const displayMonth = monthNames[projectionDate.getMonth()];
    
    projections.push({
      name: `${displayMonth} ${projectionDate.getFullYear()}`,
      income: avgMonthlyIncome,
      expenses: avgMonthlyExpenses,
      contributions: 0
    });
  }
  
  return projections;
};