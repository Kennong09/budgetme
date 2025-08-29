import { useState, useEffect } from 'react';
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

export const useInsightsAndCharts = (
  transactions: Transaction[],
  budgetData: BudgetItem[],
  expenseCategories: Category[],
  userId: string
) => {
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [monthlyData, setMonthlyData] = useState<HighchartsConfig | null>(null);
  const [categoryData, setCategoryData] = useState<PieChartConfig | null>(null);

  // Helper function to check if spending is consistent
  const checkConsistentSpending = (transactions: Transaction[]): boolean => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = today.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthExpenses = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === currentMonth &&
             txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    const previousMonthExpenses = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getMonth() === previousMonth &&
             txDate.getFullYear() === previousYear;
    }).reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    
    if (currentMonthExpenses === 0 || previousMonthExpenses === 0) {
      return false;
    }
    
    const percentDifference = Math.abs(currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses * 100;
    return percentDifference <= 10;
  };

  // Helper function to calculate debt reduction percentage
  const calculateDebtReduction = (transactions: Transaction[]): number => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = today.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
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
    
    if (currentMonthDebt === 0 || previousMonthDebt === 0) {
      return 0;
    }
    
    return ((previousMonthDebt - currentMonthDebt) / previousMonthDebt) * 100;
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
    
    if (!transactions || transactions.length === 0) {
      setInsights([]);
      return;
    }
    
    // Find unusually large transactions
    const unusualTransactions = transactions.filter(tx => {
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
          description: `There's an unusually large subscription charge of ${formatCurrency(Number(largeSubscription.amount))} on ${new Date(largeSubscription.date).toLocaleDateString()}. Please verify this transaction.`,
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
        description: `You spent ${formatCurrency(expenses - income)} more than you earned this period. Review your expenses to identify areas to cut back.`,
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
    
    // Consistency insights
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
    
    // Debt reduction insights
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
    
    // Add positive insight if we don't have many
    if (newInsights.length < 2 && income > expenses) {
      newInsights.push({
        title: "Positive cash flow",
        description: `You have a positive balance of ${formatCurrency(income - expenses)} this period. Keep up the good work!`,
        type: "success",
        icon: "fa-sack-dollar",
      });
    }
    
    setInsights(newInsights.slice(0, 3));
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
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthName = months[monthDate.getMonth()];
      labels.push(monthName);
      
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
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

  // Calculate category data from filtered transactions
  const calculateCategoryDataFiltered = (transactions: Transaction[], expenseCategories: Category[]): CategoryData => {
    const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
    
    const categoryMap = new Map<string, number>();
    const categoryNames = new Map<string, string>();
    
    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        const currentTotal = categoryMap.get(tx.category_id) || 0;
        const amount = parseFloat(tx.amount.toString()) || 0;
        categoryMap.set(tx.category_id, currentTotal + amount);
        
        const category = expenseCategories.find(cat => cat.id === tx.category_id);
        if (category) {
          categoryNames.set(tx.category_id, category.category_name);
        } else {
          categoryNames.set(tx.category_id, 'Uncategorized');
        }
      }
    });
    
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

  // Format monthly data for Highcharts
  const formatMonthlyDataForHighcharts = (data: MonthlyData | null): HighchartsConfig | null => {
    if (!data || !data.datasets || !data.labels) {
      return null;
    }
    
    const hasData = data.datasets.some(dataset => 
      dataset.data && dataset.data.length > 0
    );
    
    if (!hasData) {
      return null;
    }

    return {
      chart: {
        type: "column",
        style: {
          fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        },
        backgroundColor: "transparent",
        animation: {
          duration: 1000,
        },
        height: 350,
      },
      title: {
        text: null,
      },
      xAxis: {
        categories: data.labels,
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
          fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
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
      series: [
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
      ],
    };
  };

  // Format category data for Highcharts pie chart
  const formatCategoryDataForHighcharts = (data: CategoryData | null): PieChartConfig | null => {
    if (!data || !data.datasets || !data.labels || data.labels.length === 0 || data.datasets[0].data.length === 0) {
      return null;
    }

    const hasValues = data.datasets[0].data.some(value => value > 0);
    if (!hasValues) {
      return null;
    }

    const pieData = data.labels.map((label, index) => ({
      name: label,
      y: data.datasets[0].data[index],
      sliced: index === 0,
      selected: index === 0
    }));

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: {
          fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
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

  // Calculate transaction trends based on filtered data
  const calculateTransactionTrends = (transactions: Transaction[], expenseCategories: Category[]) => {
    if (!transactions || transactions.length === 0) {
      setTrends([]);
      return;
    }

    const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
    
    if (expenseTransactions.length === 0) {
      setTrends([]);
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
      if (tx.category_id) {
        const amount = parseFloat(tx.amount.toString()) || 0;
        const current = monthData.get(tx.category_id) || 0;
        monthData.set(tx.category_id, current + amount);
      }
    });

    const sortedMonths = Array.from(monthlySpending.keys()).sort();
    
    if (sortedMonths.length < 2) {
      setTrends([]);
      return;
    }

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
      
      const category = expenseCategories.find(c => c.id === categoryId);
      const categoryName = category ? category.category_name : 'Other';
      
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
    
    setTrends(trendData.slice(0, 4));
  };

  // Update insights and charts when data changes
  useEffect(() => {
    if (transactions.length > 0) {
      const income = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const expenses = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      generateInsights(income, expenses, savingsRate, budgetData, transactions);
      calculateTransactionTrends(transactions, expenseCategories);
      
      // Update monthly data
      const calculatedMonthlyData = calculateMonthlyData(userId, transactions);
      const formattedMonthlyData = formatMonthlyDataForHighcharts(calculatedMonthlyData);
      setMonthlyData(formattedMonthlyData);
      
      // Update category data
      const calculatedCategoryData = calculateCategoryDataFiltered(transactions, expenseCategories);
      const formattedCategoryData = formatCategoryDataForHighcharts(calculatedCategoryData);
      setCategoryData(formattedCategoryData);
    } else {
      setInsights([]);
      setTrends([]);
      setMonthlyData(null);
      setCategoryData(null);
    }
  }, [transactions, budgetData, expenseCategories, userId]);

  return {
    insights,
    trends,
    monthlyData,
    categoryData
  };
};
