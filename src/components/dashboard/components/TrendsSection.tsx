import React, { FC, memo } from "react";
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

const TrendsSection: FC<TrendsSectionProps> = memo(({
  trends,
  filteredTransactions,
  dateFilter,
  activeTip,
  onToggleTip,
  getFilteredChartTitle,
}) => {
  if (trends.length > 0) {
    // Sort trends: decreases first (good), then increases (bad)
    const sortedTrends = [...trends].sort((a, b) => a.change - b.change);
    
    return (
      <>
        {/* Mobile Trends - Compact card list */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-chart-line text-indigo-500 text-[10px]"></i>
                Spending Trends
              </h6>
              <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {trends.length} categories
              </span>
            </div>

            {/* Trends list */}
            <div className="divide-y divide-gray-50">
              {sortedTrends.slice(0, 5).map((trend, index) => (
                <div 
                  key={`trend-mobile-${index}`} 
                  className="px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      trend.change < 0 
                        ? 'bg-emerald-100' 
                        : 'bg-rose-100'
                    }`}>
                      <i className={`fas fa-arrow-${trend.change < 0 ? 'down' : 'up'} text-xs ${
                        trend.change < 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-gray-800 truncate">
                        {trend.category}
                      </p>
                      <p className="text-[9px] text-gray-500">
                        {formatCurrency(trend.currentAmount)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right flex-shrink-0 ml-2`}>
                    <span className={`text-xs font-bold ${
                      trend.change < 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {trend.change < 0 ? '−' : '+'}{formatPercentage(Math.abs(trend.change))}
                    </span>
                    <p className="text-[8px] text-gray-400">
                      vs last period
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Show more if there are more trends */}
            {trends.length > 5 && (
              <div className="px-3 py-2 border-t border-gray-100 text-center">
                <span className="text-[10px] text-gray-500">
                  +{trends.length - 5} more categories
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Trends - Original grid layout */}
        <div className="desktop-trends-section">
          <div className="col-12 mb-4">
            <div className="card shadow h-100">
              <div className="card-header py-3 flex flex-row items-center justify-between">
                <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                  Monthly Spending Trends {dateFilter !== 'all' && `(${getFilteredChartTitle().replace(' Overview', '')})`}
                  <div className="ml-2 relative">
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
              <div className="card-body p-3">
                <div className="row">
                  {trends.map((trend, index) => (
                    <div key={`trend-${index}`} className="col-lg-3 col-md-6 mb-4">
                      <div className={`card border-left-${trend.change < 0 ? 'success' : 'danger'} shadow-sm h-100 py-2`}>
                        <div className="card-body p-3">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-uppercase mb-1 text-gray-600 small">
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
        <style>{`
          .desktop-trends-section { display: none; }
          @media (min-width: 768px) {
            .desktop-trends-section { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
          }
        `}</style>
      </>
    );
  }

  if (filteredTransactions && filteredTransactions.length > 0) {
    return (
      <>
        {/* Mobile - Compact empty state */}
        <div className="block md:hidden mb-4">
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-chart-line text-gray-400 text-sm"></i>
            </div>
            <p className="text-[11px] font-medium text-gray-700 mb-1">Need More Data</p>
            <p className="text-[10px] text-gray-500 mb-3">Add transactions to see spending trends</p>
            <Link 
              to="/transactions/add" 
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-medium rounded-lg"
            >
              <i className="fas fa-plus text-[8px]"></i>
              Add Transaction
            </Link>
          </div>
        </div>

        {/* Desktop - Original empty state */}
        <div className="desktop-trends-empty-section">
          <div className="col-12 mb-4">
            <div className="card shadow h-100">
              <div className="card-header py-3">
                <h6 className="m-0 font-bold text-primary text-sm">
                  Monthly Spending Trends {dateFilter !== 'all' && `(${getFilteredChartTitle().replace(' Overview', '')})`}
                </h6>
              </div>
              <div className="card-body p-3">
                <div className="text-center py-4">
                  <i className="fas fa-chart-line text-3xl text-gray-300 mb-3"></i>
                  <h5 className="text-gray-700 mb-1.5 text-lg">Not Enough Data</h5>
                  <p className="text-gray-500 mb-4 text-xs">
                    {dateFilter === 'all' 
                      ? 'We need at least two months of transaction data to calculate spending trends.' 
                      : 'Not enough data in the selected time period to calculate spending trends. Try selecting a longer time range or adding more transactions.'}
                    <br />Continue adding transactions to see how your spending patterns change over time.
                  </p>
                  <div className="mt-4">
                    <Link 
                      to="/transactions/add" 
                      className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                    >
                      <i className="fas fa-plus text-xs mr-2"></i>
                      Add More Transactions
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .desktop-trends-empty-section { display: none; }
          @media (min-width: 768px) {
            .desktop-trends-empty-section { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
          }
        `}</style>
      </>
    );
  }

  return null;
});

TrendsSection.displayName = 'TrendsSection';

export default TrendsSection;
