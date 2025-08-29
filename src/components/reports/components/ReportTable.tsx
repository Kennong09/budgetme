import React, { FC } from 'react';
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
          ) : monthlyData.labels && monthlyData.datasets ? (
            monthlyData.labels.map((label: string, index: number) => {
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
            })
          ) : (
            <tr>
              <td colSpan={5} className="text-center">No income/expense data available</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-weight-bold">
            <th>Average</th>
            <th>
              {formatCurrency(
                Array.isArray(monthlyData)
                  ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.income, 0) / monthlyData.length
                  : monthlyData.datasets && monthlyData.datasets[0]
                    ? monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) / monthlyData.datasets[0].data.length
                    : 0
              )}
            </th>
            <th>
              {formatCurrency(
                Array.isArray(monthlyData)
                  ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.expenses, 0) / monthlyData.length
                  : monthlyData.datasets && monthlyData.datasets[1]
                    ? monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0) / monthlyData.datasets[1].data.length
                    : 0
              )}
            </th>
            <th>
              {formatCurrency(
                Array.isArray(monthlyData)
                  ? monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + (item.income - item.expenses), 0) / monthlyData.length
                  : monthlyData.datasets && monthlyData.datasets[0] && monthlyData.datasets[1]
                    ? (monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) - 
                      monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0)) / monthlyData.datasets[0].data.length
                    : 0
              )}
            </th>
            <th>
              {formatPercentage(
                Array.isArray(monthlyData)
                  ? (() => {
                      const totalIncome = monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.income, 0);
                      const totalExpenses = monthlyData.reduce((sum: number, item: IncomeExpenseDataItem) => sum + item.expenses, 0);
                      return totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                    })()
                  : monthlyData.datasets && monthlyData.datasets[0] && monthlyData.datasets[1]
                    ? (() => {
                        const totalIncome = monthlyData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                        const totalExpenses = monthlyData.datasets[1].data.reduce((a: number, b: number) => a + b, 0);
                        return totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                      })()
                    : 0
              )}
            </th>
          </tr>
        </tfoot>
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
  );
};

export default ReportTable;