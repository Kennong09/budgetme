import React, { FC, useState } from 'react';
import { formatCurrency, formatPercentage } from '../../../utils/helpers';
import { ReportType, TimeframeType } from './ReportControls';

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

interface ReportTableProps {
  reportType: ReportType;
  timeframe: TimeframeType;
  categoryData?: SpendingDataItem[] | any;
  monthlyData?: IncomeExpenseDataItem[] | any;
  trendsData?: TrendData[];
  goalRelationship?: BudgetRelationship | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const ReportTable: FC<ReportTableProps> = ({
  reportType,
  timeframe,
  categoryData,
  monthlyData,
  trendsData,
  goalRelationship,
  onToggleTip
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  const getReportIcon = (): string => {
    switch (reportType) {
      case 'spending': return 'fa-chart-pie';
      case 'income-expense': return 'fa-exchange-alt';
      case 'savings': return 'fa-piggy-bank';
      case 'trends': return 'fa-chart-line';
      case 'goals': return 'fa-bullseye';
      case 'predictions': return 'fa-magic';
      default: return 'fa-table';
    }
  };

  // Mobile Spending Card
  const renderMobileSpendingCard = (item: SpendingDataItem, index: number, total: number) => {
    const percentage = (item.value / total) * 100;
    return (
      <div key={`spending-mobile-${index}`} className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800 truncate flex-1">{item.name}</span>
          <span className="text-xs font-bold text-indigo-600">{formatCurrency(item.value)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <span className="text-[9px] text-gray-500">{formatPercentage(percentage)} of total</span>
      </div>
    );
  };

  // Mobile Income/Expense Card
  const renderMobileIncomeExpenseCard = (item: IncomeExpenseDataItem, index: number) => {
    const savings = item.income - item.expenses;
    const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
    const isPositive = savings >= 0;
    
    return (
      <div key={`income-mobile-${index}`} className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800">{item.name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {isPositive ? '+' : ''}{formatPercentage(savingsRate)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] text-gray-400 uppercase">Income</p>
            <p className="text-xs font-semibold text-emerald-600">{formatCurrency(item.income)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 uppercase">Expenses</p>
            <p className="text-xs font-semibold text-rose-600">{formatCurrency(item.expenses)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 uppercase">Savings</p>
            <p className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(savings)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Trend Card
  const renderMobileTrendCard = (trend: TrendData, index: number) => {
    const isPositive = trend.change >= 0;
    return (
      <div key={`trend-mobile-${index}`} className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800 truncate flex-1">{trend.category}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isPositive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            <i className={`fas fa-arrow-${isPositive ? 'up' : 'down'} text-[8px]`}></i>
            {Math.abs(trend.change).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">
            {formatCurrency(trend.previousAmount)} → {formatCurrency(trend.currentAmount)}
          </span>
          <span className={isPositive ? 'text-rose-500' : 'text-emerald-500'}>
            {isPositive ? '+' : ''}{formatCurrency(trend.currentAmount - trend.previousAmount)}
          </span>
        </div>
      </div>
    );
  };

  const renderMobileSpendingList = () => {
    if (!categoryData) return null;
    const data = Array.isArray(categoryData) ? categoryData : [];
    const total = data.reduce((sum: number, cat: SpendingDataItem) => sum + cat.value, 0);
    
    // Pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    return (
      <div>
        {paginatedData.map((item: SpendingDataItem, index: number) => 
          renderMobileSpendingCard(item, index, total)
        )}
        {/* Total */}
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800">Total</span>
            <span className="text-sm font-bold text-indigo-600">{formatCurrency(total)}</span>
          </div>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <span className="text-[10px] text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMobileIncomeExpenseList = () => {
    if (!monthlyData) return null;
    const data = Array.isArray(monthlyData) ? monthlyData : [];
    
    // Pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    // Calculate averages
    const avgIncome = data.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.income, 0) / data.length;
    const avgExpenses = data.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.expenses, 0) / data.length;

    return (
      <div>
        {paginatedData.map((item: IncomeExpenseDataItem, index: number) => 
          renderMobileIncomeExpenseCard(item, index)
        )}
        {/* Average Summary */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-3">
          <p className="text-[9px] text-gray-500 uppercase mb-2">Average</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-gray-400">Income</p>
              <p className="text-xs font-semibold text-emerald-600">{formatCurrency(avgIncome)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400">Expenses</p>
              <p className="text-xs font-semibold text-rose-600">{formatCurrency(avgExpenses)}</p>
            </div>
          </div>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <span className="text-[10px] text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMobileTrendsList = () => {
    if (!trendsData || trendsData.length === 0) return null;
    
    // Pagination
    const totalPages = Math.ceil(trendsData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = trendsData.slice(startIndex, startIndex + itemsPerPage);

    return (
      <div>
        {paginatedData.map((trend: TrendData, index: number) => 
          renderMobileTrendCard(trend, index)
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <span className="text-[10px] text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMobileGoalsSummary = () => {
    if (!goalRelationship) return null;

    return (
      <div className="space-y-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Total Budget Allocated</span>
            <span className="text-sm font-bold text-indigo-600">{formatCurrency(goalRelationship.totalBudgetAllocated)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Total Spent on Goals</span>
            <span className="text-sm font-bold text-emerald-600">{formatCurrency(goalRelationship.totalSpentOnGoals)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Budget to Goals %</span>
            <span className="text-sm font-bold text-amber-600">{formatPercentage(goalRelationship.percentageBudgetToGoals)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Goal Transactions</span>
            <span className="text-sm font-bold text-gray-800">{goalRelationship.goalTransactionsCount}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileContent = () => {
    switch (reportType) {
      case "spending":
        return renderMobileSpendingList();
      case "income-expense":
      case "savings":
      case "predictions":
        return renderMobileIncomeExpenseList();
      case "trends":
        return renderMobileTrendsList();
      case "goals":
        return renderMobileGoalsSummary();
      default:
        return (
          <div className="text-center py-8">
            <i className="fas fa-table text-gray-300 text-3xl mb-3"></i>
            <p className="text-xs text-gray-500">No data available</p>
          </div>
        );
    }
  };

  // Desktop table renderers (existing code)
  const renderSpendingTable = () => {
    if (!categoryData) return null;

    return (
      <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
        <thead>
          <tr className="bg-light">
            <th>Category</th>
            <th>Amount</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(categoryData) ? (
            categoryData.map((item: SpendingDataItem, index: number) => {
              const total = categoryData.reduce((sum: number, cat: SpendingDataItem) => sum + cat.value, 0);
              return (
                <tr key={`spending-${index}`}>
                  <td>{item.name}</td>
                  <td>{formatCurrency(item.value)}</td>
                  <td>{formatPercentage((item.value / total) * 100)}</td>
                </tr>
              );
            })
          ) : categoryData.labels && categoryData.datasets ? (
            categoryData.labels.map((label: string, index: number) => {
              const value = categoryData.datasets[0].data[index];
              const total = categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
              return (
                <tr key={`spending-${index}`}>
                  <td>{label}</td>
                  <td>{formatCurrency(value)}</td>
                  <td>{formatPercentage((value / total) * 100)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className="text-center">No spending data available</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-weight-bold">
            <th>Total</th>
            <th>
              {formatCurrency(
                Array.isArray(categoryData)
                  ? categoryData.reduce((sum: number, cat: SpendingDataItem) => sum + cat.value, 0)
                  : categoryData.datasets && categoryData.datasets[0]
                    ? categoryData.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
                    : 0
              )}
            </th>
            <th>100.00%</th>
          </tr>
        </tfoot>
      </table>
    );
  };

  const renderIncomeExpenseTable = () => {
    if (!monthlyData) return null;

    return (
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
          {Array.isArray(monthlyData) ? (
            monthlyData.map((item: IncomeExpenseDataItem, index: number) => {
              const savings = item.income - item.expenses;
              const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
              return (
                <tr key={`income-${index}`}>
                  <td>{item.name}</td>
                  <td>{formatCurrency(item.income)}</td>
                  <td>{formatCurrency(item.expenses)}</td>
                  <td className={savings >= 0 ? "text-success" : "text-danger"}>
                    {formatCurrency(savings)}
                  </td>
                  <td>{formatPercentage(savingsRate)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="text-center">No income/expense data available</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const renderTrendsTable = () => {
    if (!trendsData || trendsData.length === 0) return null;

    return (
      <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
        <thead>
          <tr className="bg-light">
            <th>Category</th>
            <th>Previous Amount</th>
            <th>Current Amount</th>
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
    );
  };

  const renderGoalsTable = () => {
    if (!goalRelationship) return null;

    return (
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
    );
  };

  const renderTableContent = () => {
    switch (reportType) {
      case "spending":
        return renderSpendingTable();
      case "income-expense":
      case "savings":
      case "predictions":
        return renderIncomeExpenseTable();
      case "trends":
        return renderTrendsTable();
      case "goals":
        return renderGoalsTable();
      default:
        return <div className="text-center py-4">No data available for this report type</div>;
    }
  };

  return (
    <>
      {/* Mobile Table Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate__animated animate__fadeIn">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className={`fas ${getReportIcon()} text-indigo-500 text-[10px]`}></i>
              {getShortReportTitle()} Data
            </h6>
            <span className="text-[9px] text-gray-400 font-medium">
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </span>
          </div>

          {/* Content */}
          <div className="p-3">
            {renderMobileContent()}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-slate-50 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Based on your transaction history
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Table Card */}
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
          <div className="table-responsive">
            {renderTableContent()}
          </div>
          
          <div className="mt-3 text-center">
            <div className="small text-muted">
              <i className="fas fa-info-circle mr-1"></i> 
              This report was generated based on your transaction history. Data may be subject to rounding.
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ReportTable;