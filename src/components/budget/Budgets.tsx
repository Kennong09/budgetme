import React, { useState, useEffect, useRef, FC, ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getCurrentMonthYear,
} from "../../utils/helpers";
import { getCurrentUserData, getBudgetProgressData } from "../../data/mockData";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import ErrorBoundary from "../ErrorBoundary";
import { Budget } from "../../types";
import { useCurrency } from "../../utils/CurrencyContext";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface BudgetItem {
  id: string;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  period_start: string;
  month: string;
  year: string;
}

interface FilterState {
  categoryId: string;
  status: "all" | "success" | "warning" | "danger";
  search: string;
  month: string;
  year: string;
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

const Budgets: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [barChartOptions, setBarChartOptions] = useState<BarChartConfig | null>(null);
  const [pieChartOptions, setPieChartOptions] = useState<PieChartConfig | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
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

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      const user = getCurrentUserData();
      if (!user || !user.user) {
        setLoading(false);
        return;
      }

      const budgetProgress = getBudgetProgressData(
        user.user.id
      ) as unknown as BudgetItem[];
      setBudgets(budgetProgress);
      setFilteredBudgets(budgetProgress);

      // Extract unique categories for the dropdown
      const uniqueCategories = Array.from(new Set(budgetProgress.map(b => b.category))).sort();
      setCategories(uniqueCategories);

      // Prepare bar chart data
      const labels = budgetProgress.map((b) => b.category);
      const budgetAmounts = budgetProgress.map((b) => b.budget);
      const spentAmounts = budgetProgress.map((b) => b.spent);

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
            formatter: function () {
              // Use 'this' as any to avoid TypeScript errors with Highcharts
              return formatCurrency((this as any).value);
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
      const pieData = budgetProgress.map((budget) => ({
        name: budget.category,
        y: budget.budget,
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

      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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
  const applyFilters = () => {
    if (budgets.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    // Use setTimeout to allow the UI to update with the loading state
    setTimeout(() => {
      let result = [...budgets];
      
      // Filter by category
      if (filter.categoryId !== "all") {
        result = result.filter(budget => 
          budget.category === filter.categoryId
        );
      }
      
      // Filter by status
      if (filter.status !== "all") {
        result = result.filter(budget => budget.status === filter.status);
      }
      
      // Filter by month
      if (filter.month !== "all") {
        const monthIndex = parseInt(filter.month) - 1; // Convert to 0-based index
        result = result.filter(budget => {
          const budgetDate = new Date(budget.period_start);
          return budgetDate.getMonth() === monthIndex;
        });
      }
      
      // Filter by year
      if (filter.year !== "all") {
        const yearValue = parseInt(filter.year);
        result = result.filter(budget => {
          const budgetDate = new Date(budget.period_start);
          return budgetDate.getFullYear() === yearValue;
        });
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(budget =>
          budget.category.toLowerCase().includes(searchTerm)
        );
      }
      
      setFilteredBudgets(result);
      
      // Update visualizations based on filtered data
      updateVisualizations(result);
      
      // Hide loading indicator
      setIsFiltering(false);
    }, 300); // Short delay to make the loading indicator visible
  };

  // Function to update visualizations based on filtered data
  const updateVisualizations = (filteredData: BudgetItem[]) => {
    // Update bar chart
    if (barChartRef.current && barChartRef.current.chart) {
      // Prepare bar chart data
      const labels = filteredData.map((b) => b.category);
      const budgetAmounts = filteredData.map((b) => b.budget);
      const spentAmounts = filteredData.map((b) => b.spent);
      
      barChartRef.current.chart.update({
        xAxis: {
          categories: labels
        },
        series: [
          {
            name: "Budget",
            data: budgetAmounts
          },
          {
            name: "Spent",
            data: spentAmounts
          }
        ]
      }, true);
    }
    
    // Update pie chart
    if (pieChartRef.current && pieChartRef.current.chart) {
      const pieData = filteredData.map((budget) => ({
        name: budget.category,
        y: budget.budget,
        sliced: budget.percentage > 75, // Highlight categories with high percentage used
        selected: budget.percentage > 90, // Select categories with very high percentage used
      }));
      
      pieChartRef.current.chart.update({
        series: [{
          data: pieData
        }]
      }, true);
    }
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading budget data...</p>
        </div>
      </div>
    );
  }

  // Calculate totals based on filtered budgets instead of all budgets
  const totalBudget = filteredBudgets.reduce((sum, budget) => sum + budget.budget, 0);
  const totalSpent = filteredBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = Math.min(
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    100
  );

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Budgets</h1>
        <Link
          to="/budgets/create"
          className="d-none d-sm-inline-block btn btn-primary shadow-sm animate__animated animate__fadeIn"
        >
          <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>Create Budget
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
              {barChartOptions && (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={barChartOptions}
                  callback={barChartCallback}
                  ref={barChartRef}
                />
              )}
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Hover over each bar to see exact budget and spending amounts. Compare blue (budget) with red (spent) to identify overspending.
              </div>
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
                <div className={`badge badge-${
                  overallPercentage >= 90 ? "danger" : 
                  overallPercentage >= 75 ? "warning" : 
                  "success"
                } ml-2`}>
                  {overallPercentage >= 90 ? "At Risk" : overallPercentage >= 75 ? "Caution" : "Healthy"}
                </div>
              </h6>
            </div>
            <div className="card-body">
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
              {pieChartOptions && (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={pieChartOptions}
                  callback={pieChartCallback}
                  ref={pieChartRef}
                />
              )}
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Click on a category slice to see more details. Larger segments represent categories with higher budget allocations.
              </div>
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
              </div>
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Your budget health status considers all your spending across categories and provides an overall assessment of your financial situation.
              </div>
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
            <div className="col-md-3 mb-3">
              <label htmlFor="categoryId" className="font-weight-bold text-gray-800">Category</label>
              <select
                id="categoryId"
                name="categoryId"
                value={filter.categoryId}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="status" className="font-weight-bold text-gray-800">Status</label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Statuses</option>
                <option value="success">On Track</option>
                <option value="warning">Caution</option>
                <option value="danger">Attention</option>
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="month" className="font-weight-bold text-gray-800">Month</label>
              <select
                id="month"
                name="month"
                value={filter.month}
                onChange={handleFilterChange}
                className="form-control"
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

            <div className="col-md-3 mb-3">
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
          </div>

          <div className="row">
            <div className="col-md-12 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search categories..."
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Budget Categories Table */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Budget Categories
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('budgetCategories', e)}
                aria-label="Budget categories information"
              ></i>
            </div>
          </h6>
          <div>
            <button className="btn btn-sm btn-outline-primary">
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
                  <th>Month</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFiltering ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <p className="text-gray-600 mt-3">Filtering budgets...</p>
                    </td>
                  </tr>
                ) : filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>{budget.category}</td>
                      <td>{budget.month} {budget.year}</td>
                      <td>{formatCurrency(budget.budget)}</td>
                      <td>{formatCurrency(budget.spent)}</td>
                      <td>
                        <span
                          className={
                            budget.remaining < 0
                              ? "text-danger"
                              : budget.remaining < budget.budget * 0.2
                              ? "text-warning"
                              : "text-success"
                          }
                        >
                          {formatCurrency(budget.remaining)}
                        </span>
                      </td>
                      <td>
                        <div className="progress position-relative">
                          <div
                            className={`progress-bar ${
                              budget.percentage >= 90
                                ? "bg-danger"
                                : budget.percentage >= 75
                                ? "bg-warning"
                                : "bg-success"
                            }`}
                            role="progressbar"
                            style={{
                              width: `${budget.percentage}%`,
                            }}
                            aria-valuenow={budget.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            data-toggle="tooltip"
                            data-placement="top"
                            title={formatPercentage(budget.percentage)}
                          >
                          </div>
                          <div className="progress-tooltip">
                            {formatPercentage(budget.percentage)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex justify-content-center align-items-center">
                          <Link
                            to={`/budgets/${budget.id}`}
                            className="btn btn-info btn-circle btn-sm mx-1"
                          >
                            <i className="fas fa-eye"></i>
                          </Link>
                          <Link
                            to={`/budgets/edit/${budget.id}`}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
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
    </div>
  );
};

export default Budgets;
