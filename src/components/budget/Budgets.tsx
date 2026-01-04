import React, { useState, useEffect, useRef, FC, memo, ChangeEvent } from "react";
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

// Import export utilities
import {
  exportBudgetsToPDF,
  exportBudgetsToCSV,
  exportBudgetsToDOCX
} from './utils/exportUtils';

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

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import Budget Pagination CSS
import "./budgets-pagination.css";

// Mobile Budget Card Component
interface MobileBudgetCardProps {
  budget: BudgetItem;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  activeDropdown: string | null;
  onToggleDropdown: (id: string) => void;
  onCloseDropdown: () => void;
}

const MobileBudgetCard: FC<MobileBudgetCardProps> = memo(({ 
  budget, 
  onView, 
  onEdit, 
  onDelete,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown
}) => {
  const progressPercentage = Math.min(budget.percentage_used || 0, 100);
  const statusColor = budget.status === 'danger' ? 'rose' : budget.status === 'warning' ? 'amber' : 'emerald';
  
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-800 truncate">{budget.budget_name || 'Unnamed Budget'}</h4>
          <p className="text-[10px] text-gray-500">{budget.category_name || 'Uncategorized'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
            budget.status === 'danger' ? 'bg-rose-100 text-rose-600' :
            budget.status === 'warning' ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            {(budget.percentage_used || 0) >= 100 ? 'Over' : (budget.percentage_used || 0) >= 90 ? 'Near' : 'On Track'}
          </span>
          
          {/* Actions Dropdown - 3 Dots Button */}
          <div className="relative">
            <button
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleDropdown(budget.id); }}
              onTouchEnd={(e) => { e.stopPropagation(); onToggleDropdown(budget.id); }}
              aria-label="More actions"
            >
              <i className="fas fa-ellipsis-v text-[10px]"></i>
            </button>
            
            {/* Dropdown Menu */}
            {activeDropdown === budget.id && (
              <div 
                className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}
              >
                <button
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onCloseDropdown(); onView(budget.id); }}
                  onTouchEnd={(e) => { e.stopPropagation(); onCloseDropdown(); onView(budget.id); }}
                >
                  <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                  <span className="text-gray-700">View</span>
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onCloseDropdown(); onEdit(budget.id); }}
                  onTouchEnd={(e) => { e.stopPropagation(); onCloseDropdown(); onEdit(budget.id); }}
                >
                  <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                  <span className="text-gray-700">Edit</span>
                </button>
                <div className="border-t border-gray-200"></div>
                <button
                  className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onCloseDropdown(); onDelete(budget.id); }}
                  onTouchEnd={(e) => { e.stopPropagation(); onCloseDropdown(); onDelete(budget.id); }}
                >
                  <i className="fas fa-trash text-red-500 text-[10px]"></i>
                  <span className="text-red-600">Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-gray-500">Progress</span>
          <span className={`font-semibold text-${statusColor}-600`}>{formatPercentage(progressPercentage)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 bg-${statusColor}-500`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Budget details */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Budget</p>
          <p className="text-xs font-semibold text-gray-800">{formatCurrency(budget.amount)}</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Spent</p>
          <p className="text-xs font-semibold text-gray-800">{formatCurrency(budget.spent)}</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Left</p>
          <p className={`text-xs font-semibold ${(budget.remaining || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(budget.remaining || 0)}
          </p>
        </div>
      </div>
    </div>
  );
});

MobileBudgetCard.displayName = 'MobileBudgetCard';

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

const Budgets: FC = memo(() => {
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const barChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Mobile UI state
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  const [mobileActiveChart, setMobileActiveChart] = useState<'overview' | 'allocation'>('overview');
  
  // Mobile dropdown state for budget cards
  const [activeBudgetDropdown, setActiveBudgetDropdown] = useState<string | null>(null);
  
  const toggleBudgetDropdown = (budgetId: string) => {
    setActiveBudgetDropdown(activeBudgetDropdown === budgetId ? null : budgetId);
  };
  
  const closeBudgetDropdown = () => {
    setActiveBudgetDropdown(null);
  };
  
  // Close budget dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeBudgetDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeBudgetDropdown();
      }
    };

    if (activeBudgetDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeBudgetDropdown]);

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
    // Use the unified updateVisualizations function
    updateVisualizations(budgetData);
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
      
      // Filter by month
      if (filter.month !== "all") {
        const targetMonth = parseInt(filter.month);
        result = result.filter((budget) => {
          const budgetDate = new Date(budget.start_date);
          return budgetDate.getMonth() + 1 === targetMonth;
        });
      }
      
      // Filter by year
      if (filter.year !== "all") {
        const targetYear = parseInt(filter.year);
        result = result.filter((budget) => {
          const budgetDate = new Date(budget.start_date);
          return budgetDate.getFullYear() === targetYear;
        });
      }
      
      // Filter by search term (searches budget name and category name)
      if (filter.search.trim() !== "") {
        const searchLower = filter.search.toLowerCase();
        result = result.filter((budget) => {
          const budgetName = (budget.budget_name || '').toLowerCase();
          const categoryName = (budget.category_name || budget.display_category || '').toLowerCase();
          return budgetName.includes(searchLower) || categoryName.includes(searchLower);
        });
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
      
      // Reset to first page when filters change
      setCurrentPage(1);
      
      // Hide loading state
      setIsFiltering(false);
    }, 300);
  };
  
  // Calculate pagination metadata
  const totalItems = filteredBudgets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  // Get paginated budgets
  const paginatedBudgets = filteredBudgets.slice(startIndex, endIndex);
  
  // Pagination handlers
  const updatePage = (page: number) => {
    setCurrentPage(page);
  };
  
  const updatePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  // Function to update visualizations based on filtered data
  const updateVisualizations = (filteredData: BudgetItem[]) => {
    if (!filteredData || filteredData.length === 0) {
      setBarChartOptions(null);
      setPieChartOptions(null);
      return;
    }

    // Group budgets by category to avoid duplicates
    const categoryMap = new Map<string, { budget: number; spent: number; maxPercentage: number }>();
    
    filteredData.forEach((budget) => {
      const categoryName = budget.category_name || budget.display_category || 'Uncategorized';
      const existing = categoryMap.get(categoryName);
      
      if (existing) {
        // Aggregate amounts for the same category
        existing.budget += budget.amount;
        existing.spent += budget.spent;
        existing.maxPercentage = Math.max(existing.maxPercentage, budget.percentage_used || 0);
      } else {
        categoryMap.set(categoryName, {
          budget: budget.amount,
          spent: budget.spent,
          maxPercentage: budget.percentage_used || 0
        });
      }
    });

    // Convert map to arrays for charts
    const categories = Array.from(categoryMap.keys());
    const budgetAmounts = Array.from(categoryMap.values()).map(v => v.budget);
    const spentAmounts = Array.from(categoryMap.values()).map(v => v.spent);

    // Bar Chart: Show aggregated budgets by category for Budget vs Spending comparison
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
        categories: categories,
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
          '<td style="padding:0"><b>{point.y:.2f}</b></td></tr>',
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
          data: budgetAmounts,
          color: "#4e73df",
        },
        {
          name: "Spent",
          data: spentAmounts,
          color: "#e74a3b",
        },
      ],
    };

    // Pie Chart: Show aggregated budget allocation by category
    const pieData = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name: name,
      y: data.budget, // Use budget amount for allocation
      sliced: data.maxPercentage >= 90,
      selected: data.maxPercentage >= 90,
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
        pointFormat: "<b>{point.name}</b>: {point.percentage:.1f}% (" + currencySymbol + "{point.y:,.2f})",
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
          showInLegend: false,
          size: "85%",
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

  // Export handlers
  const getFilterInfo = (): string | undefined => {
    const filters: string[] = [];
    if (filter.categoryId && filter.categoryId !== 'all') {
      const category = categories.find(c => c.id === filter.categoryId);
      filters.push(`Category: ${category?.name || filter.categoryId}`);
    }
    if (filter.status && filter.status !== 'all') {
      filters.push(`Status: ${filter.status}`);
    }
    if (filter.month && filter.month !== 'all') {
      filters.push(`Month: ${filter.month}`);
    }
    if (filter.year && filter.year !== 'all') {
      filters.push(`Year: ${filter.year}`);
    }
    if (filter.search) {
      filters.push(`Search: "${filter.search}"`);
    }
    if (filter.scope && filter.scope !== 'all') {
      filters.push(`Scope: ${filter.scope}`);
    }
    return filters.length > 0 ? `Filters: ${filters.join(', ')}` : undefined;
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing PDF export...');
      await exportBudgetsToPDF(filteredBudgets, getFilterInfo());
      showSuccessToast('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      showErrorToast('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing CSV export...');
      exportBudgetsToCSV(filteredBudgets, getFilterInfo());
      showSuccessToast('CSV downloaded successfully!');
    } catch (error) {
      console.error('CSV Export Error:', error);
      showErrorToast('Failed to generate CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing Word document export...');
      await exportBudgetsToDOCX(filteredBudgets, getFilterInfo());
      showSuccessToast('Word document downloaded successfully!');
    } catch (error) {
      console.error('DOCX Export Error:', error);
      showErrorToast('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
    return (
      <div className="container-fluid">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your budgets...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          <LoadingSpinner message="Please wait while we fetch your budget data..." />
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
    <BudgetErrorBoundary>
      <div className="container-fluid">
        
        {/* Mobile Page Heading - Floating action buttons */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Budgets</h1>
            <div className="flex items-center gap-2">
              {/* Export Button */}
              <div className="dropdown">
                <button
                  className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                  type="button"
                  id="mobileExportDropdown"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  disabled={isExporting || filteredBudgets.length === 0}
                  aria-label="Export"
                >
                  <i className="fas fa-download text-xs"></i>
                </button>
                <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="mobileExportDropdown">
                  <button className="dropdown-item text-sm" onClick={handleExportPDF} disabled={isExporting}>
                    <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-danger"></i>PDF
                  </button>
                  <button className="dropdown-item text-sm" onClick={handleExportCSV} disabled={isExporting}>
                    <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-success"></i>CSV
                  </button>
                  <button className="dropdown-item text-sm" onClick={handleExportDOCX} disabled={isExporting}>
                    <i className="fas fa-file-word fa-sm fa-fw mr-2 text-primary"></i>Word
                  </button>
                </div>
              </div>
              {/* Create Budget Button */}
              <Link
                to="/budgets/create"
                className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                aria-label="Create budget"
              >
                <i className="fas fa-plus text-xs"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Page Heading */}
        <div className="d-none d-md-flex align-items-center justify-content-between mb-2 mb-md-4 budgets-header flex-wrap">
          <h1 className="h5 h-md-3 mb-1 mb-md-0 text-gray-800" style={{ fontSize: '1.1rem' }}>Budgets</h1>
          <div className="d-flex gap-2">
            {/* Export Dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-success shadow-sm d-flex align-items-center dropdown-toggle"
                type="button"
                id="exportDropdown"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                disabled={isExporting || filteredBudgets.length === 0}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <i className="fas fa-download fa-sm text-white-50" style={{ fontSize: '0.7rem' }}></i>
                <span className="d-none d-md-inline ml-2">Export</span>
              </button>
              <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
                <button className="dropdown-item" onClick={handleExportPDF} disabled={isExporting}>
                  <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-danger"></i>Export as PDF
                </button>
                <button className="dropdown-item" onClick={handleExportCSV} disabled={isExporting}>
                  <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-success"></i>Export as CSV
                </button>
                <button className="dropdown-item" onClick={handleExportDOCX} disabled={isExporting}>
                  <i className="fas fa-file-word fa-sm fa-fw mr-2 text-primary"></i>Export as Word
                </button>
              </div>
            </div>
            
            {/* Create Budget Button */}
            <Link
              to="/budgets/create"
              className="btn btn-sm btn-primary shadow-sm d-flex align-items-center"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <i className="fas fa-plus fa-sm text-white-50" style={{ fontSize: '0.7rem' }}></i>
              <span className="d-none d-md-inline ml-2">Create Budget</span>
            </Link>
          </div>
        </div>

        {/* Mobile Summary Cards - Modern stacked design */}
        <div className="block md:hidden mb-4">
          {/* Main budget overview card */}
          <div className={`bg-gradient-to-br ${overallPercentage >= 90 ? 'from-rose-500 via-red-500 to-orange-500' : overallPercentage >= 75 ? 'from-amber-500 via-orange-500 to-yellow-500' : 'from-emerald-500 via-teal-500 to-cyan-500'} rounded-2xl p-4 mb-3 shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">Budget Health</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className={`fas fa-${overallPercentage >= 90 ? 'exclamation-triangle' : overallPercentage >= 75 ? 'exclamation-circle' : 'check-circle'} text-white text-sm`}></i>
              </div>
            </div>
            <div className="text-white text-2xl font-bold mb-1">
              {formatPercentage(overallPercentage)} Used
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${overallPercentage >= 90 ? 'text-red-200' : overallPercentage >= 75 ? 'text-amber-200' : 'text-green-200'}`}>
                <i className={`fas fa-${overallPercentage >= 90 ? 'arrow-up' : overallPercentage >= 75 ? 'minus' : 'arrow-down'} text-[10px] mr-1`}></i>
                {overallPercentage >= 90 ? 'At Risk' : overallPercentage >= 75 ? 'Caution' : 'Healthy'}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Secondary cards grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total Budget */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-wallet text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Budget</p>
              <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(totalBudget)}</p>
            </div>

            {/* Total Spent */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
                <i className="fas fa-credit-card text-rose-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Spent</p>
              <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(totalSpent)}</p>
            </div>

            {/* Remaining */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                <i className="fas fa-piggy-bank text-emerald-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Left</p>
              <p className={`text-sm font-bold truncate ${totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
        </div>

        {/* Desktop Summary Cards */}
        <div className="d-none d-md-block">
          {/* Monthly Budget Overview */}
          {(filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || 
            filter.year !== "all" || filter.search !== "" || filter.scope !== "all") && (
            <div className="col-12 mb-2">
              <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-info-circle mr-2"></i>
                Summary cards below reflect filtered data ({filteredBudgets.length} of {budgets.length} budgets)
              </small>
            </div>
          )}
          <div className="row summary-cards">
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
        </div>

        {/* Mobile Charts - Tabbed interface */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Tab header */}
            <div className="flex bg-slate-50">
              <button
                onClick={() => setMobileActiveChart('overview')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  mobileActiveChart === 'overview'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-chart-bar mr-2 text-xs"></i>
                Overview
                {mobileActiveChart === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                )}
              </button>
              <button
                onClick={() => setMobileActiveChart('allocation')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  mobileActiveChart === 'allocation'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-chart-pie mr-2 text-xs"></i>
                Allocation
                {mobileActiveChart === 'allocation' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                )}
              </button>
            </div>

            {/* Chart content */}
            <div className="p-4">
              {mobileActiveChart === 'overview' ? (
                barChartOptions && filteredBudgets.length > 0 ? (
                  <div className="animate__animated animate__fadeIn">
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mb-4">
                      <span className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Budget
                      </span>
                      <span className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        Spent
                      </span>
                    </div>
                    <HighchartsReact 
                      highcharts={Highcharts} 
                      options={{
                        ...barChartOptions,
                        chart: {
                          ...barChartOptions.chart,
                          height: 280,
                          spacing: [10, 10, 10, 10],
                        },
                        legend: { enabled: false },
                        xAxis: {
                          ...barChartOptions.xAxis,
                          labels: {
                            ...barChartOptions.xAxis.labels,
                            style: { fontSize: '10px', color: '#6b7280' },
                            rotation: -45,
                          },
                        },
                        yAxis: {
                          ...barChartOptions.yAxis,
                          labels: {
                            ...barChartOptions.yAxis.labels,
                            style: { fontSize: '10px', color: '#6b7280' },
                          },
                        },
                      }} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">No budget data yet</p>
                    <Link to="/budgets/create" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                      <i className="fas fa-plus text-xs"></i>
                      Create Budget
                    </Link>
                  </div>
                )
              ) : (
                pieChartOptions && filteredBudgets.length > 0 ? (
                  <div className="animate__animated animate__fadeIn">
                    <HighchartsReact 
                      highcharts={Highcharts} 
                      options={{
                        ...pieChartOptions,
                        chart: {
                          ...pieChartOptions.chart,
                          height: 300,
                        },
                        plotOptions: {
                          ...pieChartOptions.plotOptions,
                          pie: {
                            ...(pieChartOptions.plotOptions as any)?.pie,
                            dataLabels: { enabled: false },
                            showInLegend: true,
                            size: '70%',
                            innerSize: '50%',
                            center: ['50%', '35%'],
                          },
                        },
                        legend: {
                          enabled: true,
                          layout: 'horizontal',
                          align: 'center',
                          verticalAlign: 'bottom',
                          itemStyle: { 
                            fontSize: '11px',
                            fontWeight: 'normal',
                            color: '#374151',
                          },
                          symbolRadius: 2,
                          symbolHeight: 10,
                          symbolWidth: 10,
                          itemMarginTop: 8,
                          itemMarginBottom: 4,
                          padding: 0,
                        },
                        title: { text: null },
                      }} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-chart-pie text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">No allocation data</p>
                    <Link to="/budgets/create" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                      <i className="fas fa-plus text-xs"></i>
                      Create Budget
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Mobile Budget Progress Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-tasks text-indigo-500 text-[10px]"></i>
                Overall Progress
              </h6>
              {filteredBudgets.length > 0 && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  overallPercentage >= 90 ? 'bg-rose-100 text-rose-600' : 
                  overallPercentage >= 75 ? 'bg-amber-100 text-amber-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {overallPercentage >= 90 ? 'At Risk' : overallPercentage >= 75 ? 'Caution' : 'Healthy'}
                </span>
              )}
            </div>
            <div className="p-4">
              {filteredBudgets.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Budget Used</span>
                    <span className={`text-sm font-bold ${
                      overallPercentage >= 90 ? 'text-rose-600' : 
                      overallPercentage >= 75 ? 'text-amber-600' : 
                      'text-emerald-600'
                    }`}>{formatPercentage(overallPercentage)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        overallPercentage >= 90 ? 'bg-rose-500' : 
                        overallPercentage >= 75 ? 'bg-amber-500' : 
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {overallPercentage >= 90 ? 'Consider reviewing your spending habits.' : 
                     overallPercentage >= 75 ? 'Monitor your expenses closely.' : 
                     "You're managing your finances well!"}
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-tasks text-gray-300 text-2xl mb-2"></i>
                  <p className="text-xs text-gray-500">Add budgets to track progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Charts Section */}
        <div className="d-none d-md-block">
          <div className="row">
            {/* Budget vs Spending Chart */}
            <div className="col-xl-8 col-lg-7 mb-3 mb-md-4">
              <ChartContainer
                title={`Budget vs Spending - ${getPeriodTitle()}${
                  (filter.categoryId !== "all" || filter.status !== "all" || filter.search !== "" || filter.scope !== "all") 
                    ? " (Filtered)" 
                    : ""
                }`}
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
                      className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                    >
                      <i className="fas fa-plus fa-sm mr-1 mr-md-2"></i>
                      <span className="d-none d-md-inline">Create Your First </span>Budget
                    </Link>
                  </div>
                )}
              </ChartContainer>

            {/* Overall Budget Progress */}
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center justify-content-between" style={{ fontSize: '0.875rem' }}>
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
                          <div className="card-body py-2 md:py-3">
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
          <div className="col-xl-4 col-lg-5 mb-3 mb-md-4">
            <div className="card shadow mb-3 md:mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
              <div className="card-header py-2 md:py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Allocation - {getPeriodTitle()}
                  {(filter.categoryId !== "all" || filter.status !== "all" || filter.search !== "" || filter.scope !== "all") && " (Filtered)"}
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
                        <Link 
                          to="/transactions/add" 
                          className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                        >
                          <i className="fas fa-plus fa-sm mr-1 mr-md-2"></i>
                          <span className="d-none d-md-inline">Add Your First </span>Transaction
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
                          <Link 
                            to="/budgets/create" 
                            className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                          >
                            <i className="fas fa-plus fa-sm mr-1 mr-md-2"></i>
                            <span className="d-none d-md-inline">Create Your First </span>Budget
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
        </div>

        {/* Mobile Filter Status Banner */}
        {(filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || 
          filter.year !== "all" || filter.search !== "" || filter.scope !== "all") && (
          <div className="block md:hidden mb-3">
            <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-filter text-blue-500 text-[10px]"></i>
                <span className="text-[11px] text-blue-700">
                  <span className="font-semibold">{filteredBudgets.length}</span> of {budgets.length} budgets
                </span>
              </div>
              <button 
                onClick={resetFilters}
                className="text-[10px] text-blue-600 font-medium flex items-center gap-1"
              >
                <i className="fas fa-times text-[8px]"></i>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Mobile Budget List Card */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-list text-indigo-500 text-[10px]"></i>
                Budget List
                {totalItems > 0 && (
                  <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                    {totalItems}
                  </span>
                )}
              </h6>
              <button 
                className="text-[10px] text-gray-500 flex items-center gap-1"
                onClick={resetFilters}
              >
                <i className="fas fa-undo text-[8px]"></i>
                Reset
              </button>
            </div>
            
            {/* Mobile Filters - Pill-based quick filters */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {/* Filter toggle button */}
                <button
                  onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    (filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || filter.year !== "all" || filter.search !== "" || filter.scope !== "all")
                      ? 'bg-indigo-500 text-white shadow-md' 
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <i className="fas fa-sliders-h text-[10px]"></i>
                  Filters
                  {(filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || filter.year !== "all" || filter.search !== "" || filter.scope !== "all") && (
                    <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                      {(filter.categoryId !== "all" ? 1 : 0) + (filter.status !== "all" ? 1 : 0) + (filter.month !== "all" ? 1 : 0) + (filter.year !== "all" ? 1 : 0) + (filter.search !== "" ? 1 : 0) + (filter.scope !== "all" ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Status quick filters */}
                {['all', 'success', 'warning', 'danger'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange({ target: { name: 'status', value: status } } as any)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      filter.status === status
                        ? status === 'success' ? 'bg-emerald-500 text-white shadow-sm' 
                          : status === 'warning' ? 'bg-amber-500 text-white shadow-sm'
                          : status === 'danger' ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'success' ? 'On Track' : status === 'warning' ? 'Caution' : 'At Risk'}
                  </button>
                ))}

                {/* Clear button */}
                {(filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || filter.year !== "all" || filter.search !== "" || filter.scope !== "all") && (
                  <button
                    onClick={resetFilters}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                )}
              </div>

              {/* Expanded filter panel */}
              {mobileFiltersExpanded && (
                <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 animate__animated animate__fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                      <select 
                        name="categoryId"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        value={filter.categoryId}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                      <select 
                        name="status"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        value={filter.status}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      >
                        <option value="all">All Statuses</option>
                        <option value="success">On Track</option>
                        <option value="warning">Caution</option>
                        <option value="danger">At Risk</option>
                      </select>
                    </div>

                    {/* Month */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Month</label>
                      <select 
                        name="month"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filter.month}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      >
                        <option value="all">All</option>
                        <option value="1">Jan</option>
                        <option value="2">Feb</option>
                        <option value="3">Mar</option>
                        <option value="4">Apr</option>
                        <option value="5">May</option>
                        <option value="6">Jun</option>
                        <option value="7">Jul</option>
                        <option value="8">Aug</option>
                        <option value="9">Sep</option>
                        <option value="10">Oct</option>
                        <option value="11">Nov</option>
                        <option value="12">Dec</option>
                      </select>
                    </div>

                    {/* Year */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Year</label>
                      <select 
                        name="year"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filter.year}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      >
                        <option value="all">All</option>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Search - Full width */}
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Search</label>
                      <input 
                        type="text"
                        name="search"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        placeholder="Search budget or category..."
                        value={filter.search}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      />
                    </div>

                    {/* Scope */}
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Scope</label>
                      <select 
                        name="scope"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filter.scope}
                        onChange={handleFilterChange}
                        disabled={isFiltering}
                      >
                        <option value="all">All</option>
                        <option value="personal">Personal</option>
                        {isFamilyMember && <option value="family">Family</option>}
                      </select>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={resetFilters}
                      className="text-[10px] text-gray-500 font-medium"
                      disabled={isFiltering}
                    >
                      <i className="fas fa-undo mr-1 text-[8px]"></i>
                      Reset
                    </button>
                    <button
                      onClick={() => setMobileFiltersExpanded(false)}
                      className="text-[10px] text-indigo-600 font-medium"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Budget List */}
            <div className="p-3">
              {isFiltering ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">Filtering budgets...</p>
                </div>
              ) : paginatedBudgets.length > 0 ? (
                <>
                  {paginatedBudgets.map((budget) => (
                    <MobileBudgetCard
                      key={budget.id}
                      budget={budget}
                      onView={(id) => navigate(`/budgets/${id}`)}
                      onEdit={(id) => navigate(`/budgets/${id}/edit`)}
                      onDelete={openDeleteModal}
                      activeDropdown={activeBudgetDropdown}
                      onToggleDropdown={toggleBudgetDropdown}
                      onCloseDropdown={closeBudgetDropdown}
                    />
                  ))}
                  
                  {/* Mobile Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">
                          {startIndex + 1}-{endIndex} of {totalItems}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updatePage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <i className="fas fa-chevron-left text-[10px]"></i>
                          </button>
                          <span className="text-[11px] text-gray-700 px-2">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => updatePage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <i className="fas fa-chevron-right text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-filter text-gray-400 text-lg"></i>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">No budgets found</p>
                  <Link 
                    to="/budgets/create" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    <i className="fas fa-plus text-xs"></i>
                    Create Budget
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Status Banner */}
        <div className="d-none d-md-block">
        {(filter.categoryId !== "all" || filter.status !== "all" || filter.month !== "all" || 
          filter.year !== "all" || filter.search !== "" || filter.scope !== "all") && (
          <div className="alert alert-info alert-dismissible fade show mb-3 animate__animated animate__fadeIn" role="alert" style={{ fontSize: '0.875rem' }}>
            <i className="fas fa-filter mr-2"></i>
            <strong>Filters Active:</strong> Showing {filteredBudgets.length} of {budgets.length} budgets
            {filter.categoryId !== "all" && " • Category filtered"}
            {filter.status !== "all" && " • Status filtered"}
            {filter.month !== "all" && " • Month filtered"}
            {filter.year !== "all" && " • Year filtered"}
            {filter.search !== "" && " • Search: \"" + filter.search + "\""}
            {filter.scope !== "all" && " • Scope: " + filter.scope}
            <button 
              type="button" 
              className="close" 
              onClick={resetFilters}
              style={{ fontSize: '1.2rem' }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}
        
        {/* Budget Categories with Integrated Filters */}
        <div className="card shadow mb-3 md:mb-4 budget-table">
          <div className="card-header py-2 md:py-3 d-flex flex-row align-items-center justify-content-between">
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
                className="btn btn-sm btn-outline-secondary" 
                onClick={resetFilters}
              >
                <i className="fas fa-undo fa-sm mr-1"></i> Reset Filters
              </button>
            </div>
          </div>
          
          {/* Inline Filter Controls */}
          <div className="card-body border-bottom bg-light py-2 md:py-3">
            <div className="row align-items-end">
              <div className="col-lg-2 col-md-3 col-6 mb-2">
                <label htmlFor="categoryFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Category</span>
                  <span className="d-inline d-md-none">Category</span>
                </label>
                <select
                  id="categoryFilter"
                  name="categoryId"
                  value={filter.categoryId}
                  onChange={handleFilterChange}
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-2 col-md-3 col-6 mb-2">
                <label htmlFor="statusFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Status</span>
                  <span className="d-inline d-md-none">Status</span>
                </label>
                <select
                  id="statusFilter"
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                >
                  <option value="all">All Statuses</option>
                  <option value="success">On Track</option>
                  <option value="warning">Caution</option>
                  <option value="danger">At Risk</option>
                </select>
              </div>

              <div className="col-lg-2 col-md-3 col-6 mb-2">
                <label htmlFor="monthFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Month</span>
                  <span className="d-inline d-md-none">Month</span>
                </label>
                <select
                  id="monthFilter"
                  name="month"
                  value={filter.month}
                  onChange={handleFilterChange}
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                >
                  <option value="all">All</option>
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

              <div className="col-lg-2 col-md-3 col-6 mb-2">
                <label htmlFor="yearFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Year</span>
                  <span className="d-inline d-md-none">Year</span>
                </label>
                <select
                  id="yearFilter"
                  name="year"
                  value={filter.year}
                  onChange={handleFilterChange}
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                >
                  <option value="all">All</option>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-lg-3 col-md-6 col-12 mb-2">
                <label htmlFor="searchFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Search</span>
                  <span className="d-inline d-md-none">Search</span>
                </label>
                <input
                  type="text"
                  id="searchFilter"
                  name="search"
                  value={filter.search}
                  onChange={handleFilterChange}
                  placeholder="Search budget or category..."
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                />
              </div>

              <div className="col-lg-1 col-md-3 col-12 mb-2">
                <label htmlFor="scopeFilter" className="text-xs font-weight-bold text-gray-700 mb-1">
                  <span className="d-none d-md-inline">Scope</span>
                  <span className="d-inline d-md-none">Scope</span>
                </label>
                <select
                  id="scopeFilter"
                  name="scope"
                  value={filter.scope}
                  onChange={handleFilterChange}
                  className="form-control form-control-sm"
                  disabled={isFiltering}
                >
                  <option value="all">All</option>
                  <option value="personal">Personal</option>
                  {isFamilyMember && <option value="family">Family</option>}
                </select>
              </div>
            </div>
            
            {/* Reset Filters Button */}
            <div className="row mt-2">
              <div className="col-12 text-right">
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={resetFilters}
                  disabled={isFiltering}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                >
                  <i className="fas fa-undo fa-sm" style={{ fontSize: '0.7rem' }}></i>
                  <span className="d-none d-md-inline ml-1">{isFiltering ? 'Filtering...' : 'Reset Filters'}</span>
                  <span className="d-inline d-md-none ml-1">{isFiltering ? 'Filtering...' : 'Reset'}</span>
                </button>
              </div>
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
                  ) : paginatedBudgets.length > 0 ? (
                    paginatedBudgets.map((budget) => {
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
            
            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="card-footer bg-white border-0">
                <div className="row align-items-center">
                  {/* Left: Entry counter */}
                  <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                      Showing {Math.min(startIndex + 1, totalItems)} to {endIndex} of {totalItems} entries
                    </span>
                  </div>
                  
                  {/* Center: Page size selector */}
                  <div className="col-md-4 text-center mb-2 mb-md-0">
                    <label className="me-2 mb-0" style={{ fontSize: '0.875rem' }}>Show</label>
                    <select 
                      className="form-select d-inline-block w-auto"
                      style={{ fontSize: '0.875rem' }}
                      value={pageSize}
                      onChange={(e) => updatePageSize(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <label className="ms-2 mb-0" style={{ fontSize: '0.875rem' }}>per page</label>
                  </div>
                  
                  {/* Right: Page navigation */}
                  <div className="col-md-4 text-center text-md-end">
                    <nav>
                      <ul className="pagination mb-0 justify-content-center justify-content-md-end">
                        {/* Previous button */}
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => updatePage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <i className="fas fa-chevron-left"></i>
                          </button>
                        </li>
                        
                        {/* Page numbers with smart logic */}
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => updatePage(pageNum)}
                                style={currentPage === pageNum ? { color: 'white' } : {}}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        })}
                        
                        {/* Next button */}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => updatePage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <i className="fas fa-chevron-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            )}
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
});

Budgets.displayName = 'Budgets';

export default Budgets;
