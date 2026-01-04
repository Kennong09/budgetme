import React, { FC, memo, useState } from "react";
import { Link } from "react-router-dom";
import BudgetProgress from "../BudgetProgress";
import RecentTransactions from "../RecentTransactions";
import { BudgetItem, Transaction, Category, Account, Goal, UserData } from "../types";

interface BottomSectionProps {
  budgetProgress: BudgetItem[];
  recentTransactions: Transaction[];
  expenseCategories?: Category[];
  accounts?: Account[];
  goals?: Goal[];
  userData?: UserData;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  getFilteredUrlParams: () => string;
  onBudgetItemClick?: (budget: BudgetItem) => void;
}

const BottomSection: FC<BottomSectionProps> = memo(({
  budgetProgress,
  recentTransactions,
  expenseCategories,
  accounts,
  goals,
  userData,
  activeTip,
  onToggleTip,
  getFilteredUrlParams,
  onBudgetItemClick,
}) => {
  const [mobileActiveTab, setMobileActiveTab] = useState<'budgets' | 'transactions'>('transactions');

  return (
    <>
      {/* Mobile Bottom Section - Tabbed interface */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMobileActiveTab('transactions')}
              className={`flex-1 py-3 text-[11px] font-semibold transition-all relative ${
                mobileActiveTab === 'transactions'
                  ? 'text-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-exchange-alt mr-1.5 text-[10px]"></i>
              Transactions
              {recentTransactions.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                  mobileActiveTab === 'transactions' 
                    ? 'bg-indigo-200 text-indigo-700' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {recentTransactions.length}
                </span>
              )}
              {mobileActiveTab === 'transactions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveTab('budgets')}
              className={`flex-1 py-3 text-[11px] font-semibold transition-all relative ${
                mobileActiveTab === 'budgets'
                  ? 'text-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-pie mr-1.5 text-[10px]"></i>
              Budgets
              {budgetProgress.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                  mobileActiveTab === 'budgets' 
                    ? 'bg-indigo-200 text-indigo-700' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {budgetProgress.length}
                </span>
              )}
              {mobileActiveTab === 'budgets' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-3">
            {mobileActiveTab === 'transactions' ? (
              <div className="animate__animated animate__fadeIn">
                {/* Quick action header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500">Recent activity</span>
                  <Link 
                    to={`/transactions?${getFilteredUrlParams()}`}
                    className="text-[10px] text-indigo-600 font-medium flex items-center gap-1"
                  >
                    View all
                    <i className="fas fa-chevron-right text-[8px]"></i>
                  </Link>
                </div>
                {/* Scrollable transactions */}
                <div className="max-h-[350px] overflow-y-auto -mx-3 px-3">
                  <RecentTransactions 
                    transactions={recentTransactions}
                    categories={expenseCategories} 
                    accounts={accounts}
                    goals={goals}
                    userData={userData}
                  />
                </div>
              </div>
            ) : (
              <div className="animate__animated animate__fadeIn">
                {/* Quick action header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500">Budget progress</span>
                  <Link 
                    to="/budgets"
                    className="text-[10px] text-indigo-600 font-medium flex items-center gap-1"
                  >
                    Manage
                    <i className="fas fa-chevron-right text-[8px]"></i>
                  </Link>
                </div>
                {/* Scrollable budgets */}
                <div className="max-h-[350px] overflow-y-auto -mx-3 px-3">
                  <BudgetProgress 
                    budgets={budgetProgress}
                    onBudgetItemClick={onBudgetItemClick}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Bottom Section - Original side-by-side layout */}
      <div className="desktop-bottom-section">
        {/* Budget Progress */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4 h-100">
            <div className="card-header py-3 flex flex-row items-center justify-between">
              <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                Budget Progress
                <div className="ml-2 relative">
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
              <Link 
                to="/budgets" 
                className="inline-block w-auto px-3 py-1.5 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
              >
                Manage Budgets
              </Link>
            </div>
            <div className="card-body p-3">
              {/* Scrollable budget progress */}
              <div className="max-h-[445px] overflow-y-auto">
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
            <div className="card-header py-3 flex flex-row items-center justify-between">
              <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                Recent Transactions
                <div className="ml-2 relative">
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
              <Link 
                to={`/transactions?${getFilteredUrlParams()}`} 
                className="inline-block w-auto px-3 py-1.5 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {/* Scrollable recent transactions */}
              <div className="max-h-[445px] overflow-y-auto">
                <RecentTransactions 
                  transactions={recentTransactions}
                  categories={expenseCategories} 
                  accounts={accounts}
                  goals={goals}
                  userData={userData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for desktop-only section */}
      <style>{`
        .desktop-bottom-section {
          display: none;
        }
        @media (min-width: 768px) {
          .desktop-bottom-section {
            display: flex;
            flex-wrap: wrap;
            margin-right: -0.75rem;
            margin-left: -0.75rem;
          }
        }
      `}</style>
    </>
  );
});

BottomSection.displayName = 'BottomSection';

export default BottomSection;
