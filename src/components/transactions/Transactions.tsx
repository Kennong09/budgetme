import React, { useState, useEffect, FC, ChangeEvent, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

import {
  formatCurrency,
  formatDate,
  getCurrentMonthDates,
  formatPercentage,
  getCurrentMonthYear,
} from "../../utils/helpers";
import {
  getCurrentUserData,
  getCategoryById,
  getAccountById,
  sortByDate,
} from "../../data/mockData";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import ErrorBoundary from "../ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense";
  category_id?: string;
  account_id: string;
  created_at: string;
  goal_id?: string;
  user_id: string;
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface Goal {
  id: string;
  goal_name: string;
  current_amount: number;
  target_amount: number;
}

interface UserData {
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
  transactions: Transaction[];
}

interface FilterState {
  categoryId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  type: "all" | "income" | "expense";
  sortBy: "date" | "amount" | "category";
  sortOrder: "asc" | "desc";
  accountId: string;
  month: string;
  year: string;
  search: string;
  scope: "all" | "personal" | "family"; // Filter for personal or family transactions
  goal_id?: string; // Add goal_id filter
}

// Highcharts interfaces
interface LineChartConfig {
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
    labels: {
      style: {
        color: string;
      };
    };
  };
  yAxis: {
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
    shared: boolean;
    useHTML: boolean;
    formatter?: () => string;
    style: {
      fontSize: string;
      fontFamily: string;
    };
    valuePrefix: string;
  };
  plotOptions: {
    line: {
      marker: {
        radius: number;
        symbol: string;
      };
      lineWidth: number;
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
    };
  };
  legend: {
    enabled?: boolean;
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

const Transactions: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscriptionEstablished, setSubscriptionEstablished] = useState<boolean>(false);
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Family status states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);
  const [familyTransactions, setFamilyTransactions] = useState<Transaction[]>([]);
  const [showingFamilyTransactions, setShowingFamilyTransactions] = useState<boolean>(false);
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Get current date for default filter
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth().toString(); // 0-11 for Jan-Dec
  const currentYear = currentDate.getFullYear().toString();
  const defaultMonth = queryParams.get('month') || currentMonth;
  const defaultYear = queryParams.get('year') || currentYear;
  const defaultType = queryParams.get('type') as "all" | "income" | "expense" || "all";
  const defaultCategoryId = queryParams.get('categoryId') || "all";
  const defaultAccountId = queryParams.get('accountId') || "all";
  const defaultSearch = queryParams.get('search') || "";
  const defaultGoalId = queryParams.get('goal_id') || undefined;

  // Complete FilterState initialization with all required fields
  const [filter, setFilter] = useState<FilterState>({
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
    goal_id: defaultGoalId
  });

  const [userData, setUserData] = useState<UserData | null>(null);
  const [lineChartOptions, setLineChartOptions] = useState<LineChartConfig | null>(null);
  const [pieChartOptions, setPieChartOptions] = useState<PieChartConfig | null>(null);
  const lineChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  // Function to fetch user data from Supabase
  const fetchUserData = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user's accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, balance')
        .eq('user_id', user.id);
        
      if (accountsError) throw accountsError;
      
      // Fetch income categories
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_categories')
        .select('id, category_name, icon')
        .eq('user_id', user.id)
        .order('category_name');
        
      if (incomeError) throw incomeError;
      
      // Fetch expense categories
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_categories')
        .select('id, category_name, icon')
        .eq('user_id', user.id)
        .order('category_name');
        
      if (expenseError) throw expenseError;
      
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_name, current_amount, target_amount')
        .eq('user_id', user.id)
        .order('goal_name');
        
      if (goalsError) throw goalsError;
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (transactionsError) throw transactionsError;
      
      // Update state with fetched data
      setUserData({
        accounts: accountsData || [],
        incomeCategories: incomeData || [],
        expenseCategories: expenseData || [],
        goals: goalsData || [],
        transactions: transactionsData || []
      });

      // Set transactions for filtering
      setTransactions(transactionsData || []);
      setFilteredTransactions(transactionsData || []);
      
      // Prepare data for charts with the fetched data
      prepareChartData(transactionsData || [], {
        accounts: accountsData || [],
        incomeCategories: incomeData || [],
        expenseCategories: expenseData || [],
        goals: goalsData || [],
        transactions: transactionsData || []
      });

      // Auto-detect transaction type from category if categoryId is provided
      if (filter.categoryId !== "all") {
        const categoryId = filter.categoryId;
        
        // Check if it's an income category
        const isIncomeCategory = incomeData?.some(cat => cat.id === categoryId);
        // Check if it's an expense category
        const isExpenseCategory = expenseData?.some(cat => cat.id === categoryId);
        
        if (isIncomeCategory) {
          setFilter(prev => ({ ...prev, type: "income" }));
        } else if (isExpenseCategory) {
          setFilter(prev => ({ ...prev, type: "expense" }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showErrorToast(error.message || 'Error loading your data');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    if (user && !subscriptionEstablished) {
      // Set up Supabase real-time subscription for transactions
      const transactionsSubscription = supabase
        .channel('public:transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transactions change received!', payload);
            // Refresh data when changes occur
            fetchUserData();
          }
        )
        .subscribe();
        
      setSubscriptionEstablished(true);
      
      // Clean up subscription when component unmounts
      return () => {
        supabase.removeChannel(transactionsSubscription);
      };
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchUserData();
  }, [user]);

  // Set up real-time subscriptions after fetching initial data
  useEffect(() => {
    if (user && !loading && !subscriptionEstablished) {
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user, loading, subscriptionEstablished]);

  // Update URL when filters change
  useEffect(() => {
    if (transactions.length === 0) return;
    
    // Create URL search params from filters
    const params = new URLSearchParams();
    
    // Only add parameters that are not default values
    if (filter.type !== "all") params.set("type", filter.type);
    if (filter.accountId !== "all") params.set("accountId", filter.accountId);
    if (filter.categoryId !== "all") params.set("categoryId", filter.categoryId);
    if (filter.month !== "all") params.set("month", filter.month);
    if (filter.year !== "all") params.set("year", filter.year);
    if (filter.search !== "") params.set("search", filter.search);
    if (filter.scope !== "all") params.set("scope", filter.scope);
    
    // Update URL without refreshing the page
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    navigate(newUrl, { replace: true });
    
    // Apply filters with loader
    applyFilters();
    
  }, [filter, transactions, navigate]);
  
  // Function to apply filters with loading indicator
  const applyFilters = () => {
    if (transactions.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    // Use setTimeout to allow the UI to update with the loading state
    setTimeout(() => {
      // Apply filters
      let result = [...transactions];
  
      // Filter by type
      if (filter.type !== "all") {
        result = result.filter((tx) => tx.type === filter.type);
      }
  
      // Filter by account
      if (filter.accountId !== "all") {
        result = result.filter(
          (tx) => tx.account_id === filter.accountId
        );
      }
  
      // Filter by category
      if (filter.categoryId !== "all") {
        result = result.filter(
          (tx) =>
            tx.category_id && tx.category_id === filter.categoryId
        );
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
          tx.notes.toLowerCase().includes(searchLower)
        );
      }
  
      // Filter by scope (personal or family)
      if (filter.scope !== "all") {
        result = result.filter((tx) => {
          if (filter.scope === "personal") {
            return tx.user_id === user?.id;
          } else if (filter.scope === "family") {
            return tx.user_id !== user?.id;
          }
          return true;
        });
      }
  
      setFilteredTransactions(result);
  
      // Update charts with filtered data if userData is available
      if (userData) {
        prepareChartData(result, userData);
      }
      
      // Hide loading indicator
      setIsFiltering(false);
    }, 300); // Short delay to make the loading indicator visible
  };

  // Function to prepare chart data
  const prepareChartData = (txData: Transaction[], userData: UserData) => {
    // If no data, return early
    if (!txData.length) {
      // Create empty charts
      setLineChartOptions(null);
      setPieChartOptions(null);
      return;
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
          } else {
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
          } else {
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
            } else {
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
          } else {
            expenseData[yearIndex] += tx.amount;
          }
        }
      });
    }

    // Create line chart config
    setLineChartOptions({
      chart: {
        type: "line",
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
        text: null,
      },
      xAxis: {
        categories: chartLabels,
        labels: {
          style: {
            color: "#858796",
          },
        },
      },
      yAxis: {
        title: {
          text: null,
        },
        gridLineColor: "#eaecf4",
        gridLineDashStyle: "dash",
        labels: {
          formatter: function () {
            return formatCurrency((this as any).value);
          },
          style: {
            color: "#858796",
          },
        },
      },
      tooltip: {
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
        line: {
          marker: {
            radius: 4,
            symbol: "circle",
          },
          lineWidth: 3,
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
          data: incomeData,
          color: "#1cc88a", // Success color
        },
        {
          name: "Expenses",
          data: expenseData,
          color: "#e74a3b", // Danger color
        },
      ],
    });

    // Group transactions by category for the pie chart
    const expensesByCategory: {[key: string]: number} = {};
    txData.forEach(tx => {
      if (tx.type === 'expense' && tx.category_id) {
        // Find category name using the category_id
        let categoryName = 'Uncategorized';
        
        const category = userData.expenseCategories.find(cat => cat.id === tx.category_id);
        if (category) {
          categoryName = category.category_name;
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
    setPieChartOptions({
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
        pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b> (${point.y:,.2f})",
        valuePrefix: "$",
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f} %",
            style: {
              fontWeight: "normal",
            },
            connectorWidth: 0,
            distance: 15
          },
          showInLegend: false,
          size: '85%',
        },
      },
      legend: {
        enabled: false,
      },
      series: [{
        name: "Expenses",
        colorByPoint: true,
        data: pieData
      }],
      credits: {
        enabled: false,
      },
    });
  };

  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Set filtering state before applying changes
    setIsFiltering(true);
    
    if (name === "type") {
      // If changing transaction type
      setFilter(prev => ({
        ...prev,
        type: value as "all" | "income" | "expense",
        categoryId: "all"
      }));
    } else if (name === "categoryId") {
      // If changing category
      if (value === "all") {
        // If selecting "All Categories", no special handling needed
        setFilter(prev => ({
          ...prev,
          categoryId: value
        }));
      } else if (userData) {
        // Determine the transaction type based on the selected category
        const transactionType = getTransactionTypeFromCategory(value);
        
        // Update the filter state properly
        setFilter(prev => ({ 
          ...prev,
          categoryId: value,
          // Only update the type if we found a valid type
          ...(transactionType !== "all" ? { type: transactionType } : {})
        }));
      } else {
        // Default handling if userData is not available
        setFilter(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      // Default handling for other filters
      setFilter(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Helper function to determine transaction type from a category ID
  const getTransactionTypeFromCategory = (categoryId: string): "income" | "expense" | "all" => {
    if (!userData) return "all";
    
    // Check both income and expense categories
    const incomeCategory = userData.incomeCategories.find(cat => cat.id === categoryId);
    const expenseCategory = userData.expenseCategories.find(cat => cat.id === categoryId);
    
    // Handle the case where the category ID exists in both income and expense categories
    if (incomeCategory && expenseCategory) {
      // Use the current filter type to resolve ambiguity
      if (filter.type === "income" || filter.type === "expense") {
        return filter.type;
      }
      
      // Get the category name from the select element to resolve ambiguity
      const selectElement = document.getElementById("categoryId") as HTMLSelectElement;
      if (selectElement && selectElement.selectedOptions.length > 0) {
        const selectedText = selectElement.selectedOptions[0].text;
        
        // Check if the selected text matches either category name
        if (selectedText.includes(incomeCategory.category_name)) {
          return "income";
        } else if (selectedText.includes(expenseCategory.category_name)) {
          return "expense";
        }
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
  
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      type: "all",
      accountId: "all",
      categoryId: "all",
      month: currentMonth,
      year: currentYear,
      search: "",
      // Add the missing required properties
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      sortBy: "date",
      sortOrder: "desc",
      scope: "all",
      goal_id: undefined
    });
    
    // Update URL to remove all query parameters
    navigate('', { replace: true });
  };

  // Function to handle chart references
  const lineChartCallback = (chart: any): void => {
    if (lineChartRef.current) {
      lineChartRef.current.chart = chart;
    }
  };

  const pieChartCallback = (chart: any): void => {
    if (pieChartRef.current) {
      pieChartRef.current.chart = chart;
    }
  };

  // Toggle tip function to position tooltips correctly below each info icon
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

  // Open delete modal
  const openDeleteModal = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async () => {
    if (!user || !transactionToDelete) {
      showErrorToast("You must be logged in to delete transactions");
      return;
    }

    try {
      setIsDeleting(true);
      
      // When deleting a transaction, we need to:
      // 1. Get transaction details (account, type, amount, goal)
      // 2. Delete the transaction
      // 3. Update account balance
      // 4. Update goal progress if applicable
      
      // Get transaction details
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionToDelete)
        .single();
      
      if (txError) throw txError;
      if (!txData) throw new Error("Transaction not found");
      
      // Verify user owns this transaction
      if (txData.user_id !== user.id) {
        throw new Error("You do not have permission to delete this transaction");
      }
      
      // Calculate balance adjustment
      // If it was income, subtract from balance; if expense, add to balance
      const balanceChange = txData.type === 'income' ? -txData.amount : txData.amount;
      
      // Delete transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete);
        
      if (deleteError) throw deleteError;
      
      // Update account balance
      const { error: accountError } = await supabase.rpc('update_account_balance', {
        p_account_id: txData.account_id,
        p_amount_change: balanceChange
      });
      
      if (accountError) {
        // If RPC fails, fall back to direct update
        const { data: accountData, error: fetchError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', txData.account_id)
          .single();
          
        if (fetchError) throw fetchError;
        
        const newBalance = accountData.balance + balanceChange;
        
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', txData.account_id);
          
        if (updateError) throw updateError;
      }
      
      // If transaction was associated with a goal, update goal progress
      if (txData.goal_id) {
        // For goals, reverse the effect of the transaction (subtract if it was a contribution)
        const goalAdjustment = -txData.amount;
        
        const { error: goalError } = await supabase.rpc('update_goal_progress', {
          p_goal_id: txData.goal_id,
          p_amount: goalAdjustment
        });
        
        if (goalError) {
          // If RPC fails, fall back to direct update
          const { data: goalData, error: fetchGoalError } = await supabase
            .from('goals')
            .select('current_amount, target_amount')
            .eq('id', txData.goal_id)
            .single();
            
          if (fetchGoalError) throw fetchGoalError;
            
          const newAmount = Math.max(0, goalData.current_amount + goalAdjustment);
          const status = newAmount >= goalData.target_amount ? 'completed' : 'in_progress';
            
          const { error: updateGoalError } = await supabase
            .from('goals')
            .update({ 
              current_amount: newAmount,
              status: status
            })
            .eq('id', txData.goal_id);
            
          if (updateGoalError) throw updateGoalError;
        }
      }
      
      // Optimistically update the UI immediately
      // 1. Update transactions list without the deleted transaction
      const updatedTransactions = transactions.filter(tx => tx.id !== transactionToDelete);
      setTransactions(updatedTransactions);
      
      // 2. Update filtered transactions list
      const updatedFilteredTransactions = filteredTransactions.filter(tx => tx.id !== transactionToDelete);
      setFilteredTransactions(updatedFilteredTransactions);
      
      // 3. Update userData if it exists
      if (userData) {
        const updatedUserData = {
          ...userData,
          transactions: userData.transactions.filter(tx => tx.id !== transactionToDelete)
        };
        
        // Update accounts balance in userData
        if (txData.account_id) {
          const accountIndex = updatedUserData.accounts.findIndex(a => a.id === txData.account_id);
          if (accountIndex >= 0) {
            updatedUserData.accounts[accountIndex] = {
              ...updatedUserData.accounts[accountIndex],
              balance: updatedUserData.accounts[accountIndex].balance + balanceChange
            };
          }
        }
        
        // Update goal progress in userData
        if (txData.goal_id) {
          const goalIndex = updatedUserData.goals.findIndex(g => g.id === txData.goal_id);
          if (goalIndex >= 0) {
            const newAmount = Math.max(0, updatedUserData.goals[goalIndex].current_amount - txData.amount);
            updatedUserData.goals[goalIndex] = {
              ...updatedUserData.goals[goalIndex],
              current_amount: newAmount
            };
          }
        }
        
        setUserData(updatedUserData);
        
        // Update charts with the new data
        prepareChartData(updatedFilteredTransactions, updatedUserData);
      }
      
      showSuccessToast("Transaction deleted successfully!");
      closeDeleteModal();
      
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      showErrorToast(error.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
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
            Loading Transactions
          </h5>
          <p className="text-gray-500">Please wait while we fetch your transaction data...</p>
        </div>
      </div>
    );
  }

  // Calculate summary metrics
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpenses = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const netCashflow = totalIncome - totalExpenses;
  
  // Calculate percentage of expenses to income
  const expensesRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  // Get period title for display
  const getPeriodTitle = () => {
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

  // Function to get category name by id
  const getCategoryName = (categoryId?: string, type?: "income" | "expense"): string => {
    if (!categoryId || !userData) return "Uncategorized";
    
    // If type is provided, only search in the corresponding categories
    if (type === "income") {
      const category = userData.incomeCategories.find(c => c.id === categoryId);
      return category ? category.category_name : "Uncategorized";
    } else if (type === "expense") {
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

  // Function to get account name by id
  const getAccountName = (accountId: string): string => {
    if (!userData) return "Unknown Account";
    const account = userData.accounts.find(a => a.id === accountId);
    return account ? account.account_name : "Unknown Account";
  };

  // Helper function to get goal name by id
  const getGoalName = (goalId?: string): string => {
    if (!goalId || !userData) return "Unknown Goal";
    
    const goal = userData.goals.find(g => g.id === goalId);
    return goal ? goal.goal_name : "Unknown Goal";
  };

  // Add a banner for goal filtering
  const renderGoalFilterBanner = () => {
    if (!filter.goal_id) return null;
    
    const goalName = userData?.goals.find(g => g.id === filter.goal_id)?.goal_name || "Unknown Goal";
    
    return (
      <div className="alert alert-info mb-4 d-flex justify-content-between align-items-center">
        <div>
          <i className="fas fa-filter mr-2"></i>
          <strong>Filtered by Goal:</strong> {goalName}
        </div>
        <button 
          className="btn btn-sm btn-outline-info" 
          onClick={() => {
            setFilter(prev => ({ ...prev, goal_id: undefined }));
            navigate('/transactions');
          }}
        >
          <i className="fas fa-times mr-1"></i> Clear Filter
        </button>
      </div>
    );
  };

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 transactions-header">
        <h1 className="h3 mb-0 text-gray-800">Transactions</h1>
        <Link
          to="/transactions/add"
          className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm add-transaction-btn"
        >
          <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>
          Add Transaction
        </Link>
      </div>

      {/* Render goal filter banner if filtering by goal */}
      {renderGoalFilterBanner()}

      {/* Financial Overview */}
      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Total Income
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalIncome', e)}
                        aria-label="Total income information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalIncome)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center">
                    Total Expenses
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalExpenses', e)}
                        aria-label="Total expenses information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Net Cashflow
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('netCashflow', e)}
                        aria-label="Net cashflow information"
                      ></i>
                    </div>
                  </div>
                  <div className={`h5 mb-0 font-weight-bold ${netCashflow >= 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(netCashflow)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-wallet fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Income vs Expenses Chart */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Income vs Expenses Trend - {getPeriodTitle()}
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('linechart', e)}
                    aria-label="Line chart information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <ErrorBoundary>
                {lineChartOptions && filteredTransactions.length > 0 ? (
                  <>
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={lineChartOptions}
                      callback={lineChartCallback}
                      ref={lineChartRef}
                    />
                    <div className="mt-3 text-xs text-gray-500">
                      <i className="fas fa-lightbulb text-warning mr-1"></i>
                      <strong>Tip:</strong> Hover over the lines to see exact amounts. This chart shows how your income and expenses have changed over time.
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-chart-line fa-3x text-gray-300"></i>
                    </div>
                    <h5 className="text-gray-500 font-weight-light">No transaction data available</h5>
                    <p className="text-gray-500 mb-0 small">Add transactions to see your income and expense trends.</p>
                    <Link to="/transactions/add" className="btn btn-sm btn-primary mt-3">
                      <i className="fas fa-plus fa-sm mr-1"></i> Add New Transaction
                    </Link>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>

          {/* Spending Ratio */}
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  Spending to Income Ratio
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('ratio', e)}
                      aria-label="Spending ratio information"
                    ></i>
                  </div>
                </div>
                {filteredTransactions.length > 0 && (
                  <div className={`badge badge-${
                    expensesRatio > 100 ? "danger" : 
                    expensesRatio > 80 ? "warning" : 
                    "success"
                  } ml-2`}>
                    {expensesRatio > 100 ? "Overspending" : expensesRatio > 80 ? "Warning" : "On Track"}
                  </div>
                )}
              </h6>
            </div>
            <div className="card-body">
              {filteredTransactions.length > 0 ? (
                <>
                  <div className="mb-2 d-flex justify-content-between">
                    <span>Percentage of Income Spent</span>
                    <span className={`font-weight-bold ${
                      expensesRatio > 100 ? "text-danger" : 
                      expensesRatio > 80 ? "text-warning" : 
                      "text-success"
                    }`}>{formatPercentage(expensesRatio)}</span>
                  </div>
                  <div className="progress mb-4">
                    <div
                      className={`progress-bar ${
                        expensesRatio > 100 
                          ? "bg-danger" 
                          : expensesRatio > 80 
                          ? "bg-warning" 
                          : "bg-success"
                      }`}
                      role="progressbar"
                      style={{
                        width: `${expensesRatio > 100 ? 100 : expensesRatio}%`,
                      }}
                      aria-valuenow={expensesRatio > 100 ? 100 : expensesRatio}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      title={formatPercentage(expensesRatio)}
                    >
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">Financial Health</div>
                  <div className="row">
                    <div className="col-md-4 mb-4">
                      <div className="card bg-success text-white shadow">
                        <div className="card-body py-3">
                          Healthy
                          <div className="text-white-50 small">Spending less than 70% of income</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 mb-4">
                      <div className="card bg-warning text-white shadow">
                        <div className="card-body py-3">
                          Caution
                          <div className="text-white-50 small">Spending 70-90% of income</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 mb-4">
                      <div className="card bg-danger text-white shadow">
                        <div className="card-body py-3">
                          Alert
                          <div className="text-white-50 small">Spending over 90% of income</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-balance-scale fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No spending ratio data</h5>
                  <p className="text-gray-500 mb-0 small">Add income and expense transactions to see your spending ratio.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expense Categories Pie Chart */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Expense Distribution - {getPeriodTitle()}
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('piechart', e)}
                    aria-label="Pie chart information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <ErrorBoundary>
                {pieChartOptions && filteredTransactions.filter(tx => tx.type === 'expense').length > 0 ? (
                  <>
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={pieChartOptions}
                      callback={pieChartCallback}
                      ref={pieChartRef}
                    />
                    <div className="mt-3 text-xs text-gray-500">
                      <i className="fas fa-lightbulb text-warning mr-1"></i>
                      <strong>Tip:</strong> Click on a segment to see detailed transactions for that category. This helps identify your biggest spending areas.
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                    </div>
                    <h5 className="text-gray-500 font-weight-light">No expense data</h5>
                    <p className="text-gray-500 mb-0 small">Add expense transactions to see your spending distribution.</p>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>
                
          {/* Financial Status Card */}
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Financial Status
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('status', e)}
                    aria-label="Financial status information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {filteredTransactions.length > 0 ? (
                <div className="text-center">
                  <div className="mb-3">
                    <i className={`fas fa-${expensesRatio > 100 ? "exclamation-triangle text-danger" : expensesRatio > 80 ? "exclamation-circle text-warning" : "check-circle text-success"} fa-3x mb-3`}></i>
                  </div>
                  <h4 className="font-weight-bold" style={{ color: expensesRatio > 100 ? "#e74a3b" : expensesRatio > 80 ? "#f6c23e" : "#1cc88a" }}>
                    {expensesRatio > 100 ? "Overspending" : expensesRatio > 80 ? "Watch Spending" : "On Track"}
                  </h4>
                  <p className="mb-0">
                    You've spent {formatPercentage(expensesRatio)} of your income.
                    {expensesRatio > 100 ? " You're spending more than you earn." : 
                     expensesRatio > 80 ? " Consider reducing some expenses." : 
                     " Keep up the good financial habits!"}
                  </p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-heartbeat fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No financial status data</h5>
                  <p className="text-gray-500 mb-0 small">Add transactions to see your financial health status.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4 transaction-filters">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filters</h6>
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="type" className="font-weight-bold text-gray-800">Type</label>
              <select
                id="type"
                name="type"
                value={filter.type}
                onChange={handleFilterChange}
                className={`form-control ${filter.categoryId !== "all" ? "border-info" : ""}`}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              {filter.categoryId !== "all" && (
                <small className="form-text text-info">
                  <i className="fas fa-info-circle mr-1"></i>
                  Type auto-selected based on category
                </small>
              )}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="accountId" className="font-weight-bold text-gray-800">Account</label>
              <select
                id="accountId"
                name="accountId"
                value={filter.accountId}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Accounts</option>
                {userData?.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="categoryId" className="font-weight-bold text-gray-800">Category</label>
              <select
                id="categoryId"
                name="categoryId"
                value={filter.categoryId}
                onChange={handleFilterChange}
                className={`form-control ${filter.type !== "all" ? "border-info" : ""}`}
              >
                <option value="all">All Categories</option>
                {filter.type === 'all' && (
                  <>
                    <optgroup label="Income Categories">
                      {userData?.incomeCategories.map((cat) => (
                        <option key={`income-${cat.id}`} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Expense Categories">
                      {userData?.expenseCategories.map((cat) => (
                        <option key={`expense-${cat.id}`} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
                {filter.type === 'income' && (
                  <optgroup label="Income Categories">
                    {userData?.incomeCategories.map((cat) => (
                      <option key={`income-${cat.id}`} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {filter.type === 'expense' && (
                  <optgroup label="Expense Categories">
                    {userData?.expenseCategories.map((cat) => (
                      <option key={`expense-${cat.id}`} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {filter.type !== "all" && (
                <small className="form-text text-info">
                  <i className="fas fa-filter mr-1"></i>
                  Showing only {filter.type} categories
                </small>
              )}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="month" className="font-weight-bold text-gray-800">Month</label>
              <select
                id="month"
                name="month"
                value={filter.month}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Months</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="year" className="font-weight-bold text-gray-800">Year</label>
              <select
                id="year"
                name="year"
                value={filter.year}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Years</option>
                {/* Generate options for the last 5 years */}
                {Array.from({ length: 5 }, (_, i) => {
                  const year = currentDate.getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search in notes..."
                className="form-control"
              />
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="scope" className="font-weight-bold text-gray-800">Scope</label>
              <select
                id="scope"
                name="scope"
                value={filter.scope}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Transactions</option>
                <option value="personal">Personal Transactions</option>
                <option value="family">Family Transactions</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card shadow mb-4 transaction-table">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Transaction List
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('transactionList', e)}
                aria-label="Transaction list information"
              ></i>
            </div>
          </h6>
          <div>
            <button className="btn btn-sm btn-outline-primary mr-2">
              <i className="fas fa-download fa-sm"></i> Export
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Notes</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFiltering ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <p className="text-gray-600 mt-3">Filtering transactions...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => {
                    // Get category info
                    const category = transaction.category_id
                      ? getCategoryName(
                          transaction.category_id,
                          transaction.type
                        )
                      : null;
                    const account = getAccountName(
                      transaction.account_id
                    );

                    return (
                      <tr
                        key={transaction.id}
                        className={
                          transaction.type === "income"
                            ? "table-success"
                            : "table-danger"
                        }
                      >
                        <td>{formatDate(transaction.date)}</td>
                        <td>{category || "Uncategorized"}</td>
                        <td>{account || "Unknown Account"}</td>
                        <td>{transaction.notes}</td>
                        <td
                          className={
                            transaction.type === "income"
                              ? "text-success font-weight-bold"
                              : "text-danger font-weight-bold"
                          }
                        >
                          {transaction.type === "income" ? "+ " : "- "}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>
                          <div className="d-flex justify-content-center align-items-center">
                            <Link
                              to={`/transactions/${transaction.id}`}
                              className="btn btn-info btn-circle btn-sm mx-1"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link
                              to={`/transactions/${transaction.id}/edit`}
                              className="btn btn-primary btn-circle btn-sm mx-1"
                            >
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button
                              className="btn btn-danger btn-circle btn-sm mx-1"
                              onClick={() => openDeleteModal(transaction.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                      <p className="text-gray-500">No transactions found matching your filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-dialog modal-dialog-centered" style={{
            maxWidth: '450px',
            margin: '1.75rem',
            position: 'relative',
            width: 'auto',
            pointerEvents: 'none',
            zIndex: 1060
          }}>
            <div className="modal-content" style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fff',
              borderRadius: '0.5rem',
              pointerEvents: 'auto',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
            }}>
              <div className="modal-header border-0 pt-4 px-4 pb-0">
                <h3 className="modal-title w-100 text-center" style={{ color: '#4e73df', fontWeight: 600 }}>Confirm Deletion</h3>
                <button 
                  type="button" 
                  className="close" 
                  onClick={closeDeleteModal} 
                  style={{ 
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#999',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer' 
                  }}
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body text-center p-4">
                <div className="mb-4">
                  <div className="warning-icon" style={{
                    backgroundColor: '#FFEFD5',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#FFA500' }}></i>
                  </div>
                </div>
                <p style={{ fontSize: '1rem', color: '#555' }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 pb-4 pt-0 justify-content-center">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: 'transparent',
                    color: '#4e73df',
                    border: '1px solid #4e73df',
                    borderRadius: '30px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    marginRight: '1rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteTransaction}
                  disabled={isDeleting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#e74a3b',
                    borderColor: '#e74a3b',
                    borderRadius: '30px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#d52a1a';
                    e.currentTarget.style.borderColor = '#d52a1a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#e74a3b';
                    e.currentTarget.style.borderColor = '#e74a3b';
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global tooltip that appears based on activeTip state */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px` 
          }}
        >
          {activeTip === 'totalIncome' && (
            <>
              <div className="tip-title">Total Income</div>
              <p className="tip-description">
                The sum of all income transactions for the selected period. This includes salary, investments, gifts, and other revenue sources. Use filters to analyze income from specific sources or time periods.
              </p>
            </>
          )}
          {activeTip === 'totalExpenses' && (
            <>
              <div className="tip-title">Total Expenses</div>
              <p className="tip-description">
                The sum of all expense transactions for the selected period. This includes all your spending across categories like housing, food, transportation, and discretionary purchases. Use filters to analyze spending in specific categories.
              </p>
            </>
          )}
          {activeTip === 'netCashflow' && (
            <>
              <div className="tip-title">Net Cashflow</div>
              <p className="tip-description">
                The difference between your total income and total expenses for the selected period. A positive value (green) means you're saving money, while a negative value (red) indicates you're spending more than you earn.
              </p>
            </>
          )}
          {activeTip === 'linechart' && (
            <>
              <div className="tip-title">Income vs. Expenses Trend</div>
              <p className="tip-description">
                This visualization tracks your income and expenses over time. The green line represents your income while the red line shows your expenses. When the green line is above the red, you're saving money. Analyzing these trends helps you understand how your financial habits change over time.
              </p>
            </>
          )}
          {activeTip === 'piechart' && (
            <>
              <div className="tip-title">Expense Distribution</div>
              <p className="tip-description">
                This chart breaks down your spending by category. Each colored segment represents a different expense category, with larger segments indicating higher spending. Use this information to identify your largest spending areas and focus your budget optimization efforts where they'll have the most impact.
              </p>
            </>
          )}
          {activeTip === 'ratio' && (
            <>
              <div className="tip-title">Spending to Income Ratio</div>
              <p className="tip-description">
                This indicator shows what percentage of your income is being spent on expenses. Financial experts recommend keeping this ratio below 70% for healthy finances. A higher ratio means you have less money available for savings, investments, and debt reduction. The color coding helps you quickly assess your financial health.
              </p>
            </>
          )}
          {activeTip === 'status' && (
            <>
              <div className="tip-title">Financial Status</div>
              <p className="tip-description">
                A summary assessment of your overall financial health based on your spending habits. This status considers your spending-to-income ratio and provides personalized recommendations. Green indicates healthy finances, yellow suggests areas for improvement, and red signals potential financial stress that needs immediate attention.
              </p>
            </>
          )}
          {activeTip === 'transactionList' && (
            <>
              <div className="tip-title">Transaction List</div>
              <p className="tip-description">
                A detailed view of all your financial transactions based on the current filters. You can see the date, category, account, description, and amount for each transaction. Use the action buttons to view details, edit, or delete individual transactions.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
