import { FC, memo, useState } from 'react';
import { Link } from 'react-router-dom';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from '../../../utils/highchartsInit';
import { TransactionChartsProps } from '../types';
import { formatPercentage } from '../../../utils/helpers';

const TransactionCharts: FC<TransactionChartsProps> = memo(({
  lineChartOptions,
  pieChartOptions,
  filteredTransactions,
  periodTitle,
  expensesRatio,
  onToggleTip
}) => {
  const [mobileActiveChart, setMobileActiveChart] = useState<'overview' | 'categories'>('overview');

  // Create mobile-optimized bar chart options (column chart for Income vs Expenses)
  const mobileBarChartOptions = lineChartOptions ? {
    ...lineChartOptions,
    chart: {
      ...lineChartOptions.chart,
      type: 'column',
      height: 280,
      spacing: [10, 10, 10, 10],
      backgroundColor: 'transparent',
    },
    legend: {
      enabled: false,
    },
    xAxis: {
      ...lineChartOptions.xAxis,
      labels: {
        ...(lineChartOptions.xAxis as any)?.labels,
        style: { fontSize: '10px', color: '#6b7280' },
        rotation: 0,
      },
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb',
    },
    yAxis: {
      ...lineChartOptions.yAxis,
      gridLineColor: '#f3f4f6',
      gridLineDashStyle: 'Dot',
      labels: {
        ...(lineChartOptions.yAxis as any)?.labels,
        style: { fontSize: '11px', color: '#6b7280' },
        formatter: function(this: any) {
          if (this.value >= 1000) {
            return `₱${(this.value / 1000).toFixed(0)}k`;
          }
          return `₱${this.value}`;
        },
      },
      title: { text: null },
    },
    plotOptions: {
      column: {
        pointPadding: 0.1,
        borderWidth: 0,
        borderRadius: 4,
        groupPadding: 0.15,
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      style: { fontSize: '11px' },
    },
    series: lineChartOptions.series?.map((s: any) => ({
      ...s,
      type: 'column',
      color: s.name === 'Income' ? '#10b981' : '#ef4444',
    })),
  } : null;

  // Create mobile-optimized donut chart options
  const mobileDonutChartOptions = pieChartOptions ? {
    ...pieChartOptions,
    chart: {
      ...pieChartOptions.chart,
      height: 300,
      backgroundColor: 'transparent',
    },
    plotOptions: {
      ...pieChartOptions.plotOptions,
      pie: {
        ...(pieChartOptions.plotOptions as any)?.pie,
        dataLabels: { enabled: false },
        showInLegend: true,
        size: '70%',
        innerSize: '50%',
        center: ['50%', '35%'],
        colors: ['#60a5fa', '#818cf8', '#34d399', '#fb923c', '#f87171', '#a78bfa', '#fbbf24', '#6ee7b7'],
      },
    },
    legend: {
      enabled: true,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: { 
        fontSize: '11px',
        fontWeight: 'normal',
        color: '#374151',
      },
      symbolRadius: 2,
      symbolHeight: 10,
      symbolWidth: 10,
      itemMarginTop: 8,
      itemMarginBottom: 4,
      padding: 0,
    },
    title: { text: null },
  } : null;

  return (
    <>
      {/* Mobile Charts - Clean tabbed interface matching the design */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab header - Clean design like the image */}
          <div className="flex bg-slate-50">
            <button
              onClick={() => setMobileActiveChart('overview')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveChart === 'overview'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-bar mr-2 text-xs"></i>
              Overview
              {mobileActiveChart === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveChart('categories')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveChart === 'categories'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-pie mr-2 text-xs"></i>
              Categories
              {mobileActiveChart === 'categories' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          </div>

          {/* Chart content */}
          <div className="p-4">
            {mobileActiveChart === 'overview' ? (
              mobileBarChartOptions && filteredTransactions.length > 0 ? (
                <div className="animate__animated animate__fadeIn">
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <span className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      Income
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Expenses
                    </span>
                  </div>
                  <HighchartsReact highcharts={Highcharts} options={mobileBarChartOptions} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">No transaction data yet</p>
                  <Link to="/transactions/add" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                    <i className="fas fa-plus text-xs"></i>
                    Add Transaction
                  </Link>
                </div>
              )
            ) : (
              mobileDonutChartOptions && filteredTransactions.filter(tx => tx.type === 'expense').length > 0 ? (
                <div className="animate__animated animate__fadeIn">
                  <HighchartsReact highcharts={Highcharts} options={mobileDonutChartOptions} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-pie text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">No expense data to categorize</p>
                  <Link to="/transactions/add" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                    <i className="fas fa-plus text-xs"></i>
                    Add Expense
                  </Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile Spending Ratio Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-percentage text-indigo-500 text-[10px]"></i>
              Spending Ratio
            </h6>
            {filteredTransactions.length > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                expensesRatio > 100 ? 'bg-rose-100 text-rose-600' : 
                expensesRatio > 80 ? 'bg-amber-100 text-amber-600' : 
                'bg-emerald-100 text-emerald-600'
              }`}>
                {expensesRatio > 100 ? 'Overspending' : expensesRatio > 80 ? 'Warning' : 'On Track'}
              </span>
            )}
          </div>
          <div className="p-4">
            {filteredTransactions.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Income Spent</span>
                  <span className={`text-sm font-bold ${
                    expensesRatio > 100 ? 'text-rose-600' : 
                    expensesRatio > 80 ? 'text-amber-600' : 
                    'text-emerald-600'
                  }`}>{formatPercentage(expensesRatio)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      expensesRatio > 100 ? 'bg-rose-500' : 
                      expensesRatio > 80 ? 'bg-amber-500' : 
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(expensesRatio, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {expensesRatio > 100 ? 'You are spending more than you earn' : 
                   expensesRatio > 80 ? 'Consider reducing some expenses' : 
                   'Great job keeping expenses under control!'}
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-balance-scale text-gray-300 text-2xl mb-2"></i>
                <p className="text-xs text-gray-500">Add transactions to see ratio</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Financial Status Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
          <div className="px-4 py-3 border-b border-gray-100">
            <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-heartbeat text-indigo-500 text-[10px]"></i>
              Financial Status
            </h6>
          </div>
          <div className="p-4">
            {filteredTransactions.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  expensesRatio > 100 ? 'bg-rose-100' : 
                  expensesRatio > 80 ? 'bg-amber-100' : 
                  'bg-emerald-100'
                }`}>
                  <i className={`fas fa-${
                    expensesRatio > 100 ? 'exclamation-triangle' : 
                    expensesRatio > 80 ? 'exclamation-circle' : 
                    'check-circle'
                  } text-xl ${
                    expensesRatio > 100 ? 'text-rose-500' : 
                    expensesRatio > 80 ? 'text-amber-500' : 
                    'text-emerald-500'
                  }`}></i>
                </div>
                <div className="flex-1">
                  <h4 className={`text-base font-bold mb-0.5 ${
                    expensesRatio > 100 ? 'text-rose-600' : 
                    expensesRatio > 80 ? 'text-amber-600' : 
                    'text-emerald-600'
                  }`}>
                    {expensesRatio > 100 ? 'Overspending' : expensesRatio > 80 ? 'Watch Spending' : 'On Track'}
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    {expensesRatio > 100 ? "You're spending more than you earn. Review your budget." : 
                     expensesRatio > 80 ? "You're close to your limit. Consider cutting back." : 
                     "Keep up the good financial habits!"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-heartbeat text-gray-300 text-2xl mb-2"></i>
                <p className="text-xs text-gray-500">Add transactions to see status</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts - Original layout */}
      <div className="desktop-charts-section">
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
                    <strong>Tip:</strong> Hover over the lines to see exact amounts.
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-line fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No transaction data available</h5>
                  <p className="text-gray-500 mb-0 small">Add transactions to see your income and expense trends.</p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-medium rounded shadow-sm transition-colors mt-3"
                  >
                    <i className="fas fa-plus text-xs mr-1"></i> Add New Transaction
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Spending Ratio */}
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center justify-content-between flex-wrap">
                <div className="d-flex align-items-center mb-1 mb-md-0">
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
                    >
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">Financial Health</div>
                  <div className="row spending-ratio-cards">
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
                    <strong>Tip:</strong> Click on a segment to see detailed transactions for that category.
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
          <div className="card shadow mb-4 animate__animated animate__fadeIn financial-status-card" style={{ animationDelay: "0.4s" }}>
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

      {/* CSS for desktop-only section */}
      <style>{`
        .desktop-charts-section { display: none; }
        @media (min-width: 768px) {
          .desktop-charts-section { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
        }
      `}</style>
    </>
  );
});

TransactionCharts.displayName = 'TransactionCharts';

export default TransactionCharts;
