import React, { FC, ReactNode } from "react";
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

const BudgetProgress: FC<BudgetProgressProps> = ({ budgets, onBudgetItemClick }) => {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <i className="fas fa-chart-pie text-gray-400 text-4xl mb-3"></i>
        <p className="text-gray-500">No budget data available.</p>
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
    <div className="space-y-5">
      {sortedBudgets.map((budget) => (
        <div
          key={budget.id}
          className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Month/Year and Budget Category Header */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-col">
              <div className="flex items-center">
                {getBudgetIcon(budget.status)}
                <span className="font-semibold ml-2 text-base">
                  {budget.category || budget.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {budget.month || 'June'} {budget.year || 2025} 
                {budget.period && ` • ${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}`}
              </span>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                <span
                  className={`text-sm ${budget.status === "danger" ? "text-danger-color" : budget.status === "warning" ? "text-warning-color" : "text-success-color"}`}
                >
                  {formatCurrency(budget.spent)} /{" "}
                  {formatCurrency(budget.budget || budget.amount)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatPercentage(
                  budget.percentage ||
                    (budget.spent && budget.amount
                      ? (budget.spent / budget.amount) * 100
                      : 0)
                )}{" "}
                used
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-container mb-3">
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

            <div className="flex justify-end items-center mt-1">
              <span
                className={`text-xs font-medium ${budget.remaining && budget.remaining <= 0 ? "text-danger-color" : "text-gray-700"}`}
              >
                {formatCurrency(
                  budget.remaining ||
                    (budget.amount && budget.spent
                      ? budget.amount - budget.spent
                      : 0)
                )}{" "}
                remaining
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            {onBudgetItemClick ? (
              <button
                onClick={() => onBudgetItemClick(budget)}
                className="text-xs flex items-center text-primary-500 hover:text-primary-700 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <i className="fas fa-list-ul mr-1"></i>
                View related transactions
              </button>
            ) : (
              <Link
                to={`/transactions?categoryId=${budget.id}&month=5&year=2025`}
                className="text-xs flex items-center text-primary-500 hover:text-primary-700 transition-colors"
              >
                <i className="fas fa-list-ul mr-1"></i>
                View related transactions
              </Link>
            )}
            <Link
              to={`/budgets/${budget.id}`}
              className="text-xs flex items-center bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition-colors"
            >
              <i className="fas fa-cog mr-1"></i>
              Manage budget
            </Link>
          </div>
        </div>
      ))}

      {/* View All Budgets Button */}
      <div className="text-center mt-4">
        <Link
          to="/budgets"
          className="inline-block px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          View All Budgets
        </Link>
      </div>
    </div>
  );
};

export default BudgetProgress;
