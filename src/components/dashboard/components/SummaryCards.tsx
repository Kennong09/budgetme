import React, { FC, memo } from "react";
import { formatCurrency, formatPercentage } from "../../../utils/helpers";

interface SummaryCardsProps {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const SummaryCards: FC<SummaryCardsProps> = memo(({
  income,
  expenses,
  balance,
  savingsRate,
  activeTip,
  onToggleTip,
}) => {
  // Mobile card data for easier mapping
  const mobileCards = [
    {
      id: 'income',
      label: 'Income',
      value: income,
      icon: 'fa-arrow-up',
      gradient: 'from-emerald-400 to-green-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      iconBg: 'bg-emerald-500/20',
    },
    {
      id: 'expenses',
      label: 'Expenses',
      value: expenses,
      icon: 'fa-arrow-down',
      gradient: 'from-rose-400 to-red-500',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      iconBg: 'bg-rose-500/20',
    },
    {
      id: 'balance',
      label: 'Balance',
      value: balance,
      icon: 'fa-wallet',
      gradient: 'from-blue-400 to-indigo-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500/20',
    },
    {
      id: 'savings',
      label: 'Savings',
      value: savingsRate,
      isPercentage: true,
      icon: 'fa-piggy-bank',
      gradient: 'from-amber-400 to-orange-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      iconBg: 'bg-amber-500/20',
    },
  ];

  return (
    <>
      {/* Mobile Summary Cards - Modern stacked design */}
      <div className="block md:hidden mb-4">
        {/* Main balance card */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 mb-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Net Balance</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-wallet text-white text-sm"></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {formatCurrency(balance)}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              <i className={`fas fa-${balance >= 0 ? 'arrow-up' : 'arrow-down'} text-[10px] mr-1`}></i>
              {balance >= 0 ? 'Positive' : 'Negative'} balance
            </span>
          </div>
        </div>

        {/* Secondary cards grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Income */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-arrow-up text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Income</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(income)}</p>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
              <i className="fas fa-arrow-down text-rose-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Expenses</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(expenses)}</p>
          </div>

          {/* Savings Rate */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-piggy-bank text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Saved</p>
            <p className="text-sm font-bold text-gray-800">{formatPercentage(savingsRate)}</p>
            {/* Mini progress bar */}
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-amber-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(savingsRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Summary Cards - Original style */}
      <div className="desktop-summary-cards">
        {/* Income Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-bold text-primary uppercase mb-1 flex items-center">
                    Monthly Income
                    <div className="ml-2 relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => onToggleTip('income', e)}
                        aria-label="Income information"
                      ></i>
                      {activeTip === 'income' && (
                        <div className="tip-box">
                          <div className="tip-title">Monthly Income</div>
                          <div className="tip-description">
                            Total income for the selected period. This includes all sources of income like salary, freelance work, investments, and other earnings.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-800 truncate">
                    {formatCurrency(income)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-bold text-danger uppercase mb-1 flex items-center">
                    Monthly Expenses
                    <div className="ml-2 relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => onToggleTip('expenses', e)}
                        aria-label="Expenses information"
                      ></i>
                      {activeTip === 'expenses' && (
                        <div className="tip-box">
                          <div className="tip-title">Monthly Expenses</div>
                          <div className="tip-description">
                            Total expenses for the selected period. This includes all categories of spending like housing, food, transportation, entertainment, and other costs.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-800 truncate">
                    {formatCurrency(expenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-bold text-info uppercase mb-1 flex items-center">
                    Balance
                    <div className="ml-2 relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => onToggleTip('balance', e)}
                        aria-label="Balance information"
                      ></i>
                      {activeTip === 'balance' && (
                        <div className="tip-box">
                          <div className="tip-title">Net Balance</div>
                          <div className="tip-description">
                            The difference between your income and expenses for the selected period. A positive balance means you earned more than you spent.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-800 truncate">
                    {formatCurrency(balance)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-bold text-success uppercase mb-1 flex items-center">
                    Savings Rate
                    <div className="ml-2 relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => onToggleTip('savings', e)}
                        aria-label="Savings rate information"
                      ></i>
                      {activeTip === 'savings' && (
                        <div className="tip-box">
                          <div className="tip-title">Savings Rate</div>
                          <div className="tip-description">
                            Percentage of income saved after expenses. Financial experts recommend saving at least 20% of your income for long-term financial health.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto">
                      <div className="text-lg font-bold text-gray-800 mr-3">
                        {formatPercentage(savingsRate)}
                      </div>
                    </div>
                    <div className="col">
                      <div className="progress progress-sm mr-2">
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{
                            width: `${Math.min(savingsRate, 100)}%`,
                          }}
                          aria-valuenow={Math.min(savingsRate, 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-percentage fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .desktop-summary-cards { display: none; }
        @media (min-width: 768px) {
          .desktop-summary-cards { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
        }
      `}</style>
    </>
  );
});

SummaryCards.displayName = 'SummaryCards';

export default SummaryCards;
