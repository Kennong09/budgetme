import React, { useState, useEffect, FC, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatCurrency, formatDate, formatPercentage } from "../../utils/helpers";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import "animate.css";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { BudgetService, BudgetItem as ServiceBudgetItem } from "../../services/database/budgetService";

// Import refactored components
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";
import BudgetErrorBoundary from "./components/shared/BudgetErrorBoundary";
import DataSourceNotification from "./components/shared/DataSourceNotification";

// Import types
import { BudgetItem, Transaction, TooltipPosition } from "./types";

const BudgetDetails: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [budget, setBudget] = useState<BudgetItem | null>(null);
  const [relatedBudgets, setRelatedBudgets] = useState<BudgetItem[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [budgetSubscription, setBudgetSubscription] = useState<any>(null);
  const [transactionSubscription, setTransactionSubscription] = useState<any>(null);
  
  // Data source tracking for fallback strategy
  const [dataSource, setDataSource] = useState<'view' | 'table_with_category' | 'table_only' | 'error'>('view');
  const [dataSourceError, setDataSourceError] = useState<string | null>(null);
  
  // Budget service instance
  const budgetService = useRef(BudgetService.getInstance());
  
  // Tooltip state
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  
  // Chart refs
  const allocationChartRef = useRef<any>(null);
  const categoryDistributionRef = useRef<any>(null);
  
  // Chart configs
  const [allocationChartOptions, setAllocationChartOptions] = useState<any>(null);
  const [categoryDistributionOptions, setCategoryDistributionOptions] = useState<any>(null);

  const [budgetChannelName] = useState<string>(`budget_detail_updates_${id}`);
  const [transactionChannelName] = useState<string>(`budget_transactions_updates_${id}`);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Helper functions to extract month and year from dates
  const getMonthYear = (budget: BudgetItem) => {
    if (budget.month && budget.year) {
      return { month: budget.month, year: budget.year };
    }
    
    // Fallback to extracting from start_date
    const startDate = new Date(budget.start_date);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    return {
      month: monthNames[startDate.getMonth()],
      year: startDate.getFullYear().toString()
    };
  };
  


  // Fetch budget details using enhanced service with fallback strategy
  useEffect(() => {
    const fetchBudgetDetails = async () => {
      try {
        if (!id) {
          setLoading(false);
          setError("No budget ID provided");
          return;
        }

        if (!user) {
          console.log("No user found, redirecting to login");
          navigate("/login");
          return;
        }

        setLoading(true);
        console.log(`Loading budget details for ID: ${id}`);

        // Use enhanced budget service with fallback strategy
        const result = await budgetService.current.getBudgetById(id, user.id);
        
        // Update data source tracking
        setDataSource(result.source);
        
        if (result.source === 'error') {
          setDataSourceError(result.error || 'Unknown error occurred');
          throw new Error(result.error || 'Failed to fetch budget data');
        } else {
          setDataSourceError(null);
        }

        if (!result.data || result.data.length === 0) {
          setError("Budget not found");
          setLoading(false);
          return;
        }

        const budgetData = result.data[0];
        console.log("Found budget:", budgetData);
        setBudget(budgetData);
        
        // Fetch related budgets (same category) using fallback strategy
        try {
          const relatedResult = await budgetService.current.getBudgets(user.id);
          if (relatedResult.source !== 'error' && relatedResult.data) {
            const relatedBudgetsData = relatedResult.data
              .filter(b => b.category_id === budgetData.category_id && b.id !== id)
              .slice(0, 5);
            setRelatedBudgets(relatedBudgetsData);
            console.log(`Found ${relatedBudgetsData.length} related budgets`);
          }
        } catch (err) {
          console.error("Error fetching related budgets:", err);
          setRelatedBudgets([]);
        }
        
        // Fetch related transactions for this budget period and category
        try {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('category_id', budgetData.category_id)
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('date', budgetData.start_date)
            .lte('date', budgetData.end_date)
            .order('date', { ascending: false });
          
          if (transactionsError) {
            console.error("Error fetching transactions:", transactionsError);
            setRelatedTransactions([]);
          } else {
            console.log(`Found ${transactionsData?.length || 0} related transactions`);
            setRelatedTransactions(transactionsData || []);
          }
        } catch (err) {
          console.error("Error fetching transactions:", err);
          setRelatedTransactions([]);
        }
        
        // Fetch all budgets for chart visualizations using fallback strategy
        try {
          const allBudgetsResult = await budgetService.current.getBudgets(user.id);
          if (allBudgetsResult.source !== 'error' && allBudgetsResult.data) {
            createChartConfigs(budgetData, allBudgetsResult.data);
          }
        } catch (err) {
          console.error("Error fetching all budgets for charts:", err);
        }
        
        setHighchartsLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error("Error loading budget details:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        showErrorToast(`Failed to load budget details: ${errorMessage}`);
        setDataSource('error');
        setDataSourceError(errorMessage);
        setLoading(false);
      }
    };

    // Initial data fetch
    fetchBudgetDetails();
  }, [id, user, navigate, showErrorToast]);

  // Set up real-time subscriptions in a separate useEffect
  useEffect(() => {
    if (!user || !id) return;

    // Clean up any existing subscriptions first
    if (budgetSubscription) {
      console.log("Removing existing budget subscription");
      supabase.removeChannel(budgetSubscription);
    }
    if (transactionSubscription) {
      console.log("Removing existing transaction subscription");
      supabase.removeChannel(transactionSubscription);
    }

    console.log(`Setting up new subscriptions for budget ${id}`);
    
    // Create new budget subscription with unique channel name
    const newBudgetSubscription = supabase
      .channel(budgetChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'budgets',
        filter: `id=eq.${id}`
      }, (payload) => {
        console.log("Budget update received:", payload);
        // Refresh data when changes occur
        const fetchUpdatedBudget = async () => {
          try {
            const { data, error } = await supabase
              .from('budget_details')
              .select('*')
              .eq('id', id)
              .eq('user_id', user.id)
              .single();
              
            if (!error && data) {
              setBudget(data);
            }
          } catch (err) {
            console.error("Error refreshing budget data:", err);
          }
        };
        
        fetchUpdatedBudget();
      })
      .subscribe((status) => {
        console.log(`Budget subscription status: ${status}`);
      });
      
    // Create new transaction subscription for this budget's category and period
    const newTransactionSubscription = supabase
      .channel(transactionChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("Transaction update received:", payload);
        // Refresh transactions data when changes occur
        const fetchUpdatedTransactions = async () => {
          if (!budget) return;
          
          try {
            const { data, error } = await supabase
              .from('transactions')
              .select('*')
              .eq('category_id', budget.category_id)
              .eq('user_id', user.id)
              .eq('type', 'expense')
              .gte('date', budget.start_date)
              .lte('date', budget.end_date)
              .order('date', { ascending: false });
              
            if (!error && data) {
              setRelatedTransactions(data);
            }
          } catch (err) {
            console.error("Error refreshing transaction data:", err);
          }
        };
        
        fetchUpdatedTransactions();
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
  }, [id, user, budgetChannelName, transactionChannelName]);
  
  // Tooltip toggle function
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

  const createChartConfigs = (budget: BudgetItem, allBudgets: BudgetItem[]) => {
    // Budget allocation chart (how this budget compares to other categories)
    const topCategories = allBudgets
      .filter(b => b.id !== budget.id)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
    
    const allocationData = [
      {
        name: budget.category_name,
        y: budget.amount,
        selected: true,
        sliced: true,
        color: '#4e73df'
      },
      ...topCategories.map(b => ({
        name: b.category_name,
        y: b.amount
      }))
    ];
    
    setAllocationChartOptions({
      chart: {
        type: 'pie',
        height: 250,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> (${point.y:.2f})',
        valuePrefix: '$'
      },
      accessibility: {
        point: {
          valueSuffix: '%'
        }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              fontWeight: 'normal'
            },
            connectorWidth: 0,
            distance: 15
          },
          showInLegend: false,
          size: '85%'
        }
      },
      legend: {
        enabled: false
      },
      series: [{
        name: 'Budget Allocation',
        colorByPoint: true,
        data: allocationData
      }],
      credits: {
        enabled: false
      }
    });
    
    // Budget Category Distribution bar chart
    // Group budgets by category and sum them
    const categoryBudgets = allBudgets.reduce<Record<string, number>>((acc, b) => {
      const categoryName = b.category_name || b.display_category || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += b.amount;
      return acc;
    }, {});
    
    // Convert to array of [category, amount] pairs and sort by amount
    const sortedCategories = Object.entries(categoryBudgets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Limit to top 8 categories for readability
    
    setCategoryDistributionOptions({
      chart: {
        type: 'bar',
        height: 300,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      xAxis: {
        categories: sortedCategories.map(([cat]) => cat),
        title: {
          text: null
        },
        lineWidth: 0,
        gridLineWidth: 0,
        labels: {
          style: {
            color: '#858796',
            fontSize: '11px'
          }
        }
      },
      yAxis: {
        min: 0,
        title: {
          text: null
        },
        labels: {
          format: '${value}',
          style: {
            color: '#858796',
            fontSize: '11px'
          }
        },
        gridLineColor: '#eaecf4',
        gridLineDashStyle: 'dash'
      },
      legend: {
        enabled: false
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">Budget: </td>' +
          '<td style="padding:0"><b>${point.y:.2f}</b></td></tr>',
        footerFormat: '</table>',
        shared: true,
        useHTML: true
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          dataLabels: {
            enabled: true,
            format: '${y}'
          },
          pointWidth: 20
        }
      },
      credits: {
        enabled: false
      },
      series: [{
        name: 'Budget Amount',
        colorByPoint: true,
        data: sortedCategories.map(([cat, amount]) => ({
          name: cat,
          y: amount,
          color: cat === (budget.category_name || budget.display_category) ? '#4e73df' : '#858796', // Highlight current category
        }))
      }]
    });
  };

  // Function to open delete confirmation modal
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  // Function to close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  // Update the delete function to use enhanced service
  const handleDelete = async (): Promise<void> => {
    if (!id || !user) return;
    
    try {
      setIsDeleting(true);
      
      // Use enhanced budget service for deletion
      const result = await budgetService.current.deleteBudget(id, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete budget');
      }
      
      showSuccessToast("Budget deleted successfully!");
      
      // Add a short timeout to ensure events have time to propagate
      setTimeout(() => {
        navigate("/budgets");
      }, 300);
      
    } catch (err) {
      console.error("Error deleting budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to delete budget: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading budget details..." />;
  }

  if (error || !budget) {
    return (
      <ErrorMessage
        title="Budget not found"
        message={error || "The budget you're looking for does not exist or has been deleted."}
        showBackButton={true}
        backTo="/budgets"
        backLabel="Back to Budgets"
      />
    );
  }

  // Extract month and year for display
  const { month, year } = getMonthYear(budget);

  // Determine color scheme based on budget status
  const colorClass = budget.status === "danger" ? "danger" : budget.status === "warning" ? "warning" : "success";
  const iconClass = budget.status === "danger" ? "exclamation-circle" : budget.status === "warning" ? "exclamation-triangle" : "check-circle";
  const bgColorStyle = budget.status === "danger"
    ? "rgba(231, 74, 59, 0.1)"
    : budget.status === "warning"
    ? "rgba(246, 194, 62, 0.1)"
    : "rgba(28, 200, 138, 0.1)";
  const iconColor = budget.status === "danger" ? "#e74a3b" : budget.status === "warning" ? "#f6c23e" : "#1cc88a";

  return (
    <BudgetErrorBoundary>
      <div className="container-fluid">
        {/* Data Source Notification */}
        <DataSourceNotification 
          source={dataSource} 
          className="mb-3" 
          showDetails={process.env.NODE_ENV === 'development'}
        />
        
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4 animate__animated animate__fadeInDown">
          <h1 className="h3 mb-0 text-gray-800">Budget Details</h1>
          <div className="d-flex">
            <button onClick={openDeleteModal} className="btn btn-primary btn-sm shadow-sm mr-2" style={{ backgroundColor: "#e74a3b", borderColor: "#e74a3b" }}>
              <i className="fas fa-trash fa-sm mr-2"></i> Delete Budget
            </button>
            <Link to={`/budgets/${id}/edit`} className="btn btn-primary btn-sm mr-2 shadow-sm">
              <i className="fas fa-edit fa-sm mr-2"></i> Edit Budget
            </Link>
            <Link to="/budgets" className="btn btn-sm btn-secondary shadow-sm">
              <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Budgets
            </Link>
          </div>
        </div>

        {/* Budget Overview Row */}
        <div className="row">
          {/* Budget Amount Card */}
          <div className="col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
            <div className={`card border-left-${colorClass} shadow h-100 py-2`}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className={`text-xs font-weight-bold text-${colorClass} text-uppercase mb-1 d-flex align-items-center`}>
                      Budget Amount
                      <div className="ml-2 position-relative">
                        <i 
                          className="fas fa-info-circle text-gray-400 cursor-pointer" 
                          onClick={(e) => toggleTip('budgetAmount', e)}
                          aria-label="Budget amount information"
                        ></i>
                      </div>
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {formatCurrency(budget.amount)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-coins fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Card */}
          <div className="col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card border-left-info shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                      Category
                      <div className="ml-2 position-relative">
                        <i 
                          className="fas fa-info-circle text-gray-400 cursor-pointer" 
                          onClick={(e) => toggleTip('budgetCategory', e)}
                          aria-label="Category information"
                        ></i>
                      </div>
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {budget.category_name || budget.display_category || (
                        <span className="text-warning">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Uncategorized
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-tag fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Period Card */}
          <div className="col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                      Budget Period
                      <div className="ml-2 position-relative">
                        <i 
                          className="fas fa-info-circle text-gray-400 cursor-pointer" 
                          onClick={(e) => toggleTip('budgetPeriod', e)}
                          aria-label="Budget period information"
                        ></i>
                      </div>
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {month} {year}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-calendar fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Budget Details Card */}
          <div className="col-lg-8 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
            <div className="card shadow">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Details
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('budgetDetails', e)}
                      aria-label="Budget details information"
                    ></i>
                  </div>
                </h6>
                <div className={`badge badge-${colorClass}`}>{budget.status === 'danger' ? 'Overspent' : budget.status === 'warning' ? 'Warning' : 'On Track'}</div>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="mb-2">
                    <h4 className="small font-weight-bold">Budget Name</h4>
                    <div className="p-3 bg-light rounded">
                      {budget.budget_name && budget.budget_name.trim() ? (
                        <p className="mb-0 text-gray-700">{budget.budget_name}</p>
                      ) : (
                        <p className="mb-0 text-muted font-italic">No budget name provided</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h4 className="small font-weight-bold">Budget Period</h4>
                    <div className="d-flex align-items-center">
                      <div className="p-2 rounded mr-2" style={{ backgroundColor: "rgba(78, 115, 223, 0.15)" }}>
                        <i className="fas fa-calendar text-primary"></i>
                      </div>
                      <span className="text-gray-800">{formatDate(budget.start_date)} - {formatDate(budget.end_date)}</span>
                    </div>
                  </div>
                  {budget.created_at && (
                    <div className="col-md-6">
                      <h4 className="small font-weight-bold">Created At</h4>
                      <div className="d-flex align-items-center">
                        <div className="p-2 rounded mr-2" style={{ backgroundColor: "rgba(246, 194, 62, 0.15)" }}>
                          <i className="fas fa-clock text-warning"></i>
                        </div>
                        <span className="text-gray-800">{formatDate(budget.created_at)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Budget Progress Section */}
                <div className="mb-4">
                  <h4 className="small font-weight-bold">Budget Progress</h4>
                  <div className="d-flex align-items-center">
                    <div className="p-2 rounded mr-2" style={{ backgroundColor: bgColorStyle }}>
                      <i className={`fas fa-${iconClass}`} style={{ color: iconColor }}></i>
                    </div>
                    <div>
                      <span className="text-gray-800">
                        <strong>{formatPercentage(budget.percentage_used || 0)}</strong> of budget used
                      </span>
                      <div className="small text-gray-600 mt-1">
                        Spent: {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)} 
                        (Remaining: {formatCurrency(budget.remaining || 0)})
                      </div>
                      <div className="progress mt-2" style={{ height: '10px' }}>
                        <div
                          className={`progress-bar bg-${colorClass}`}
                          role="progressbar"
                          style={{ width: `${Math.min(budget.percentage_used || 0, 100)}%` }}
                          aria-valuenow={budget.percentage_used || 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget Impact Visualization */}
                <div className="mt-4">
                  <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center">
                    Budget Category Distribution
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('categoryDistribution', e)}
                        aria-label="Category distribution information"
                      ></i>
                    </div>
                  </h6>
                  <p className="small text-gray-600 mb-3">
                    How this budget compares to other category budgets in the same period
                  </p>
                  {highchartsLoaded && categoryDistributionOptions && (
                    <div className="chart-area">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={categoryDistributionOptions}
                        ref={categoryDistributionRef}
                      />
                    </div>
                  )}
                </div>

                {/* Related Transactions Section */}
                {relatedTransactions.length > 0 && (
                  <div className="mt-4">
                    <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center">
                      Budget Expenses
                      <div className="ml-2 position-relative">
                        <i 
                          className="fas fa-info-circle text-gray-400 cursor-pointer" 
                          onClick={(e) => toggleTip('budgetExpenses', e)}
                          aria-label="Budget expenses information"
                        ></i>
                      </div>
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                        <thead className="bg-light">
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <th>% of Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatedTransactions.map((tx) => {
                            const percentOfBudget = (tx.amount / budget.amount) * 100;
                            
                            return (
                              <tr key={tx.id}>
                                <td>{formatDate(tx.date)}</td>
                                <td className="text-danger">
                                  {formatCurrency(tx.amount)}
                                </td>
                                <td>
                                  {tx.notes && tx.notes.trim() ? (
                                    tx.notes
                                  ) : (
                                    <span className="text-muted font-italic">No description</span>
                                  )}
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="progress mr-2" style={{ height: '15px', width: '80px' }}>
                                      <div
                                        className={`progress-bar ${
                                          percentOfBudget >= 20 ? 'bg-danger' : 
                                          percentOfBudget >= 10 ? 'bg-warning' : 
                                          'bg-success'
                                        }`}
                                        role="progressbar"
                                        style={{ width: `${Math.min(percentOfBudget, 100)}%` }}
                                        aria-valuenow={percentOfBudget}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                      ></div>
                                    </div>
                                    <span className="small">
                                      {formatPercentage(percentOfBudget)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Related Budgets Section */}
                {relatedBudgets.length > 0 && (
                  <div className="mt-4">
                    <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center">
                      Related Budgets
                      <div className="ml-2 position-relative">
                        <i 
                          className="fas fa-info-circle text-gray-400 cursor-pointer" 
                          onClick={(e) => toggleTip('relatedBudgets', e)}
                          aria-label="Related budgets information"
                        ></i>
                      </div>
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                        <thead className="bg-light">
                          <tr>
                            <th>Period</th>
                            <th>Budget</th>
                            <th>Spent</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatedBudgets.map((b) => {
                            const budgetMonthYear = getMonthYear(b);
                            return (
                              <tr key={b.id}>
                                <td>{budgetMonthYear.month} {budgetMonthYear.year}</td>
                                <td>{formatCurrency(b.amount)}</td>
                                <td className={b.status === 'danger' ? 'text-danger' : b.status === 'warning' ? 'text-warning' : 'text-success'}>
                                  {formatCurrency(b.spent)}
                                </td>
                                <td>
                                  <span className={`badge badge-${b.status === 'danger' ? 'danger' : b.status === 'warning' ? 'warning' : 'success'}`}>
                                    {b.status === 'danger' ? 'Overspent' : b.status === 'warning' ? 'Warning' : 'On Track'}
                                  </span>
                                </td>
                                <td>
                                  <Link to={`/budgets/${b.id}`} className="btn btn-sm btn-primary">
                                    <i className="fas fa-eye fa-sm"></i>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Budget Analysis Sidebar */}
          <div className="col-lg-4 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
            {/* Budget Allocation Chart */}
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Allocation
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('budgetAllocation', e)}
                      aria-label="Budget allocation information"
                    ></i>
                  </div>
                </h6>
              </div>
              <div className="card-body">
                {highchartsLoaded && allocationChartOptions ? (
                  <div className="chart-pie">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={allocationChartOptions}
                      ref={allocationChartRef}
                    />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-3">
                      <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                    </div>
                    <p className="text-gray-600 mb-0">No allocation data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Info Card */}
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  Budget Info
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('budgetInfo', e)}
                      aria-label="Budget info information"
                    ></i>
                  </div>
                </h6>
              </div>
              <div className="card-body">
                <div className="p-3 bg-light rounded mb-3">
                  <div className="small text-gray-500">Budget ID</div>
                  <div className="font-weight-bold">{budget.id}</div>
                </div>
                
                <div className="d-flex align-items-center mb-3">
                  <div className={`bg-${colorClass} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                    <i className={`fas fa-${iconClass} text-${colorClass}`}></i>
                  </div>
                  <div>
                    <div className="small text-gray-500">Budget Status</div>
                    <div className={`font-weight-bold text-${colorClass}`}>
                      {budget.status === 'danger' ? 'Overspent' : budget.status === 'warning' ? 'Warning' : 'On Track'}
                    </div>
                  </div>
                </div>
                
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-info p-2 rounded mr-2" style={{ opacity: 0.5 }}>
                    <i className="fas fa-calendar text-info"></i>
                  </div>
                  <div>
                    <div className="small text-gray-500">Budget Period</div>
                    <div className="font-weight-bold">
                      {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                    </div>
                  </div>
                </div>
                
                <Link to={`/budgets/${id}/edit`} className="btn btn-primary btn-block">
                  <i className="fas fa-edit mr-1"></i> Edit Budget
                </Link>
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
              left: `${tooltipPosition.left}px`,
              position: 'absolute',
              zIndex: 1000,
              maxWidth: '300px',
              padding: '15px',
              background: 'white',
              borderRadius: '5px',
              boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)',
              transform: 'translateX(-50%)'
            }}
          >
            {activeTip === 'budgetAmount' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Amount</div>
                <p className="tip-description mb-0">
                  The total amount of money allocated for this category during the selected time period. This is your spending limit for this category.
                </p>
              </>
            )}
            {activeTip === 'budgetCategory' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Category</div>
                <p className="tip-description mb-0">
                  The spending category this budget applies to. Categories help you organize your expenses and track spending patterns in specific areas.
                </p>
              </>
            )}
            {activeTip === 'budgetPeriod' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Period</div>
                <p className="tip-description mb-0">
                  The time period this budget covers. Budget tracking is done over specific periods to help you manage your finances more effectively.
                </p>
              </>
            )}
            {activeTip === 'budgetDetails' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Details</div>
                <p className="tip-description mb-0">
                  Comprehensive information about this budget, including its utilization rate, related transactions, and progress tracking. This section helps you understand how your money is being spent within this category.
                </p>
              </>
            )}
            {activeTip === 'categoryDistribution' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Category Distribution</div>
                <p className="tip-description mb-0">
                  This chart shows how budget allocations are distributed across all categories. It helps visualize spending priorities and identify which categories receive the largest portions of your total budget.
                </p>
              </>
            )}
            {activeTip === 'budgetExpenses' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Expenses</div>
                <p className="tip-description mb-0">
                  All transactions related to this budget category during the specified period. This section shows exactly where your money went and how each expense contributes to your overall category spending.
                </p>
              </>
            )}
            {activeTip === 'relatedBudgets' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Related Budgets</div>
                <p className="tip-description mb-0">
                  Other budgets for the same category from different time periods. This helps you track how your budget and spending patterns in this category change over time.
                </p>
              </>
            )}
            {activeTip === 'budgetAllocation' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Allocation</div>
                <p className="tip-description mb-0">
                  This chart shows how this budget compares to other category budgets in the same period. It helps you visualize your financial priorities based on how you allocate your money.
                </p>
              </>
            )}
            {activeTip === 'budgetInfo' && (
              <>
                <div className="tip-title font-weight-bold mb-2">Budget Information</div>
                <p className="tip-description mb-0">
                  Technical details about this budget including its unique ID, status, and date range. This information is useful for reference and identification purposes.
                </p>
              </>
            )}
          </div>
        )}

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
                    Are you sure you want to delete this budget? This action cannot be undone.
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
                    onClick={handleDelete}
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
      </div>
    </BudgetErrorBoundary>
  );
};

export default BudgetDetails; 