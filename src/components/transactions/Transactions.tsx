import React, { useState, useEffect, FC, ChangeEvent, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";


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
  category_id?: number;
  account_id: number;
}

interface Category {
  id: number;
  category_name: string;
}

interface Account {
  id: number;
  account_name: string;
  account_type: string;
  balance: number;
}

interface UserData {
  user: {
    id: string;
    name: string;
  };
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  transactions: Transaction[];
}

interface FilterState {
  type: "all" | "income" | "expense";
  accountId: string;
  categoryId: string;
  month: string;
  year: string;
  search: string;
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
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Get current date for default filter
  const currentDate = new Date();
  const defaultMonth = queryParams.get('month') || currentDate.getMonth().toString(); // 0-11 for Jan-Dec
  const defaultYear = queryParams.get('year') || currentDate.getFullYear().toString();
  const defaultType = queryParams.get('type') as "all" | "income" | "expense" || "all";
  const defaultCategoryId = queryParams.get('categoryId') || "all";
  const defaultAccountId = queryParams.get('accountId') || "all";
  const defaultSearch = queryParams.get('search') || "";
  
  const [filter, setFilter] = useState<FilterState>({
    type: defaultType,
    accountId: defaultAccountId,
    categoryId: defaultCategoryId,
    month: defaultMonth,
    year: defaultYear,
    search: defaultSearch,
  });

  const [userData, setUserData] = useState<UserData | null>(null);
  const [lineChartOptions, setLineChartOptions] = useState<LineChartConfig | null>(null);
  const [pieChartOptions, setPieChartOptions] = useState<PieChartConfig | null>(null);
  const lineChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      const userData = getCurrentUserData();
      setUserData(userData as unknown as UserData);

      // Get transactions and sort by date (newest first)
      const sortedTransactions = sortByDate(userData.transactions);
      setTransactions(sortedTransactions);
      setFilteredTransactions(sortedTransactions);

      // Prepare data for charts
      prepareChartData(sortedTransactions, userData as unknown as UserData);

      // Auto-detect transaction type from category if categoryId is provided
      if (filter.categoryId !== "all" && userData) {
        const categoryId = parseInt(filter.categoryId);
        console.log(`Initial category ID check: ${categoryId} (${typeof categoryId})`);
        
        // Check if it's an income category - ensure type matching with Number conversion
        const isIncomeCategory = userData.incomeCategories.some(cat => Number(cat.id) === Number(categoryId));
        // Check if it's an expense category - ensure type matching with Number conversion
        const isExpenseCategory = userData.expenseCategories.some(cat => Number(cat.id) === Number(categoryId));
        
        console.log(`Category type detection: Income=${isIncomeCategory}, Expense=${isExpenseCategory}`);
        
        if (isIncomeCategory) {
          console.log(`Setting initial type to income for category ID: ${categoryId}`);
          setFilter(prev => ({ ...prev, type: "income" }));
        } else if (isExpenseCategory) {
          console.log(`Setting initial type to expense for category ID: ${categoryId}`);
          setFilter(prev => ({ ...prev, type: "expense" }));
        }
      }
      
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
          (tx) => tx.account_id.toString() === filter.accountId
        );
      }
  
      // Filter by category
      if (filter.categoryId !== "all") {
        result = result.filter(
          (tx) =>
            tx.category_id && tx.category_id.toString() === filter.categoryId
        );
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
  
      setFilteredTransactions(result);
  
      // Update charts with filtered data if userData is available
      if (userData) {
        prepareChartData(result, userData);
      }
      
      // Hide loading indicator
      setIsFiltering(false);
    }, 300); // Short delay to make the loading indicator visible
  };

  const prepareChartData = (txData: Transaction[], userData: UserData) => {
    // Get filtered period information for titles
    let periodTitle = "";
    if (filter.month !== "all" && filter.year !== "all") {
      const monthName = new Date(0, parseInt(filter.month)).toLocaleString('default', { month: 'long' });
      periodTitle = `${monthName} ${filter.year}`;
    } else if (filter.month !== "all") {
      const monthName = new Date(0, parseInt(filter.month)).toLocaleString('default', { month: 'long' });
      periodTitle = `${monthName} (All Years)`;
    } else if (filter.year !== "all") {
      periodTitle = filter.year;
    } else {
      periodTitle = "All Time";
    }

    // Group transactions appropriately based on filter
    let chartLabels: string[] = [];
    let incomeData: number[] = [];
    let expenseData: number[] = [];

    if (filter.month !== "all" && filter.year !== "all") {
      // Daily view for specific month and year
      const month = parseInt(filter.month);
      const year = parseInt(filter.year);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      chartLabels = Array.from({length: daysInMonth}, (_, i) => `${i + 1}`);
      
      // Initialize data arrays with zeros
      incomeData = Array(daysInMonth).fill(0);
      expenseData = Array(daysInMonth).fill(0);
      
      // Fill in the data
      txData.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === month && txDate.getFullYear() === year) {
          const dayOfMonth = txDate.getDate() - 1; // 0-indexed array
          
          if (tx.type === 'income') {
            incomeData[dayOfMonth] += tx.amount;
          } else {
            expenseData[dayOfMonth] += tx.amount;
          }
        }
      });
    } else {
      // Monthly view or yearly view
      if (filter.year !== "all") {
        // Show all months for specific year
        chartLabels = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        
        // Initialize data arrays with zeros
        incomeData = Array(12).fill(0);
        expenseData = Array(12).fill(0);
        
        // Fill in the data
        txData.forEach(tx => {
          const txDate = new Date(tx.date);
          if (txDate.getFullYear() === parseInt(filter.year)) {
            const month = txDate.getMonth(); // 0-indexed
            
            if (tx.type === 'income') {
              incomeData[month] += tx.amount;
            } else {
              expenseData[month] += tx.amount;
            }
          }
        });
      } else if (filter.month !== "all") {
        // Show the specific month across years
        // Get unique years from transactions
        const years = Array.from(new Set(txData.map(tx => new Date(tx.date).getFullYear()))).sort();
        chartLabels = years.map(year => year.toString());
        
        // Initialize data arrays with zeros
        incomeData = Array(years.length).fill(0);
        expenseData = Array(years.length).fill(0);
        
        // Fill in the data
        txData.forEach(tx => {
          const txDate = new Date(tx.date);
          if (txDate.getMonth() === parseInt(filter.month)) {
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
        const category = getCategoryById(tx.category_id, 'expense');
        const categoryName = category ? category.category_name : 'Uncategorized';
        
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
      series: [
        {
          name: "Expenses",
          colorByPoint: true,
          data: pieData,
        },
      ],
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
        // Get the category ID - ensure it's a number
        const categoryId = parseInt(value);
        console.log(`Selected category ID: ${categoryId} (${typeof categoryId})`);
        
        // Determine the transaction type based on the selected category
        const transactionType = getTransactionTypeFromCategory(categoryId);
        console.log(`Auto-determining type for category ID: ${categoryId}, Type: ${transactionType}`);
        
        // Important: Update the filter state directly instead of using a function
        // This ensures React immediately updates the state in a single batch
        const newFilter = { 
          ...filter,
          categoryId: value
        };
        
        // Only update the type if we found a valid type
        if (transactionType !== "all") {
          newFilter.type = transactionType;
        }
        
        // Apply the new filter state
        setFilter(newFilter);
        
        // Log the updated filter state for debugging
        console.log("Updated filter to:", newFilter);
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
  const getTransactionTypeFromCategory = (categoryId: number): "income" | "expense" | "all" => {
    if (!userData) return "all";
    
    // Log the category being checked and available categories for debugging
    console.log(`Checking category ID: ${categoryId} (${typeof categoryId})`);
    console.log(`Available income categories:`, userData.incomeCategories.map(c => `${c.id} (${typeof c.id}): ${c.category_name}`));
    console.log(`Available expense categories:`, userData.expenseCategories.map(c => `${c.id} (${typeof c.id}): ${c.category_name}`));
    
    // Check both income and expense categories, and handle ambiguity
    // Ensure we're comparing the same type by explicitly converting to numbers
    const incomeCategory = userData.incomeCategories.find(cat => Number(cat.id) === Number(categoryId));
    const expenseCategory = userData.expenseCategories.find(cat => Number(cat.id) === Number(categoryId));
    
    // Log what was found
    if (incomeCategory) console.log(`Found matching income category: ${incomeCategory.category_name}`);
    if (expenseCategory) console.log(`Found matching expense category: ${expenseCategory.category_name}`);
    
    // Handle the case where the category ID exists in both income and expense categories
    if (incomeCategory && expenseCategory) {
      console.log(`WARNING: Ambiguous category ID ${categoryId} found in both income and expense categories!`);
      console.log(`Income: ${incomeCategory.category_name}, Expense: ${expenseCategory.category_name}`);
      
      // Use the current filter type to resolve ambiguity
      if (filter.type === "income" || filter.type === "expense") {
        console.log(`Resolving ambiguity using current filter type: ${filter.type}`);
        return filter.type;
      }
      
      // Get the category name from the select element to resolve ambiguity
      const selectElement = document.getElementById("categoryId") as HTMLSelectElement;
      if (selectElement && selectElement.selectedOptions.length > 0) {
        const selectedText = selectElement.selectedOptions[0].text;
        console.log(`Selected category text: ${selectedText}`);
        
        // Check if the selected text matches either category name
        if (selectedText.includes(incomeCategory.category_name)) {
          console.log(`Resolved to income category based on selection text`);
          return "income";
        } else if (selectedText.includes(expenseCategory.category_name)) {
          console.log(`Resolved to expense category based on selection text`);
          return "expense";
        }
      }
      
      // Default to expense for Housing (special case)
      if (expenseCategory.category_name === "Housing") {
        console.log(`Defaulting to expense for Housing category`);
        return "expense";
      }
      
      // If we can't resolve, default to expense
      console.log(`Couldn't resolve ambiguity, defaulting to expense`);
      return "expense";
    }
    
    // If category is found in income categories only
    if (incomeCategory) {
      console.log(`Found income category: ${incomeCategory.category_name}`);
      return "income";
    }
    
    // If category is found in expense categories only
    if (expenseCategory) {
      console.log(`Found expense category: ${expenseCategory.category_name}`);
      return "expense";
    }
    
    console.log(`No matching category found for ID: ${categoryId}`);
    return "all";
  };
  
  const resetFilters = (): void => {
    // Get current date for resetting filters
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth().toString();
    const currentYear = currentDate.getFullYear().toString();
    
    // Show filtering state
    setIsFiltering(true);
    
    setFilter({
      type: "all",
      accountId: "all",
      categoryId: "all",
      month: currentMonth,
      year: currentYear,
      search: "",
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading transaction data...</p>
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

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Transactions</h1>
        <Link to="/transactions/add" className="d-none d-sm-inline-block btn btn-primary shadow-sm animate__animated animate__fadeIn">
          <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>Add New
        </Link>
      </div>

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
                {lineChartOptions && (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={lineChartOptions}
                    callback={lineChartCallback}
                    ref={lineChartRef}
                  />
                )}
              </ErrorBoundary>
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Hover over the lines to see exact amounts. This chart shows how your income and expenses have changed over time.
              </div>
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
                <div className={`badge badge-${
                  expensesRatio > 100 ? "danger" : 
                  expensesRatio > 80 ? "warning" : 
                  "success"
                } ml-2`}>
                  {expensesRatio > 100 ? "Overspending" : expensesRatio > 80 ? "Warning" : "On Track"}
                </div>
              </h6>
            </div>
            <div className="card-body">
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
                  {/* Percentage removed from here */}
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
                {pieChartOptions && (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={pieChartOptions}
                    callback={pieChartCallback}
                    ref={pieChartRef}
                  />
                )}
              </ErrorBoundary>
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Click on a segment to see detailed transactions for that category. This helps identify your biggest spending areas.
              </div>
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
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
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
                  <option key={account.id} value={account.id.toString()}>
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
                        <option key={`income-${cat.id}`} value={cat.id.toString()}>
                          {cat.category_name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Expense Categories">
                      {userData?.expenseCategories.map((cat) => (
                        <option key={`expense-${cat.id}`} value={cat.id.toString()}>
                          {cat.category_name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
                {filter.type === 'income' && (
                  <optgroup label="Income Categories">
                    {userData?.incomeCategories.map((cat) => (
                      <option key={`income-${cat.id}`} value={cat.id.toString()}>
                        {cat.category_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {filter.type === 'expense' && (
                  <optgroup label="Expense Categories">
                    {userData?.expenseCategories.map((cat) => (
                      <option key={`expense-${cat.id}`} value={cat.id.toString()}>
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
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
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
          </div>
        </div>
      </div>

      {/* Transactions Table */}
              <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.6s" }}>
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
                      ? getCategoryById(
                          transaction.category_id,
                          transaction.type
                        )
                      : null;
                    const account = getAccountById(
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
                        <td>{category?.category_name || "Uncategorized"}</td>
                        <td>{account?.account_name || "Unknown Account"}</td>
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
                              to={`/transactions/edit/${transaction.id}`}
                              className="btn btn-primary btn-circle btn-sm mx-1"
                            >
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button
                              className="btn btn-danger btn-circle btn-sm mx-1"
                              onClick={() => {
                                /* Delete implementation */
                              }}
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
