import { Transaction, UserData, FilterState, LineChartConfig, PieChartConfig } from '../types';
import { formatCurrency } from '../../../utils/helpers';

/**
 * Apply filters to transactions array
 */
export const applyTransactionFilters = (
  transactions: Transaction[],
  filter: FilterState,
  userId?: string
): Transaction[] => {
  let result = [...transactions];

  // Filter by type
  if (filter.type !== "all") {
    result = result.filter((tx) => tx.type === filter.type);
  }

  // Filter by account
  if (filter.accountId !== "all") {
    result = result.filter((tx) => tx.account_id === filter.accountId);
  }

  // Filter by category
  if (filter.categoryId !== "all") {
    if (filter.categoryId === "uncategorized") {
      // Show only transactions without a category_id or with invalid category_id
      result = result.filter((tx) => !tx.category_id);
    } else {
      // Show only transactions with the specified category_id
      result = result.filter((tx) => tx.category_id && tx.category_id === filter.categoryId);
    }
  }
  
  // Filter by goal_id if provided
  if (filter.goal_id) {
    result = result.filter(tx => tx.goal_id === filter.goal_id);
  }

  // Filter by month and year
  if (filter.month !== "all" || filter.year !== "all") {
    result = result.filter((tx) => {
      const txDate = new Date(tx.date);
      
      // Filter by month if specified
      if (filter.month !== "all") {
        const monthIndex = parseInt(filter.month);
        if (txDate.getMonth() !== monthIndex) {
          return false;
        }
      }
      
      // Filter by year if specified
      if (filter.year !== "all") {
        const year = parseInt(filter.year);
        if (txDate.getFullYear() !== year) {
          return false;
        }
      }
      
      return true;
    });
  }

  // Filter by search term
  if (filter.search.trim() !== "") {
    const searchLower = filter.search.toLowerCase();
    result = result.filter((tx) =>
      tx.description.toLowerCase().includes(searchLower)
    );
  }

  // Filter by scope (personal or family)
  if (filter.scope !== "all" && userId) {
    result = result.filter((tx) => {
      if (filter.scope === "personal") {
        return tx.user_id === userId;
      } else if (filter.scope === "family") {
        return tx.user_id !== userId;
      }
      return true;
    });
  }

  return result;
};

/**
 * Calculate summary metrics from transactions
 */
export const calculateSummaryMetrics = (transactions: Transaction[]) => {
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalContributions = transactions
    .filter(tx => tx.type === 'contribution')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  // Contributions are effectively expenses but tracked separately for goal progress
  const totalExpensesIncludingContributions = totalExpenses + totalContributions;
  const netCashflow = totalIncome - totalExpensesIncludingContributions;
  const expensesRatio = totalIncome > 0 ? (totalExpensesIncludingContributions / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses: totalExpensesIncludingContributions,
    totalContributions,
    netCashflow,
    expensesRatio
  };
};

/**
 * Get period title for display
 */
export const getPeriodTitle = (filter: FilterState): string => {
  if (filter.month !== "all" && filter.year !== "all") {
    const monthName = new Date(0, parseInt(filter.month)).toLocaleString('default', { month: 'long' });
    return `${monthName} ${filter.year}`;
  } else if (filter.month !== "all") {
    const monthName = new Date(0, parseInt(filter.month)).toLocaleString('default', { month: 'long' });
    return `${monthName} (All Years)`;
  } else if (filter.year !== "all") {
    return filter.year;
  } else {
    return "All Time";
  }
};

/**
 * Get category name by id and type
 */
export const getCategoryName = (
  categoryId?: string, 
  type?: "income" | "expense" | "contribution", 
  userData?: UserData | null
): string => {
  if (!categoryId || !userData) return "Uncategorized";
  
  // If type is provided, only search in the corresponding categories
  if (type === "income") {
    const category = userData.incomeCategories.find(c => c.id === categoryId);
    return category ? category.category_name : "Uncategorized";
  } else if (type === "expense" || type === "contribution") {
    // Both expense and contribution use expense categories
    const category = userData.expenseCategories.find(c => c.id === categoryId);
    return category ? category.category_name : "Uncategorized";
  }
  
  // If type is not provided, search in both categories
  const incomeCategory = userData.incomeCategories.find(c => c.id === categoryId);
  if (incomeCategory) return incomeCategory.category_name;
  
  const expenseCategory = userData.expenseCategories.find(c => c.id === categoryId);
  if (expenseCategory) return expenseCategory.category_name;
  
  return "Uncategorized";
};

/**
 * Get account name by id
 */
export const getAccountName = (accountId: string, userData?: UserData | null): string => {
  if (!userData) return "Unknown Account";
  const account = userData.accounts.find(a => a.id === accountId);
  return account ? account.account_name : "Unknown Account";
};

/**
 * Determine transaction type from category ID
 */
export const getTransactionTypeFromCategory = (
  categoryId: string, 
  userData?: UserData | null,
  currentType?: "income" | "expense" | "contribution" | "all"
): "income" | "expense" | "contribution" | "all" => {
  if (!userData) return "all";
  
  // Check both income and expense categories
  const incomeCategory = userData.incomeCategories.find(cat => cat.id === categoryId);
  const expenseCategory = userData.expenseCategories.find(cat => cat.id === categoryId);
  
  // Handle the case where the category ID exists in both income and expense categories
  if (incomeCategory && expenseCategory) {
    // Use the current filter type to resolve ambiguity
    if (currentType === "income" || currentType === "expense" || currentType === "contribution") {
      return currentType;
    }
    
    // Default to expense for Housing (special case)
    if (expenseCategory.category_name === "Housing") {
      return "expense";
    }
    
    // If we can't resolve, default to expense
    return "expense";
  }
  
  // If category is found in income categories only
  if (incomeCategory) {
    return "income";
  }
  
  // If category is found in expense categories only
  if (expenseCategory) {
    return "expense";
  }
  
  return "all";
};

/**
 * Prepare chart data for visualization
 */
export const prepareChartData = (
  txData: Transaction[], 
  userData: UserData, 
  filter: FilterState
): { lineChartOptions: LineChartConfig | null; pieChartOptions: PieChartConfig | null } => {
  // If no data, return empty charts
  if (!txData.length) {
    return {
      lineChartOptions: null,
      pieChartOptions: null
    };
  }
  
  // Variables for line chart data
  let chartLabels: string[] = [];
  let incomeData: number[] = [];
  let expenseData: number[] = [];

  // Group data based on filter
  if (filter.month !== "all" && filter.year !== "all") {
    // Show daily data for specific month
    const year = parseInt(filter.year);
    const month = parseInt(filter.month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create labels for days in month
    chartLabels = Array.from({ length: daysInMonth }, (_, i) => `${month + 1}/${i + 1}`);
    
    // Initialize data arrays with zeros
    incomeData = Array(daysInMonth).fill(0);
    expenseData = Array(daysInMonth).fill(0);
    
    // Fill in the data
    txData.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const day = txDate.getDate() - 1; // 0-indexed array
        
        if (tx.type === 'income') {
          incomeData[day] += tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'contribution') {
          expenseData[day] += tx.amount;
        }
      }
    });
  } else if (filter.year !== "all") {
    // Show monthly data for specific year
    const year = parseInt(filter.year);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    chartLabels = monthNames;
    
    // Initialize data arrays with zeros
    incomeData = Array(12).fill(0);
    expenseData = Array(12).fill(0);
    
    // Fill in the data
    txData.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year) {
        const month = txDate.getMonth();
        
        if (tx.type === 'income') {
          incomeData[month] += tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'contribution') {
          expenseData[month] += tx.amount;
        }
      }
    });
  } else if (filter.month !== "all") {
    // Show yearly data for specific month
    const month = parseInt(filter.month);
    
    // Get unique years from transactions
    const years = Array.from(new Set(txData.map(tx => new Date(tx.date).getFullYear()))).sort();
    chartLabels = years.map(year => year.toString());
    
    // Initialize data arrays with zeros
    incomeData = Array(years.length).fill(0);
    expenseData = Array(years.length).fill(0);
    
    // Fill in the data
    txData.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() === month) {
        const yearIndex = years.indexOf(txDate.getFullYear());
        
        if (yearIndex >= 0) {
          if (tx.type === 'income') {
            incomeData[yearIndex] += tx.amount;
          } else if (tx.type === 'expense' || tx.type === 'contribution') {
            expenseData[yearIndex] += tx.amount;
          }
        }
      }
    });
  } else {
    // Show all data grouped by year
    // Get unique years from transactions
    const years = Array.from(new Set(txData.map(tx => new Date(tx.date).getFullYear()))).sort();
    chartLabels = years.map(year => year.toString());
    
    // Initialize data arrays with zeros
    incomeData = Array(years.length).fill(0);
    expenseData = Array(years.length).fill(0);
    
    // Fill in the data
    txData.forEach(tx => {
      const txDate = new Date(tx.date);
      const yearIndex = years.indexOf(txDate.getFullYear());
      
      if (yearIndex >= 0) {
        if (tx.type === 'income') {
          incomeData[yearIndex] += tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'contribution') {
          expenseData[yearIndex] += tx.amount;
        }
      }
    });
  }

  // Create line chart config
  const lineChartOptions: LineChartConfig = {
    chart: {
      type: "line",
      style: {
        fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      },
      backgroundColor: "transparent",
      animation: { duration: 1000 },
      height: 350,
    },
    title: { text: null },
    xAxis: {
      categories: chartLabels,
      labels: { style: { color: "#858796" } },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: "#eaecf4",
      gridLineDashStyle: "dash",
      labels: {
        formatter: function () {
          return formatCurrency((this as any).value);
        },
        style: { color: "#858796" },
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      style: {
        fontSize: "12px",
        fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      },
      valuePrefix: "$",
    },
    plotOptions: {
      line: {
        marker: { radius: 4, symbol: "circle" },
        lineWidth: 3,
      },
      series: { animation: { duration: 1000 } },
    },
    credits: { enabled: false },
    series: [
      { name: "Income", data: incomeData, color: "#1cc88a" },
      { name: "Expenses", data: expenseData, color: "#e74a3b" },
    ],
  };

  // Group transactions by category for the pie chart
  const expensesByCategory: {[key: string]: number} = {};
  txData.forEach(tx => {
    if (tx.type === 'expense' || tx.type === 'contribution') {
      // Find category name using the category_id
      let categoryName = 'Uncategorized';
      
      if (tx.category_id) {
        const category = userData.expenseCategories.find(cat => cat.id === tx.category_id);
        if (category) {
          categoryName = category.category_name;
        }
      }
      
      // Special handling for contribution transactions
      if (tx.type === 'contribution') {
        categoryName = tx.goal_id ? `Goal Contribution` : 'Contribution';
      }
      
      if (!expensesByCategory[categoryName]) {
        expensesByCategory[categoryName] = 0;
      }
      expensesByCategory[categoryName] += tx.amount;
    }
  });

  const pieData = Object.keys(expensesByCategory).map(cat => ({
    name: cat,
    y: expensesByCategory[cat],
    sliced: false,
    selected: false
  }));

  // Sort by amount descending
  pieData.sort((a, b) => b.y - a.y);

  // Select the largest segment
  if (pieData.length > 0) {
    pieData[0].sliced = true;
    pieData[0].selected = true;
  }

  // Create pie chart config
  const pieChartOptions: PieChartConfig = {
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
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> (${point.y:,.2f})',
      valuePrefix: "$",
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.1f} %",
          style: { fontWeight: "normal" },
          connectorWidth: 0,
          distance: 15
        },
        showInLegend: false,
        size: '85%',
      },
    },
    legend: { enabled: false },
    series: [{
      name: "Expenses",
      colorByPoint: true,
      data: pieData
    }],
    credits: { enabled: false },
  };

  return { lineChartOptions, pieChartOptions };
};

/**
 * Generate years for filter dropdown
 */
export const generateYearOptions = (count: number = 5): number[] => {
  return Array.from({ length: count }, (_, i) => new Date().getFullYear() - i);
};

/**
 * Create default filter state
 */
export const createDefaultFilter = (queryParams?: URLSearchParams): FilterState => {
  const defaultMonth = queryParams?.get('month') || "all";
  const defaultYear = queryParams?.get('year') || "all";
  const defaultType = queryParams?.get('type') as "all" | "income" | "expense" || "all";
  const defaultCategoryId = queryParams?.get('categoryId') || "all";
  const defaultAccountId = queryParams?.get('accountId') || "all";
  const defaultSearch = queryParams?.get('search') || "";
  const defaultGoalId = queryParams?.get('goal_id') || undefined;

  return {
    type: defaultType,
    accountId: defaultAccountId,
    categoryId: defaultCategoryId,
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    sortBy: "date",
    sortOrder: "desc",
    month: defaultMonth,
    year: defaultYear,
    search: defaultSearch,
    scope: "all",
    goal_id: defaultGoalId,
    currentPage: 1,
    pageSize: 10
  };
};