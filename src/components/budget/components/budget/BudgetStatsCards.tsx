import React, { FC } from "react";
import { formatCurrency } from "../../../../utils/helpers";
import { BudgetItem } from "../../types";

interface BudgetStatsCardsProps {
  budget: BudgetItem;
}

const BudgetStatsCards: FC<BudgetStatsCardsProps> = ({ budget }) => {
  return (
    <div className="row mb-4">
      <div className="col-md-4">
        <div className="card bg-light border-0 h-100">
          <div className="card-body text-center">
            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
              Budget Amount
            </div>
            <div className="h5 mb-0 font-weight-bold text-gray-800">
              {formatCurrency(budget.amount)}
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
  );
};

export default BudgetStatsCards;
