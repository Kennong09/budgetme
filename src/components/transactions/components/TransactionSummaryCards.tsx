import { FC, memo } from 'react';
import { TransactionSummaryCardsProps } from '../types';
import { formatCurrency } from '../../../utils/helpers';

const TransactionSummaryCards: FC<TransactionSummaryCardsProps> = memo(({
  totalIncome,
  totalExpenses,
  netCashflow,
  onToggleTip
}) => {
  return (
    <>
      {/* Mobile Summary Cards - Modern stacked design matching Dashboard */}
      <div className="block md:hidden mb-4">
        {/* Main cashflow card */}
        <div className={`bg-gradient-to-br ${netCashflow >= 0 ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-rose-500 via-red-500 to-orange-500'} rounded-2xl p-4 mb-3 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Net Cashflow</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-exchange-alt text-white text-sm"></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {formatCurrency(netCashflow)}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${netCashflow >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              <i className={`fas fa-${netCashflow >= 0 ? 'arrow-up' : 'arrow-down'} text-[10px] mr-1`}></i>
              {netCashflow >= 0 ? 'Positive' : 'Negative'} cashflow
            </span>
          </div>
        </div>

        {/* Secondary cards grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Income */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-arrow-up text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Income</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(totalIncome)}</p>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
              <i className="fas fa-arrow-down text-rose-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Expenses</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Desktop Summary Cards - Original style */}
      <div className="desktop-summary-cards">
        <div className="col-xl-4 col-md-6 col-6 mb-3 mb-md-4">
          <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center" style={{ fontSize: '0.65rem' }}>
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

        <div className="col-xl-4 col-md-6 col-6 mb-3 mb-md-4">
          <div className="card border-left-danger shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center" style={{ fontSize: '0.65rem' }}>
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

        <div className="col-xl-4 col-md-6 col-12 mb-3 mb-md-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center" style={{ fontSize: '0.65rem' }}>
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

      {/* CSS for desktop-only section */}
      <style>{`
        .desktop-summary-cards { display: none; }
        @media (min-width: 768px) {
          .desktop-summary-cards { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
        }
      `}</style>
    </>
  );
});

TransactionSummaryCards.displayName = 'TransactionSummaryCards';

export default TransactionSummaryCards;
