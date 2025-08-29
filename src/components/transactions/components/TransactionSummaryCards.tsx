import React from 'react';
import { TransactionSummaryCardsProps } from '../types';
import { formatCurrency } from '../../../utils/helpers';

const TransactionSummaryCards: React.FC<TransactionSummaryCardsProps> = ({
  totalIncome,
  totalExpenses,
  netCashflow,
  onToggleTip
}) => {
  return (
    <div className="row">
      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                  Total Income
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('totalIncome', e)}
                      aria-label="Total income information"
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(totalIncome)}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-danger shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center">
                  Total Expenses
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('totalExpenses', e)}
                      aria-label="Total expenses information"
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(totalExpenses)}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-credit-card fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                  Net Cashflow
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('netCashflow', e)}
                      aria-label="Net cashflow information"
                    ></i>
                  </div>
                </div>
                <div className={`h5 mb-0 font-weight-bold ${netCashflow >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(netCashflow)}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-wallet fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionSummaryCards;