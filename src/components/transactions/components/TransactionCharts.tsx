import React from 'react';
import { Link } from 'react-router-dom';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from '../../../utils/highchartsInit';
import { TransactionChartsProps } from '../types';
import { formatPercentage } from '../../../utils/helpers';

const TransactionCharts: React.FC<TransactionChartsProps> = ({
  lineChartOptions,
  pieChartOptions,
  filteredTransactions,
  periodTitle,
  expensesRatio,
  onToggleTip
}) => {
  return (
    <div className="row">
      {/* Income vs Expenses Chart */}
      <div className="col-xl-8 col-lg-7">
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Income vs Expenses Trend - {periodTitle}
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('linechart', e)}
                  aria-label="Line chart information"
                ></i>
              </div>
            </h6>
          </div>
          <div className="card-body">
            {lineChartOptions && filteredTransactions.length > 0 ? (
              <>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={lineChartOptions}
                />
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-lightbulb text-warning mr-1"></i>
                  <strong>Tip:</strong> Hover over the lines to see exact amounts. This chart shows how your income and expenses have changed over time.
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="mb-3">
                  <i className="fas fa-chart-line fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-500 font-weight-light">No transaction data available</h5>
                <p className="text-gray-500 mb-0 small">Add transactions to see your income and expense trends.</p>
                <Link to="/transactions/add" className="btn btn-sm btn-primary mt-3">
                  <i className="fas fa-plus fa-sm mr-1"></i> Add New Transaction
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Spending Ratio */}
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                Spending to Income Ratio
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('ratio', e)}
                    aria-label="Spending ratio information"
                  ></i>
                </div>
              </div>
              {filteredTransactions.length > 0 && (
                <div className={`badge badge-${
                  expensesRatio > 100 ? "danger" : 
                  expensesRatio > 80 ? "warning" : 
                  "success"
                } ml-2`}>
                  {expensesRatio > 100 ? "Overspending" : expensesRatio > 80 ? "Warning" : "On Track"}
                </div>
              )}
            </h6>
          </div>
          <div className="card-body">
            {filteredTransactions.length > 0 ? (
              <>
                <div className="mb-2 d-flex justify-content-between">
                  <span>Percentage of Income Spent</span>
                  <span className={`font-weight-bold ${
                    expensesRatio > 100 ? "text-danger" : 
                    expensesRatio > 80 ? "text-warning" : 
                    "text-success"
                  }`}>{formatPercentage(expensesRatio)}</span>
                </div>
                <div className="progress mb-4">
                  <div
                    className={`progress-bar ${
                      expensesRatio > 100 
                        ? "bg-danger" 
                        : expensesRatio > 80 
                        ? "bg-warning" 
                        : "bg-success"
                    }`}
                    role="progressbar"
                    style={{
                      width: `${expensesRatio > 100 ? 100 : expensesRatio}%`,
                    }}
                    aria-valuenow={expensesRatio > 100 ? 100 : expensesRatio}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    title={formatPercentage(expensesRatio)}
                  >
                  </div>
                </div>
                
                <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">Financial Health</div>
                <div className="row">
                  <div className="col-md-4 mb-4">
                    <div className="card bg-success text-white shadow">
                      <div className="card-body py-3">
                        Healthy
                        <div className="text-white-50 small">Spending less than 70% of income</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-4">
                    <div className="card bg-warning text-white shadow">
                      <div className="card-body py-3">
                        Caution
                        <div className="text-white-50 small">Spending 70-90% of income</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-4">
                    <div className="card bg-danger text-white shadow">
                      <div className="card-body py-3">
                        Alert
                        <div className="text-white-50 small">Spending over 90% of income</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="mb-3">
                  <i className="fas fa-balance-scale fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-500 font-weight-light">No spending ratio data</h5>
                <p className="text-gray-500 mb-0 small">Add income and expense transactions to see your spending ratio.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Categories Pie Chart */}
      <div className="col-xl-4 col-lg-5">
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Expense Distribution - {periodTitle}
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('piechart', e)}
                  aria-label="Pie chart information"
                ></i>
              </div>
            </h6>
          </div>
          <div className="card-body">
            {pieChartOptions && filteredTransactions.filter(tx => tx.type === 'expense').length > 0 ? (
              <>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={pieChartOptions}
                />
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-lightbulb text-warning mr-1"></i>
                  <strong>Tip:</strong> Click on a segment to see detailed transactions for that category. This helps identify your biggest spending areas.
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="mb-3">
                  <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-500 font-weight-light">No expense data</h5>
                <p className="text-gray-500 mb-0 small">Add expense transactions to see your spending distribution.</p>
              </div>
            )}
          </div>
        </div>
              
        {/* Financial Status Card */}
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Financial Status
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('status', e)}
                  aria-label="Financial status information"
                ></i>
              </div>
            </h6>
          </div>
          <div className="card-body">
            {filteredTransactions.length > 0 ? (
              <div className="text-center">
                <div className="mb-3">
                  <i className={`fas fa-${expensesRatio > 100 ? "exclamation-triangle text-danger" : expensesRatio > 80 ? "exclamation-circle text-warning" : "check-circle text-success"} fa-3x mb-3`}></i>
                </div>
                <h4 className="font-weight-bold" style={{ color: expensesRatio > 100 ? "#e74a3b" : expensesRatio > 80 ? "#f6c23e" : "#1cc88a" }}>
                  {expensesRatio > 100 ? "Overspending" : expensesRatio > 80 ? "Watch Spending" : "On Track"}
                </h4>
                <p className="mb-0">
                  You've spent {formatPercentage(expensesRatio)} of your income.
                  {expensesRatio > 100 ? " You're spending more than you earn." : 
                   expensesRatio > 80 ? " Consider reducing some expenses." : 
                   " Keep up the good financial habits!"}
                </p>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="mb-3">
                  <i className="fas fa-heartbeat fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-500 font-weight-light">No financial status data</h5>
                <p className="text-gray-500 mb-0 small">Add transactions to see your financial health status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionCharts;