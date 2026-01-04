import React, { FC, memo, ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatPercentage } from "../../utils/helpers";

// Define our own type for budget items to avoid TS compatibility issues
interface BudgetItem {
  id: string | number;
  category: string;
  name?: string;
  spent: number;
  amount: number;
  remaining?: number;
  percentage?: number;
  status?: "success" | "warning" | "danger";
  budget?: number;
  month?: string;
  year?: number;
  period?: string;
  period_start?: string;
  period_end?: string;
}

interface BudgetProgressProps {
  budgets: BudgetItem[];
  onBudgetItemClick?: (budget: BudgetItem) => void;
}

const BudgetProgress: FC<BudgetProgressProps> = memo(({ budgets, onBudgetItemClick }) => {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-center py-3 md:py-5">
        <div className="mb-1.5 md:mb-3">
          <i className="fas fa-chart-pie text-xl md:text-3xl text-gray-300"></i>
        </div>
        <h5 className="text-gray-700 mb-1.5 text-sm md:text-lg font-semibold">No Budgets</h5>
        <p className="text-gray-500 mb-2 md:mb-4 text-xs hidden md:block">
          Create budgets to track your spending by category and stay on top of your financial goals.
        </p>
        <Link 
          to="/budgets/create" 
          className="inline-block w-auto px-2 md:px-3 py-1.5 md:py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs md:text-sm font-normal rounded shadow-sm transition-colors"
        >
          <i className="fas fa-plus text-xs mr-1 md:mr-2"></i>
          <span className="hidden md:inline">Create Your First </span>Budget
        </Link>
      </div>
    );
  }

  // Helper to get appropriate icon based on status
  const getBudgetIcon = (status?: string): ReactNode => {
    switch (status) {
      case "danger":
        return <i className="fas fa-exclamation-circle text-danger-color"></i>;
      case "warning":
        return <i className="fas fa-exclamation-triangle text-warning-color"></i>;
      default:
        return <i className="fas fa-check-circle text-success-color"></i>;
    }
  };

  // Sort budgets - first show critical (over budget), then warning, then good ones
  const sortedBudgets = [...budgets].sort((a, b) => {
    const statusOrder = { danger: 0, warning: 1, success: 2 };
    const aStatus = a.status || "success";
    const bStatus = b.status || "success";
    
    // First sort by status
    if (statusOrder[aStatus as keyof typeof statusOrder] !== statusOrder[bStatus as keyof typeof statusOrder]) {
      return statusOrder[aStatus as keyof typeof statusOrder] - statusOrder[bStatus as keyof typeof statusOrder];
    }
    
    // Then sort by percentage (higher percentage first)
    const aPercentage = a.percentage || ((a.spent / a.amount) * 100);
    const bPercentage = b.percentage || ((b.spent / b.amount) * 100);
    return bPercentage - aPercentage;
  });

  return (
    <div className="space-y-3 md:space-y-5">
      {sortedBudgets.map((budget) => (
        <div
          key={budget.id}
          className="bg-white p-2 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-2 md:mb-3"
        >
          {/* Month/Year and Budget Category Header */}
          <div className="flex justify-between items-center mb-1.5 md:mb-3">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="hidden md:inline">{getBudgetIcon(budget.status)}</span>
                <span className="font-semibold ml-0 md:ml-2 text-[11px] md:text-base truncate max-w-[120px] md:max-w-none">
                  {budget.category || budget.name}
                </span>
              </div>
              <span className="text-[9px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                <span className="hidden md:inline">{budget.month || 'June'} {budget.year || 2025}</span>
                <span className="inline md:hidden">{(budget.month || 'June').substring(0, 3)} {budget.year || 2025}</span>
                {budget.period && <span className="hidden md:inline"> • {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}</span>}
              </span>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                <span
                  className={`text-[10px] md:text-sm ${budget.status === "danger" ? "text-danger-color" : budget.status === "warning" ? "text-warning-color" : "text-success-color"}`}
                >
                  {formatCurrency(budget.spent)} <span className="hidden md:inline">/ {formatCurrency(budget.budget || budget.amount)}</span>
                </span>
              </div>
              <div className="text-[9px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                {formatPercentage(
                  budget.percentage ||
                    (budget.spent && budget.amount
                      ? (budget.spent / budget.amount) * 100
                      : 0)
                )}{" "}
                <span className="hidden md:inline">used</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-container mb-2 md:mb-3">
            <div className="progress-bar">
              <div
                className={`progress ${budget.status}`}
                style={{
                  width: `${Math.min(100, budget.percentage || (budget.spent && budget.amount ? (budget.spent / budget.amount) * 100 : 0))}%`,
                }}
                title={formatPercentage(
                  budget.percentage ||
                    (budget.spent && budget.amount
                      ? (budget.spent / budget.amount) * 100
                      : 0)
                )}
              ></div>
            </div>

            <div className="flex justify-end items-center mt-0.5 md:mt-1">
              <span
                className={`text-[9px] md:text-xs font-medium ${budget.remaining && budget.remaining <= 0 ? "text-danger-color" : "text-gray-700"}`}
              >
                {formatCurrency(
                  budget.remaining ||
                    (budget.amount && budget.spent
                      ? budget.amount - budget.spent
                      : 0)
                )}{" "}
                <span className="hidden md:inline">remaining</span>
                <span className="inline md:hidden">left</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-2 md:mt-4 pt-1.5 md:pt-3 border-t border-gray-100 gap-1 md:gap-2">
            {onBudgetItemClick ? (
              <button
                onClick={() => onBudgetItemClick(budget)}
                className="text-[9px] md:text-xs flex items-center text-primary-500 hover:text-primary-700 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <i className="fas fa-list-ul mr-0.5 md:mr-1 text-[8px] md:text-[10px]"></i>
                <span className="hidden md:inline">View related transactions</span>
                <span className="inline md:hidden">View</span>
              </button>
            ) : (
              <Link
                to={`/transactions?categoryId=${budget.id}&month=5&year=2025`}
                className="text-[9px] md:text-xs flex items-center text-primary-500 hover:text-primary-700 transition-colors"
              >
                <i className="fas fa-list-ul mr-0.5 md:mr-1 text-[8px] md:text-[10px]"></i>
                <span className="hidden md:inline">View related transactions</span>
                <span className="inline md:hidden">View</span>
              </Link>
            )}
            <Link
              to={`/budgets/${budget.id}`}
              className="text-[9px] md:text-xs flex items-center bg-primary-100 text-primary-700 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full hover:bg-primary-200 transition-colors"
            >
              <i className="fas fa-cog mr-0.5 md:mr-1 text-[8px] md:text-[10px]"></i>
              <span className="hidden md:inline">Manage budget</span>
              <span className="inline md:hidden">Manage</span>
            </Link>
          </div>
        </div>
      ))}

      {/* View All Budgets Button - Hidden on mobile since it's in the tabbed header */}
      <div className="text-center mt-4 hidden md:block">
        <Link
          to="/budgets"
          className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
        >
          View All Budgets
        </Link>
      </div>
    </div>
  );
});

BudgetProgress.displayName = 'BudgetProgress';

export default BudgetProgress;
