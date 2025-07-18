import React, { useState, useEffect, useRef, FC, ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getCurrentMonthYear,
} from "../../utils/helpers";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import { Budget } from "../../types";
import { useCurrency } from "../../utils/CurrencyContext";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface BudgetItem {
  id: string;
  category_name: string;  // Changed from category to match budget_details view
  amount: number;         // Changed from budget to match budget_details view
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  start_date: string;     // Changed from period_start to match budget_details view
  month: string;
  year: number;           // Changed from string to match budget_details view
  period: string;         // Added to match budget_details view
  end_date: string;       // Added to match budget_details view
  category_id: string;    // Added to match budget_details view
}

interface FilterState {
  categoryId: string;
  status: "all" | "success" | "warning" | "danger";
  search: string;
  month: string;
  year: string;
  scope: "all" | "personal" | "family"; // Filter for personal or family budgets
}

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
  
  // Family status states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);
  const [familyBudgets, setFamilyBudgets] = useState<BudgetItem[]>([]);
  const [showingFamilyBudgets, setShowingFamilyBudgets] = useState<boolean>(false);
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Get current date for default filter
  const currentDate = new Date();
  const defaultMonth = queryParams.get('month') || (currentDate.getMonth() + 1).toString(); // 1-12 for Jan-Dec
  const defaultYear = queryParams.get('year') || currentDate.getFullYear().toString();
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

  // Fetch budget data from Supabase
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

        // Fetch budgets from budget_details view
        const { data: budgetData, error: budgetError } = await supabase
          .from('budget_details')
          .select('*')
          .eq('user_id', user.id);

        if (budgetError) {
          throw new Error(`Error fetching budgets: ${budgetError.message}`);
        }

        console.log(`Retrieved ${budgetData?.length || 0} budgets`);
        
        if (budgetData && budgetData.length > 0) {
          setBudgets(budgetData);
          setFilteredBudgets(budgetData);

      // Extract unique categories for the dropdown
          const { data: categoryData, error: categoryError } = await supabase
            .from('expense_categories')
            .select('id, category_name')
            .eq('user_id', user.id)
            .order('category_name', { ascending: true });
          
          if (categoryError) {
            throw new Error(`Error fetching categories: ${categoryError.message}`);
          }

          setCategories(categoryData?.map(cat => ({
            id: cat.id,
            name: cat.category_name
          })) || []);

          // Update visualizations
          updateChartsWithData(budgetData);
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
        setLoading(false);
      }
    };

    // Initial data fetch
    fetchBudgetData();

    return () => {
      // Nothing to clean up for data fetching
    };
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
          // For INSERT and UPDATE events, refresh data from server
          const refreshBudgets = async () => {
            try {
              const { data, error } = await supabase
                .from('budget_details')
                .select('*')
                .eq('user_id', user.id);
                
              if (!error && data) {
                setBudgets(data);
                setFilteredBudgets(prev => {
                  // Apply current filters to the new data
                  if (filter.categoryId !== "all" || 
                      filter.status !== "all" || 
                      filter.month !== "all" || 
                      filter.year !== "all" || 
                      filter.search) {
                    // Re-apply filters
                    applyFilters(data);
                    return prev;
                  }
                  return data;
                });
                updateChartsWithData(data);
              }
            } catch (err) {
              console.error("Error refreshing budget data:", err);
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
        // Refresh budget data when transactions change
        const refreshBudgets = async () => {
          try {
            const { data, error } = await supabase
              .from('budget_details')
              .select('*')
              .eq('user_id', user.id);
              
            if (!error && data) {
              setBudgets(data);
              setFilteredBudgets(prev => {
                // Apply current filters to the new data
                if (filter.categoryId !== "all" || 
                    filter.status !== "all" || 
                    filter.month !== "all" || 
                    filter.year !== "all" || 
                    filter.search) {
                  // Re-apply filters
                  applyFilters(data);
                  return prev;
                }
                return data;
              });
              updateChartsWithData(data);
            }
          } catch (err) {
            console.error("Error refreshing budget data after transaction change:", err);
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
    const labels = budgetData.map((b) => b.category_name);
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
      name: budget.category_name,
      y: budget.amount,
        sliced: budget.percentage > 75, // Highlight categories with high percentage used
        selected: budget.percentage > 90, // Select categories with very high percentage used
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
          budget.category_name.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort results
      result.sort((a, b) => a.category_name.localeCompare(b.category_name));
      
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
        categories: sortedData.map((budget) => budget.category_name),
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
      name: budget.category_name,
      y: budget.spent,
      sliced: budget.percentage >= 90,
      selected: budget.percentage >= 90,
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
    // Get current date for resetting filters
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString();
    const currentYear = currentDate.getFullYear().toString();
    
    // Show filtering state
    setIsFiltering(true);
    
    setFilter({
      categoryId: "all",
      status: "all",
      search: "",
      month: currentMonth,
      year: currentYear,
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

  // Function to handle budget deletion
  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetToDelete);
        
      if (error) {
        throw new Error(`Error deleting budget: ${error.message}`);
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
          // Fallback to the function
          const { data: familyStatus, error: statusError } = await supabase.rpc(
            'check_user_family',
            { p_user_id: user.id }
          );
          
          if (!statusError && familyStatus && 
              ((Array.isArray(familyStatus) && familyStatus.length > 0 && familyStatus[0].is_member) || 
              (familyStatus.is_member))) {
            // Extract the family ID from the response based on format
            const familyId = Array.isArray(familyStatus) 
              ? familyStatus[0].family_id 
              : familyStatus.family_id;
              
            setIsFamilyMember(true);
            setUserFamilyId(familyId);
            
            // Fetch role
            const { data: roleData, error: roleError } = await supabase
              .from('family_members')
              .select('role')
              .eq('user_id', user.id)
              .eq('family_id', familyId)
              .single();
              
            if (!roleError && roleData) {
              setFamilyRole(roleData.role as "admin" | "viewer");
            }
          } else {
            setIsFamilyMember(false);
            setUserFamilyId(null);
            setFamilyRole(null);
          }
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
          status: getProgressStatus(budget.percentage),
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

  // Create a new method to render budget as table rows instead of cards
  const renderBudgetRows = () => {
    return (
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
                    <td colSpan={8} className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <p className="text-gray-600 mt-3">Filtering budgets...</p>
                    </td>
                  </tr>
                ) : filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => {
                    const statusClass = getStatusClass(budget.status);
                    const progressPercentage = Math.min(budget.percentage, 100);
                    
                    return (
                      <tr key={budget.id}>
                        <td>
                          <span className="font-weight-bold">{budget.category_name}</span>
                        </td>
                        <td>
                          <div>
                            {budget.month} {budget.year}
                          </div>
                          <small className="text-gray-600">{budget.period}</small>
                        </td>
                        <td className="font-weight-bold">
                          {formatCurrency(budget.amount)}
                        </td>
                        <td>
                          {formatCurrency(budget.spent)}
                        </td>
                        <td className={budget.remaining < 0 ? "text-danger font-weight-bold" : "text-success font-weight-bold"}>
                          {formatCurrency(budget.remaining)}
                        </td>
                        <td>
                          {budget.percentage >= 100 ? (
                            <span className="badge badge-danger">
                              <i className="fas fa-exclamation-circle mr-1"></i>
                              Over Budget
                            </span>
                          ) : budget.percentage >= 90 ? (
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
                    <td colSpan={8} className="text-center py-4">
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
    );
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Budgets
          </h5>
          <p className="text-gray-500">Please wait while we fetch your budget data...</p>
        </div>
      </div>
    );
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
    <div className="container-fluid">
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
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Total Budget
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalBudget', e)}
                        aria-label="Total budget information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalBudget)}
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
                    Total Spent
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalSpent', e)}
                        aria-label="Total spent information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalSpent)}
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
          <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Remaining Budget
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('remaining', e)}
                        aria-label="Remaining budget information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalRemaining)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Budget vs Spending Chart */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Budget vs Spending - {getPeriodTitle()}
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('barChart', e)}
                    aria-label="Bar chart information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {barChartOptions && filteredBudgets.length > 0 ? (
                <>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={barChartOptions}
                  callback={barChartCallback}
                  ref={barChartRef}
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
            </div>
          </div>

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
              {pieChartOptions && filteredBudgets.length > 0 ? (
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
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No allocation data</h5>
                  <p className="text-gray-500 mb-0 small">Your budget allocation chart will appear here.</p>
                </div>
              )}
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
      
      {/* Filters Card */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.45s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filter Budgets</h6>
          <button onClick={resetFilters} className="btn btn-sm btn-outline-primary">
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-2 mb-3">
              <label htmlFor="category" className="font-weight-bold text-gray-800">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={filter.categoryId}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label htmlFor="status" className="font-weight-bold text-gray-800">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Status</option>
                <option value="success">Under Budget</option>
                <option value="warning">Near Limit</option>
                <option value="danger">Over Budget</option>
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label htmlFor="month" className="font-weight-bold text-gray-800">Month</label>
              <select
                id="month"
                name="month"
                value={filter.month}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label htmlFor="year" className="font-weight-bold text-gray-800">Year</label>
              <select
                id="year"
                name="year"
                value={filter.year}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Years</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
            
            {/* Scope filter - only show if user is part of a family */}
            {isFamilyMember && (
              <div className="col-md-2 mb-3">
                <label htmlFor="scope" className="font-weight-bold text-gray-800">
                  Budget Type
                </label>
                <select
                  id="scope"
                  name="scope"
                  value={filter.scope}
                  onChange={handleFilterChange}
                  className="form-control"
                  disabled={isFiltering}
                >
                  <option value="all">All Budgets</option>
                  <option value="personal">My Personal</option>
                  <option value="family">Family</option>
                </select>
              </div>
            )}
            
            <div className="col-md-2 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">
                Search
              </label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search..."
                className="form-control"
                disabled={isFiltering}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Budget Categories Table */}
      {renderBudgetRows()}

      {/* Global tooltip that appears based on activeTip state */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px` 
          }}
        >
          {activeTip === 'totalBudget' && (
            <>
              <div className="tip-title">Total Budget</div>
              <p className="tip-description">
                The combined budget amount for all categories in the selected time period. This is the total amount you've planned to spend. Adjust individual category budgets to change this total.
              </p>
            </>
          )}
          {activeTip === 'totalSpent' && (
            <>
              <div className="tip-title">Total Spent</div>
              <p className="tip-description">
                The combined amount you've spent across all budget categories in the selected period. This represents your actual spending against your planned budget. Monitor this to ensure you're staying within your financial limits.
              </p>
            </>
          )}
          {activeTip === 'remaining' && (
            <>
              <div className="tip-title">Remaining Budget</div>
              <p className="tip-description">
                The difference between your total budget and total spent amounts. A positive value means you're under budget, while a negative value indicates you've exceeded your overall budget for the period.
              </p>
            </>
          )}
          {activeTip === 'barChart' && (
            <>
              <div className="tip-title">Budget vs Spending Comparison</div>
              <p className="tip-description">
                This chart compares your budgeted amounts (blue bars) with your actual spending (red bars) across categories. When red bars are taller than blue, you've exceeded the budget for that category. Use this visualization to identify areas where you might need to adjust spending or budget allocations.
              </p>
            </>
          )}
          {activeTip === 'pieChart' && (
            <>
              <div className="tip-title">Budget Allocation</div>
              <p className="tip-description">
                This chart shows how your total budget is distributed across different categories. Larger segments represent categories with higher budget allocations. Use this visualization to ensure your budget aligns with your priorities and financial goals.
              </p>
            </>
          )}
          {activeTip === 'progress' && (
            <>
              <div className="tip-title">Overall Budget Progress</div>
              <p className="tip-description">
                This progress bar shows what percentage of your total budget you've spent so far. The color indicates your overall budget health: green means you're on track, yellow suggests caution, and red indicates you're approaching or have exceeded your budget limits.
              </p>
            </>
          )}
          {activeTip === 'health' && (
            <>
              <div className="tip-title">Budget Health Status</div>
              <p className="tip-description">
                A quick assessment of your overall financial health based on your spending relative to your budget. "Healthy" indicates you're well under budget, "Caution" means you're approaching your limits, and "At Risk" signals that you've spent most or all of your budgeted amount.
              </p>
            </>
          )}
          {activeTip === 'budgetCategories' && (
            <>
              <div className="tip-title">Budget Categories</div>
              <p className="tip-description">
                A detailed breakdown of all your budget categories showing allocated amounts, actual spending, and remaining balances. This table helps you track spending across categories and identify areas where you may be over or under budget.
              </p>
            </>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
  );
};

export default Budgets;
