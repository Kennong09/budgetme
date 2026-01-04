import React, { FC } from "react";
import { formatCurrency } from "../../../utils/helpers";
import { TransactionTypeForecastTableProps, TimeframeType } from "../types";
import { getTimeframeMonths } from "../../../services/database/predictionService";

const TransactionTypeForecastTable: FC<TransactionTypeForecastTableProps & { timeframe?: TimeframeType }> = ({
  transactionTypePredictions,
  activeTip,
  tooltipPosition,
  onToggleTip,
  timeframe = '3months'
}) => {
  const forecastMonths = getTimeframeMonths(timeframe);
  const timeframeLabel = timeframe === '3months' ? '3 Month' : timeframe === '6months' ? '6 Month' : '1 Year';
  const hasEmptyState = transactionTypePredictions.length > 0 && transactionTypePredictions[0].isEmptyState;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Income': return 'fas fa-plus-circle text-success';
      case 'Expense': return 'fas fa-minus-circle text-danger';
      case 'Savings': return 'fas fa-piggy-bank text-info';
      case 'Total': return 'fas fa-calculator text-primary';
      default: return 'fas fa-circle';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Income': return { bg: 'emerald', icon: 'emerald' };
      case 'Expense': return { bg: 'rose', icon: 'rose' };
      case 'Savings': return { bg: 'cyan', icon: 'cyan' };
      case 'Total': return { bg: 'indigo', icon: 'indigo' };
      default: return { bg: 'gray', icon: 'gray' };
    }
  };

  const getStatusBadgeClass = (type: string, changePercent: number) => {
    if (type === 'Total') return changePercent > 0 ? 'badge-success' : 'badge-danger';
    if (type === 'Income') return changePercent > 0 ? 'badge-success' : 'badge-warning';
    if (type === 'Expense') return changePercent < 0 ? 'badge-success' : changePercent < 10 ? 'badge-warning' : 'badge-danger';
    if (type === 'Savings') return changePercent > 0 ? 'badge-success' : 'badge-warning';
    return 'badge-info';
  };

  const getStatusText = (type: string, changePercent: number) => {
    if (type === 'Total') return changePercent > 0 ? 'Growing' : 'Declining';
    if (type === 'Income') return changePercent > 0 ? 'Increasing' : changePercent < -5 ? 'Decreasing' : 'Stable';
    if (type === 'Expense') return changePercent < 0 ? 'Decreasing' : changePercent < 10 ? 'Stable' : 'Increasing';
    if (type === 'Savings') return changePercent > 0 ? 'Growing' : changePercent < -5 ? 'Declining' : 'Stable';
    return 'Stable';
  };

  return (
    <>
      {/* Mobile Transaction Type Forecast */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-exchange-alt text-indigo-500 text-[10px]"></i>
              Transaction Forecast
            </h6>
            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-medium">
              {timeframeLabel}
            </span>
          </div>
          
          {/* Content */}
          <div className="p-3">
            {hasEmptyState ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">No Transaction Data</p>
                <p className="text-[10px] text-gray-500 mb-3">Add transactions to see forecasts</p>
                <a href="/transactions/add" className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-medium rounded-full">
                  <i className="fas fa-plus text-[8px]"></i>
                  Add Transaction
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionTypePredictions.map((item, index) => {
                  const colors = getTypeColor(item.type);
                  const isIncrease = item.change >= 0;
                  const isPositiveChange = (item.type === 'Income' || item.type === 'Savings' || item.type === 'Total') 
                    ? isIncrease 
                    : !isIncrease;
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-xl p-3 ${item.type === 'Total' ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg bg-${colors.bg}-100 flex items-center justify-center`}>
                            <i className={`fas fa-${
                              item.type === 'Income' ? 'arrow-up' : 
                              item.type === 'Expense' ? 'arrow-down' : 
                              item.type === 'Savings' ? 'piggy-bank' : 'calculator'
                            } text-${colors.icon}-500 text-xs`}></i>
                          </div>
                          <span className={`text-xs font-semibold ${item.type === 'Total' ? 'text-indigo-700' : 'text-gray-800'}`}>
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.lowConfidence && (
                            <span className="bg-amber-100 text-amber-600 px-1 py-0.5 rounded text-[8px]">
                              <i className="fas fa-exclamation-triangle"></i>
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${
                            isPositiveChange ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {isIncrease ? '+' : ''}{item.changePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-[9px]">
                        <div>
                          <p className="text-gray-400 uppercase">Current</p>
                          <p className="font-semibold text-gray-700">{formatCurrency(item.current)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 uppercase">Predicted</p>
                          <p className="font-semibold text-gray-700">{formatCurrency(item.predicted)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 uppercase">Change</p>
                          <p className={`font-semibold ${isPositiveChange ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isIncrease ? '+' : ''}{formatCurrency(item.change)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {!hasEmptyState && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-[9px] text-gray-500 text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Current month vs predicted next month
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Transaction Type Forecast */}
      <div className="row d-none d-md-block">
        <div className="col-12">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.35s" }}>
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Transaction Type Forecast
                <span className="badge badge-info ml-2 px-2 py-1" style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>
                  <i className="fas fa-calendar-alt mr-1"></i>
                  {timeframeLabel} Forecast
                </span>
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('transactionTypeForecast', e)}
                    aria-label="Transaction type forecast information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {hasEmptyState ? (
                <div className="text-center py-5">
                  <div className="mb-4"><i className="fas fa-chart-line fa-3x text-gray-300"></i></div>
                  <h5 className="text-gray-600 mb-3">No Transaction Data</h5>
                  <p className="text-gray-500 mb-4">
                    We need transaction data to generate transaction type forecasts. 
                    Add some transactions to see predictions for income, expenses, and savings.
                  </p>
                  <div className="alert alert-info text-left mb-4">
                    <h6 className="alert-heading"><i className="fas fa-lightbulb mr-2"></i>Get Started:</h6>
                    <ul className="mb-0 small">
                      <li>Add at least 7 transactions for reliable predictions</li>
                      <li>Include both income and expense transactions</li>
                      <li>Use consistent date ranges for better accuracy</li>
                      <li>Track different transaction types to see comprehensive forecasts</li>
                    </ul>
                  </div>
                  <div className="d-flex justify-content-center">
                    <a href="/transactions/add" className="btn btn-primary btn-sm mr-2">
                      <i className="fas fa-plus mr-1"></i>Add Transaction
                    </a>
                    <a href="/transactions" className="btn btn-outline-primary btn-sm">
                      <i className="fas fa-list mr-1"></i>View Transactions
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr className="bg-light">
                          <th>Transaction Type</th>
                          <th>Current Month</th>
                          <th>Predicted Next Month</th>
                          <th>Change</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionTypePredictions.map((item, index) => (
                          <tr key={index} className={item.type === 'Total' ? 'table-primary font-weight-bold' : ''}>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className={`${getTypeIcon(item.type)} mr-2`}></i>
                                <strong>{item.type}</strong>
                              </div>
                            </td>
                            <td>{formatCurrency(item.current)}</td>
                            <td>{formatCurrency(item.predicted)}</td>
                            <td className={item.change < 0 ? "text-success" : "text-danger"}>
                              <i className={`fas fa-${item.change < 0 ? "arrow-down" : "arrow-up"} mr-1`}></i>
                              {item.change < 0 ? "-" : "+"}{formatCurrency(Math.abs(item.change))} 
                              <span className="text-muted small ml-1">({Math.abs(item.changePercent).toFixed(1)}%)</span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className={`badge ${getStatusBadgeClass(item.type, item.changePercent)} badge-pill`}>
                                  {getStatusText(item.type, item.changePercent)}
                                </div>
                                {item.lowConfidence && (
                                  <div 
                                    className="badge badge-warning badge-pill ml-2" 
                                    title="Prediction capped due to unrealistic growth rate (>50%). Conservative estimate applied."
                                    style={{ cursor: 'help' }}
                                  >
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Low Confidence
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row mt-3">
                    <div className="col-md-8">
                      <div className="small text-muted">
                        <i className="fas fa-info-circle mr-1"></i> 
                        <strong>Current Month</strong> shows your actual spending from the Income vs Expenses Trend chart. Predictions are AI-powered forecasts.
                      </div>
                      {transactionTypePredictions.some(t => t.lowConfidence) && (
                        <div className="small text-warning mt-2">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          <strong>Low Confidence:</strong> Some predictions were capped at ±5% due to unrealistic growth rates exceeding 50%. Conservative estimates applied for accuracy.
                        </div>
                      )}
                    </div>
                    <div className="col-md-4 text-right">
                      <div className="small text-muted">
                        <i className="fas fa-chart-line mr-1"></i>
                        Showing Monthly Income, Expenses, Savings & Net Total
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionTypeForecastTable;
