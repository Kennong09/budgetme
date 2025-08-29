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
  );
};

export default ReportSummaryCards;