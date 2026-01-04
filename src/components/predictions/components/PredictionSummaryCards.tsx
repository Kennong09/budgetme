import React, { FC } from "react";
import { PredictionSummaryCardsProps } from "../types";

const PredictionSummaryCards: FC<PredictionSummaryCardsProps> = ({
  insights,
  activeTip,
  tooltipPosition,
  onToggleTip
}) => {
  const { incomeGrowth, expenseGrowth, savingsGrowth, confidenceScore = 95 } = insights;
  
  // TASK 4.2: Check if confidence score is below 70%
  const isLowConfidence = confidenceScore < 70;

  return (
    <>
      {/* TASK 4.2: Display warning indicator when confidence is low */}
      {isLowConfidence && (
        <div className="row mb-3">
          <div className="col-12">
            {/* Mobile Warning */}
            <div className="block md:hidden">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 animate__animated animate__fadeIn">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Low Confidence ({confidenceScore.toFixed(0)}%)</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Add more transactions for improved forecasts.</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Desktop Warning */}
            <div className="alert alert-warning d-none d-md-flex align-items-center animate__animated animate__fadeIn" role="alert">
              <i className="fas fa-exclamation-triangle mr-3" style={{ fontSize: '1.5rem' }}></i>
              <div>
                <strong>Low Prediction Confidence ({confidenceScore.toFixed(0)}%)</strong>
                <p className="mb-0 mt-1 small">
                  These predictions have lower accuracy due to limited transaction data or irregular patterns. 
                  Consider adding more transaction history for improved forecasts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Summary Cards - Modern stacked design */}
      <div className="block md:hidden mb-4">
        {/* Main prediction overview card */}
        <div className={`bg-gradient-to-br ${
          savingsGrowth >= 5 ? 'from-emerald-500 via-teal-500 to-cyan-500' : 
          savingsGrowth >= 0 ? 'from-blue-500 via-indigo-500 to-purple-500' : 
          'from-rose-500 via-red-500 to-orange-500'
        } rounded-2xl p-4 mb-3 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Savings Forecast</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className={`fas fa-${savingsGrowth >= 0 ? 'piggy-bank' : 'exclamation-triangle'} text-white text-sm`}></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {savingsGrowth >= 0 ? '+' : ''}{savingsGrowth.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${savingsGrowth >= 5 ? 'text-green-200' : savingsGrowth >= 0 ? 'text-blue-200' : 'text-red-200'}`}>
              <i className={`fas fa-${savingsGrowth >= 0 ? 'arrow-up' : 'arrow-down'} text-[10px] mr-1`}></i>
              {savingsGrowth >= 5 ? 'Strong Growth' : savingsGrowth >= 0 ? 'Stable' : 'Declining'}
            </span>
            {isLowConfidence && (
              <span className="bg-white/20 text-white/90 px-1.5 py-0.5 rounded text-[9px] ml-2">
                <i className="fas fa-exclamation-circle mr-0.5"></i>
                Low Confidence
              </span>
            )}
          </div>
        </div>

        {/* Secondary cards grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Income Growth */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Income Growth</p>
            <p className={`text-sm font-bold ${incomeGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {incomeGrowth >= 0 ? '+' : ''}{incomeGrowth.toFixed(1)}%
            </p>
            {isLowConfidence && (
              <span className="text-[8px] text-amber-500">
                <i className="fas fa-exclamation-circle mr-0.5"></i>
                {confidenceScore.toFixed(0)}%
              </span>
            )}
          </div>

          {/* Expense Growth */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-area text-rose-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Expense Growth</p>
            <p className={`text-sm font-bold ${expenseGrowth <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {expenseGrowth >= 0 ? '+' : ''}{expenseGrowth.toFixed(1)}%
            </p>
            {isLowConfidence && (
              <span className="text-[8px] text-amber-500">
                <i className="fas fa-exclamation-circle mr-0.5"></i>
                {confidenceScore.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Summary Cards */}
      <div className="row d-none d-md-flex">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Projected Income Growth
                    {/* TASK 4.2: Show tooltip explaining prediction uncertainty for low confidence */}
                    {isLowConfidence && (
                      <span 
                        className="ml-2 badge badge-warning" 
                        title="Low confidence - prediction may be less accurate"
                        style={{ fontSize: '0.65rem', cursor: 'help' }}
                      >
                        <i className="fas fa-exclamation-circle"></i>
                      </span>
                    )}
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
                  {isLowConfidence && (
                    <small className="text-muted">
                      <i className="fas fa-chart-line mr-1"></i>
                      Confidence: {confidenceScore.toFixed(0)}%
                    </small>
                  )}
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
                    {/* TASK 4.2: Show tooltip explaining prediction uncertainty for low confidence */}
                    {isLowConfidence && (
                      <span 
                        className="ml-2 badge badge-warning" 
                        title="Low confidence - prediction may be less accurate"
                        style={{ fontSize: '0.65rem', cursor: 'help' }}
                      >
                        <i className="fas fa-exclamation-circle"></i>
                      </span>
                    )}
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
                  {isLowConfidence && (
                    <small className="text-muted">
                      <i className="fas fa-chart-line mr-1"></i>
                      Confidence: {confidenceScore.toFixed(0)}%
                    </small>
                  )}
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
                    {/* TASK 4.2: Show tooltip explaining prediction uncertainty for low confidence */}
                    {isLowConfidence && (
                      <span 
                        className="ml-2 badge badge-warning" 
                        title="Low confidence - prediction may be less accurate"
                        style={{ fontSize: '0.65rem', cursor: 'help' }}
                      >
                        <i className="fas fa-exclamation-circle"></i>
                      </span>
                    )}
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
                  {isLowConfidence && (
                    <small className="text-muted">
                      <i className="fas fa-chart-line mr-1"></i>
                      Confidence: {confidenceScore.toFixed(0)}%
                    </small>
                  )}
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PredictionSummaryCards;