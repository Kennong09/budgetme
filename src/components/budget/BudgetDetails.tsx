import React, { useState, useEffect, FC, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatCurrency, formatDate, formatPercentage } from "../../utils/helpers";
import { getBudgetProgressData, getCurrentUserData, getTransactionsByCategory, getTransactionsByDate, getCategoryById } from "../../data/mockData";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import "animate.css";
import { Budget } from "../../types";

// Interface for the data returned by getBudgetProgressData
interface RawBudgetData {
  id: number;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  month: string;
  year: number;
  period_start: string;
  period_end: string;
  category_id: number;
}

// Interface for the properly typed budget item
interface BudgetItem {
  id: string;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  month: string;
  year: number;
  period_start: string;
  period_end: string;
}

// Interface for transaction data
interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number;
  type: "income" | "expense";
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

// Convert raw budget data to properly typed BudgetItem
const convertToTypedBudget = (budget: RawBudgetData): BudgetItem => ({
  ...budget,
  id: budget.id.toString()
});

interface RouteParams {
  id: string;
}

const BudgetDetails: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<BudgetItem | null>(null);
  const [relatedBudgets, setRelatedBudgets] = useState<BudgetItem[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  
  // Tooltip state
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Chart refs
  const allocationChartRef = useRef<any>(null);
  const categoryDistributionRef = useRef<any>(null);
  
  // Chart configs
  const [allocationChartOptions, setAllocationChartOptions] = useState<any>(null);
  const [categoryDistributionOptions, setCategoryDistributionOptions] = useState<any>(null);

  useEffect(() => {
    // Simulate API call to get budget details
    const timer = setTimeout(() => {
      if (!id) {
        setLoading(false);
        return;
      }

      console.log(`Loading budget details for ID: ${id}`);

      // Get user data and budget info
      const userData = getCurrentUserData();
      if (!userData || !userData.user) {
        console.error("No user data found");
        setLoading(false);
        return;
      }

      const userId = userData.user.id;
      console.log(`User ID: ${userId}`);

      // Get all budget data
      const budgetProgressData = getBudgetProgressData(userId) as RawBudgetData[];
      console.log(`Retrieved ${budgetProgressData.length} budgets`);
      
      // Find the specific budget
      const foundBudget = budgetProgressData.find(
        (budget) => budget.id.toString() === id
      );

      if (foundBudget) {
        console.log("Found budget:", foundBudget);
        const typedBudget = convertToTypedBudget(foundBudget);
        setBudget(typedBudget);
        
        // Find related budgets (same category)
        const relatedBudgetsData = budgetProgressData
          .filter((b) => b.category === foundBudget.category && b.id.toString() !== id)
          .slice(0, 5)
          .map(convertToTypedBudget);
        
        setRelatedBudgets(relatedBudgetsData);
        console.log(`Found ${relatedBudgetsData.length} related budgets`);
        
        // Get related transactions for this budget period and category
        const categoryId = foundBudget.category_id;
        const categoryDetails = getCategoryById(categoryId, "expense");
        console.log(`Category: ${categoryDetails?.category_name} (ID: ${categoryId})`);
        
        // Get all transactions for this category within the budget period
        // Make sure we're working with date strings in the correct format
        const startDate = foundBudget.period_start;
        const endDate = foundBudget.period_end;
        
        console.log(`Fetching transactions from ${startDate} to ${endDate} for category ${categoryId}`);
        
        // Get all transactions within this period
        const periodTransactions = getTransactionsByDate(userId, startDate, endDate);
        console.log(`Found ${periodTransactions.length} transactions in this period`);
        
        // Filter by category and ensure they're expenses
        const categoryTransactions = periodTransactions.filter(t => 
          t.category_id === categoryId && 
          t.type === "expense"
        );
        
        console.log(`Found ${categoryTransactions.length} transactions for this category in this period`);
        categoryTransactions.forEach((tx, index) => {
          console.log(`Transaction ${index + 1}: ${formatDate(tx.date)} - ${formatCurrency(tx.amount)} - ${tx.notes}`);
        });
        
        // Check if the spent amount matches what we calculated
        const calculatedSpent = categoryTransactions.reduce((total, tx) => total + tx.amount, 0);
        console.log(`Calculated spent: ${calculatedSpent}, Budget spent property: ${foundBudget.spent}`);
        
        setRelatedTransactions(categoryTransactions as Transaction[]);
        
        // Generate chart configurations
        createChartConfigs(typedBudget, budgetProgressData);
      } else {
        console.error(`Budget with ID ${id} not found`);
      }

      setLoading(false);
      setHighchartsLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);
  
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

  const createChartConfigs = (budget: BudgetItem, allBudgets: RawBudgetData[]) => {
    // Budget allocation chart (how this budget compares to other categories)
    const topCategories = allBudgets
      .filter(b => b.id.toString() !== budget.id)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 4);
    
    const allocationData = [
      {
        name: budget.category,
        y: budget.budget,
        selected: true,
        sliced: true,
        color: '#4e73df'
      },
      ...topCategories.map(b => ({
        name: b.category,
        y: b.budget
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
      if (!acc[b.category]) {
        acc[b.category] = 0;
      }
      acc[b.category] += b.budget;
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
          color: cat === budget.category ? '#4e73df' : '#858796', // Highlight current category
        }))
      }]
    });
  };

  const handleDelete = (): void => {
    if (window.confirm("Are you sure you want to delete this budget?")) {
      // In a real app, would call API to delete budget
      console.log("Deleting budget:", budget);
      alert("Budget deleted successfully!");
      navigate("/budgets");
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading budget details...</p>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 animate__animated animate__fadeIn">
          <div className="error-icon mb-4">
            <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Budget not found</h1>
          <p className="mb-4">The budget you're looking for does not exist or has been deleted.</p>
          <Link to="/budgets" className="btn btn-primary">
            <i className="fas fa-arrow-left mr-2"></i> Back to Budgets
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 animate__animated animate__fadeInDown">
        <h1 className="h3 mb-0 text-gray-800">Budget Details</h1>
        <div className="d-flex">
          <button onClick={handleDelete} className="btn btn-primary btn-sm shadow-sm mr-2" style={{ backgroundColor: "#e74a3b", borderColor: "#e74a3b" }}>
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
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
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
                    {formatCurrency(budget.budget)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-coins fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Month/Period Card */}
        <div className="col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Month
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('budgetMonth', e)}
                        aria-label="Budget month information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {budget.month} {budget.year}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Card */}
        <div className="col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Category
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('budgetCategory', e)}
                        aria-label="Budget category information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {budget.category}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-tag fa-2x text-gray-300"></i>
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
              {/* Budget Progress Section */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="small font-weight-bold mb-0">Budget Utilization</h4>
                  <span className={`font-weight-bold text-${colorClass}`}>{formatPercentage(budget.percentage)}</span>
                </div>
                <div className="progress mb-4 position-relative">
                  <div
                    className={`progress-bar bg-${colorClass}`}
                    role="progressbar"
                    style={{ width: `${budget.percentage}%` }}
                    aria-valuenow={budget.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    data-toggle="tooltip"
                    data-placement="top"
                    title={formatPercentage(budget.percentage)}
                  ></div>
                  <div className="progress-tooltip">
                    {formatPercentage(budget.percentage)}
                  </div>
                </div>
                
                {/* Budget stats summary */}
                <div className="row mb-4">
                  <div className="col-md-4">
                    <div className="card bg-light border-0 h-100">
                      <div className="card-body text-center">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                          Budget Amount
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(budget.budget)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-4">
                    <div className="card bg-light border-0 h-100">
                      <div className="card-body text-center">
                        <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                          Current Spending
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(budget.spent)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-4">
                    <div className="card bg-light border-0 h-100">
                      <div className="card-body text-center">
                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                          Remaining
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(budget.remaining)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Category Distribution */}
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
                  How {budget.category} budget amount compares to other budget categories
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
                <p className="small text-gray-600 mb-3">
                  Transactions related to this budget category during {budget.month} {budget.year}
                </p>
                {relatedTransactions.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover" id="dataTable" width="100%" cellSpacing="0">
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
                          // Calculate what percentage of the budget this transaction represents
                          const percentOfBudget = (tx.amount / budget.budget) * 100;
                          
                          return (
                            <tr key={tx.id}>
                              <td>{formatDate(tx.date)}</td>
                              <td className="text-danger">
                                {formatCurrency(tx.amount)}
                              </td>
                              <td>{tx.notes}</td>
                              <td>
                                <div style={{ width: "100%", height: "15px", backgroundColor: "#e9ecef", borderRadius: "0.25rem", position: "relative" }}
                                  data-toggle="tooltip"
                                  data-placement="top"
                                  title={formatPercentage(percentOfBudget)}
                                >
                                  <div
                                    style={{ 
                                      width: `${percentOfBudget}%`, 
                                      height: "15px", 
                                      borderRadius: "0.25rem",
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      backgroundColor: percentOfBudget > 50 ? "#e74a3b" : percentOfBudget > 25 ? "#f6c23e" : "#1cc88a"
                                    }}
                                  >
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-weight-bold bg-light">
                          <td colSpan={1}>Total</td>
                          <td className="text-danger">
                            {formatCurrency(relatedTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                          </td>
                          <td colSpan={2}>{formatPercentage(relatedTransactions.reduce((sum, tx) => sum + tx.amount, 0) / budget.budget * 100)} of budget</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <i className="fas fa-info-circle mr-2"></i>
                        No transactions found for this budget category during {budget.month} {budget.year}.
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        onClick={() => window.location.reload()}
                      >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                      </button>
                    </div>
                    <div className="mt-2 small text-muted">
                      Budget period: {formatDate(budget.period_start)} - {formatDate(budget.period_end)}<br/>
                      Category: {budget.category} (ID: {budget.id})
                    </div>
                  </div>
                )}
              </div>
              
              {/* Related Budgets Section */}
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
                <p className="small text-gray-600 mb-3">
                  Other budgets for the {budget.category} category
                </p>
                {relatedBudgets.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover" id="dataTable" width="100%" cellSpacing="0">
                      <thead className="bg-light">
                        <tr>
                          <th>Month</th>
                          <th>Budget</th>
                          <th>Spent</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedBudgets.map((b) => (
                          <tr key={b.id}>
                            <td>{b.month} {b.year}</td>
                            <td>{formatCurrency(b.budget)}</td>
                            <td className={b.status === 'danger' ? 'text-danger' : b.status === 'warning' ? 'text-warning' : 'text-success'}>
                              {formatCurrency(b.spent)}
                            </td>
                                                          <td>
                              <div className={`badge badge-${b.status}`}>
                                {b.status === 'danger' ? 'Overspent' : b.status === 'warning' ? 'Warning' : 'On Track'}
                              </div>
                            </td>
                            <td>
                              <Link to={`/budgets/${b.id}`} className="btn btn-sm btn-primary">
                                <i className="fas fa-eye fa-sm"></i>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info text-center">
                    <i className="fas fa-info-circle mr-2"></i>
                    No related budgets found for the {budget.category} category.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Analysis Card */}
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
                  <p className="text-gray-600 mb-0">No budget data available</p>
                </div>
              )}
              <div className="mt-3">
                <p className="small text-gray-500 text-center mb-0">
                  This chart shows how your {budget.category} budget compares to other categories
                </p>
              </div>
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
                    {formatDate(budget.period_start)} - {formatDate(budget.period_end)}
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
          {activeTip === 'budgetMonth' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Budget Period</div>
              <p className="tip-description mb-0">
                The month and year this budget applies to. Budget tracking is done on a monthly basis to help you manage your finances more effectively.
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
          {activeTip === 'budgetDetails' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Budget Details</div>
              <p className="tip-description mb-0">
                Detailed information about this budget, including its utilization rate and related transactions. This section helps you understand how your money is being spent within this category.
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
          {activeTip === 'categoryDistribution' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Budget Category Distribution</div>
              <p className="tip-description mb-0">
                This chart shows how budget allocations are distributed across all categories. It helps visualize spending priorities and identify which categories receive the largest and smallest portions of your total budget.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to get month index from month name
const getMonthIndex = (month: string): number => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(month);
};

export default BudgetDetails; 