import React, { FC, useState } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

interface ChartData {
  [key: string]: any;
}

interface ReportsChartsProps {
  chartData: ChartData;
  chartOptions: any;
  loading?: boolean;
  selectedReportType: string;
  chartType: 'pie' | 'column' | 'line' | 'area';
  onChartTypeChange: (chartType: 'pie' | 'column' | 'line' | 'area') => void;
}

const ReportsCharts: FC<ReportsChartsProps> = ({
  chartData,
  chartOptions,
  loading = false,
  selectedReportType,
  chartType,
  onChartTypeChange
}) => {
  // State for fullscreen chart modal
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const getReportDisplayInfo = () => {
    const reportTypeMap: { [key: string]: { title: string; description: string; icon: string } } = {
      'system-activity': {
        title: 'System Activity Analytics',
        description: 'Monitor system events, user activities, and performance metrics',
        icon: 'fas fa-server'
      },
      'user-engagement': {
        title: 'User Engagement Analytics',
        description: 'Track user growth, engagement patterns, and retention metrics',
        icon: 'fas fa-users'
      },
      'financial-health': {
        title: 'Financial Health Overview',
        description: 'Analyze financial performance, revenue trends, and system health',
        icon: 'fas fa-chart-line'
      },
      'aiml-analytics': {
        title: 'AI/ML Analytics Dashboard',
        description: 'Monitor AI prediction accuracy, model performance, and usage patterns',
        icon: 'fas fa-brain'
      },
      'chatbot-analytics': {
        title: 'Chatbot Performance Analytics',
        description: 'Track chatbot interactions, satisfaction rates, and conversation metrics',
        icon: 'fas fa-robot'
      }
    };

    return reportTypeMap[selectedReportType] || {
      title: 'Analytics Dashboard',
      description: 'System analytics and reporting',
      icon: 'fas fa-chart-bar'
    };
  };

  const reportInfo = getReportDisplayInfo();

  if (loading) {
    return (
      <div className="dashboard-section charts-section">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="flex gap-1">
                <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
                <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
            <div className="h-48 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="section-header mb-4">
            <div className="skeleton-line skeleton-section-title mb-2"></div>
            <div className="skeleton-line skeleton-chart-title"></div>
          </div>
          
          <div className="row">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="skeleton-line skeleton-chart-title"></div>
                    <div className="d-flex gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="skeleton-button"></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="skeleton-chart"></div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 py-3">
                  <div className="skeleton-line skeleton-chart-title"></div>
                </div>
                <div className="card-body">
                  <div className="skeleton-chart" style={{ height: '200px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section charts-section">
      {/* Mobile Section Header */}
      <div className="block md:hidden mb-3">
        <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <i className={`${reportInfo.icon} text-red-500 text-xs`}></i>
          {reportInfo.title}
        </h6>
        <p className="text-[10px] text-gray-500 mt-0.5">{reportInfo.description}</p>
      </div>

      {/* Mobile Chart View */}
      <div className="block md:hidden">
        {/* Mobile Chart Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
          {/* Mobile Chart Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-chart-bar text-red-500 text-[10px]"></i>
              Analytics View
            </h6>
            <div className="flex items-center gap-1">
              {[
                { type: 'pie', icon: 'fas fa-chart-pie' },
                { type: 'column', icon: 'fas fa-chart-bar' },
                { type: 'line', icon: 'fas fa-chart-line' },
                { type: 'area', icon: 'fas fa-chart-area' }
              ].map((option) => (
                <button
                  key={option.type}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    chartType === option.type 
                      ? 'bg-red-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  onClick={() => onChartTypeChange(option.type as any)}
                  aria-label={`${option.type} chart`}
                >
                  <i className={`${option.icon} text-[10px]`}></i>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Chart Content */}
          <div className="p-3">
            {chartOptions && typeof chartOptions === 'object' && chartOptions !== null && Object.keys(chartOptions).length > 0 ? (
              <>
                <div className="chart-container" style={{ minHeight: '220px' }}>
                  <HighchartsReact
                    key={`mobile-${selectedReportType}-${chartType}`}
                    highcharts={Highcharts}
                    options={{
                      ...chartOptions,
                      chart: {
                        ...chartOptions.chart,
                        height: 220
                      }
                    }}
                    allowChartUpdate={true}
                    immutable={false}
                    updateArgs={[true, true, true]}
                    containerProps={{ style: { height: '220px', width: '100%' } }}
                  />
                </div>
                {/* View Full Chart Button */}
                <button
                  onClick={() => setIsFullscreenOpen(true)}
                  className="w-full mt-3 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <i className="fas fa-expand-arrows-alt text-[10px]"></i>
                  View Full Chart
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-chart-bar text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No Chart Data</p>
                <p className="text-[10px] text-gray-400 mt-1">Data is unavailable or loading</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-info-circle text-red-500 text-[10px]"></i>
              Quick Stats
            </h6>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-[10px] text-gray-500">Report Type</span>
              <span className="text-[10px] font-semibold text-gray-800">
                {selectedReportType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-[10px] text-gray-500">Chart Format</span>
              <span className="text-[10px] font-semibold text-gray-800">{chartType.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-[10px] text-gray-500">Data Points</span>
              <span className="text-[10px] font-semibold text-gray-800">
                {Array.isArray(chartData) ? chartData.length : Object.keys(chartData || {}).length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[10px] text-gray-500">Status</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-semibold rounded-full">
                <i className="fas fa-check mr-1 text-[8px]"></i>Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Section Header */}
      <div className="hidden md:block">
        <div className="section-header mb-4">
          <h5 className="section-title text-gray-800 font-weight-bold mb-1 d-flex align-items-center">
            <div className="header-icon-container mr-3" style={{ width: '2.5rem', height: '2.5rem' }}>
              <i className={reportInfo.icon}></i>
            </div>
            {reportInfo.title}
          </h5>
          <p className="section-subtitle text-muted mb-0">
            {reportInfo.description}
          </p>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 py-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <h6 className="card-title mb-0 font-weight-bold text-gray-800">
                    <i className="fas fa-chart-bar mr-2 text-primary"></i>
                    Primary Analytics View
                  </h6>
                  <div className="chart-type-controls d-flex gap-2">
                    {[
                      { type: 'pie', icon: 'fas fa-chart-pie', label: 'Pie' },
                      { type: 'column', icon: 'fas fa-chart-bar', label: 'Column' },
                      { type: 'line', icon: 'fas fa-chart-line', label: 'Line' },
                      { type: 'area', icon: 'fas fa-chart-area', label: 'Area' }
                    ].map((option) => (
                      <button
                        key={option.type}
                        className={`btn btn-sm ${chartType === option.type ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`}
                        onClick={() => onChartTypeChange(option.type as any)}
                        title={`Switch to ${option.label} Chart`}
                      >
                        <i className={`${option.icon} ${chartType === option.type ? '' : 'mr-1'}`}></i>
                        <span className="d-none d-md-inline ml-1">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                {chartOptions && typeof chartOptions === 'object' && chartOptions !== null && Object.keys(chartOptions).length > 0 ? (
                  <div className="chart-container" style={{ minHeight: '350px' }}>
                    <HighchartsReact
                      key={`${selectedReportType}-${chartType}`}
                      highcharts={Highcharts}
                      options={chartOptions}
                      allowChartUpdate={true}
                      immutable={false}
                      updateArgs={[true, true, true]}
                      containerProps={{ style: { height: '350px', width: '100%' } }}
                    />
                  </div>
                ) : (
                  <div className="no-data-container text-center py-5">
                    <div className="no-data-icon mb-3">
                      <i className="fas fa-chart-bar fa-3x text-muted"></i>
                    </div>
                    <h6 className="text-muted mb-2">No Chart Data Available</h6>
                    <p className="text-muted small mb-0">
                      Data for the selected report type is currently unavailable or still loading.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 py-3">
                <h6 className="card-title mb-0 font-weight-bold text-gray-800">
                  <i className="fas fa-info-circle mr-2 text-info"></i>
                  Chart Insights
                </h6>
              </div>
              <div className="card-body p-4">
                {chartData && (Array.isArray(chartData) ? chartData.length > 0 : Object.keys(chartData).length > 0) ? (
                  <div className="insights-container">
                    <div className="insight-item mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center mb-2">
                        <div className="insight-icon mr-2">
                          <i className="fas fa-database text-primary"></i>
                        </div>
                        <h6 className="mb-0 font-weight-bold">Data Points</h6>
                      </div>
                      <p className="small text-muted mb-0">
                        {Array.isArray(chartData) ? chartData.length : Object.keys(chartData || {}).length} data entries loaded
                      </p>
                    </div>

                    <div className="insight-item mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center mb-2">
                        <div className="insight-icon mr-2">
                          <i className="fas fa-chart-line text-success"></i>
                        </div>
                        <h6 className="mb-0 font-weight-bold">Chart Type</h6>
                      </div>
                      <p className="small text-muted mb-0">
                        Currently displaying as {chartType.toUpperCase()} chart
                      </p>
                    </div>

                    <div className="insight-item mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center mb-2">
                        <div className="insight-icon mr-2">
                          <i className="fas fa-clock text-warning"></i>
                        </div>
                        <h6 className="mb-0 font-weight-bold">Last Updated</h6>
                      </div>
                      <p className="small text-muted mb-0">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="chart-actions mt-4">
                      <button className="btn btn-outline-primary btn-sm btn-block mb-2">
                        <i className="fas fa-download mr-2"></i>
                        Export Chart
                      </button>
                      <button className="btn btn-outline-secondary btn-sm btn-block">
                        <i className="fas fa-expand-arrows-alt mr-2"></i>
                        Full Screen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-insights text-center py-4">
                    <i className="fas fa-info-circle fa-2x text-muted mb-3"></i>
                    <h6 className="text-muted mb-2">No Insights Available</h6>
                    <p className="text-muted small mb-0">
                      Chart insights will appear here once data is loaded.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 py-3">
                <h6 className="card-title mb-0 font-weight-bold text-gray-800">
                  <i className="fas fa-tachometer-alt mr-2 text-success"></i>
                  Quick Stats
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="stats-grid">
                  <div className="stat-item d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span className="stat-label text-muted small">Report Type</span>
                    <span className="stat-value font-weight-bold text-gray-800 small">
                      {selectedReportType.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="stat-item d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span className="stat-label text-muted small">Chart Format</span>
                    <span className="stat-value font-weight-bold text-gray-800 small">
                      {chartType.toUpperCase()}
                    </span>
                  </div>
                  <div className="stat-item d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span className="stat-label text-muted small">Data Status</span>
                    <span className="badge badge-success badge-sm">
                      <i className="fas fa-check mr-1"></i>
                      Active
                    </span>
                  </div>
                  <div className="stat-item d-flex justify-content-between align-items-center py-2">
                    <span className="stat-label text-muted small">Auto Refresh</span>
                    <span className="badge badge-info badge-sm">
                      <i className="fas fa-sync mr-1"></i>
                      5 min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Chart Modal for Mobile */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col md:hidden animate__animated animate__fadeIn animate__faster">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-500 to-rose-500 flex-shrink-0">
            <div className="flex items-center gap-2">
              <i className={`${reportInfo.icon} text-white text-xs`}></i>
              <h6 className="text-white text-xs font-bold truncate max-w-[200px]">{reportInfo.title}</h6>
            </div>
            <button
              onClick={() => setIsFullscreenOpen(false)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
              aria-label="Close fullscreen"
            >
              <i className="fas fa-times text-white text-xs"></i>
            </button>
          </div>

          {/* Chart Type Controls */}
          <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 flex-shrink-0">
            {[
              { type: 'pie', icon: 'fas fa-chart-pie', label: 'Pie' },
              { type: 'column', icon: 'fas fa-chart-bar', label: 'Column' },
              { type: 'line', icon: 'fas fa-chart-line', label: 'Line' },
              { type: 'area', icon: 'fas fa-chart-area', label: 'Area' }
            ].map((option) => (
              <button
                key={option.type}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  chartType === option.type 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => onChartTypeChange(option.type as any)}
              >
                <i className={`${option.icon} text-[10px]`}></i>
                <span className="text-[10px] font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Fullscreen Chart */}
          <div className="flex-1 flex items-center justify-center bg-white overflow-hidden">
            {chartOptions && typeof chartOptions === 'object' && chartOptions !== null && Object.keys(chartOptions).length > 0 ? (
              <div className="w-full h-full max-h-full flex items-center justify-center p-2">
                <HighchartsReact
                  key={`fullscreen-${selectedReportType}-${chartType}`}
                  highcharts={Highcharts}
                  options={{
                    ...chartOptions,
                    chart: {
                      ...chartOptions.chart,
                      height: 350,
                      backgroundColor: '#ffffff',
                      spacing: [10, 10, 15, 10]
                    },
                    title: {
                      ...chartOptions.title,
                      style: {
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }
                    }
                  }}
                  allowChartUpdate={true}
                  immutable={false}
                  updateArgs={[true, true, true]}
                  containerProps={{ style: { width: '100%', maxWidth: '100%' } }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-sm font-medium text-gray-600">No Chart Data Available</p>
                  <p className="text-xs text-gray-400 mt-1">Data is unavailable or still loading</p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Stats */}
          <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Type</p>
                  <p className="text-xs text-white font-semibold">{chartType}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Points</p>
                  <p className="text-xs text-white font-semibold">
                    {Array.isArray(chartData) ? chartData.length : Object.keys(chartData || {}).length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Status</p>
                  <p className="text-xs text-emerald-400 font-semibold">Active</p>
                </div>
              </div>
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
              >
                <i className="fas fa-compress-arrows-alt mr-1.5 text-[10px]"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsCharts;
