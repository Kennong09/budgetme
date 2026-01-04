import React, { FC, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatPercentage } from "../../../../utils/helpers";
import { BudgetItem } from "../../types";

interface BudgetCardProps {
  budget: BudgetItem;
  onDelete?: (id: string) => void;
}

const BudgetCard: FC<BudgetCardProps> = memo(({ budget, onDelete }) => {
  const statusColor = useMemo(() => {
    switch (budget.status) {
      case "danger": return "danger";
      case "warning": return "warning";
      default: return "success";
    }
  }, [budget.status]);

  const statusText = useMemo(() => {
    switch (budget.status) {
      case "danger": return "Overspent";
      case "warning": return "Warning";
      default: return "On Track";
    }
  }, [budget.status]);

  return (
    <div className="col-lg-4 col-md-6 mb-3 md:mb-4">
      <div className="card border-0 shadow h-100 animate__animated animate__fadeIn">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center p-3 md:p-4">
          <div>
            <h6 className="m-0 text-sm md:text-base font-weight-bold text-primary">{budget.budget_name || 'Unnamed Budget'}</h6>
            <small className="text-xs md:text-sm text-muted">{budget.category_name || budget.display_category || 'Uncategorized'}</small>
          </div>
          <span className={`badge badge-${statusColor} text-xs md:text-sm`}>
            {statusText}
          </span>
        </div>
        <div className="card-body p-3 md:p-4">
          <div className="row no-gutters align-items-center mb-2 md:mb-3">
            <div className="col mr-2">
              <div className="text-xs md:text-sm font-weight-bold text-gray-800 text-uppercase mb-1">
                Budget Amount
              </div>
              <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                {formatCurrency(budget.amount)}
              </div>
            </div>
            <div className="col-auto">
              <i className="fas fa-coins fa-lg md:fa-2x text-gray-300"></i>
            </div>
          </div>

          <div className="row no-gutters align-items-center mb-2 md:mb-3">
            <div className="col mr-2">
              <div className="text-xs md:text-sm font-weight-bold text-gray-800 text-uppercase mb-1">
                Spent
              </div>
              <div className="text-sm md:text-base lg:h6 mb-0 font-weight-bold text-danger">
                {formatCurrency(budget.spent)}
              </div>
            </div>
            <div className="col-auto">
              <div className="text-xs md:text-sm font-weight-bold text-gray-800 text-uppercase mb-1">
                Remaining
              </div>
              <div className="text-sm md:text-base lg:h6 mb-0 font-weight-bold text-success">
                {formatCurrency(budget.remaining || 0)}
              </div>
            </div>
          </div>

          <div className="mb-2 md:mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-xs font-weight-bold text-gray-800 text-uppercase">
                Progress
              </span>
              <span className={`text-xs md:text-sm font-weight-bold text-${statusColor}`}>
                {formatPercentage(budget.percentage_used || 0)}
              </span>
            </div>
            <div className="progress" style={{ height: window.innerWidth < 768 ? '6px' : '8px' }}>
              <div
                className={`progress-bar bg-${statusColor}`}
                role="progressbar"
                style={{ width: `${Math.min(budget.percentage_used || 0, 100)}%` }}
                aria-valuenow={budget.percentage_used || 0}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>

          <div className="text-center">
            <small className="text-muted">
              {budget.month} {budget.year}
            </small>
          </div>
        </div>
        <div className="card-footer bg-transparent border-0 p-2 md:p-3">
          <div className="d-flex justify-content-between gap-1 md:gap-2">
            <Link 
              to={`/budgets/${budget.id}`} 
              className="flex-1 inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
            >
              <i className="fas fa-eye mr-1 text-xs"></i> <span className="hidden sm:inline">View</span><span className="sm:hidden">View</span>
            </Link>
            <Link 
              to={`/budgets/${budget.id}/edit`} 
              className="flex-1 inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-gray-50 text-[#4e73df] border border-[#4e73df] text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
            >
              <i className="fas fa-edit mr-1 text-xs"></i> <span className="hidden sm:inline">Edit</span><span className="sm:hidden">Edit</span>
            </Link>
            {onDelete && (
              <button 
                onClick={() => onDelete(budget.id)}
                className="flex-1 inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-red-50 text-[#e74a3b] border border-[#e74a3b] text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
              >
                <i className="fas fa-trash mr-1 text-xs"></i> <span className="hidden sm:inline">Delete</span><span className="sm:hidden">Del</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

BudgetCard.displayName = 'BudgetCard';

export default BudgetCard;
