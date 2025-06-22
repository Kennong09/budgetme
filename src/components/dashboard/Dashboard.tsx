import React, { useState, useEffect, useRef, FC } from "react";
import { Link } from "react-router-dom";
import HighchartsReact from "highcharts-react-official";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getCurrentMonthDates,
} from "../../utils/helpers";
import {
  getCurrentUserData,
  getTotalIncome,
  getTotalExpenses,
  getMonthlySpendingData,
  getCategorySpendingData,
  getBudgetProgressData,
  sortByDate,
  getTopBudgetCategories,
  getTransactionTrends,
  calculateConsistentSpending,
  calculateDebtReduction,
  findUnusualTransactions,
  getTransactionsByDate,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  family,
} from "../../data/mockData";
import ErrorBoundary from "../ErrorBoundary";

// Import initialized Highcharts from utils
import Highcharts from "../../utils/highchartsInit";
import { Transaction, Budget } from "../../types";

// Import dashboard components
import BudgetProgress from "./BudgetProgress";
import RecentTransactions from "./RecentTransactions";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import SB Admin theme-related styles
import "./dashboard.css";

// Import Animate.css
import "animate.css";

// Define types for mock data
interface MockUser {
  id: number;
  name?: string;
  username?: string;
  email: string;
  profilePicture?: string;
}

interface MockData {
  user: MockUser;
  transactions: Transaction[];
  // Add other mock data properties as needed
}

interface UserData {
  user: {
    id: number;
    name: string;
    email: string;
    profilePicture?: string;
  };
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

// Update the interface for BudgetProgressItem to be compatible with BudgetItem in BudgetProgress.tsx
interface BudgetProgressItem {
  id: string | number;
  category: string;
  name?: string;
  amount: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success";
  budget?: number;
  month?: string;
  year?: number;
  period?: string;
  period_start?: string;
  period_end?: string;
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
  inviter_user_id: number;
}

const Dashboard: FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [monthlyData, setMonthlyData] = useState<HighchartsConfig | null>(null);
  const [categoryData, setCategoryData] = useState<PieChartConfig | null>(null);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgressItem[]>([]);
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

  useEffect(() => {
    // Simulate API call delay
    const timer = setTimeout(() => {
      // Get the most recent transaction date to determine "current" month
      const rawData = getCurrentUserData(1) as unknown;
      const user = rawData as MockData;

      if (!user || !user.user) {
        setLoading(false);
        return;
      }

      // Find the most recent transaction date to determine current month
      const sortedTransactions = sortByDate(user.transactions);
      const latestTransaction = sortedTransactions[0]; // Already sorted by date (newest first)
      
      // Use the latest transaction date as "current" month
      const currentDate = latestTransaction ? new Date(latestTransaction.date) : new Date();
      
      // Create date range text for UI
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
      const rangeText = startYear === currentYear 
        ? `${startMonth}-${currentMonth} ${currentYear}` 
        : `${startMonth} ${startYear}-${currentMonth} ${currentYear}`;
      
      setMonthRangeText(rangeText);
      
      // Calculate the first and last day of the current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

      // Calculate income and expenses from actual transactions
      const income = getTotalIncome(user.user.id, firstDay, lastDay);
      const expenses = getTotalExpenses(user.user.id, firstDay, lastDay);
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      setUserData({
        user: {
          id: user.user.id,
          name: user.user.username || "User",
          email: user.user.email,
        },
        transactions: user.transactions || [],
        summaryData: {
          income,
          expenses,
          balance: income - expenses,
          savingsRate,
        },
      });

      // Calculate and set monthly spending data from actual transactions
      // Pass the current date to calculate the correct months
      const calculatedMonthlyData = calculateMonthlyData(user.user.id, currentDate);
      setMonthlyData(formatMonthlyDataForHighcharts(calculatedMonthlyData));

      // Set category data for Highcharts using actual transactions from current month
      const calculatedCategoryData = calculateCategoryData(user.user.id, firstDay, lastDay);
      setCategoryData(formatCategoryDataForHighcharts(calculatedCategoryData));

      // Get budget progress data and convert to expected format
      const rawBudgetData = getBudgetProgressData(user.user.id);
      const typedBudgetData: BudgetProgressItem[] = rawBudgetData.map(budget => ({
        id: budget.id,
        category: budget.category || "",
        name: budget.category || "", // Use category as name if needed
        spent: budget.spent,
        amount: budget.budget, // budget.budget contains the amount value
        remaining: budget.remaining,
        percentage: budget.percentage,
        status: budget.status as "success" | "warning" | "danger",
        budget: budget.budget,
        month: budget.month,
        year: budget.year,
        period_start: budget.period_start,
        period_end: budget.period_end
      }));
      
      setBudgetProgress(typedBudgetData);

      // Get recent transactions and sort by date
      const transactions = sortByDate(user.transactions).slice(0, 5);
      setRecentTransactions(transactions);

      // Generate insights based on financial data
      generateInsights(income, expenses, savingsRate, typedBudgetData);
      
      // Get transaction trends
      const trendData = getTransactionTrends(user.user.id.toString());
      setTrends(trendData as unknown as TrendData[]);

      // Check for pending family invitations
      const invites = getPendingInvitations(user.user.email);
      setPendingInvites(invites as unknown as Invitation[]);

      setLoading(false);
    }, 800);

    // Auto-hide welcome message
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(welcomeTimer);
    };
  }, []);

  // Function to calculate monthly data from actual transactions
  const calculateMonthlyData = (userId: string | number, currentDate: Date): MonthlyData => {
    const months = [
      "January", "February", "March", "April", "May",
      "June", "July", "August", "September", "October",
      "November", "December"
    ];
    
    // Get data for current month and past 4 months
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
      const monthYear = monthDate.getFullYear();
      labels.push(monthName);
      
      // Get transactions for this month
      const monthTransactions = getTransactionsByDate(
        userId,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      
      // Calculate income and expenses
      const monthlyIncome = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const monthlyExpenses = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
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
  
  // Function to calculate category data from actual transactions
  const calculateCategoryData = (userId: string | number, startDate: string, endDate: string): CategoryData => {
    // Get transactions for current month
    const transactions = getTransactionsByDate(userId, startDate, endDate);
    
    // Filter expense transactions
    const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
    
    // Group by category
    const categoryMap = new Map<number, number>();
    const categoryNames = new Map<number, string>();
    
    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        // Add to category total
        const currentTotal = categoryMap.get(tx.category_id) || 0;
        categoryMap.set(tx.category_id, currentTotal + tx.amount);
        
        // Store category name (This is simplified, in real app you'd get from category data)
        const categoryName = getCategoryName(tx.category_id);
        categoryNames.set(tx.category_id, categoryName);
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
    budgetData: BudgetProgressItem[]
  ): void => {
    const newInsights: InsightData[] = [];
    const userId = userData?.user.id || 1;
    
    // Detect unusual subscription transaction
    const unusualTxs = findUnusualTransactions(userId);
    if (unusualTxs.length > 0) {
      // Find large subscription (from mockData.js)
      const largeSubscription = unusualTxs.find(tx => 
        tx.amount > 10000 && tx.category_id === 12
      );
      
      if (largeSubscription) {
        newInsights.push({
          title: "Critical: Unusual subscription charge",
          description: `There's an unusually large subscription charge of ${formatCurrency(largeSubscription.amount)} on ${formatDate(largeSubscription.date)}. Please verify this transaction.`,
          type: "danger",
          icon: "fa-exclamation-circle",
        });
      } else if (unusualTxs.length > 0) {
        newInsights.push({
          title: "Unusual spending detected",
          description: `Found ${unusualTxs.length} ${unusualTxs.length === 1 ? 'transaction' : 'transactions'} that ${unusualTxs.length === 1 ? 'doesn\'t' : 'don\'t'} match your typical spending pattern.`,
          type: "warning",
          icon: "fa-exclamation-circle",
        });
      }
    }
    
    // Budget insights
    const overBudgetCategories = budgetData.filter(budget => 
      budget.spent > (budget.budget || budget.amount)
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
    
    // Consistent spending pattern insight - dynamically calculated
    const isSpendingConsistent = calculateConsistentSpending(userId);
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
    
    // Debt reduction insight
    const debtReductionPercent = calculateDebtReduction(userId);
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

  const handleAcceptInvite = (inviteId: number) => {
    if (acceptInvitation(inviteId)) {
      alert("Invitation accepted! You are now part of the family.");
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
      // Optionally, you could refresh user data here to reflect family membership
    } else {
      alert("Failed to accept invitation.");
    }
  };

  const handleRejectInvite = (inviteId: number) => {
    if (rejectInvitation(inviteId)) {
      alert("Invitation rejected.");
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
    } else {
      alert("Failed to reject invitation.");
    }
  };

  // Format monthly data for Highcharts
  const formatMonthlyDataForHighcharts = (
    data: MonthlyData | null
  ): HighchartsConfig | null => {
    if (!data || !data.datasets || !data.labels) return null;

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
    if (!data || !data.datasets || !data.labels) return null;

    const pieData = data.labels.map((label, index) => ({
      name: label,
      y: data.datasets[0].data[index],
      // First segment slightly pulled out
      sliced: index === 0,
      selected: index === 0,
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
        pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}<br><span style="font-size:10px">Click for more details</span>',
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
          size: '85%',
          point: {
            events: {
              click: function() {
                // Navigate to transactions page with category filter only
                const categoryName = (this as any).name;
                const categoryId = data.labels.findIndex(label => label === categoryName) + 1; // Assuming category IDs start at 1
                window.location.href = `/transactions?categoryId=${categoryId}&month=5&year=2025`;
              }
            }
          }
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
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading your dashboard...</p>
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
              const inviter = userData?.user?.id === 1 ? "mockdata" : "another user"; // Simplified for demo
              const familyData = family.find(f => f.id === invite.family_id);
              return (
                  <div key={invite.id} className="d-flex justify-content-between align-items-center mb-2">
                      <p className="mb-0">
                          You have been invited by <strong>{inviter}</strong> to join the <strong>{familyData?.family_name}</strong>.
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
      {insights.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <h6 className="text-xs font-weight-bold text-primary text-uppercase mb-3">
              Financial Insights
            </h6>
            <div className="row">
              {insights.map((insight, index) => (
                <div 
                  key={`insight-${index}`} 
                  className={`col-md-${12 / insights.length} mb-2 ${index === 0 ? 'new-insight' : ''}`}
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
      )}

      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
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
      <div className="row">
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
              {highchartsLoaded && monthlyData && (
                <ErrorBoundary>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={monthlyData}
                    ref={monthlyChartRef}
                    callback={monthlyChartCallback}
                  />
                </ErrorBoundary>
              )}
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Hover over the bars to see exact amounts. Click on a bar to see transaction details for that month.
              </div>
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
              {highchartsLoaded && categoryData && (
                <ErrorBoundary>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={categoryData}
                    ref={categoryChartRef}
                    callback={categoryChartCallback}
                  />
                </ErrorBoundary>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Click on a category to see detailed transactions.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Trends */}
      {trends.length > 0 && (
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
              <div style={{ maxHeight: '445px', overflowY: 'auto', marginBottom: '25px' }}>
                <BudgetProgress 
                  budgets={budgetProgress}
                  onBudgetItemClick={(budget) => {
                    // Navigate to transactions page with category filter only
                    window.location.href = `/transactions?categoryId=${budget.id}&month=5&year=2025`;
                  }}
                />
              </div>
              
              {/* Tip outside scrollable area */}
              <div className="text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Click on a view transactions and manage your budget limits.
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4 h-100">
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
              <RecentTransactions transactions={recentTransactions} />
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Click on a transaction to see details or edit it.
              </div>
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
