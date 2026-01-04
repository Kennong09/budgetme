import React, { FC, useRef } from 'react';
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../../utils/highchartsInit";
import { ReportType, TimeframeType } from './ReportControls';
import { Link } from 'react-router-dom';

interface ReportChartProps {
  reportType: ReportType;
  timeframe: TimeframeType;
  chartOptions: Highcharts.Options;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  categoryData?: any;
  monthlyData?: any;
  trendsData?: any;
  budgetData?: any;
}

const ReportChart: FC<ReportChartProps> = ({
  reportType,
  timeframe,
  chartOptions,
  onToggleTip,
  categoryData,
  monthlyData,
  trendsData,
  budgetData
}) => {
  const chartRef = useRef<any>(null);

  const getReportTitle = (): string => {
    const typeTitle = reportType === "spending" 
      ? "Spending by Category" 
      : reportType === "income-expense" 
      ? "Income vs Expenses" 
      : reportType === "trends"
      ? "Financial Trends"
      : reportType === "goals"
      ? "Goal Allocations"
      : reportType === "savings"
      ? "Savings Rate"
      : "Financial Projections";

    const timeframeTitle = timeframe === "month" 
      ? "Monthly" 
      : timeframe === "quarter" 
      ? "Quarterly" 
      : "Yearly";

    return `${typeTitle} (${timeframeTitle})`;
  };

  const getShortReportTitle = (): string => {
    switch (reportType) {
      case "spending": return "Spending";
      case "income-expense": return "Income/Expense";
      case "trends": return "Trends";
      case "goals": return "Goals";
      case "savings": return "Savings";
      case "predictions": return "Predictions";
      default: return "Report";
    }
  };

  // Check if data is available for the current report type
  const hasValidData = (): boolean => {
    switch (reportType) {
      case 'spending':
        return categoryData && Array.isArray(categoryData) && categoryData.length > 0 &&
               categoryData.some((item: any) => item.value > 0);
      
      case 'income-expense':
      case 'predictions':
        return monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0 &&
               monthlyData.some((item: any) => item.income > 0 || item.expenses > 0);
      
      case 'savings':
        return monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0;
      
      case 'trends':
        return trendsData && Array.isArray(trendsData) && trendsData.length > 0;
      
      case 'goals':
        return budgetData && Array.isArray(budgetData) && budgetData.length > 0;
      
      default:
        return false;
    }
  };

  // Get appropriate icon for report type
  const getReportIcon = (): string => {
    switch (reportType) {
      case 'spending':
        return 'fa-chart-pie';
      case 'income-expense':
        return 'fa-exchange-alt';
      case 'savings':
        return 'fa-piggy-bank';
      case 'trends':
        return 'fa-chart-line';
      case 'goals':
        return 'fa-bullseye';
      case 'predictions':
        return 'fa-magic';
      default:
        return 'fa-chart-bar';
    }
  };

  // Get contextual message for each report type
  const getNoDataMessage = (): { title: string; description: string; tip: string } => {
    switch (reportType) {
      case 'spending':
        return {
          title: 'No Spending Data Available',
          description: 'Add expense transactions to see your spending breakdown by category.',
          tip: 'Start tracking your expenses to understand where your money goes and identify areas to save.'
        };
      
      case 'income-expense':
        return {
          title: 'No Income/Expense Data Available',
          description: 'Add income and expense transactions to see your cash flow over time.',
          tip: 'Track both income and expenses to monitor your financial health and spending patterns.'
        };
      
      case 'savings':
        return {
          title: 'No Savings Data Available',
          description: 'Add transactions to calculate your savings rate over time.',
          tip: 'A healthy savings rate is typically 20% or more of your income. Track your progress here!'
        };
      
      case 'trends':
        return {
          title: 'No Trend Data Available',
          description: 'Not enough historical data to analyze spending trends.',
          tip: 'Track transactions for at least 2 months to see how your spending patterns change over time.'
        };
      
      case 'goals':
        return {
          title: 'No Goal Data Available',
          description: 'Create financial goals and link transactions to track your progress.',
          tip: 'Set clear financial goals and allocate your budget toward achieving them.'
        };
      
      case 'predictions':
        return {
          title: 'No Prediction Data Available',
          description: 'Add historical transaction data to generate financial forecasts.',
          tip: 'At least 3-6 months of transaction history is needed for accurate predictions.'
        };
      
      default:
        return {
          title: 'No Data Available',
          description: 'Add transactions to view this report.',
          tip: 'Start tracking your finances to see comprehensive reports and insights.'
        };
    }
  };

  const hasData = hasValidData();
  const noDataInfo = getNoDataMessage();

  // Mobile-optimized chart options
  const getMobileChartOptions = () => {
    if (!chartOptions) return chartOptions;
    
    return {
      ...chartOptions,
      chart: {
        ...(chartOptions.chart || {}),
        height: 280,
        spacing: [10, 10, 10, 10],
      },
      legend: {
        enabled: true,
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { 
          fontSize: '10px',
          fontWeight: 'normal',
        },
        symbolRadius: 2,
        symbolHeight: 8,
        symbolWidth: 8,
        itemMarginTop: 4,
      },
      title: { text: null },
      xAxis: chartOptions.xAxis ? {
        ...chartOptions.xAxis,
        labels: {
          ...(chartOptions.xAxis as any).labels,
          style: { fontSize: '9px' },
          rotation: -45,
        },
      } : undefined,
      yAxis: chartOptions.yAxis ? {
        ...chartOptions.yAxis,
        labels: {
          ...(chartOptions.yAxis as any).labels,
          style: { fontSize: '9px' },
        },
      } : undefined,
    };
  };

  return (
    <>
      {/* Mobile Chart Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate__animated animate__fadeIn">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className={`fas ${getReportIcon()} text-indigo-500 text-[10px]`}></i>
              {getShortReportTitle()} Chart
            </h6>
            <span className="text-[9px] text-gray-400 font-medium">
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </span>
          </div>

          {/* Chart Content */}
          <div className="p-3">
            {!hasData ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className={`fas ${getReportIcon()} text-gray-400 text-xl`}></i>
                </div>
                <h6 className="text-sm font-semibold text-gray-700 mb-1">{noDataInfo.title}</h6>
                <p className="text-[10px] text-gray-500 mb-3 px-4">
                  {noDataInfo.description}
                </p>
                <div className="bg-blue-50 rounded-xl p-3 mx-2">
                  <p className="text-[10px] text-blue-600">
                    <i className="fas fa-lightbulb mr-1"></i>
                    {noDataInfo.tip}
                  </p>
                </div>
                <Link 
                  to="/transactions/add" 
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  <i className="fas fa-plus text-[10px]"></i>
                  Add Transaction
                </Link>
              </div>
            ) : (
              <div className="animate__animated animate__fadeIn">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={getMobileChartOptions()}
                  ref={chartRef}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          {hasData && (
            <div className="px-3 py-2 bg-slate-50 border-t border-gray-100">
              <p className="text-[9px] text-gray-400 text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Based on your transaction history
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Chart Card */}
      <div className="hidden md:block">
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            {getReportTitle()}
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e: React.MouseEvent) => onToggleTip('reportContent', e)}
                aria-label="Report content information"
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          {!hasData ? (
            <div style={{ minHeight: "300px" }} className="d-flex align-items-center justify-content-center">
              <div className="text-center py-5">
                <div className="mb-4">
                  <i className={`fas ${getReportIcon()} fa-4x text-gray-300`}></i>
                </div>
                <h5 className="text-gray-600 mb-3">{noDataInfo.title}</h5>
                <p className="text-gray-500 mb-4">
                  {noDataInfo.description}
                </p>
                <div className="alert alert-info mx-auto" style={{ maxWidth: '500px' }}>
                  <i className="fas fa-lightbulb mr-2"></i>
                  <strong>Tip:</strong> {noDataInfo.tip}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ height: "auto", minHeight: "300px", maxHeight: "600px" }}>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={chartOptions}
                  ref={chartRef}
                />
              </div>
              
              <div className="mt-3 text-center">
                <div className="small text-muted">
                  <i className="fas fa-info-circle mr-1"></i> 
                  This report was generated based on your transaction history. Data may be subject to rounding.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default ReportChart;