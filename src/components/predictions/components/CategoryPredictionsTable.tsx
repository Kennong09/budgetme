import React, { FC } from "react";
import { formatCurrency } from "../../../utils/helpers";
import { CategoryPredictionsTableProps } from "../types";
import "../../../styles/scrollbar.css";

const CategoryPredictionsTable: FC<CategoryPredictionsTableProps> = ({
  categoryPredictions,
  activeTip,
  tooltipPosition,
  onToggleTip
}) => {
  const hasEmptyState = categoryPredictions.length > 0 && categoryPredictions[0].isEmptyState;

  return (
    <>
      {/* Mobile Category Predictions Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-tags text-indigo-500 text-[10px]"></i>
              Category Forecast
              {!hasEmptyState && categoryPredictions.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {categoryPredictions.length}
                </span>
              )}
            </h6>
          </div>
          
          {/* Content */}
          <div className="p-3">
            {hasEmptyState ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">No Category Data</p>
                <p className="text-[10px] text-gray-500 mb-3">Add expense transactions to see category forecasts</p>
                <a href="/transactions/add" className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-medium rounded-full">
                  <i className="fas fa-plus text-[8px]"></i>
                  Add Transaction
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {categoryPredictions.map((category, index) => {
                  const isIncrease = category.change >= 0;
                  const statusColor = category.changePercent < 0 ? 'emerald' : 
                    category.changePercent < 10 ? 'blue' :
                    category.changePercent < 20 ? 'amber' : 'rose';
                  
                  return (
                    <div key={index} className="bg-gray-50 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-800 truncate flex-1 mr-2">
                          {category.category}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold bg-${statusColor}-100 text-${statusColor}-600`}>
                          {category.changePercent < 0 ? "↓" : 
                           category.changePercent < 10 ? "→" :
                           category.changePercent < 20 ? "↗" : "↑"}
                          {Math.abs(category.changePercent).toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[9px]">
                        <div>
                          <p className="text-gray-400 uppercase">Current</p>
                          <p className="font-semibold text-gray-700">{formatCurrency(category.current)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 uppercase">Predicted</p>
                          <p className="font-semibold text-gray-700">{formatCurrency(category.predicted)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 uppercase">Change</p>
                          <p className={`font-semibold ${isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isIncrease ? '+' : ''}{formatCurrency(category.change)}
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
          {!hasEmptyState && categoryPredictions.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-[9px] text-gray-500 text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Prophet time series analysis
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Category Predictions Card */}
      <div className="row d-none d-md-block">
        <div className="col-12">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.35s" }}>
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Category Spending Forecast
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('categoryForecast', e)}
                    aria-label="Category forecast information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {hasEmptyState ? (
                <div className="text-center py-5">
                  <div className="mb-4">
                    <i className="fas fa-chart-line fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-600 mb-3">No Category Spending Data</h5>
                  <p className="text-gray-500 mb-4">
                    We need transaction data to generate category spending forecasts. 
                    Add some expense transactions to see predictions for different spending categories.
                  </p>
                  <div className="alert alert-info text-left mb-4">
                    <h6 className="alert-heading"><i className="fas fa-lightbulb mr-2"></i>Get Started:</h6>
                    <ul className="mb-0 small">
                      <li>Add at least 7 transactions for reliable predictions</li>
                      <li>Include various categories (Food, Transportation, Entertainment, etc.)</li>
                      <li>Use consistent date ranges for better accuracy</li>
                    </ul>
                  </div>
                  <div className="d-flex justify-content-center">
                    <a href="/transactions/add" className="btn btn-primary btn-sm mr-2">
                      <i className="fas fa-plus mr-1"></i>
                      Add Transaction
                    </a>
                    <a href="/transactions" className="btn btn-outline-primary btn-sm">
                      <i className="fas fa-list mr-1"></i>
                      View Transactions
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="scrollable-container"
                    style={{
                      maxHeight: 'clamp(400px, 55vh, 600px)',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      overscrollBehavior: 'contain',
                      WebkitOverflowScrolling: 'touch'
                    }}
                    role="region"
                    aria-label="Category spending forecast table"
                    tabIndex={0}
                  >
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead className="sticky-top">
                          <tr className="bg-light">
                            <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fc', zIndex: 10 }}>Category</th>
                            <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fc', zIndex: 10 }}>Current Monthly</th>
                            <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fc', zIndex: 10 }}>Predicted Next Month</th>
                            <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fc', zIndex: 10 }}>Change</th>
                            <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fc', zIndex: 10 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryPredictions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-gray-500">
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Loading category predictions...
                              </td>
                            </tr>
                          ) : (
                            categoryPredictions.map((category, index) => (
                              <tr key={index}>
                                <td style={{ minWidth: 0 }}>
                                  <strong style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    {category.category}
                                  </strong>
                                </td>
                                <td className="text-nowrap">{formatCurrency(category.current)}</td>
                                <td className="text-nowrap">{formatCurrency(category.predicted)}</td>
                                <td className={`text-nowrap ${category.change < 0 ? "text-success" : "text-danger"}`}>
                                  <i className={`fas fa-${category.change < 0 ? "arrow-down" : "arrow-up"} mr-1`}></i>
                                  {category.change < 0 ? "-" : "+"}{formatCurrency(Math.abs(category.change))} 
                                  <br />
                                  <span className="text-muted small">({Math.abs(category.changePercent).toFixed(1)}%)</span>
                                </td>
                                <td>
                                  <div className={`badge badge-${
                                    category.changePercent < 0 ? "success" : 
                                    category.changePercent < 10 ? "info" :
                                    category.changePercent < 20 ? "warning" : "danger"
                                  } badge-pill`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {category.changePercent < 0 ? "Decreasing" : 
                                    category.changePercent < 10 ? "Stable" :
                                    category.changePercent < 20 ? "Moderate Growth" : "High Growth"}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-3 d-flex justify-content-between align-items-center">
                    <div className="small text-muted">
                      <i className="fas fa-info-circle mr-1"></i> 
                      Category forecasts are generated using Prophet's time series decomposition and your spending patterns.
                    </div>
                    {categoryPredictions.length > 5 && (
                      <div className="small text-primary">
                        <i className="fas fa-scroll mr-1"></i>
                        Showing all {categoryPredictions.length} categories
                      </div>
                    )}
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

export default CategoryPredictionsTable;
