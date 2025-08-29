import { Transaction, Category, TrendData } from '../types';

/**
 * Check if spending is consistent between months
 */
export const checkConsistentSpending = (transactions: Transaction[]): boolean => {
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

/**
 * Calculate debt reduction percentage
 */
export const calculateDebtReduction = (transactions: Transaction[]): number => {
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

/**
 * Calculate transaction trends based on filtered data
 */
export const calculateTransactionTrends = (
  transactions: Transaction[], 
  expenseCategories: Category[]
): TrendData[] => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get expense transactions only
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  
  if (expenseTransactions.length === 0) {
    return [];
  }

  // Group transactions by month and year
  const monthlySpending = new Map<string, Map<string, number>>();
  
  expenseTransactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlySpending.has(monthKey)) {
      monthlySpending.set(monthKey, new Map<string, number>());
    }
    
    const monthData = monthlySpending.get(monthKey)!;
    if (tx.category_id) {
      const amount = parseFloat(tx.amount.toString()) || 0;
      const current = monthData.get(tx.category_id) || 0;
      monthData.set(tx.category_id, current + amount);
    }
  });

  // Get sorted month keys
  const sortedMonths = Array.from(monthlySpending.keys()).sort();
  
  if (sortedMonths.length < 2) {
    return [];
  }

  // Compare the two most recent months with data
  const recentMonth = sortedMonths[sortedMonths.length - 1];
  const previousMonth = sortedMonths[sortedMonths.length - 2];
  
  const recentSpending = monthlySpending.get(recentMonth) || new Map();
  const previousSpending = monthlySpending.get(previousMonth) || new Map();

  // Calculate trends
  const trendData: TrendData[] = [];
  
  // Get all categories that have spending in either month
  const allCategories = new Set([
    ...Array.from(recentSpending.keys()),
    ...Array.from(previousSpending.keys())
  ]);
  
  allCategories.forEach(categoryId => {
    const currentAmount = recentSpending.get(categoryId) || 0;
    const prevAmount = previousSpending.get(categoryId) || 0;
    
    // Skip categories with no spending in either month
    if (currentAmount === 0 && prevAmount === 0) return;
    
    // Find category name
    const category = expenseCategories.find(c => c.id === categoryId);
    const categoryName = category ? category.category_name : 'Other';
    
    // Calculate percentage change
    let change = 0;
    if (prevAmount > 0) {
      change = ((currentAmount - prevAmount) / prevAmount) * 100;
    } else if (currentAmount > 0) {
      change = 100; // New spending category
    }
    
    trendData.push({
      category: categoryName,
      change,
      previousAmount: prevAmount,
      currentAmount: currentAmount
    });
  });
  
  // Sort by absolute change amount (most significant changes first)
  trendData.sort((a, b) => 
    Math.abs(b.currentAmount - b.previousAmount) - Math.abs(a.currentAmount - a.previousAmount)
  );
  
  // Take top 4 categories with most significant changes
  return trendData.slice(0, 4);
};
