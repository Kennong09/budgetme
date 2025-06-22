import React, { useState, useRef, useEffect, FC, ChangeEvent, MouseEvent } from "react";
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
// Import accessibility module (optional but recommended for accessibility)
import HighchartsAccessibility from 'highcharts/modules/accessibility';
// Import additional modules
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import ErrorBoundary from "../ErrorBoundary";
import { formatCurrency, formatPercentage } from "../../utils/helpers";
import {
  getCurrentUserData,
  getTotalIncome, 
  getTotalExpenses,
  getMonthlySpendingData,
  getCategorySpendingData,
  getTransactionTrends,
  calculateConsistentSpending,
  calculateDebtReduction,
  findUnusualTransactions,
  getTransactionsByDate,
  getBudgetProgressData,
  getTopBudgetCategories,
  calculateBudgetToGoalRelationship
} from "../../data/mockData";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Add zoomType to Highcharts chart options
declare module 'highcharts' {
  interface ChartOptions {
    zoomType?: 'x' | 'y' | 'xy';
  }
}

// Initialize Highcharts modules
if (typeof window !== 'undefined') {
  HighchartsAccessibility(Highcharts);
  HighchartsExporting(Highcharts);
  HighchartsExportData(Highcharts);
}

interface SpendingDataItem {
  name: string;
  value: number;
  color: string;
}

interface IncomeExpenseDataItem {
  name: string;
  income: number;
  expenses: number;
}

interface SavingsDataItem {
  name: string;
  rate: number;
}

// Proper reference for Highcharts component
interface ChartComponentProps {
  highcharts: typeof Highcharts;
  options: Highcharts.Options;
}

interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}

interface BudgetRelationship {
  totalBudgetAllocated: number;
  totalSpentOnGoals: number;
  percentageBudgetToGoals: number;
  goalTransactionsCount: number;
}

type ReportType = "spending" | "income-expense" | "savings" | "trends" | "goals" | "predictions";
type TimeframeType = "month" | "quarter" | "year";
type FormatType = "chart" | "table";
type ChartType = "bar" | "pie" | "line" | "area" | "column";

const FinancialReports: FC = () => {
  const [reportType, setReportType] = useState<ReportType>("spending");
  const [timeframe, setTimeframe] = useState<TimeframeType>("month");
  const [format, setFormat] = useState<FormatType>("chart");
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [goalRelationship, setGoalRelationship] = useState<BudgetRelationship | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [chartOptions, setChartOptions] = useState<Highcharts.Options>({});
  
  // Fixed reference for Highcharts
  const chartRef = useRef<any>(null);

  // Function to determine default chart type based on report type
  const getDefaultChartType = (reportType: ReportType): ChartType => {
    switch (reportType) {
      case "spending":
        return "pie";
      case "income-expense":
        return "column";
      case "trends":
        return "line";
      case "goals":
        return "column";
      case "predictions":
        return "line";
      default:
        return "column";
    }
  };

  // Update chart type when report type changes
  useEffect(() => {
    const defaultChart = getDefaultChartType(reportType);
    setChartType(defaultChart);
  }, [reportType]);

  // Function to toggle tooltips
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

  // Fetch user data and initialize reports
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Get user data and set state
      const userDataResult = getCurrentUserData(1);
      setUserData(userDataResult);
      
      // Get monthly data
      const monthlyDataResult = getMonthlySpendingData(1);
      setMonthlyData(monthlyDataResult);
      
      // Get category data
      const categoryDataResult = getCategorySpendingData(1);
      setCategoryData(categoryDataResult);
      
      // Get trends data
      const trendsDataResult = getTransactionTrends(1 as unknown as string);
      setTrendsData(trendsDataResult);
      
      // Get budget data
      const budgetDataResult = getBudgetProgressData(1);
      setBudgetData(budgetDataResult);
      
      // Get budget to goal relationship
      const relationshipData = calculateBudgetToGoalRelationship(1) as BudgetRelationship;
      setGoalRelationship(relationshipData);
      
      // Simulate API delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
    };

    fetchData();
  }, []);

  // Create Highcharts options based on data and chart type
  useEffect(() => {
    if (loading) return;

    // Define options as any to bypass TypeScript strict checking
    const options: any = {
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadPDF', 'downloadCSV']
          }
        }
      },
      chart: {
        height: 400,
        style: {
          fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      title: {
        text: ''
      },
      colors: [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', 
        '#858796', '#5a5c69', '#6610f2', '#fd7e14', '#20c9a6'
      ]
    };

    let updatedOptions = { ...options };

    if (reportType === "spending" && categoryData) {
      const seriesData = categoryData.labels.map((label: string, index: number) => ({
        name: label,
        y: categoryData.datasets[0].data[index],
        color: categoryData.datasets[0].backgroundColor[index]
      }));
      
      if (chartType === "pie") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: 'pie'
          },
          tooltip: {
            pointFormat: '{point.name}: <b>{point.percentage:.1f}%</b> ({point.y:,.2f})'
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
              },
              showInLegend: true
            }
          },
          series: [{
            name: 'Categories',
            colorByPoint: true,
            data: seriesData,
            type: 'pie'
          }]
        };
      } else if (chartType === "bar" || chartType === "column") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: chartType
          },
          xAxis: {
            categories: categoryData.labels,
            title: {
              text: 'Categories'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          plotOptions: {
            column: {
              borderRadius: 5
            }
          },
          series: [{
            name: 'Spending',
            data: categoryData.datasets[0].data,
            type: chartType
          }]
        };
      }
    }

    if (reportType === "income-expense" && monthlyData) {
      if (chartType === "line") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: 'line'
          },
          xAxis: {
            categories: monthlyData.labels,
            title: {
              text: 'Month'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          series: [
            {
              name: 'Income',
              data: monthlyData.datasets[0].data,
              type: 'line',
              color: '#1cc88a'
            },
            {
              name: 'Expenses',
              data: monthlyData.datasets[1].data,
              type: 'line',
              color: '#e74a3b'
            },
            {
              name: 'Savings',
              data: monthlyData.labels.map((_: any, index: number) => 
                monthlyData.datasets[0].data[index] - monthlyData.datasets[1].data[index]
              ),
              type: 'line',
              color: '#4e73df'
            }
          ]
        };
      } else if (chartType === "bar" || chartType === "column") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: chartType
          },
          xAxis: {
            categories: monthlyData.labels,
            title: {
              text: 'Month'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          plotOptions: {
            column: {
              borderRadius: 5
            }
          },
          series: [
            {
              name: 'Income',
              data: monthlyData.datasets[0].data,
              type: chartType,
              color: '#1cc88a'
            },
            {
              name: 'Expenses',
              data: monthlyData.datasets[1].data,
              type: chartType,
              color: '#e74a3b'
            }
          ]
        };
      } else if (chartType === "area") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: 'area'
          },
          xAxis: {
            categories: monthlyData.labels,
            title: {
              text: 'Month'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          plotOptions: {
            area: {
              stacking: 'normal',
              marker: {
                enabled: false
              }
            }
          },
          series: [
            {
              name: 'Income',
              data: monthlyData.datasets[0].data,
              type: 'area',
              color: '#1cc88a',
              fillOpacity: 0.3
            },
            {
              name: 'Expenses',
              data: monthlyData.datasets[1].data,
              type: 'area',
              color: '#e74a3b',
              fillOpacity: 0.3
            }
          ]
        };
      }
    }

    if (reportType === "trends" && trendsData) {
      if (chartType === "line") {
        // Create the chart options object first with proper type assertion
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: 'line'
          } as any,
          xAxis: {
            categories: trendsData.map(item => item.category),
            labels: {
              rotation: -45,
              style: {
                fontSize: '12px'
              }
            }
          },
          yAxis: [
            {
              title: {
                text: 'Amount'
              },
              labels: {
                formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                  return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
                }
              }
            },
            {
              title: {
                text: 'Change %'
              },
              labels: {
                format: '{value}%'
              },
              opposite: true
            }
          ],
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              if (this.series.name === '% Change') {
                return `<b>${this.x}</b><br/>${this.series.name}: ${this.y}%`;
              }
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          series: [
            {
              name: 'Previous Month',
              data: trendsData.map(item => item.previousAmount),
              type: 'column',
              color: '#8884d8',
              yAxis: 0
            } as any,
            {
              name: 'Current Month',
              data: trendsData.map(item => item.currentAmount),
              type: 'column',
              color: '#4e73df',
              yAxis: 0
            } as any,
            {
              name: '% Change',
              data: trendsData.map(item => item.change),
              type: 'line',
              color: '#ff7300',
              yAxis: 1,
              marker: {
                lineWidth: 2
              }
            } as any
          ]
        };
        
        // Then add zoomType as a separate property with type assertion
        (updatedOptions.chart as any).zoomType = 'xy';
      } else if (chartType === "bar" || chartType === "column") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: chartType
          },
          xAxis: {
            categories: trendsData.map(item => item.category),
            labels: {
              rotation: -45,
              style: {
                fontSize: '12px'
              }
            }
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          plotOptions: {
            column: {
              borderRadius: 5
            }
          },
          series: [
            {
              name: 'Previous Month',
              data: trendsData.map(item => item.previousAmount),
              type: chartType,
              color: '#8884d8'
            },
            {
              name: 'Current Month',
              data: trendsData.map(item => item.currentAmount),
              type: chartType,
              color: '#4e73df'
            }
          ]
        };
      }
    }

    if (reportType === "goals" && goalRelationship) {
      if (chartType === "bar" || chartType === "column") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: chartType
          },
          xAxis: {
            categories: ['Budget vs Goals']
          },
          yAxis: {
            title: {
              text: 'Amount'
            },
            labels: {
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject): string {
                return formatCurrency(typeof this.value === 'string' ? parseFloat(this.value) || 0 : Number(this.value));
              }
            }
          },
          tooltip: {
            formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
              return `<b>${this.x}</b><br/>${this.series.name}: ${formatCurrency(this.y !== undefined && this.y !== null ? Number(this.y) : 0)}`;
            }
          },
          plotOptions: {
            column: {
              borderRadius: 5
            }
          },
          series: [
            {
              name: 'Total Budget',
              data: [goalRelationship.totalBudgetAllocated],
              type: chartType,
              color: '#4e73df'
            },
            {
              name: 'Goal Allocations',
              data: [goalRelationship.totalSpentOnGoals],
              type: chartType,
              color: '#1cc88a'
            }
          ]
        };
      } else if (chartType === "pie") {
        updatedOptions = {
          ...updatedOptions,
          chart: {
            ...updatedOptions.chart,
            type: 'pie'
          },
          tooltip: {
            pointFormat: '{point.name}: <b>{point.percentage:.1f}%</b> ({point.y:,.2f})'
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
              },
              showInLegend: true
            }
          },
          series: [{
            name: 'Budget',
            colorByPoint: true,
            data: [
              {
                name: 'Goal Allocations',
                y: goalRelationship.totalSpentOnGoals,
                color: '#1cc88a'
              },
              {
                name: 'Other Budget Items',
                y: goalRelationship.totalBudgetAllocated - goalRelationship.totalSpentOnGoals,
                color: '#4e73df'
              }
            ],
            type: 'pie'
          } as any]
        };
      }
    }

    // Set options with type assertion
    setChartOptions(updatedOptions);
  }, [reportType, chartType, categoryData, monthlyData, trendsData, goalRelationship, loading]);

  // Calculate summary data from actual data
  const getCurrentMonthData = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const totalIncome = getTotalIncome(1, firstDay.toISOString(), lastDay.toISOString());
    const totalExpenses = getTotalExpenses(1, firstDay.toISOString(), lastDay.toISOString());
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    
    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalIncome - totalExpenses,
      savingsRate
    };
  };
  
  const monthlyFinancials = getCurrentMonthData();

  // Handle report download
  const handleDownloadReport = (): void => {
    alert("Report downloaded successfully!");
  };

  // Handle email report
  const handleEmailReport = (): void => {
    alert("Report sent to your email!");
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-gray-600">Loading your financial reports...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Financial Reports</h1>
        <div className="d-flex">
          <div className="dropdown mr-2">
            <button 
              className="btn btn-primary dropdown-toggle shadow-sm animate__animated animate__fadeIn"
              type="button"
              id="exportDropdown"
              data-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="fas fa-download fa-sm text-white-50 mr-2"></i>Export
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
              <a className="dropdown-item" href="#" onClick={handleDownloadReport}>
                <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-gray-400"></i>PDF
              </a>
              <a className="dropdown-item" href="#" onClick={handleDownloadReport}>
                <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-gray-400"></i>CSV
              </a>
              <a className="dropdown-item" href="#" onClick={handleDownloadReport}>
                <i className="fas fa-file-excel fa-sm fa-fw mr-2 text-gray-400"></i>Excel
              </a>
            </div>
          </div>
          <button
            onClick={handleEmailReport}
            className="d-none d-sm-inline-block btn btn-secondary shadow-sm animate__animated animate__fadeIn"
          >
            <i className="fas fa-envelope fa-sm text-white-50 mr-2"></i>Email
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Monthly Spending
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalSpending', e)}
                        aria-label="Total spending information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(monthlyFinancials.expenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Monthly Income
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalIncome', e)}
                        aria-label="Total income information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(monthlyFinancials.income)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Monthly Savings
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('monthlySavings', e)}
                        aria-label="Monthly savings information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(monthlyFinancials.savings)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1 d-flex align-items-center">
                    Savings Rate
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('savingsRate', e)}
                        aria-label="Savings rate information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatPercentage(monthlyFinancials.savingsRate)}
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

      {/* Report Controls */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Report Settings
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e: React.MouseEvent) => toggleTip('reportSettings', e)}
                aria-label="Report settings information"
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Report Type</label>
              <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                <button 
                  className={`btn ${reportType === "spending" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setReportType("spending")}
                >
                  <i className="fas fa-chart-pie fa-sm mr-1"></i> Spending
                </button>
                <button 
                  className={`btn ${reportType === "income-expense" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setReportType("income-expense")}
                >
                  <i className="fas fa-exchange-alt fa-sm mr-1"></i> Income/Expense
                </button>
                <button 
                  className={`btn ${reportType === "trends" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setReportType("trends")}
                >
                  <i className="fas fa-chart-line fa-sm mr-1"></i> Trends
                </button>
                <button 
                  className={`btn ${reportType === "goals" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setReportType("goals")}
                >
                  <i className="fas fa-bullseye fa-sm mr-1"></i> Goals
                </button>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Timeframe</label>
              <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                <button 
                  className={`btn ${timeframe === "month" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setTimeframe("month")}
                >
                  Month
                </button>
                <button 
                  className={`btn ${timeframe === "quarter" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setTimeframe("quarter")}
                >
                  Quarter
                </button>
                <button 
                  className={`btn ${timeframe === "year" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setTimeframe("year")}
                >
                  Year
                </button>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">View Format</label>
              <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                <button 
                  className={`btn ${format === "chart" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => setFormat("chart")}
                >
                  <i className="fas fa-chart-bar mr-1"></i> Chart
                </button>
                <button 
                  className={`btn ${format === "table" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => setFormat("table")}
                >
                  <i className="fas fa-table mr-1"></i> Table
                </button>
              </div>
            </div>
          </div>
          {format === "chart" && (
            <div className="row mt-2">
              <div className="col-md-12 mb-4">
                <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Chart Type</label>
                <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                  {reportType === "spending" && (
                    <>
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </>
                  )}
                  {reportType === "income-expense" && (
                    <>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "area" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("area")}
                      >
                        <i className="fas fa-chart-area mr-1"></i> Area
                      </button>
                    </>
                  )}
                  {reportType === "trends" && (
                    <>
                      <button 
                        className={`btn ${chartType === "line" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("line")}
                      >
                        <i className="fas fa-chart-line mr-1"></i> Line
                      </button>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                    </>
                  )}
                  {reportType === "goals" && (
                    <>
                      <button 
                        className={`btn ${chartType === "column" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("column")}
                      >
                        <i className="fas fa-chart-bar mr-1"></i> Column
                      </button>
                      <button 
                        className={`btn ${chartType === "pie" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setChartType("pie")}
                      >
                        <i className="fas fa-chart-pie mr-1"></i> Pie
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-2 small text-gray-600">
                  <i className="fas fa-info-circle mr-1"></i> 
                  Different chart types provide unique insights into your financial data.
                  <br/>
                  <span className="font-weight-bold">Auto-selected default chart type based on report type.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            {reportType === "spending" 
              ? "Spending by Category" 
              : reportType === "income-expense" 
              ? "Income vs Expenses" 
              : reportType === "trends"
              ? "Financial Trends"
              : "Goal Allocations"
            } ({timeframe === "month" 
              ? "Monthly" 
              : timeframe === "quarter" 
              ? "Quarterly" 
              : "Yearly"
            })
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e: React.MouseEvent) => toggleTip('reportContent', e)}
                aria-label="Report content information"
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          {format === "chart" ? (
            <div style={{ height: "450px" }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
                ref={chartRef}
              />
            </div>
          ) : (
            <div className="table-responsive">
              {reportType === "spending" && categoryData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.labels.map((label: string, index: number) => {
                      const value = categoryData.datasets[0].data[index];
                      const total = categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                      return (
                        <tr key={`spending-${index}`}>
                          <td>{label}</td>
                          <td>{formatCurrency(value)}</td>
                          <td>{formatPercentage((value / total) * 100)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-weight-bold">
                      <th>Total</th>
                      <th>{formatCurrency(categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0))}</th>
                      <th>100.00%</th>
                    </tr>
                  </tfoot>
                </table>
              )}

              {reportType === "income-expense" && monthlyData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Month</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Savings</th>
                      <th>Savings Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.labels.map((label: string, index: number) => {
                      const income = monthlyData.datasets[0].data[index];
                      const expenses = monthlyData.datasets[1].data[index];
                      const savings = income - expenses;
                      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
                      return (
                        <tr key={`income-${index}`}>
                          <td>{label}</td>
                          <td>{formatCurrency(income)}</td>
                          <td>{formatCurrency(expenses)}</td>
                          <td className={savings >= 0 ? "text-success" : "text-danger"}>
                            {formatCurrency(savings)}
                          </td>
                          <td>{formatPercentage(savingsRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-weight-bold">
                      <th>Average</th>
                      <th>
                        {formatCurrency(
                          monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) / 
                          monthlyData.datasets[0].data.length
                        )}
                      </th>
                      <th>
                        {formatCurrency(
                          monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0) / 
                          monthlyData.datasets[1].data.length
                        )}
                      </th>
                      <th>
                        {formatCurrency(
                          (monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) - 
                           monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0)) / 
                           monthlyData.datasets[0].data.length
                        )}
                      </th>
                      <th>
                        {formatPercentage(
                          ((monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) - 
                            monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0)) / 
                            monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0)) * 100
                        )}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              )}

              {reportType === "trends" && trendsData && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Category</th>
                      <th>Previous Month</th>
                      <th>Current Month</th>
                      <th>Change</th>
                      <th>Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendsData.map((trend, index) => (
                      <tr key={`trend-${index}`}>
                        <td>{trend.category}</td>
                        <td>{formatCurrency(trend.previousAmount)}</td>
                        <td>{formatCurrency(trend.currentAmount)}</td>
                        <td className={trend.currentAmount - trend.previousAmount >= 0 ? "text-success" : "text-danger"}>
                          {trend.currentAmount - trend.previousAmount >= 0 ? "+" : ""}
                          {formatCurrency(trend.currentAmount - trend.previousAmount)}
                        </td>
                        <td className={trend.change >= 0 ? "text-success" : "text-danger"}>
                          {trend.change >= 0 ? "+" : ""}
                          {trend.change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === "goals" && goalRelationship && (
                <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
                  <thead>
                    <tr className="bg-light">
                      <th>Metric</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Budget Allocated</td>
                      <td>{formatCurrency(goalRelationship.totalBudgetAllocated)}</td>
                    </tr>
                    <tr>
                      <td>Total Spent on Goals</td>
                      <td>{formatCurrency(goalRelationship.totalSpentOnGoals)}</td>
                    </tr>
                    <tr>
                      <td>Percentage Budget to Goals</td>
                      <td>{formatPercentage(goalRelationship.percentageBudgetToGoals)}</td>
                    </tr>
                    <tr>
                      <td>Goal Transactions Count</td>
                      <td>{goalRelationship.goalTransactionsCount}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
          
          <div className="mt-3 text-center">
            <div className="small text-muted">
              <i className="fas fa-info-circle mr-1"></i> 
              This report was generated based on your transaction history. Data may be subject to rounding.
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip Component */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            zIndex: 1000,
            background: "white",
            border: "1px solid #e3e6f0",
            borderRadius: "0.35rem",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            padding: "1rem",
            maxWidth: "300px",
            transform: "translateX(-50%)",
            marginTop: "10px"
          }}
        >
          {/* Arrow element */}
          <div 
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid white"
            }}
          ></div>
          
          {/* Close button */}
          <button 
            onClick={() => setActiveTip(null)}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              color: "#858796"
            }}
          >
            <i className="fas fa-times"></i>
          </button>
          
          {activeTip === 'totalSpending' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Monthly Spending</div>
              <p className="tip-description text-gray-800 mb-0">
                Your total expenses for the current month. This includes all categories of spending recorded in the system.
              </p>
            </>
          )}
          
          {activeTip === 'totalIncome' && (
            <>
              <div className="tip-title font-weight-bold text-success mb-2">Monthly Income</div>
              <p className="tip-description text-gray-800 mb-0">
                Your total income for the current month from all sources, including salary, investments, and other income streams.
              </p>
            </>
          )}
          
          {activeTip === 'monthlySavings' && (
            <>
              <div className="tip-title font-weight-bold text-info mb-2">Monthly Savings</div>
              <p className="tip-description text-gray-800 mb-0">
                The difference between your income and expenses. This represents money you've kept rather than spent this month.
              </p>
            </>
          )}
          
          {activeTip === 'savingsRate' && (
            <>
              <div className="tip-title font-weight-bold text-warning mb-2">Savings Rate</div>
              <p className="tip-description text-gray-800 mb-0">
                The percentage of your income that you save. Financial experts recommend a savings rate of at least 20% of your income.
              </p>
            </>
          )}
          
          {activeTip === 'reportSettings' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Report Settings</div>
              <p className="tip-description text-gray-800 mb-0">
                Customize your financial report by selecting different report types, timeframes, and view formats to gain insights into your financial data.
              </p>
            </>
          )}
          
          {activeTip === 'reportContent' && (
            <>
              <div className="tip-title font-weight-bold text-primary mb-2">Report Content</div>
              <p className="tip-description text-gray-800 mb-0">
                This report visualizes your financial data according to the selected filters. Use different chart types to gain different insights into your spending patterns and financial trends.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
