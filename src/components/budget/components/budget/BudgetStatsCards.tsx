import React, { FC, memo } from "react";
import { formatCurrency } from "../../../../utils/helpers";
import { BudgetItem } from "../../types";

interface BudgetStatsCardsProps {
  budget: BudgetItem;
}

const BudgetStatsCards: FC<BudgetStatsCardsProps> = memo(({ budget }) => {
  return (
    <div className="row mb-3 md:mb-4">
      <div className="col-md-4">
        <div className="card bg-light border-0 h-100">
          <div className="card-body text-center p-3 md:p-4">
            <div className="text-xs md:text-sm font-weight-bold text-primary text-uppercase mb-1">
              Budget Amount
            </div>
            <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
              {formatCurrency(budget.amount)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="col-md-4">
        <div className="card bg-light border-0 h-100">
          <div className="card-body text-center p-3 md:p-4">
            <div className="text-xs md:text-sm font-weight-bold text-danger text-uppercase mb-1">
              Current Spending
            </div>
            <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
              {formatCurrency(budget.spent)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="col-md-4">
        <div className="card bg-light border-0 h-100">
          <div className="card-body text-center p-3 md:p-4">
            <div className="text-xs md:text-sm font-weight-bold text-success text-uppercase mb-1">
              Remaining
            </div>
            <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
              {formatCurrency(budget.remaining || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BudgetStatsCards.displayName = 'BudgetStatsCards';

export default BudgetStatsCards;
