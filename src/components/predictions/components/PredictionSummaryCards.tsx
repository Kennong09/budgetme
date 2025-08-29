import React, { FC } from "react";
import { PredictionSummaryCardsProps } from "../types";

const PredictionSummaryCards: FC<PredictionSummaryCardsProps> = ({
  insights,
  activeTip,
  tooltipPosition,
  onToggleTip
}) => {
  const { incomeGrowth, expenseGrowth, savingsGrowth } = insights;

  return (
    <div className="row">
      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                  Projected Income Growth
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('projectedIncome', e)}
                      aria-label="Projected income information"
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {incomeGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-chart-line fa-2x text-gray-300"></i>
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
                  Projected Expense Growth
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('projectedExpense', e)}
                      aria-label="Projected expense information"
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {expenseGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-chart-area fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                  Projected Savings Growth
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('projectedSavings', e)}
                      aria-label="Projected savings information"
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {savingsGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionSummaryCards;