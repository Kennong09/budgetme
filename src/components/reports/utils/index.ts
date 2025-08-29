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
  getCategoryName
} from '../hooks';

// Data processing utilities
export const processSpendingData = (
  transactions: Transaction[],
  categories: Category[]
): SpendingDataItem[] => {
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  const categorySpending: { [key: string]: number } = {};
  
  expenseTransactions.forEach(tx => {
    if (tx.category_id) {
      const categoryName = getCategoryName(tx.category_id, categories);
      if (!categorySpending[categoryName]) {
        categorySpending[categoryName] = 0;
      }
      categorySpending[categoryName] += tx.amount;
    }
  });
  
  const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'];
  return Object.keys(categorySpending).map((category, index) => ({
    name: category,
    value: categorySpending[category],
    color: colors[index % colors.length]
  }));
};

export const processIncomeExpenseData = (
  transactions: Transaction[],
  timeframe: TimeframeType
): IncomeExpenseDataItem[] => {
  const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
  
  const now = new Date();
  let startDate: Date;
  let months: number;
  
  switch(timeframe) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setMonth(startDate.getMonth() - 5);
      months = 6;
      break;
    case 'quarter':
      startDate = new Date(now.getFullYear(), 0, 1);
      months = 12;
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 2, 0, 1);
      months = 36;
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      months = 6;
  }
  
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { income: 0, expenses: 0 };
  }
  
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
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Object.keys(monthlyData)
    .sort()
    .map(month => {
      const [year, monthNum] = month.split('-');
      const displayMonth = monthNames[parseInt(monthNum) - 1];
      
      return {
        name: `${displayMonth} ${year}`,
        income: monthlyData[month].income,
        expenses: monthlyData[month].expenses
      };
    });
};

export const processSavingsData = (
  transactions: Transaction[],
  timeframe: TimeframeType
): SavingsDataItem[] => {
  const incomeExpenseData = processIncomeExpenseData(transactions, timeframe);
  
  return incomeExpenseData.map(item => ({
    name: item.name,
    rate: item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
  }));
};

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
  
  const allCategories = new Set<number>();
  [...currentTransactions, ...previousTransactions].forEach(tx => {
    if (tx.category_id) {
      allCategories.add(tx.category_id);
    }
  });
  
  allCategories.forEach(categoryId => {
    const categoryName = getCategoryName(categoryId, categories);
    categoryTotals[categoryName] = { current: 0, previous: 0 };
  });
  
  currentTransactions.forEach(tx => {
    if (tx.category_id) {
      const categoryName = getCategoryName(tx.category_id, categories);
      categoryTotals[categoryName].current += tx.amount;
    }
  });
  
  previousTransactions.forEach(tx => {
    if (tx.category_id) {
      const categoryName = getCategoryName(tx.category_id, categories);
      categoryTotals[categoryName].previous += tx.amount;
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
      expenses: avgMonthlyExpenses
    });
  }
  
  return projections;
};