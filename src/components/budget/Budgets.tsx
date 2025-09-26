import React, { useState, useEffect, useRef, FC, ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  formatPercentage,
} from "../../utils/helpers";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import { useCurrency } from "../../utils/CurrencyContext";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { BudgetService, BudgetItem } from "../../services/database/budgetService";

// Import modular components
import { FilterState } from "./types";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";
import StatCard from "./components/shared/StatCard";
import InfoTooltip from "./components/shared/InfoTooltip";
import DeleteModal from "./components/shared/DeleteModal";
import BudgetCard from "./components/budget/BudgetCard";
import FilterControls from "./components/budget/FilterControls";
import ChartContainer from "./components/charts/ChartContainer";
import BudgetChart from "./components/charts/BudgetChart";
import BudgetErrorBoundary from "./components/shared/BudgetErrorBoundary";
import DataSourceNotification from "./components/shared/DataSourceNotification";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Component interfaces
interface BarChartConfig {
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
  subtitle?: {
    text: string;
    style?: {
      fontSize: string;
      color: string;
    };
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
  legend?: {
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

const Budgets: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [barChartOptions, setBarChartOptions] = useState<BarChartConfig | null>(null);
  const [pieChartOptions, setPieChartOptions] = useState<PieChartConfig | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [budgetSubscription, setBudgetSubscription] = useState<any>(null);
  const [transactionSubscription, setTransactionSubscription] = useState<any>(null);
  const [budgetChannelName] = useState<string>(`budget_updates_${user?.id || 'anonymous'}`);
  const [transactionChannelName] = useState<string>(`transaction_updates_${user?.id || 'anonymous'}`);
  
  // Data source tracking for fallback strategy
  const [dataSource, setDataSource] = useState<'view' | 'table_with_category' | 'table_only' | 'error'>('view');
  const [dataSourceError, setDataSourceError] = useState<string | null>(null);
  
  // Budget service instance
  const budgetService = useRef(BudgetService.getInstance());
  
  // Family status states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [, setFamilyRole] = useState<"admin" | "viewer" | null>(null);
  const [familyBudgets, setFamilyBudgets] = useState<BudgetItem[]>([]);
  const [showingFamilyBudgets, setShowingFamilyBudgets] = useState<boolean>(false);
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Default to "all" instead of current date for filters
  const defaultMonth = queryParams.get('month') || "all";
  const defaultYear = queryParams.get('year') || "all";
  const defaultStatus = queryParams.get('status') as "all" | "success" | "warning" | "danger" || "all";
  const defaultCategoryId = queryParams.get('categoryId') || "all";
  const defaultSearch = queryParams.get('search') || "";
  
  const [filter, setFilter] = useState<FilterState>({
    categoryId: defaultCategoryId,
    status: defaultStatus,
    search: defaultSearch,
    month: defaultMonth,
    year: defaultYear,
    scope: "all",
  });
  const barChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);

  // Helper functions to extract month and year from dates
  const getMonthYear = (budget: BudgetItem) => {
    // Extract from start_date since month/year properties are optional
    const startDate = new Date(budget.start_date);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    return {
      month: monthNames[startDate.getMonth()],
      year: startDate.getFullYear().toString()
    };
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

  // Helper function to get period title based on current filter
  const getPeriodTitle = () => {
    if (filter.month !== "all" && filter.year !== "all") {
      const monthName = new Date(0, parseInt(filter.month) - 1).toLocaleString('default', { month: 'long' });
      return `${monthName} ${filter.year}`;
    } else if (filter.month !== "all") {
      const monthName = new Date(0, parseInt(filter.month) - 1).toLocaleString('default', { month: 'long' });
      return `${monthName} (All Years)`;
    } else if (filter.year !== "all") {
      return filter.year;
    } else {
      return "All Time";
    }
  };

  // Fetch budget data using enhanced service with fallback strategy
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        if (!user) {
          console.log("No user found, redirecting to login");
          navigate("/login");
          return;
        }

        setLoading(true);
        console.log("Fetching budget data for user:", user.id);

        // Use enhanced budget service with fallback strategy
        const result = await budgetService.current.getBudgets(user.id);
        
        // Update data source tracking
        setDataSource(result.source);
        
        if (result.source === 'error') {
          setDataSourceError(result.error || 'Unknown error occurred');
          throw new Error(result.error || 'Failed to fetch budget data');
        } else {
          setDataSourceError(null);
        }

        console.log(`Retrieved ${result.data?.length || 0} budgets from source: ${result.source}`);
        
        if (result.data && result.data.length > 0) {
          setBudgets(result.data);
          setFilteredBudgets(result.data);

          // Extract unique categories for the dropdown
          const categoryResult = await budgetService.current.getExpenseCategories(user.id);
          
          if (categoryResult.success && categoryResult.data) {
            setCategories(categoryResult.data.map(cat => ({
              id: cat.id,
              name: cat.category_name
            })));
          } else {
            console.warn("Failed to fetch categories:", categoryResult.error);
            setCategories([]);
          }

          // Update visualizations
          updateChartsWithData(result.data);
        } else {
          setBudgets([]);
          setFilteredBudgets([]);
          setBarChartOptions(null);
          setPieChartOptions(null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching budget data:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        showErrorToast(`Failed to load budgets: ${errorMessage}`);
        setDataSource('error');
        setDataSourceError(errorMessage);
        setLoading(false);
      }
    };

    // Initial data fetch
    fetchBudgetData();

    return () => {
      // Nothing to clean up for data fetching
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, showErrorToast]);

  // Set up real-time subscriptions in a separate useEffect
  useEffect(() => {
    if (!user) return;

    // Clean up any existing subscriptions first
    if (budgetSubscription) {
      console.log("Removing existing budget subscription");
      supabase.removeChannel(budgetSubscription);
    }
    if (transactionSubscription) {
      console.log("Removing existing transaction subscription");
      supabase.removeChannel(transactionSubscription);
    }

    console.log(`Setting up new subscriptions for user ${user.id}`);

    // Create new budget subscription with unique channel name
    const newBudgetSubscription = supabase
      .channel(budgetChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'budgets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("Budget update received:", payload);
        
        // Handle different event types
        if (payload.eventType === 'DELETE') {
          // For delete events, update state directly
          const deletedId = payload.old?.id;
          if (deletedId) {
            console.log(`Budget ${deletedId} was deleted, updating UI`);
            setBudgets(prev => prev.filter(b => b.id !== deletedId));
            setFilteredBudgets(prev => {
              const updated = prev.filter(b => b.id !== deletedId);
              // Update visualizations
              if (updated.length > 0) {
                updateChartsWithData(updated);
              } else {
                // If no budgets remain, clear the charts
                setBarChartOptions(null);
                setPieChartOptions(null);
              }
              return updated;
            });
          }
        } else {
          // For INSERT and UPDATE events, refresh data using enhanced service
          const refreshBudgets = async () => {
            try {
              const result = await budgetService.current.getBudgets(user.id);
              
              if (result.source !== 'error') {
                setBudgets(result.data);
                setDataSource(result.source);
                setDataSourceError(null);
                setFilteredBudgets(prev => {
                  // Apply current filters to the new data
                  if (filter.categoryId !== "all" || 
                      filter.status !== "all" || 
                      filter.month !== "all" || 
                      filter.year !== "all" || 
                      filter.search) {
                    // Re-apply filters
                    applyFilters(result.data);
                    return prev;
                  }
                  return result.data;
                });
                updateChartsWithData(result.data);
              } else {
                setDataSource('error');
                setDataSourceError(result.error || 'Failed to refresh budget data');
              }
            } catch (err) {
              console.error("Error refreshing budget data:", err);
              setDataSource('error');
              setDataSourceError(err instanceof Error ? err.message : 'Unknown error');
            }
          };
          
          refreshBudgets();
        }
      })
      .subscribe((status) => {
        console.log(`Budget subscription status: ${status}`);
      });
      
    // Create new transaction subscription
    const newTransactionSubscription = supabase
      .channel(transactionChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("Transaction update received (may affect budget spent):", payload);
        // Refresh budget data using enhanced service when transactions change
        const refreshBudgets = async () => {
          try {
            const result = await budgetService.current.getBudgets(user.id);
            
            if (result.source !== 'error') {
              setBudgets(result.data);
              setDataSource(result.source);
              setDataSourceError(null);
              setFilteredBudgets(prev => {
                // Apply current filters to the new data
                if (filter.categoryId !== "all" || 
                    filter.status !== "all" || 
                    filter.month !== "all" || 
                    filter.year !== "all" || 
                    filter.search) {
                  // Re-apply filters
                  applyFilters(result.data);
                  return prev;
                }
                return result.data;
              });
              updateChartsWithData(result.data);
            } else {
              setDataSource('error');
              setDataSourceError(result.error || 'Failed to refresh budget data after transaction change');
            }
          } catch (err) {
            console.error("Error refreshing budget data after transaction change:", err);
            setDataSource('error');
            setDataSourceError(err instanceof Error ? err.message : 'Unknown error');
          }
        };
        
        refreshBudgets();
      })
      .subscribe((status) => {
        console.log(`Transaction subscription status: ${status}`);
      });

    // Save subscription references
    setBudgetSubscription(newBudgetSubscription);
    setTransactionSubscription(newTransactionSubscription);

    // Clean up subscriptions on unmount or when dependencies change
    return () => {
      console.log("Cleaning up subscriptions");
      if (newBudgetSubscription) {
        supabase.removeChannel(newBudgetSubscription);
      }
      if (newTransactionSubscription) {
        supabase.removeChannel(newTransactionSubscription);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, budgetChannelName, transactionChannelName]);
  
  // Function to update chart visualizations with data
  const updateChartsWithData = (budgetData: BudgetItem[]) => {
    if (!budgetData || budgetData.length === 0) {
      // Create empty chart configurations
      setBarChartOptions({
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
          text: null,
        },
        xAxis: {
          categories: [],
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
            formatter: function (this: any) {
              return currencySymbol + this.value;
            },
            style: {
              color: "#5a5c69",
            },
          },
        },
        tooltip: {
          shared: true,
          useHTML: true,
          headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
          pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
            '<td style="padding:0"><b>' + currencySymbol + '{point.y:,.2f}</b></td></tr>',
          footerFormat: '</table>',
          style: {
            fontSize: "12px",
            fontFamily:
              'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          },
          valuePrefix: currencySymbol,
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
        series: []
      });

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
          pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b> (" + currencySymbol + "{point.y:,.2f})",
          valuePrefix: currencySymbol,
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
          name: "Budget Allocation",
          colorByPoint: true,
          data: []
        }],
        credits: {
          enabled: false,
        },
      });
      return;
    }

    // Continue with existing chart generation code...
    const labels: string[] = budgetData.map((b) => b.category_name || b.display_category || 'Uncategorized');
    const budgetAmounts = budgetData.map((b) => b.amount);
    const spentAmounts = budgetData.map((b) => b.spent);

      setBarChartOptions({
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
          text: null,
        },
        xAxis: {
          categories: labels,
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
            formatter: function (this: any) {
              return currencySymbol + this.value;
            },
            style: {
              color: "#5a5c69",
            },
          },
        },
        tooltip: {
          headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
          pointFormat:
            '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
            '<td style="padding:0"><b>' + currencySymbol + '{point.y:,.2f}</b></td></tr>',
          footerFormat: "</table>",
          shared: true,
          useHTML: true,
          style: {
            fontSize: "12px",
            fontFamily:
              'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          },
          valuePrefix: currencySymbol,
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
            name: "Budget",
            data: budgetAmounts,
            color: "#4e73df", // Primary color
          },
          {
            name: "Spent",
            data: spentAmounts,
            color: "#e74a3b", // Danger color
          },
        ],
      });

      // Prepare pie chart data for category distribution
    const pieData = budgetData.map((budget) => ({
      name: budget.category_name || budget.display_category || 'Uncategorized',
      y: budget.amount,
        sliced: (budget.percentage_used || 0) > 75, // Highlight categories with high percentage used
        selected: (budget.percentage_used || 0) > 90, // Select categories with very high percentage used
      }));

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
          pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b> (" + currencySymbol + "{point.y:,.2f})",
          valuePrefix: currencySymbol,
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
            name: "Budget Allocation",
            colorByPoint: true,
            data: pieData,
          },
        ],
        credits: {
          enabled: false,
        },
      });
  };

  // Update URL when filters change
  useEffect(() => {
    if (!budgets.length) return;
    
    // Create URL search params from filters
    const params = new URLSearchParams();
    
    // Only add parameters that are not default values
    if (filter.status !== "all") params.set("status", filter.status);
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
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, budgets, navigate]);
  
  // Function to apply filters with loading indicator
  const applyFilters = (dataToFilter = budgets) => {
    if (dataToFilter.length === 0) return;
    
    // Determine which data source to use based on scope filter
    let baseData = dataToFilter;
    if (filter.scope === "family" && familyBudgets.length > 0) {
      baseData = familyBudgets;
      setShowingFamilyBudgets(true);
    } else if (filter.scope === "personal") {
      baseData = budgets;
      setShowingFamilyBudgets(false);
    } else if (filter.scope === "all" && isFamilyMember) {
      // Combine personal and family budgets, preventing duplicates
      const combinedBudgets = [...budgets];
      familyBudgets.forEach(familyBudget => {
        if (!combinedBudgets.some(b => b.id === familyBudget.id)) {
          combinedBudgets.push(familyBudget);
        }
      });
      baseData = combinedBudgets;
      setShowingFamilyBudgets(false);
    } else {
      setShowingFamilyBudgets(false);
    }
    
    let result = [...baseData];
    
    // Show loading state
    setIsFiltering(true);
    
    setTimeout(() => {
      // Filter by category
      if (filter.categoryId !== "all") {
        result = result.filter(
          (budget) => budget.category_id === filter.categoryId
        );
      }
      
      // Filter by status
      if (filter.status !== "all") {
        result = result.filter((budget) => budget.status === filter.status);
      }
      
      // Filter by search term
      if (filter.search.trim() !== "") {
        const searchLower = filter.search.toLowerCase();
        result = result.filter((budget) =>
          (budget.category_name || budget.display_category || 'Uncategorized').toLowerCase().includes(searchLower)
        );
      }
      
      // Sort results
      result.sort((a, b) => {
        const categoryA = a.category_name || a.display_category || 'Uncategorized';
        const categoryB = b.category_name || b.display_category || 'Uncategorized';
        return categoryA.localeCompare(categoryB);
      });
      
      // Update filtered data and visualizations
      setFilteredBudgets(result);
      updateVisualizations(result);
      
      // Hide loading state
      setIsFiltering(false);
    }, 300);
  };

  // Function to update visualizations based on filtered data
  const updateVisualizations = (filteredData: BudgetItem[]) => {
    if (!filteredData || filteredData.length === 0) {
      setBarChartOptions(null);
      setPieChartOptions(null);
      return;
    }

    // Get top categories by spending for bar chart
    const sortedData = [...filteredData]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const barConfig: BarChartConfig = {
      chart: {
        type: "column",
        style: {
          fontFamily: '"Nunito", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
        categories: sortedData.map((budget) => budget.category_name || budget.display_category || 'Uncategorized'),
        crosshair: true,
        labels: {
          style: {
            color: "#5a5c69",
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
          formatter: function (this: any) {
            return currencySymbol + this.value;
          },
          style: {
            color: "#5a5c69",
          },
        },
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat:
          '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>{point.y:.1f}</b></td></tr>',
        footerFormat: "</table>",
        shared: true,
        useHTML: true,
        style: {
          fontSize: "12px",
          fontFamily: '"Nunito", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        valuePrefix: currencySymbol,
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 2,
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
          name: "Budget",
          data: sortedData.map((budget) => budget.amount),
          color: "#4e73df",
        },
        {
          name: "Spent",
          data: sortedData.map((budget) => budget.spent),
          color: "#1cc88a",
        },
      ],
    };

    // Create series data for pie chart
    const pieData = filteredData.map((budget) => ({
      name: budget.category_name || budget.display_category || 'Uncategorized',
      y: budget.spent,
      sliced: (budget.percentage_used || 0) >= 90,
      selected: (budget.percentage_used || 0) >= 90,
    }));

    // Add a special series to distinguish family budgets
    if (isFamilyMember && filter.scope === "all" && familyBudgets.length > 0) {
      // Add title to indicate it includes family budgets
      barConfig.title = {
        text: "Combined Personal & Family Budget Overview",
      };
      
      // Add additional series for family data visualization
      const familySpending = familyBudgets.reduce((total, budget) => total + budget.spent, 0);
      const personalSpending = filteredData
        .filter(b => !familyBudgets.some(fb => fb.id === b.id))
        .reduce((total, budget) => total + budget.spent, 0);
      
      // Add a small summary to the bar chart
      if (barConfig.subtitle) {
        barConfig.subtitle.text = `Family: ${formatCurrency(familySpending)} | Personal: ${formatCurrency(personalSpending)}`;
      } else {
        barConfig.subtitle = {
          text: `Family: ${formatCurrency(familySpending)} | Personal: ${formatCurrency(personalSpending)}`,
          style: {
            fontSize: '12px',
            color: '#858796'
          }
        };
      }
    } else if (showingFamilyBudgets) {
      barConfig.title = {
        text: "Family Budget Overview",
      };
    }

    const pieConfig: PieChartConfig = {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: {
          fontFamily: '"Nunito", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        height: 350,
      },
      title: {
        text: null,
      },
      tooltip: {
        pointFormat: "<b>{point.name}</b>: {point.percentage:.1f}%",
        valuePrefix: currencySymbol,
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
          },
          showInLegend: true,
          size: "90%",
        },
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

    setBarChartOptions(barConfig);
    setPieChartOptions(pieConfig);
  };

  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Set filtering state before applying changes
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = (): void => {
    // Show filtering state
    setIsFiltering(true);
    
    setFilter({
      categoryId: "all",
      status: "all",
      search: "",
      month: "all",
      year: "all",
      scope: "all",
    });
    
    // Update URL to remove all query parameters
    navigate('', { replace: true });
  };

  // Function to handle bar chart reference
  const barChartCallback = (chart: any): void => {
    // Save the chart instance
    if (barChartRef.current) {
      barChartRef.current.chart = chart;
    }
  };

  // Function to handle pie chart reference
  const pieChartCallback = (chart: any): void => {
    // Save the chart instance
    if (pieChartRef.current) {
      pieChartRef.current.chart = chart;
    }
  };

  // Function to open delete confirmation modal
  const openDeleteModal = (budgetId: string) => {
    setBudgetToDelete(budgetId);
    setShowDeleteModal(true);
  };

  // Function to close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setBudgetToDelete(null);
    setIsDeleting(false);
  };

  // Function to handle budget deletion using enhanced service
  const handleDeleteBudget = async () => {
    if (!budgetToDelete || !user) return;
    
    try {
      setIsDeleting(true);
      
      // Use enhanced budget service for deletion
      const result = await budgetService.current.deleteBudget(budgetToDelete, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete budget');
      }
      
      // Optimistically update the UI by removing the deleted budget from state
      const updatedBudgets = budgets.filter(budget => budget.id !== budgetToDelete);
      setBudgets(updatedBudgets);
      
      // Also update filtered budgets to keep the UI in sync
      const updatedFiltered = filteredBudgets.filter(budget => budget.id !== budgetToDelete);
      setFilteredBudgets(updatedFiltered);
      
      // Update charts with new data or clear them if no budgets remain
      if (updatedFiltered.length > 0) {
        updateVisualizations(updatedFiltered);
      } else {
        setBarChartOptions(null);
        setPieChartOptions(null);
      }
      
      showSuccessToast("Budget deleted successfully");
      closeDeleteModal();
    } catch (err) {
      console.error("Error deleting budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to delete budget: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user) return;
      
      try {
        // First try to query the family_members directly
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select(`
            id,
            family_id,
            role,
            status,
            families:family_id (
              id,
              family_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (!memberError && memberData && memberData.length > 0) {
          setIsFamilyMember(true);
          setUserFamilyId(memberData[0].family_id);
          setFamilyRole(memberData[0].role as "admin" | "viewer");
        } else {
          // Fallback: Since check_user_family RPC doesn't exist, set defaults
          console.log("No family_members record found and check_user_family RPC is not available");
          setIsFamilyMember(false);
          setUserFamilyId(null);
          setFamilyRole(null);
        }
      } catch (err) {
        console.error("Error checking family status:", err);
        setIsFamilyMember(false);
      }
    };
    
    checkFamilyStatus();
  }, [user]);

  // Load family budgets if user is part of a family
  useEffect(() => {
    const fetchFamilyBudgets = async () => {
      if (!isFamilyMember || !userFamilyId) return;
      
      try {
        const { data: familyBudgetData, error: familyBudgetError } = await supabase
          .from('family_budget_details')
          .select('*')
          .eq('family_id', userFamilyId)
          .eq('month', filter.month)
          .eq('year', filter.year);
          
        if (familyBudgetError) {
          throw new Error(familyBudgetError.message);
        }
        
        // Process family budgets similarly to personal budgets
        const processedFamilyBudgets = (familyBudgetData || []).map((budget: any) => ({
          ...budget,
          status: getProgressStatus(budget.percentage_used),
        }));
        
        setFamilyBudgets(processedFamilyBudgets);
      } catch (err) {
        console.error("Error fetching family budgets:", err);
        // Don't show error toast, just use empty array
        setFamilyBudgets([]);
      }
    };
    
    fetchFamilyBudgets();
  }, [isFamilyMember, userFamilyId, filter.month, filter.year]);
  
  const getProgressStatus = (percentage: number): "success" | "warning" | "danger" => {
    if (percentage <= 75) return "success"; // Under budget
    if (percentage <= 90) return "warning"; // Near budget limit
    return "danger"; // Over budget or at limit
  };
  
  const getStatusClass = (status: string): string => {
    switch (status) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "danger":
        return "danger";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return <LoadingSpinner message="Please wait while we fetch your budget data..." />;
  }

  // Calculate totals based on filtered budgets
  const totalBudget = filteredBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = filteredBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = Math.min(
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    100
  );

  return (
    <BudgetErrorBoundary>
      <div className="container-fluid">
        {/* Data Source Notification */}
        <DataSourceNotification 
          source={dataSource} 
          className="mb-3" 
          showDetails={process.env.NODE_ENV === 'development'}
        />
        
        <div className="d-sm-flex align-items-center justify-content-between mb-4 budgets-header">
          <h1 className="h3 mb-0 text-gray-800">Budgets</h1>
          <Link
            to="/budgets/create"
            className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm create-budget-btn"
          >
            <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>
            Create Budget
          </Link>
        </div>

        {/* Monthly Budget Overview */}
        <div className="row">
          <StatCard
            title="Total Budget"
            value={formatCurrency(totalBudget)}
            icon="solid fa-peso-sign"
            borderColor="primary"
            showTooltip={true}
            tooltipId="totalBudget"
            onClick={(e) => toggleTip('totalBudget', e)}
            animationDelay="0s"
          />

          <StatCard
            title="Total Spent"
            value={formatCurrency(totalSpent)}
            icon="credit-card"
            borderColor="danger"
            showTooltip={true}
            tooltipId="totalSpent"
            onClick={(e) => toggleTip('totalSpent', e)}
            animationDelay="0.1s"
          />

          <StatCard
            title="Remaining Budget"
            value={formatCurrency(totalRemaining)}
            icon="piggy-bank"
            borderColor="success"
            showTooltip={true}
            tooltipId="remaining"
            onClick={(e) => toggleTip('remaining', e)}
            animationDelay="0.2s"
          />
        </div>

        <div className="row">
          {/* Budget vs Spending Chart */}
          <div className="col-xl-8 col-lg-7">
            <ChartContainer
              title={`Budget vs Spending - ${getPeriodTitle()}`}
              showInfo={true}
              onInfoClick={(e) => toggleTip('barChart', e)}
              animationDelay="0.3s"
            >
              {barChartOptions && filteredBudgets.length > 0 ? (
                <>
                  <BudgetChart
                    options={barChartOptions}
                    chartRef={barChartRef}
                  />
                  <div className="mt-3 text-xs text-gray-500">
                    <i className="fas fa-lightbulb text-warning mr-1"></i>
                    <strong>Tip:</strong> Hover over each bar to see exact budget and spending amounts. Compare blue (budget) with red (spent) to identify overspending.
                  </div>
                </>
              ) : (
                <div className="text-center my-5">
                  <div className="mb-3">
                    <i className="fas fa-wallet fa-4x text-gray-300"></i>
                  </div>
                  <p className="text-gray-500">
                    {isFiltering
                      ? "No budgets match your filters"
                      : showingFamilyBudgets
                      ? "No family budgets found for this period"
                      : "No budgets found for this period"}
                  </p>
                  <Link
                    to="/budgets/create"
                    className="btn btn-primary btn-sm"
                  >
                    <i className="fas fa-plus-circle fa-sm mr-1"></i> Create New Budget
                  </Link>
                </div>
              )}
            </ChartContainer>

            {/* Overall Budget Progress */}
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    Overall Budget Progress
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('progress', e)}
                        aria-label="Budget progress information"
                      ></i>
                    </div>
                  </div>
                  {filteredBudgets.length > 0 && (
                    <div className={`badge badge-${
                      overallPercentage >= 90 ? "danger" : 
                      overallPercentage >= 75 ? "warning" : 
                      "success"
                    } ml-2`}>
                      {overallPercentage >= 90 ? "At Risk" : overallPercentage >= 75 ? "Caution" : "Healthy"}
                    </div>
                  )}
                </h6>
              </div>
              <div className="card-body">
                {filteredBudgets.length > 0 ? (
                  <>
                    <div className="mb-2 d-flex justify-content-between">
                      <span>Overall Progress</span>
                      <span className={`font-weight-bold ${
                        overallPercentage >= 90 ? "text-danger" : 
                        overallPercentage >= 75 ? "text-warning" : 
                        "text-success"
                      }`}>{formatPercentage(overallPercentage)}</span>
                    </div>
                    <div className="progress mb-4">
                      <div
                        className={`progress-bar ${
                          overallPercentage >= 90 
                            ? "bg-danger" 
                            : overallPercentage >= 75 
                            ? "bg-warning" 
                            : "bg-success"
                        }`}
                        role="progressbar"
                        style={{
                          width: `${overallPercentage}%`,
                        }}
                        aria-valuenow={overallPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        title={formatPercentage(overallPercentage)}
                      >
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">Budget Status</div>
                    <div className="row">
                      <div className="col-md-4 mb-4">
                        <div className="card bg-success text-white shadow">
                          <div className="card-body py-3">
                            On Track
                            <div className="text-white-50 small">Under budget</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-4">
                        <div className="card bg-warning text-white shadow">
                          <div className="card-body py-3">
                            Caution
                            <div className="text-white-50 small">Near limit</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-4">
                        <div className="card bg-danger text-white shadow">
                          <div className="card-body py-3">
                            Attention
                            <div className="text-white-50 small">Over budget</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <i className="fas fa-lightbulb text-warning mr-1"></i>
                      <strong>Tip:</strong> The color of the progress bar indicates your budget health: green is good, yellow means caution, and red indicates potential overspending.
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-tasks fa-3x text-gray-300"></i>
                    </div>
                    <h5 className="text-gray-500 font-weight-light">No budget progress to display</h5>
                    <p className="text-gray-500 mb-0 small">Add budgets to track your spending progress.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Budget Allocation Pie Chart */}
          <div className="col-xl-4 col-lg-5">
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Allocation - {getPeriodTitle()}
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('pieChart', e)}
                      aria-label="Pie chart information"
                    ></i>
                  </div>
                </h6>
              </div>
              <div className="card-body">
                {(() => {
                  // Check if we have budgets and meaningful spending data
                  const hasData = pieChartOptions && filteredBudgets.length > 0;
                  const hasSpending = filteredBudgets.some(budget => (budget.spent || 0) > 0);
                  
                  if (hasData && hasSpending) {
                    // Show chart when we have budgets with spending
                    return (
                      <>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={pieChartOptions}
                          callback={pieChartCallback}
                          ref={pieChartRef}
                        />
                        <div className="mt-3 text-xs text-gray-500">
                          <i className="fas fa-lightbulb text-warning mr-1"></i>
                          <strong>Tip:</strong> Click on a category slice to see more details. Larger segments represent categories with higher budget allocations. Use this visualization to ensure your budget aligns with your priorities and financial goals.
                        </div>
                      </>
                    );
                  } else if (filteredBudgets.length > 0 && !hasSpending) {
                    // Show no spending state when budgets exist but no spending
                    return (
                      <div className="text-center p-4">
                        <div className="mb-3">
                          <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                        </div>
                        <h5 className="text-gray-500 font-weight-light">No spending to visualize</h5>
                        <p className="text-gray-500 mb-3 small">
                          You have {filteredBudgets.length} budget{filteredBudgets.length !== 1 ? 's' : ''} set up, but no spending has been recorded yet.
                        </p>
                        <Link to="/transactions/add" className="btn btn-primary btn-sm">
                          <i className="fas fa-plus fa-sm mr-1"></i>Add Transaction
                        </Link>
                        <div className="mt-3 text-xs text-gray-500">
                          <i className="fas fa-info-circle mr-1"></i>
                          <strong>Tip:</strong> Start tracking your expenses to see how your spending compares to your budget allocation.
                        </div>
                      </div>
                    );
                  } else {
                    // Show no budgets state
                    return (
                      <div className="text-center p-4">
                        <div className="mb-3">
                          <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                        </div>
                        <h5 className="text-gray-500 font-weight-light">No budget data</h5>
                        <p className="text-gray-500 mb-3 small">
                          {isFiltering
                            ? "No budgets match your current filters."
                            : showingFamilyBudgets
                            ? "No family budgets found for this period."
                            : "Add budgets to see your budget allocation."}
                        </p>
                        {!isFiltering && (
                          <Link to="/budgets/create" className="btn btn-primary btn-sm">
                            <i className="fas fa-plus fa-sm mr-1"></i>Create Budget
                          </Link>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
                  
            {/* Budget Health Card */}
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Health
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('health', e)}
                      aria-label="Budget health information"
                    ></i>
                  </div>
                </h6>
              </div>
              <div className="card-body">
                {filteredBudgets.length > 0 ? (
                  <div className="text-center">
                    <div className="mb-3">
                      <i className={`fas fa-${overallPercentage >= 90 ? "exclamation-triangle text-danger" : overallPercentage >= 75 ? "exclamation-circle text-warning" : "check-circle text-success"} fa-3x mb-3`}></i>
                    </div>
                    <h4 className="font-weight-bold" style={{ color: overallPercentage >= 90 ? "#e74a3b" : overallPercentage >= 75 ? "#f6c23e" : "#1cc88a" }}>
                      {overallPercentage >= 90 ? "At Risk" : overallPercentage >= 75 ? "Caution" : "Healthy"}
                    </h4>
                    <p className="mb-0">
                      You've spent {formatPercentage(overallPercentage)} of your total budget.
                      {overallPercentage >= 90 ? " Consider reviewing your spending habits." : 
                       overallPercentage >= 75 ? " Monitor your expenses closely." : 
                       " You're managing your finances well!"}
                    </p>
                    <div className="mt-3 text-xs text-gray-500">
                      <i className="fas fa-lightbulb text-warning mr-1"></i>
                      <strong>Tip:</strong> Your budget health status considers all your spending across categories and provides an overall assessment of your financial situation.
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-heartbeat fa-3x text-gray-300"></i>
                    </div>
                    <h5 className="text-gray-500 font-weight-light">No budget health data</h5>
                    <p className="text-gray-500 mb-0 small">Create budgets to see your financial health status.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Budget Categories with Integrated Filters */}
        <div className="card shadow mb-4 transaction-table">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Budget Categories
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => toggleTip('budgetCategories', e)}
                  aria-label="Budget categories information"
                  style={{ cursor: "pointer" }}
                ></i>
              </div>
            </h6>
            <div>
              <button 
                className="btn btn-sm btn-outline-secondary mr-2" 
                onClick={resetFilters}
              >
                <i className="fas fa-undo fa-sm mr-1"></i> Reset Filters
              </button>
              <button className="btn btn-sm btn-outline-primary">
                <i className="fas fa-download fa-sm mr-1"></i> Export
              </button>
            </div>
          </div>
          
          {/* Table Section */}
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Period</th>
                    <th>Budget</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isFiltering ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5">
                        <div className="spinner-border text-primary mb-3" role="status">
                          <span className="sr-only">Loading...</span>
                        </div>
                        <p className="text-gray-600 mt-3">Filtering budgets...</p>
                      </td>
                    </tr>
                  ) : filteredBudgets.length > 0 ? (
                    filteredBudgets.map((budget) => {
                      const statusClass = getStatusClass(budget.status);
                      const progressPercentage = Math.min(budget.percentage_used || 0, 100);
                      
                      return (
                        <tr key={budget.id}>
                          <td>
                            <span className="font-weight-bold text-primary">{budget.budget_name || 'Unnamed Budget'}</span>
                          </td>
                          <td>
                            <span className="font-weight-bold">{budget.category_name}</span>
                          </td>
                          <td>
                            <div>
                              {getMonthYear(budget).month} {getMonthYear(budget).year}
                            </div>
                            <small className="text-gray-600">{budget.period}</small>
                          </td>
                          <td className="font-weight-bold">
                            {formatCurrency(budget.amount)}
                          </td>
                          <td>
                            {formatCurrency(budget.spent)}
                          </td>
                          <td className={(budget.remaining || 0) < 0 ? "text-danger font-weight-bold" : "text-success font-weight-bold"}>
                            {formatCurrency(budget.remaining || 0)}
                          </td>
                          <td>
                            {(budget.percentage_used || 0) >= 100 ? (
                              <span className="badge badge-danger">
                                <i className="fas fa-exclamation-circle mr-1"></i>
                                Over Budget
                              </span>
                            ) : (budget.percentage_used || 0) >= 90 ? (
                              <span className="badge badge-warning">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Near Limit
                              </span>
                            ) : (
                              <span className="badge badge-success">
                                <i className="fas fa-check-circle mr-1"></i>
                                On Track
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress mr-2" style={{ height: '10px', width: '80px' }}>
                                <div
                                  className={`progress-bar bg-${statusClass}`}
                                  role="progressbar"
                                  style={{ width: `${progressPercentage}%` }}
                                  aria-valuenow={progressPercentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                ></div>
                              </div>
                              <span className={`text-${statusClass}`}>
                                {formatPercentage(progressPercentage)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex justify-content-center align-items-center">
                              <Link
                                to={`/budgets/${budget.id}`}
                                className="btn btn-info btn-circle btn-sm mx-1"
                                title="View Budget Details"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link
                                to={`/budgets/${budget.id}/edit`}
                                className="btn btn-primary btn-circle btn-sm mx-1"
                                title="Edit Budget"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                              <button
                                className="btn btn-danger btn-circle btn-sm mx-1"
                                onClick={() => openDeleteModal(budget.id)}
                                title="Delete Budget"
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
                      <td colSpan={9} className="text-center py-4">
                        <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                        <p className="text-gray-500">No budgets found matching your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="modal fade show" style={{ display: "block" }} aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Deletion</h5>
                  <button type="button" className="close" onClick={closeDeleteModal} disabled={isDeleting}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body text-center">
                  <div className="mb-4">
                    <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                      style={{ width: "80px", height: "80px", backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                      <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
                    </div>
                  </div>
                  <p>Are you sure you want to delete this budget? This action cannot be undone.</p>
                </div>
                <div className="modal-footer d-flex justify-content-center">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteBudget}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Delete
                      </>
                    ) : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BudgetErrorBoundary>
  );
};

export default Budgets;
