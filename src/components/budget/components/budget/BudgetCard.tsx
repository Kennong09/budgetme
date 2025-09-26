import React, { FC } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatPercentage } from "../../../../utils/helpers";
import { BudgetItem } from "../../types";

interface BudgetCardProps {
  budget: BudgetItem;
  onDelete?: (id: string) => void;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget, onDelete }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "danger": return "danger";
      case "warning": return "warning";
      default: return "success";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "danger": return "Overspent";
      case "warning": return "Warning";
      default: return "On Track";
    }
  };

  return (
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="card border-0 shadow h-100 animate__animated animate__fadeIn">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="m-0 font-weight-bold text-primary">{budget.budget_name || 'Unnamed Budget'}</h6>
            <small className="text-muted">{budget.category_name || budget.display_category || 'Uncategorized'}</small>
          </div>
          <span className={`badge badge-${getStatusColor(budget.status)}`}>
            {getStatusText(budget.status)}
          </span>
        </div>
        <div className="card-body">
          <div className="row no-gutters align-items-center mb-3">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-gray-800 text-uppercase mb-1">
                Budget Amount
              </div>
              <div className="h5 mb-0 font-weight-bold text-gray-800">
                {formatCurrency(budget.amount)}
              </div>
            </div>
            <div className="col-auto">
              <i className="fas fa-coins fa-2x text-gray-300"></i>
            </div>
          </div>

          <div className="row no-gutters align-items-center mb-3">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-gray-800 text-uppercase mb-1">
                Spent
              </div>
              <div className="h6 mb-0 font-weight-bold text-danger">
                {formatCurrency(budget.spent)}
              </div>
            </div>
            <div className="col-auto">
              <div className="text-xs font-weight-bold text-gray-800 text-uppercase mb-1">
                Remaining
              </div>
              <div className="h6 mb-0 font-weight-bold text-success">
                {formatCurrency(budget.remaining || 0)}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-xs font-weight-bold text-gray-800 text-uppercase">
                Progress
              </span>
              <span className={`text-xs font-weight-bold text-${getStatusColor(budget.status)}`}>
                {formatPercentage(budget.percentage_used || 0)}
              </span>
            </div>
            <div className="progress" style={{ height: "8px" }}>
              <div
                className={`progress-bar bg-${getStatusColor(budget.status)}`}
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
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between">
            <Link 
              to={`/budgets/${budget.id}`} 
              className="btn btn-primary btn-sm"
            >
              <i className="fas fa-eye mr-1"></i> View
            </Link>
            <Link 
              to={`/budgets/${budget.id}/edit`} 
              className="btn btn-outline-primary btn-sm"
            >
              <i className="fas fa-edit mr-1"></i> Edit
            </Link>
            {onDelete && (
              <button 
                onClick={() => onDelete(budget.id)}
                className="btn btn-outline-danger btn-sm"
              >
                <i className="fas fa-trash mr-1"></i> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCard;
