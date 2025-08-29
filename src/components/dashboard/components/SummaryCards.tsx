import React, { FC } from "react";
import { formatCurrency, formatPercentage } from "../../../utils/helpers";

interface SummaryCardsProps {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const SummaryCards: FC<SummaryCardsProps> = ({
  income,
  expenses,
  balance,
  savingsRate,
  activeTip,
  onToggleTip,
}) => {
  return (
    <div className="row summary-cards">
      {/* Income Card */}
      <div className="col-xl-3 col-md-6 mb-4">
        <div className="card border-left-primary shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                  Monthly Income
                  <div className="ml-2 position-relative">
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
                <div className="h5 mb-0 font-weight-bold text-gray-800">
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
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center">
                  Monthly Expenses
                  <div className="ml-2 position-relative">
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
                <div className="h5 mb-0 font-weight-bold text-gray-800">
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
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                  Balance
                  <div className="ml-2 position-relative">
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
                <div className="h5 mb-0 font-weight-bold text-gray-800">
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
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                  Savings Rate
                  <div className="ml-2 position-relative">
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
                    <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
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
  );
};

export default SummaryCards;
