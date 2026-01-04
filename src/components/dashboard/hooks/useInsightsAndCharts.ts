import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { formatCurrency, formatPercentage } from '../../../utils/helpers';

import {
  Transaction,
  BudgetItem,
  Category,
  InsightData,
  TrendData,
  MonthlyData,
  CategoryData,
  HighchartsConfig,
  PieChartConfig
} from '../types';

// Internal implementation of useInsightsAndCharts
const useInsightsAndChartsInternal = (
  transactions: Transaction[],
  budgetData: BudgetItem[],
  expenseCategories: Category[],
  userId: string,
  dateFilter?: string,
  customStartDate?: string,
  customEndDate?: string
) => {

  // CRITICAL: ALL HOOKS MUST BE CALLED FIRST - NO CONDITIONAL RETURNS BEFORE THIS POINT
  const canRender = true;
  
  // Legacy circuit breaker refs (will be phased out)
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const circuitBreakerTripped = useRef(false);

  // State declarations with stable initial values - MUST ALWAYS BE CALLED
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [monthlyData, setMonthlyData] = useState<HighchartsConfig | null>(null);
  const [categoryData, setCategoryData] = useState<PieChartConfig | null>(null);

  // Stable memoized values to prevent unnecessary recalculations
  const stableTransactions = useMemo(() => transactions || [], [transactions]);
  const stableBudgetData = useMemo(() => budgetData, [budgetData]);
  const stableExpenseCategories = useMemo(() => expenseCategories, [expenseCategories]);
  const stableDateFilter = useMemo(() => dateFilter, [dateFilter]);
  const stableCustomStartDate = useMemo(() => customStartDate, [customStartDate]);
  const stableCustomEndDate = useMemo(() => customEndDate, [customEndDate]);

  // Helper function to get date range based on filter with stable dependencies
  const getDateRange = useCallback(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (stableDateFilter) {
      case 'current-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
        case 'last-3-months':
          startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1); // -2 to include current month
          break;
        case 'last-6-months':
          startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1); // -5 to include current month
          break;
        case 'last-year':
          // Show previous calendar year (Jan - Dec of previous year)
          startDate = new Date(today.getFullYear() - 1, 0, 1); // Jan 1 of previous year
          endDate = new Date(today.getFullYear() - 1, 11, 31); // Dec 31 of previous year
          break;
          case 'custom':
            if (stableCustomStartDate && stableCustomEndDate) {
              startDate = new Date(stableCustomStartDate);
              endDate = new Date(stableCustomEndDate);
              // Validate dates: if invalid or start > end, fallback to last 3 months
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                endDate = today;
              }
            } else if (stableCustomStartDate) {
              // Only start date: show from start to today
              startDate = new Date(stableCustomStartDate);
              if (isNaN(startDate.getTime())) {
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
              }
            } else if (stableCustomEndDate) {
              // Only end date: show last 3 months up to end date
              endDate = new Date(stableCustomEndDate);
              if (isNaN(endDate.getTime())) {
                endDate = today;
              }
              startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
            } else {
              // No dates provided: fallback to last 3 months
              startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            }
            break;
        default: // 'all'
          // For 'all', find the earliest transaction date to show ALL data
          if (stableTransactions && stableTransactions.length > 0) {
            const dates = stableTransactions.map(tx => new Date(tx.date));
            const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
            startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
          } else {
            // Fallback: show last 12 months if no transactions
            startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
          }
          break;
    }

    return { startDate, endDate };
  }, [stableDateFilter, stableCustomStartDate, stableCustomEndDate]);

  // Create stable references to utility functions with proper dependencies
  const stableFormatCurrency = useCallback((amount: number) => formatCurrency(amount), []);
  const stableFormatPercentage = useCallback((value: number) => formatPercentage(value), []);

  // Stable generateInsights function with minimal dependencies to prevent re-renders
  const generateInsights = useCallback((income: number, expenses: number, savingsRate: number): void => {
    const newInsights: InsightData[] = [];
    
    // Enhanced data validation - but don't exit early if we have financial data to analyze
    if (!stableTransactions || stableTransactions.length === 0) {
      // Even with no transactions, we can still provide insights based on income/expenses data
      if (income === 0 && expenses === 0 && savingsRate === 0) {
        // Don't call setInsights here - just return to avoid infinite loop
        return;
      }
    }
    
    // Validate numeric inputs and sanitize
    const safeIncome = isNaN(income) || !isFinite(income) ? 0 : Math.max(0, income);
    const safeExpenses = isNaN(expenses) || !isFinite(expenses) ? 0 : Math.max(0, expenses);
    const safeSavingsRate = isNaN(savingsRate) || !isFinite(savingsRate) ? 0 : savingsRate;
    const balance = safeIncome - safeExpenses;
    

    
    // PRIORITY 1: Critical Financial Alerts (Zero income, negative balance)
    
    // Zero income with expenses - CRITICAL
    if (safeIncome === 0 && safeExpenses > 0) {
      newInsights.push({
        title: "Critical: No income recorded",
        description: `You have expenses of ${stableFormatCurrency(safeExpenses)} but no recorded income. Add your income sources to get accurate financial insights and improve your financial health score.`,
        type: "danger",
        icon: "fa-exclamation-triangle",
      });
    }
    
    // Significant negative balance - URGENT
    if (balance < -5000) {
      newInsights.push({
        title: "Urgent: Significant negative balance",
        description: `Your expenses exceed income by ${stableFormatCurrency(Math.abs(balance))}. Take immediate action to balance your finances or review your budget.`,
        type: "danger",
        icon: "fa-exclamation-circle",
      });
    } else if (balance < 0) {
      newInsights.push({
        title: "Warning: Negative balance detected",
        description: `Your expenses exceed income by ${stableFormatCurrency(Math.abs(balance))}. Consider reducing expenses or increasing income.`,
        type: "warning",
        icon: "fa-exclamation-triangle",
      });
    }
    
    // Find unusually large transactions
    const unusualTransactions = stableTransactions.filter(tx => {
      const amount = parseFloat(tx.amount.toString());
      return amount > 1000 && 
        (tx.category_id === 'subscription' || 
         (tx.notes && tx.notes.toLowerCase().includes('subscription')));
    });
    
    if (unusualTransactions.length > 0) {
      const largeSubscription = unusualTransactions.find(tx => {
        const amount = parseFloat(tx.amount.toString());
        return amount > 10000;
      });
      
      if (largeSubscription) {
        newInsights.push({
          title: "Critical: Unusual subscription charge",
          description: `There's an unusually large subscription charge of ${stableFormatCurrency(Number(largeSubscription.amount))} on ${new Date(largeSubscription.date).toLocaleDateString()}. Please verify this transaction.`,
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
    const overBudgetCategories = stableBudgetData.filter(budget => 
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
    
    // Income vs expenses insight (Enhanced with safe calculations)
    if (safeIncome < safeExpenses && safeIncome > 0) {
      // When there is income but expenses exceed it
      const deficit = safeExpenses - safeIncome;
      const deficitPercentage = (deficit / safeIncome) * 100;
      if (deficitPercentage > 50) {
        newInsights.push({
          title: "Critical: Major overspending",
          description: `You spent ${stableFormatCurrency(deficit)} (${stableFormatPercentage(deficitPercentage)}) more than earned. Immediate action needed.`,
          type: "danger",
          icon: "fa-exclamation-triangle",
        });
      } else {
        newInsights.push({
          title: "Spending exceeds income",
          description: `You spent ${stableFormatCurrency(deficit)} more than you earned this period. Review your expenses to identify areas to cut back.`,
          type: "danger",
          icon: "fa-arrow-trend-down",
        });
      }
    } else if (safeIncome > safeExpenses && safeSavingsRate >= 30) {
      newInsights.push({
        title: "Outstanding savings rate!",
        description: `Excellent! You're saving ${stableFormatPercentage(safeSavingsRate)} of your income. Consider investing excess funds for growth.`,
        type: "success",
        icon: "fa-trophy",
      });
    } else if (safeIncome > safeExpenses && safeSavingsRate >= 20) {
      newInsights.push({
        title: "Great savings rate!",
        description: `You're saving ${stableFormatPercentage(safeSavingsRate)} of your income, which meets or exceeds the recommended 20%.`,
        type: "success",
        icon: "fa-piggy-bank",
      });
    } else if (safeIncome > safeExpenses && safeSavingsRate < 20 && safeSavingsRate >= 10) {
      newInsights.push({
        title: "Improve your savings",
        description: `Your current savings rate is ${stableFormatPercentage(safeSavingsRate)}. Try to save at least 20% of your income for financial security.`,
        type: "info",
        icon: "fa-chart-line",
      });
    } else if (safeIncome > safeExpenses && safeSavingsRate < 10 && safeSavingsRate >= 5) {
      newInsights.push({
        title: "Low savings rate warning",
        description: `You're only saving ${stableFormatPercentage(safeSavingsRate)} of your income. Consider reducing expenses to improve financial security.`,
        type: "warning",
        icon: "fa-exclamation-circle",
      });
    } else if (safeIncome > safeExpenses && safeSavingsRate < 5) {
      newInsights.push({
        title: "Critical: Minimal savings",
        description: `Your savings rate is only ${stableFormatPercentage(safeSavingsRate)}. This leaves you vulnerable to financial emergencies.`,
        type: "danger",
        icon: "fa-shield-alt",
      });
    }
    
    // NEW INSIGHTS - SPENDING PATTERNS
    
    // 1. Daily spending analysis (using safe values)
    const dailyAverage = safeExpenses / 30;
    const last7DaysTx = stableTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return txDate >= sevenDaysAgo && tx.type === 'expense';
    });
    
    if (last7DaysTx.length > 0) {
      const recent7DaysSpending = last7DaysTx.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      const recentDailyAvg = recent7DaysSpending / 7;
      
      if (dailyAverage > 0 && recentDailyAvg > dailyAverage * 1.5) {
        newInsights.push({
          title: "Recent spending spike",
          description: `Your daily spending this week (${stableFormatCurrency(recentDailyAvg)}) is ${stableFormatPercentage((recentDailyAvg / dailyAverage - 1) * 100)} above average.`,
          type: "warning",
          icon: "fa-arrow-up",
        });
      } else if (dailyAverage > 0 && recentDailyAvg < dailyAverage * 0.7) {
        newInsights.push({
          title: "Great spending control!",
          description: `Excellent! Your daily spending this week (${stableFormatCurrency(recentDailyAvg)}) is ${stableFormatPercentage((1 - recentDailyAvg / dailyAverage) * 100)} below average.`,
          type: "success",
          icon: "fa-thumbs-up",
        });
      }
    }
    
    // 2. Large transaction analysis (enhanced validation)
    const expenseTransactions = stableTransactions.filter(tx => tx.type === 'expense');
    if (expenseTransactions.length > 0 && safeExpenses > 0) {
      const largeTransactions = expenseTransactions.filter(tx => {
        const amount = parseFloat(tx.amount.toString()) || 0;
        return amount > safeExpenses * 0.15;
      });
      if (largeTransactions.length > 0) {
        const largestTx = largeTransactions.reduce((max, tx) => {
          const maxAmount = parseFloat(max.amount.toString()) || 0;
          const txAmount = parseFloat(tx.amount.toString()) || 0;
          return txAmount > maxAmount ? tx : max;
        });
        const largestAmount = parseFloat(largestTx.amount.toString()) || 0;
        const percentage = (largestAmount / safeExpenses) * 100;
        
        newInsights.push({
          title: "Large expense detected",
          description: `Your largest expense (${stableFormatCurrency(largestAmount)}) represents ${stableFormatPercentage(percentage)} of total spending.`,
          type: percentage > 30 ? "warning" : "info",
          icon: "fa-exclamation-circle",
        });
      }
    }
    
    // 3. Frequent small transactions (enhanced validation)
    const smallTransactions = expenseTransactions.filter(tx => {
      const amount = parseFloat(tx.amount.toString()) || 0;
      return amount < 100;
    });
    if (smallTransactions.length > 20 && safeExpenses > 0) {
      const totalSmall = smallTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      const smallPercentage = (totalSmall / safeExpenses) * 100;
      
      newInsights.push({
        title: "Many small purchases",
        description: `You have ${smallTransactions.length} transactions under ₱100, totaling ${stableFormatCurrency(totalSmall)} (${stableFormatPercentage(smallPercentage)} of expenses).`,
        type: "info",
        icon: "fa-coins",
      });
    }
    
    // 4. Weekend vs weekday spending (enhanced validation)
    const weekendExpenses = expenseTransactions.filter(tx => {
      const day = new Date(tx.date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    const weekdayExpenses = expenseTransactions.filter(tx => {
      const day = new Date(tx.date).getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    });
    
    if (weekendExpenses.length > 0 && weekdayExpenses.length > 0) {
      const weekendTotal = weekendExpenses.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      const weekdayTotal = weekdayExpenses.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      const weekendAvg = weekendTotal / Math.max(1, weekendExpenses.length / 2); // per weekend day
      const weekdayAvg = weekdayTotal / Math.max(1, weekdayExpenses.length / 5); // per weekday
      
      if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.5) {
        newInsights.push({
          title: "High weekend spending",
          description: `You spend ${stableFormatPercentage((weekendAvg / weekdayAvg - 1) * 100)} more per day on weekends. Consider budgeting for weekend activities.`,
          type: "warning",
          icon: "fa-calendar-week",
        });
      }
    }
    
    // 5. Monthly spending trend analysis
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthTx = expenseTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    const lastMonthTx = expenseTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const year = currentMonth === 0 ? currentYear - 1 : currentYear;
      return txDate.getMonth() === lastMonth && txDate.getFullYear() === year;
    });
    
    if (currentMonthTx.length > 0 && lastMonthTx.length > 0) {
      const currentTotal = currentMonthTx.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const lastTotal = lastMonthTx.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const monthlyChange = ((currentTotal - lastTotal) / lastTotal) * 100;
      
      if (monthlyChange > 20) {
        newInsights.push({
          title: "Spending increased significantly",
          description: `Your spending this month is ${stableFormatPercentage(monthlyChange)} higher than last month. Review recent purchases.`,
          type: "warning",
          icon: "fa-arrow-trend-up",
        });
      } else if (monthlyChange < -15) {
        newInsights.push({
          title: "Great spending reduction!",
          description: `Excellent! You've reduced spending by ${stableFormatPercentage(Math.abs(monthlyChange))} compared to last month.`,
          type: "success",
          icon: "fa-arrow-trend-down",
        });
      }
    }
    
    // 6. Income consistency analysis
    const incomeTransactions = stableTransactions.filter(tx => tx.type === 'income');
    if (incomeTransactions.length >= 2) {
      const incomeAmounts = incomeTransactions.map(tx => parseFloat(tx.amount.toString()));
      const minIncome = Math.min(...incomeAmounts);
      const maxIncome = Math.max(...incomeAmounts);
      const avgIncome = income / incomeTransactions.length;
      const variability = ((maxIncome - minIncome) / avgIncome) * 100;
      
      if (variability > 50) {
        newInsights.push({
          title: "Irregular income detected",
          description: `Your income varies by ${stableFormatPercentage(variability)}. Consider building a larger emergency fund for stability.`,
          type: "info",
          icon: "fa-chart-line",
        });
      } else if (variability < 10) {
        newInsights.push({
          title: "Stable income stream",
          description: `Great! Your income is very consistent with only ${stableFormatPercentage(variability)} variation.`,
          type: "success",
          icon: "fa-check-circle",
        });
      }
    }
    
    // 7. Emergency fund assessment (enhanced with safe calculations)
    const monthlyExpenses = safeExpenses / Math.max(1, expenseTransactions.length / 30);
    const emergencyFundMonths = (safeIncome > safeExpenses && monthlyExpenses > 0) ? (safeIncome - safeExpenses) / monthlyExpenses : 0;
    
    if (emergencyFundMonths < 1 && safeIncome > 0) {
      newInsights.push({
        title: "Build emergency fund",
        description: "You need an emergency fund covering 3-6 months of expenses. Start saving immediately for financial security.",
        type: "danger",
        icon: "fa-shield-alt",
      });
    } else if (emergencyFundMonths >= 6) {
      newInsights.push({
        title: "Strong emergency fund!",
        description: `Excellent! Your current savings can cover ${Math.floor(emergencyFundMonths)} months of expenses.`,
        type: "success",
        icon: "fa-shield-check",
      });
    } else if (emergencyFundMonths >= 3) {
      newInsights.push({
        title: "Good emergency fund",
        description: `You have ${Math.floor(emergencyFundMonths)} months of expenses saved. Consider building up to 6 months.`,
        type: "info",
        icon: "fa-shield-halved",
      });
    }
    
    // 8. Subscription and recurring payment detection
    const subscriptionKeywords = ['subscription', 'monthly', 'netflix', 'spotify', 'gym', 'membership', 'plan'];
    const potentialSubscriptions = expenseTransactions.filter(tx => {
      const description = (tx.notes || '').toLowerCase(); // Fixed: removed tx.description reference
      return subscriptionKeywords.some(keyword => description.includes(keyword)) ||
             parseFloat(tx.amount.toString()).toString().endsWith('.00'); // Round amounts often indicate subscriptions
    });
    
    if (potentialSubscriptions.length > 5) {
      const subscriptionTotal = potentialSubscriptions.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const subscriptionPercentage = (subscriptionTotal / expenses) * 100;
      
      newInsights.push({
        title: "Multiple subscriptions detected",
        description: `You have ${potentialSubscriptions.length} potential subscriptions costing ${stableFormatCurrency(subscriptionTotal)} (${stableFormatPercentage(subscriptionPercentage)} of expenses).`,
        type: subscriptionPercentage > 15 ? "warning" : "info",
        icon: "fa-repeat",
      });
    }
    
    // 9. Cash flow timing analysis
    const transactionsByDay = new Map<number, number>();
    expenseTransactions.forEach(tx => {
      const day = new Date(tx.date).getDate();
      const amount = parseFloat(tx.amount.toString());
      transactionsByDay.set(day, (transactionsByDay.get(day) || 0) + amount);
    });
    
    const heavySpendingDays = Array.from(transactionsByDay.entries())
      .filter(([_, amount]) => amount > expenses * 0.1)
      .sort((a, b) => b[1] - a[1]);
    
    if (heavySpendingDays.length > 0) {
      const topDay = heavySpendingDays[0];
      newInsights.push({
        title: "Heavy spending day identified",
        description: `Day ${topDay[0]} of the month shows highest spending (${stableFormatCurrency(topDay[1])}). Plan major purchases carefully.`,
        type: "info",
        icon: "fa-calendar-day",
      });
    }
    
    // 10. Transaction frequency patterns
    const dailyTransactionCount = new Map<string, number>();
    expenseTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      dailyTransactionCount.set(dateKey, (dailyTransactionCount.get(dateKey) || 0) + 1);
    });
    
    const avgTransactionsPerDay = Array.from(dailyTransactionCount.values())
      .reduce((sum, count) => sum + count, 0) / dailyTransactionCount.size;
    
    const highActivityDays = Array.from(dailyTransactionCount.entries())
      .filter(([_, count]) => count > avgTransactionsPerDay * 2).length;
    
    if (highActivityDays > 0) {
      newInsights.push({
        title: "Spending pattern detected",
        description: `You have ${highActivityDays} days with unusually high transaction activity. Consider consolidating purchases.`,
        type: "info",
        icon: "fa-chart-bar",
      });
    }
    
    // 11. Round number spending analysis
    const roundNumberTx = expenseTransactions.filter(tx => {
      const amount = parseFloat(tx.amount.toString());
      return amount % 100 === 0 || amount % 50 === 0; // Transactions ending in .00 or .50
    });
    
    if (roundNumberTx.length > expenseTransactions.length * 0.3) {
      newInsights.push({
        title: "Round number spending pattern",
        description: `${stableFormatPercentage((roundNumberTx.length / expenseTransactions.length) * 100)} of your transactions are round numbers. This might indicate budgeting opportunities.`,
        type: "info",
        icon: "fa-calculator",
      });
    }
    
    // 12. Category concentration analysis
    const categorySpending = new Map<string, number>();
    expenseTransactions.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      categorySpending.set(category, (categorySpending.get(category) || 0) + parseFloat(tx.amount.toString()));
    });
    
    const topCategory = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory && categorySpending.size > 1) {
      const categoryPercentage = (topCategory[1] / expenses) * 100;
      if (categoryPercentage > 40) {
        newInsights.push({
          title: "Spending concentrated in one category",
          description: `${stableFormatPercentage(categoryPercentage)} of spending is in ${topCategory[0]}. Consider diversifying expenses or reviewing this category.`,
          type: "warning",
          icon: "fa-pie-chart",
        });
      }
    }
    
    // 13. Impulse buying detection (multiple transactions on same day)
    const sameDayPurchases = new Map<string, Transaction[]>();
    expenseTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      if (!sameDayPurchases.has(dateKey)) {
        sameDayPurchases.set(dateKey, []);
      }
      sameDayPurchases.get(dateKey)!.push(tx);
    });
    
    const impulseDays = Array.from(sameDayPurchases.entries())
      .filter(([_, txs]) => txs.length >= 5 && txs.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) > expenses * 0.15);
    
    if (impulseDays.length > 0) {
      newInsights.push({
        title: "Potential impulse buying detected",
        description: `Found ${impulseDays.length} days with 5+ transactions and high spending. Consider implementing a 24-hour waiting period for purchases.`,
        type: "warning",
        icon: "fa-exclamation-triangle",
      });
    }
    
    // 14. Income to expense ratio health score (enhanced calculation)
    const healthScore = (safeIncome + safeExpenses) > 0 ? (safeIncome / (safeIncome + safeExpenses)) * 100 : 0;
    
    if (healthScore >= 60) {
      newInsights.push({
        title: "Excellent financial health!",
        description: `Your financial health score is ${Math.round(healthScore)}%. You're managing money very well.`,
        type: "success",
        icon: "fa-heart",
      });
    } else if (healthScore >= 45) {
      newInsights.push({
        title: "Good financial health",
        description: `Your financial health score is ${Math.round(healthScore)}%. There's room for improvement by increasing income or reducing expenses.`,
        type: "info",
        icon: "fa-heartbeat",
      });
    } else if (healthScore > 0) {
      newInsights.push({
        title: "Financial health needs attention",
        description: `Your financial health score is ${Math.round(healthScore)}%. Focus on increasing income and controlling expenses.`,
        type: "warning",
        icon: "fa-heart-broken",
      });
    } else if (safeExpenses > 0) {
      // Special case for zero income with expenses
      newInsights.push({
        title: "Critical: Financial health at risk",
        description: "No income recorded while having expenses. Add income sources immediately to improve your financial health score.",
        type: "danger",
        icon: "fa-heart-broken",
      });
    }
    
    // 15. Seasonal spending patterns
    const monthlySpendingPattern = new Map<number, number>();
    expenseTransactions.forEach(tx => {
      const month = new Date(tx.date).getMonth();
      const amount = parseFloat(tx.amount.toString());
      monthlySpendingPattern.set(month, (monthlySpendingPattern.get(month) || 0) + amount);
    });
    
    if (monthlySpendingPattern.size >= 3) {
      const spendingValues = Array.from(monthlySpendingPattern.values());
      const avgMonthlySpending = spendingValues.reduce((sum, val) => sum + val, 0) / spendingValues.length;
      const highSpendingMonths = Array.from(monthlySpendingPattern.entries())
        .filter(([_, amount]) => amount > avgMonthlySpending * 1.3);
      
      if (highSpendingMonths.length > 0) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const highMonths = highSpendingMonths.map(([month]) => monthNames[month]).join(', ');
        
        newInsights.push({
          title: "Seasonal spending pattern detected",
          description: `Higher spending detected in ${highMonths}. Plan and budget for these seasonal increases.`,
          type: "info",
          icon: "fa-calendar-alt",
        });
      }
    }
    
    // 16. Debt-to-income warning (if expenses consistently exceed income)
    const recentMonths = 3;
    let monthsWithDeficit = 0;
    
    for (let i = 0; i < recentMonths; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthTx = stableTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
      const monthIncome = monthTx.filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const monthExpenses = monthTx.filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      
      if (monthExpenses > monthIncome) {
        monthsWithDeficit++;
      }
    }
    
    if (monthsWithDeficit >= 2) {
      newInsights.push({
        title: "Persistent deficit warning",
        description: `You've spent more than earned in ${monthsWithDeficit} of the last ${recentMonths} months. Consider debt counseling or financial planning.`,
        type: "danger",
        icon: "fa-exclamation-circle",
      });
    }
    
    // 17. Goal achievement potential (enhanced with safe calculations)
    if (safeIncome > safeExpenses) {
      const monthlySavings = (safeIncome - safeExpenses);
      const yearlyPotential = monthlySavings * 12;
      
      if (yearlyPotential >= 50000) {
        newInsights.push({
          title: "Strong goal achievement potential",
          description: `At current savings rate, you could save ${stableFormatCurrency(yearlyPotential)} annually. Perfect for major financial goals!`,
          type: "success",
          icon: "fa-bullseye",
        });
      } else if (yearlyPotential >= 20000) {
        newInsights.push({
          title: "Moderate goal achievement potential",
          description: `You could save ${stableFormatCurrency(yearlyPotential)} annually. Consider setting medium-term financial goals.`,
          type: "info",
          icon: "fa-target",
        });
      }
    }
    
    // 18. Transaction timing optimization
    const morningTx = expenseTransactions.filter(tx => {
      const hour = new Date(tx.date).getHours();
      return hour >= 6 && hour < 12;
    });
    const afternoonTx = expenseTransactions.filter(tx => {
      const hour = new Date(tx.date).getHours();
      return hour >= 12 && hour < 18;
    });
    const eveningTx = expenseTransactions.filter(tx => {
      const hour = new Date(tx.date).getHours();
      return hour >= 18 || hour < 6;
    });
    
    const morningTotal = morningTx.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
    const afternoonTotal = afternoonTx.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
    const eveningTotal = eveningTx.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
    
    const maxTimeSlot = Math.max(morningTotal, afternoonTotal, eveningTotal);
    if (maxTimeSlot > 0) {
      let timeSlotName = 'morning';
      if (maxTimeSlot === afternoonTotal) timeSlotName = 'afternoon';
      if (maxTimeSlot === eveningTotal) timeSlotName = 'evening';
      
      const percentage = (maxTimeSlot / expenses) * 100;
      if (percentage > 50) {
        newInsights.push({
          title: `Heavy ${timeSlotName} spending`,
          description: `${stableFormatPercentage(percentage)} of spending occurs in the ${timeSlotName}. Consider if this aligns with your financial goals.`,
          type: "info",
          icon: "fa-clock",
        });
      }
    }
    
    // 19. Financial milestone tracking (enhanced with safe calculations)
    const totalWealth = safeIncome - safeExpenses;
    const milestones = [
      { amount: 100000, title: "₱100K milestone achieved!" },
      { amount: 50000, title: "₱50K milestone achieved!" },
      { amount: 25000, title: "₱25K milestone achieved!" },
      { amount: 10000, title: "₱10K milestone achieved!" },
      { amount: 5000, title: "₱5K milestone achieved!" }
    ];
    
    const achievedMilestone = milestones.find(m => totalWealth >= m.amount);
    if (achievedMilestone && totalWealth > 0) {
      newInsights.push({
        title: achievedMilestone.title,
        description: `Congratulations! Your current net positive flow is ${stableFormatCurrency(totalWealth)}. Keep up the excellent financial management!`,
        type: "success",
        icon: "fa-trophy",
      });
    }
    
    // 20. Expense growth rate analysis
    const last30Days = expenseTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return txDate >= thirtyDaysAgo;
    });
    
    const previous30Days = expenseTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const sixtyDaysAgo = new Date();
      const thirtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return txDate >= sixtyDaysAgo && txDate < thirtyDaysAgo;
    });
    
    if (last30Days.length > 0 && previous30Days.length > 0) {
      const recentTotal = last30Days.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const previousTotal = previous30Days.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
      const growthRate = ((recentTotal - previousTotal) / previousTotal) * 100;
      
      if (growthRate > 25) {
        newInsights.push({
          title: "Rapid expense growth",
          description: `Your expenses grew ${stableFormatPercentage(growthRate)} in the last 30 days. Monitor spending carefully.`,
          type: "danger",
          icon: "fa-arrow-up",
        });
      } else if (growthRate < -15) {
        newInsights.push({
          title: "Expense reduction success!",
          description: `Great job! You've reduced expenses by ${stableFormatPercentage(Math.abs(growthRate))} in the last 30 days.`,
          type: "success",
          icon: "fa-arrow-down",
        });
      }
    }
    

    

    
    // Prioritize insights by importance: danger > warning > success > info
    const priorityWeights = {
      'danger': 4,
      'warning': 3, 
      'success': 2,
      'info': 1
    };
    
    // Create weighted selection - critical insights are more likely to be shown
    const weightedInsights: InsightData[] = [];
    newInsights.forEach(insight => {
      const weight = priorityWeights[insight.type] || 1;
      // Add the insight multiple times based on its weight
      for (let i = 0; i < weight; i++) {
        weightedInsights.push(insight);
      }
    });
    
    // Randomly shuffle the weighted array and remove duplicates
    const shuffledWeighted = [...weightedInsights].sort(() => Math.random() - 0.5);
    const uniqueInsights = shuffledWeighted.filter((insight, index, arr) => 
      arr.findIndex(item => item.title === insight.title) === index
    );
    
    // Select up to 4 unique insights
    const selectedInsights = uniqueInsights.slice(0, Math.min(4, uniqueInsights.length));
    
    setInsights(selectedInsights);
  }, [stableFormatCurrency, stableFormatPercentage, stableTransactions, stableBudgetData, stableExpenseCategories]);

  // Calculate transaction trends with minimal dependencies to prevent re-renders
  const calculateTransactionTrends = useCallback((): void => {
    if (!stableTransactions || stableTransactions.length === 0) {
      // Don't call setTrends here - just return to avoid infinite loop
      return;
    }

    const expenseTransactions = stableTransactions.filter(tx => tx.type === 'expense');
    
    if (expenseTransactions.length === 0) {
      // Don't call setTrends here - just return to avoid infinite loop
      return;
    }

    const monthlySpending = new Map<string, Map<string, number>>();
    
    expenseTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlySpending.has(monthKey)) {
        monthlySpending.set(monthKey, new Map<string, number>());
      }
      
      const monthData = monthlySpending.get(monthKey)!;
      // Fix: Use expense_category_id instead of category_id for expense transactions
      const categoryId = (tx as any).expense_category_id || tx.category_id || (tx as any).category || 'uncategorized';
      
      if (categoryId) {
        const amount = parseFloat(tx.amount.toString()) || 0;
        const current = monthData.get(categoryId) || 0;
        monthData.set(categoryId, current + amount);
      }
    });
    
    const sortedMonths = Array.from(monthlySpending.keys()).sort();
    
    if (sortedMonths.length < 2) {
      // Don't call setTrends here - just return to avoid infinite loop
      return;
    }

    // Compare the two most recent months with data
    const recentMonth = sortedMonths[sortedMonths.length - 1];
    const previousMonth = sortedMonths[sortedMonths.length - 2];
    
    const recentSpending = monthlySpending.get(recentMonth) || new Map();
    const previousSpending = monthlySpending.get(previousMonth) || new Map();
    
    const trendData: TrendData[] = [];
    
    const allCategories = new Set([
      ...Array.from(recentSpending.keys()),
      ...Array.from(previousSpending.keys())
    ]);
    
    allCategories.forEach(categoryId => {
      const currentAmount = recentSpending.get(categoryId) || 0;
      const prevAmount = previousSpending.get(categoryId) || 0;
      
      if (currentAmount === 0 && prevAmount === 0) return;
      
      const category = stableExpenseCategories.find(c => c.id === categoryId);
      const categoryName = category ? category.category_name : (categoryId === 'uncategorized' ? 'Uncategorized' : 'Other');
      
      let change = 0;
      if (prevAmount > 0) {
        change = ((currentAmount - prevAmount) / prevAmount) * 100;
      } else if (currentAmount > 0) {
        change = 100;
      }
      
      trendData.push({
        category: categoryName,
        change,
        previousAmount: prevAmount,
        currentAmount: currentAmount
      });
    });
    
    trendData.sort((a, b) => 
      Math.abs(b.currentAmount - b.previousAmount) - Math.abs(a.currentAmount - a.previousAmount)
    );
    
    const finalTrends = trendData.slice(0, 4);
    
    setTrends(finalTrends);
  }, [stableExpenseCategories, stableTransactions]);

  // Simplified calculations with stable dependencies
  const calculations = useMemo(() => {
    if (!stableTransactions || stableTransactions.length === 0) {
      return { income: 0, expenses: 0, savingsRate: 0, hasData: false };
    }

    const income = stableTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    const expenses = stableTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    return { income, expenses, savingsRate, hasData: true };
  }, [stableTransactions]);

  // Track if insights have been generated to prevent infinite loops
  const insightsGeneratedRef = useRef(false);
  const lastCalculationsRef = useRef({ income: 0, expenses: 0, savingsRate: 0 });

  // Effect 1: Generate insights - ONLY when we have data
  useEffect(() => {
    // Don't do anything if no data - initial state is already empty array
    if (!calculations.hasData) {
      return;
    }

    // Skip if calculations haven't meaningfully changed
    const calculationsChanged = 
      lastCalculationsRef.current.income !== calculations.income ||
      lastCalculationsRef.current.expenses !== calculations.expenses ||
      Math.abs(lastCalculationsRef.current.savingsRate - calculations.savingsRate) > 0.01;
    
    if (!calculationsChanged && insightsGeneratedRef.current) {
      return;
    }

    // Update refs
    lastCalculationsRef.current = { 
      income: calculations.income, 
      expenses: calculations.expenses, 
      savingsRate: calculations.savingsRate 
    };

    // Generate insights with debounce
    const timeoutId = setTimeout(() => {
      generateInsights(calculations.income, calculations.expenses, calculations.savingsRate);
      insightsGeneratedRef.current = true;
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [calculations.hasData, calculations.income, calculations.expenses, calculations.savingsRate, generateInsights]);

  // Track if trends have been calculated to prevent infinite loops
  const trendsCalculatedRef = useRef(false);
  const lastTransactionsLengthRef = useRef(0);

  // Effect 2: Calculate trends - ONLY when we have data
  useEffect(() => {
    // Don't do anything if no data - initial state is already empty array
    if (!calculations.hasData || stableTransactions.length === 0) {
      return;
    }

    // Skip if transactions haven't changed
    if (lastTransactionsLengthRef.current === stableTransactions.length && trendsCalculatedRef.current) {
      return;
    }

    lastTransactionsLengthRef.current = stableTransactions.length;

    // HEAVY THROTTLE: Only update trends when absolutely necessary
    const timeoutId = setTimeout(() => {
      calculateTransactionTrends();
      trendsCalculatedRef.current = true;
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [calculations.hasData, calculateTransactionTrends, stableTransactions.length]);

  // SIMPLE CHART GENERATION - Following the same pattern as TransactionCharts
  // Use a ref to track if charts have been generated to prevent unnecessary re-renders
  const chartsGeneratedRef = useRef(false);
  const lastTxCountRef = useRef(0);
  // Track the actual transaction IDs to detect real data changes
  const lastTxIdsRef = useRef<string>('');
  
  // Use a single effect with the actual transactions array to properly detect changes
  useEffect(() => {
    const txCount = stableTransactions?.length || 0;
    
    // Only generate charts if we have data - don't do anything if no data
    // This prevents the infinite loop caused by setting state to null repeatedly
    if (txCount === 0) {
      // Reset refs when no data so charts regenerate when data arrives
      chartsGeneratedRef.current = false;
      lastTxCountRef.current = 0;
      lastTxIdsRef.current = '';
      return;
    }

    // Create a hash of transaction IDs to detect actual data changes
    const txIds = stableTransactions.map(tx => tx.id).sort().join(',');
    
    // Skip if we've already generated charts for this exact data
    // Check both count AND actual transaction IDs to ensure we regenerate when data changes
    if (chartsGeneratedRef.current && lastTxCountRef.current === txCount && lastTxIdsRef.current === txIds) {
      return;
    }

    console.log('[useInsightsAndCharts] Generating charts for', txCount, 'transactions');

    // Generate monthly bar chart data
    const generateMonthlyChart = (): HighchartsConfig | null => {
      const monthsMap = new Map<string, { income: number; expenses: number }>();
      
      stableTransactions.forEach(tx => {
        const txDate = new Date(tx.date);
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth()).padStart(2, '0')}`;
        
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, { income: 0, expenses: 0 });
        }
        
        const monthData = monthsMap.get(monthKey)!;
        const amount = parseFloat(tx.amount?.toString() || '0') || 0;
        
        if (tx.type === 'income') {
          monthData.income += amount;
        } else if (tx.type === 'expense') {
          monthData.expenses += amount;
        }
      });

      // Sort months and create chart data
      const sortedMonths = Array.from(monthsMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12); // Last 12 months max

      const monthlyLabels: string[] = [];
      const monthlyIncomeData: number[] = [];
      const monthlyExpenseData: number[] = [];

      sortedMonths.forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month);
        monthlyLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        monthlyIncomeData.push(data.income);
        monthlyExpenseData.push(data.expenses);
      });

      if (monthlyLabels.length === 0) {
        return null;
      }

      return {
        chart: {
          type: "column",
          style: {
            fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          },
          backgroundColor: "transparent",
          animation: { duration: 1000 },
          height: 350,
        },
        title: { text: null },
        xAxis: {
          categories: monthlyLabels,
          crosshair: true,
          labels: { style: { color: "#858796" } },
        },
        yAxis: {
          min: 0,
          title: { text: null },
          gridLineColor: "#eaecf4",
          gridLineDashStyle: "dash",
          labels: {
            formatter: function(this: any) {
              return formatCurrency(this.value);
            },
            style: { color: "#858796" },
          },
        },
        tooltip: {
          headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
          pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>{point.y:,.0f}</b></td></tr>',
          footerFormat: '</table>',
          shared: true,
          useHTML: true,
          style: {
            fontSize: "12px",
            fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          },
          valuePrefix: "₱",
        },
        plotOptions: {
          column: {
            pointPadding: 0.2,
            borderWidth: 0,
            borderRadius: 3,
          },
          series: { animation: { duration: 1000 } },
        },
        series: [
          { name: "Income", data: monthlyIncomeData, color: "#1cc88a", type: "column" },
          { name: "Expenses", data: monthlyExpenseData, color: "#e74a3b", type: "column" },
        ],
        credits: { enabled: false },
      };
    };

    // Generate pie chart data for expense categories
    const generateCategoryChart = (): PieChartConfig | null => {
      const expenseTransactions = stableTransactions.filter(tx => tx.type === 'expense');
      
      if (expenseTransactions.length === 0) {
        return null;
      }

      const categoryMap = new Map<string, number>();
      
      expenseTransactions.forEach(tx => {
        // Check both category_id (mapped by EnhancedTransactionService) and expense_category_id (raw from DB)
        // Use type assertion to handle the raw database field
        const rawTx = tx as Transaction & { expense_category_id?: string };
        const categoryId = tx.category_id || rawTx.expense_category_id;
        let categoryName = 'Uncategorized';
        
        if (categoryId && stableExpenseCategories && stableExpenseCategories.length > 0) {
          const category = stableExpenseCategories.find(c => c.id === categoryId);
          if (category) {
            categoryName = category.category_name;
          }
        }
        
        const current = categoryMap.get(categoryName) || 0;
        const amount = parseFloat(tx.amount?.toString() || '0') || 0;
        categoryMap.set(categoryName, current + amount);
      });

      const pieData = Array.from(categoryMap.entries())
        .filter(([_, value]) => value > 0)
        .map(([name, y]) => ({ name, y }))
        .sort((a, b) => b.y - a.y);

      if (pieData.length === 0) {
        return null;
      }

      return {
        chart: {
          type: "pie",
          backgroundColor: "transparent",
          style: {
            fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          },
          height: 350,
        },
        title: { text: null },
        tooltip: {
          pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}% (₱{point.y:,.2f})',
          valuePrefix: "₱",
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: "pointer",
            dataLabels: {
              enabled: true,
              format: "<b>{point.name}</b>: {point.percentage:.1f}%",
              style: { fontWeight: "normal" },
              connectorWidth: 0,
              distance: 15,
            },
            showInLegend: false,
            size: '85%',
          },
        },
        legend: { enabled: false },
        series: [{
          name: "Expenses",
          colorByPoint: true,
          data: pieData,
        }],
        credits: { enabled: false },
      };
    };

    // Generate charts
    const monthlyChart = generateMonthlyChart();
    const categoryChart = generateCategoryChart();
    
    setMonthlyData(monthlyChart);
    setCategoryData(categoryChart);
    chartsGeneratedRef.current = true;
    lastTxCountRef.current = txCount;
    lastTxIdsRef.current = txIds;
    
  }, [stableTransactions, stableExpenseCategories]); // Depend on actual arrays to detect content changes

  // Manual refresh function for insights
  const refreshInsights = useCallback(() => {
    if (calculations.hasData) {
      generateInsights(calculations.income, calculations.expenses, calculations.savingsRate);
    }
  }, [calculations.hasData, calculations.income, calculations.expenses, calculations.savingsRate, generateInsights]);

  return {
    insights,
    trends,
    monthlyData,
    categoryData,
    refreshInsights
  };
};

// Export the hook directly
export const useInsightsAndCharts = useInsightsAndChartsInternal;