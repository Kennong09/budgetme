import React, { FC } from "react";
import { formatCurrency } from "../../../utils/helpers";
import { CategoryPredictionsTableProps } from "../types";

const CategoryPredictionsTable: FC<CategoryPredictionsTableProps> = ({
  categoryPredictions,
  activeTip,
  tooltipPosition,
  onToggleTip
}) => {
  return (
    <div className="row">
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
            {categoryPredictions.length > 0 && categoryPredictions[0].isEmptyState ? (
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
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr className="bg-light">
                        <th>Category</th>
                        <th>Current Monthly</th>
                        <th>Predicted Next Month</th>
                        <th>Change</th>
                        <th>Status</th>
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
                        categoryPredictions.slice(0, 5).map((category, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{category.category}</strong>
                            </td>
                            <td>{formatCurrency(category.current)}</td>
                            <td>{formatCurrency(category.predicted)}</td>
                            <td className={category.change < 0 ? "text-success" : "text-danger"}>
                              <i className={`fas fa-${category.change < 0 ? "arrow-down" : "arrow-up"} mr-1`}></i>
                              {category.change < 0 ? "-" : "+"}{formatCurrency(Math.abs(category.change))} 
                              <span className="text-muted small ml-1">({Math.abs(category.changePercent).toFixed(1)}%)</span>
                            </td>
                            <td>
                              <div className={`badge badge-${
                                category.changePercent < 0 ? "success" : 
                                category.changePercent < 10 ? "info" :
                                category.changePercent < 20 ? "warning" : "danger"
                              } badge-pill`}>
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
                <div className="mt-3 small text-muted">
                  <i className="fas fa-info-circle mr-1"></i> 
                  Category forecasts are generated using Prophet's time series decomposition and your spending patterns.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPredictionsTable;