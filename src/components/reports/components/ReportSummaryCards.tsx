import React, { FC } from 'react';

interface ReportSummaryCardsProps {
  totalTransactions: number;
  activeBudgets: number;
  activeGoals: number;
  lastUpdated: string;
}

const ReportSummaryCards: FC<ReportSummaryCardsProps> = ({
  totalTransactions,
  activeBudgets,
  activeGoals,
  lastUpdated
}) => {
  return (
    <>
      {/* Mobile Summary Cards - Modern stacked design */}
      <div className="block md:hidden mb-4">
        {/* Main overview card */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 mb-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Report Overview</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-sm"></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {totalTransactions} Transactions
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-indigo-200">
              <i className="fas fa-clock text-[10px] mr-1"></i>
              Updated {lastUpdated}
            </span>
          </div>
        </div>

        {/* Secondary cards grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Total Transactions */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-exchange-alt text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Transactions</p>
            <p className="text-sm font-bold text-gray-800">{totalTransactions}</p>
          </div>

          {/* Active Budgets */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-wallet text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Budgets</p>
            <p className="text-sm font-bold text-gray-800">{activeBudgets}</p>
          </div>

          {/* Active Goals */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-bullseye text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Goals</p>
            <p className="text-sm font-bold text-gray-800">{activeGoals}</p>
          </div>
        </div>
      </div>

      {/* Desktop Summary Cards */}
      <div className="hidden md:block">
        <div className="row mb-4">
          <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Transactions
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {totalTransactions}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exchange-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Budgets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {activeBudgets}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Active Goals
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {activeGoals}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-bullseye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-6 col-lg-3 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body py-2 px-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Data Last Updated
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {lastUpdated}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clock fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ReportSummaryCards;