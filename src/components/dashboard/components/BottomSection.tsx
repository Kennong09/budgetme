import React, { FC } from "react";
import { Link } from "react-router-dom";
import BudgetProgress from "../BudgetProgress";
import RecentTransactions from "../RecentTransactions";
import { BudgetItem, Transaction, Category, Account, Goal } from "../types";

interface BottomSectionProps {
  budgetProgress: BudgetItem[];
  recentTransactions: Transaction[];
  expenseCategories?: Category[];
  accounts?: Account[];
  goals?: Goal[];
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  getFilteredUrlParams: () => string;
  onBudgetItemClick?: (budget: BudgetItem) => void;
}

const BottomSection: FC<BottomSectionProps> = ({
  budgetProgress,
  recentTransactions,
  expenseCategories,
  accounts,
  goals,
  activeTip,
  onToggleTip,
  getFilteredUrlParams,
  onBudgetItemClick,
}) => {
  return (
    <div className="row">
      {/* Budget Progress */}
      <div className="col-lg-6 mb-4">
        <div className="card shadow mb-4 h-100">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Budget Progress
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('budget', e)}
                ></i>
                {activeTip === 'budget' && (
                  <div className="tip-box">
                    <div className="tip-title">Budget Progress</div>
                    <div className="tip-description">
                      Track your spending against your budget limits for each category. Green bars indicate you're well under budget, yellow means you're approaching your limit, and red shows where you've exceeded your budget allocations.
                    </div>
                  </div>
                )}
              </div>
            </h6>
            <Link to="/budgets" className="btn btn-sm btn-primary">
              Manage Budgets
            </Link>
          </div>
          <div className="card-body">
            {/* Scrollable budget progress */}
            <div style={{ maxHeight: '445px', overflowY: 'auto' }}>
              <BudgetProgress 
                budgets={budgetProgress}
                onBudgetItemClick={onBudgetItemClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="col-lg-6 mb-4">
        <div className="card shadow mb-4 h-100 recent-transactions">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Recent Transactions
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('transactions', e)}
                ></i>
                {activeTip === 'transactions' && (
                  <div className="tip-box">
                    <div className="tip-title">Recent Transactions</div>
                    <div className="tip-description">
                      View your most recent income and expense transactions. This helps you track your latest financial activity and spot any unusual patterns. Click on any transaction to edit or categorize it properly.
                    </div>
                  </div>
                )}
              </div>
            </h6>
            <Link to={`/transactions?${getFilteredUrlParams()}`} className="btn btn-sm btn-primary">
              View All
            </Link>
          </div>
          <div className="card-body">
            <RecentTransactions 
              transactions={recentTransactions}
              categories={expenseCategories} 
              accounts={accounts}
              goals={goals}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomSection;
