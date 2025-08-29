import React, { FC } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatPercentage } from "../../../utils/helpers";
import { TrendData, DateFilterType } from "../types";

interface TrendsSectionProps {
  trends: TrendData[];
  filteredTransactions: any[];
  dateFilter: DateFilterType;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  getFilteredChartTitle: () => string;
}

const TrendsSection: FC<TrendsSectionProps> = ({
  trends,
  filteredTransactions,
  dateFilter,
  activeTip,
  onToggleTip,
  getFilteredChartTitle,
}) => {
  if (trends.length > 0) {
    return (
      <div className="row">
        <div className="col-12 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Monthly Spending Trends {dateFilter !== 'all' && `(${getFilteredChartTitle().replace(' Overview', '')})`}
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('trends', e)}
                  ></i>
                  {activeTip === 'trends' && (
                    <div className="tip-box">
                      <div className="tip-title">Monthly Spending Trends</div>
                      <div className="tip-description">
                        See how your spending is changing compared to previous periods. Green arrows indicate decreased spending, while red arrows show increased spending.
                      </div>
                    </div>
                  )}
                </div>
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                {trends.map((trend, index) => (
                  <div key={`trend-${index}`} className="col-lg-3 col-md-6 mb-4">
                    <div className={`card border-left-${trend.change < 0 ? 'success' : 'danger'} shadow-sm h-100 py-2`}>
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-uppercase mb-1 text-gray-600">
                              {trend.category}
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {trend.change < 0 ? '↓' : '↑'} {formatPercentage(Math.abs(trend.change))}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatCurrency(trend.currentAmount)} vs {formatCurrency(trend.previousAmount)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className={`fas fa-arrow-${trend.change < 0 ? 'down' : 'up'} fa-2x ${trend.change < 0 ? 'text-success' : 'text-danger'}`}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (filteredTransactions && filteredTransactions.length > 0) {
    return (
      <div className="row">
        <div className="col-12 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                Monthly Spending Trends {dateFilter !== 'all' && `(${getFilteredChartTitle().replace(' Overview', '')})`}
              </h6>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <i className="fas fa-chart-line fa-3x text-gray-300 mb-3"></i>
                <h5 className="text-gray-700 mb-2">Not Enough Data for Trends</h5>
                <p className="text-gray-500 mb-4">
                  {dateFilter === 'all' 
                    ? 'We need at least two months of transaction data to calculate spending trends.' 
                    : 'Not enough data in the selected time period to calculate spending trends. Try selecting a longer time range or adding more transactions.'}
                  <br />Continue adding transactions to see how your spending patterns change over time.
                </p>
                <div className="mt-4">
                  <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                    <i className="fas fa-plus fa-sm mr-2"></i>Add More Transactions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TrendsSection;
