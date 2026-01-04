import React, { useState, useEffect, FC, useCallback } from "react";
import { formatCurrency, formatDate, formatPercentage } from "../../../utils/helpers";
import { useAuth } from "../../../utils/AuthContext";
import { useToast } from "../../../utils/ToastContext";

// Import admin-specific hooks and utilities
import { useAdminReportsData } from "./hooks/useAdminReportsData";
import { 
  processSystemActivityData,
  processUserEngagementData,
  processFinancialHealthData,
  processAIMLAnalyticsData,
  processChatbotAnalyticsData,
  generateAdminChartOptions,
  AdminReportType
} from "./utils/adminDataProcessing";

// Import new modern components
import ReportsStatsCards from "./ReportsStatsCards";
import ReportsCharts from "./ReportsCharts";
import ReportsDataTable from "./ReportsDataTable";
import ReportsControls from "./ReportsControls";

// Admin-specific interfaces
interface ProcessedAdminData {
  chartData: any[];
  tableData: any[];
  summaryStats: { [key: string]: any };
}

const AdminReports: FC = () => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();

  // Admin report type and timeframe selection
  const [selectedReportType, setSelectedReportType] = useState<AdminReportType>("system-activity");
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [chartType, setChartType] = useState<'pie' | 'column' | 'line' | 'area'>('pie');
  const [format, setFormat] = useState<'chart' | 'table'>('chart');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin-specific state
  const [processedData, setProcessedData] = useState<ProcessedAdminData>({
    chartData: [],
    tableData: [],
    summaryStats: {}
  });
  const [chartOptions, setChartOptions] = useState<any>({});

  // Use admin reports data hook
  const {
    dashboardSummary,
    systemActivity,
    userEngagement,
    financialHealth,
    aimlAnalytics,
    chatbotAnalytics,
    loading,
    error,
    refreshData
  } = useAdminReportsData(timeframe);

  // Modern refresh handler
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      setLastUpdated(new Date());
      showSuccessToast("Reports data refreshed successfully!");
    } catch (error) {
      showErrorToast("Failed to refresh reports data");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, showSuccessToast, showErrorToast]);

  // Export handler
  const handleExportData = useCallback(() => {
    try {
      const exportData = {
        reportType: selectedReportType,
        timeframe,
        data: processedData,
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-reports-${selectedReportType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSuccessToast("Report data exported successfully!");
    } catch (error) {
      showErrorToast("Failed to export report data");
    }
  }, [selectedReportType, timeframe, processedData, showSuccessToast, showErrorToast]);

  // Process data when report type or data changes
  useEffect(() => {
    processAdminData();
  }, [selectedReportType, systemActivity, userEngagement, financialHealth, aimlAnalytics, chatbotAnalytics, loading]);

  // Update chart options when processed data changes
  useEffect(() => {
    if (processedData.chartData.length > 0) {
      const options = generateAdminChartOptions(selectedReportType, chartType, processedData.chartData);
      setChartOptions(options);
    }
  }, [processedData, chartType, selectedReportType]);

  // Process admin data based on selected report type
  const processAdminData = () => {
    if (loading) return;

    let processed: ProcessedAdminData = {
      chartData: [],
      tableData: [],
      summaryStats: {}
    };

    try {
      switch (selectedReportType) {
        case 'system-activity':
          if (systemActivity && systemActivity.length > 0) {
            processed = processSystemActivityData(systemActivity);
          }
          break;
        case 'user-engagement':
          if (userEngagement) {
            processed = processUserEngagementData(userEngagement);
          }
          break;
        case 'financial-health':
          if (financialHealth) {
            processed = processFinancialHealthData(financialHealth);
          }
          break;
        case 'aiml-analytics':
          if (aimlAnalytics) {
            processed = processAIMLAnalyticsData(aimlAnalytics);
          }
          break;
        case 'chatbot-analytics':
          if (chatbotAnalytics) {
            processed = processChatbotAnalyticsData(chatbotAnalytics);
          }
          break;
        default:
          processed = {
            chartData: [],
            tableData: [],
            summaryStats: {}
          };
      }
    } catch (error) {
      console.error('Error processing admin data:', error);
    }

    setProcessedData(processed);
  };

  // Define table columns for data display - unique columns for each report type
  const getTableColumns = () => {
    switch (selectedReportType) {
      case 'system-activity':
        // System Activity tableData: { activity_type, count, activity_date, severity }
        return [
          {
            key: 'activity_date',
            label: 'Date',
            sortable: true,
            render: (value: any) => value || '-'
          },
          {
            key: 'activity_type',
            label: 'Activity Type',
            sortable: true,
            render: (value: any) => (
              <span className="badge badge-primary">{value || 'Unknown'}</span>
            )
          },
          { 
            key: 'count', 
            label: 'Count', 
            sortable: true, 
            render: (value: any) => {
              const num = Number(value);
              return (num && !isNaN(num)) ? num.toLocaleString() : '0';
            }
          },
          {
            key: 'severity',
            label: 'Severity',
            sortable: true,
            render: (value: any) => {
              const severityColors: { [key: string]: string } = {
                'info': 'badge-info',
                'warning': 'badge-warning',
                'error': 'badge-danger',
                'critical': 'badge-danger'
              };
              return (
                <span className={`badge ${severityColors[value] || 'badge-secondary'}`}>
                  {value || 'info'}
                </span>
              );
            }
          }
        ];
      
      case 'user-engagement':
        // User Engagement tableData: { metric, value, change }
        return [
          {
            key: 'metric',
            label: 'Metric',
            sortable: true,
            render: (value: any) => (
              <span className="font-weight-bold text-primary">{value || '-'}</span>
            )
          },
          { 
            key: 'value', 
            label: 'Value', 
            sortable: true,
            render: (value: any) => {
              const num = Number(value);
              return (num && !isNaN(num)) ? num.toLocaleString() : String(value) || '0';
            }
          },
          {
            key: 'change',
            label: 'Status',
            sortable: true,
            render: (value: any) => (
              <span className="text-muted small">{value || '-'}</span>
            )
          }
        ];
      
      case 'financial-health':
        // Financial Health tableData: { metric, value, change }
        return [
          {
            key: 'metric',
            label: 'Financial Metric',
            sortable: true,
            render: (value: any) => (
              <span className="font-weight-bold text-success">{value || '-'}</span>
            )
          },
          { 
            key: 'value', 
            label: 'Value', 
            sortable: true,
            render: (value: any) => {
              // Handle both numeric and string values (like "$123.45")
              if (typeof value === 'string' && value.startsWith('$')) {
                return value;
              }
              const num = Number(value);
              return (num && !isNaN(num)) ? num.toLocaleString() : String(value) || '0';
            }
          },
          {
            key: 'change',
            label: 'Details',
            sortable: true,
            render: (value: any) => (
              <span className="text-muted small">{value || '-'}</span>
            )
          }
        ];
      
      case 'aiml-analytics':
        // AI/ML Analytics tableData: { metric, value, change }
        return [
          {
            key: 'metric',
            label: 'AI/ML Metric',
            sortable: true,
            render: (value: any) => (
              <span className="font-weight-bold text-info">{value || '-'}</span>
            )
          },
          { 
            key: 'value', 
            label: 'Value', 
            sortable: true,
            render: (value: any) => {
              // Handle percentage strings and numbers
              if (typeof value === 'string' && value.includes('%')) {
                return value;
              }
              const num = Number(value);
              return (num && !isNaN(num)) ? num.toLocaleString() : String(value) || '0';
            }
          },
          {
            key: 'change',
            label: 'Status',
            sortable: true,
            render: (value: any) => (
              <span className="text-muted small">{value || '-'}</span>
            )
          }
        ];
      
      case 'chatbot-analytics':
        // Chatbot Analytics tableData: { metric, value, change }
        return [
          {
            key: 'metric',
            label: 'Chatbot Metric',
            sortable: true,
            render: (value: any) => (
              <span className="font-weight-bold text-warning">{value || '-'}</span>
            )
          },
          { 
            key: 'value', 
            label: 'Value', 
            sortable: true,
            render: (value: any) => {
              // Handle rating strings like "4.5/5"
              if (typeof value === 'string' && value.includes('/')) {
                return value;
              }
              const num = Number(value);
              return (num && !isNaN(num)) ? num.toLocaleString() : String(value) || '0';
            }
          },
          {
            key: 'change',
            label: 'Details',
            sortable: true,
            render: (value: any) => (
              <span className="text-muted small">{value || '-'}</span>
            )
          }
        ];
      
      default:
        return [
          { key: 'metric', label: 'Metric', sortable: true },
          { key: 'value', label: 'Value', sortable: true },
          { key: 'change', label: 'Status', sortable: true }
        ];
    }
  };

  // Error state
  if (error) {
    return (
      <div className="modern-user-management">
        {/* Mobile Error State */}
        <div className="block md:hidden py-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Error Loading Data</h3>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button 
              onClick={handleRefreshData}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
            >
              <i className="fas fa-sync-alt mr-2"></i>Retry
            </button>
          </div>
        </div>

        {/* Desktop Error State */}
        <div className="hidden md:block text-center mt-5">
          <div className="error mx-auto" data-text="500">500</div>
          <p className="lead text-gray-800 mb-5">Error Loading Admin Data</p>
          <p className="text-gray-500 mb-0">{error}</p>
          <button className="btn btn-primary mt-3" onClick={handleRefreshData}>
            <i className="fas fa-sync-alt mr-2"></i>Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state with modern design
  if (loading) {
    return (
      <div className="modern-user-management">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading reports & analytics...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="skeleton-line skeleton-header-title mb-2"></div>
            <div className="skeleton-line skeleton-header-subtitle"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <ReportsStatsCards dashboardSummary={null} loading={true} />

          {/* Controls Skeleton */}
          <ReportsControls
            selectedReportType={selectedReportType}
            onReportTypeChange={setSelectedReportType}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            format={format}
            onFormatChange={setFormat}
            loading={true}
          />

          {/* Charts/Table Skeleton */}
          <ReportsCharts
            chartData={{}}
            chartOptions={{}}
            loading={true}
            selectedReportType={selectedReportType}
            chartType={chartType}
            onChartTypeChange={setChartType}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Reports & Analytics</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshData}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={handleExportData}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Export data"
            >
              <i className="fas fa-download text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Report Status Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Analytics Overview</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-sm"></i>
            </div>
          </div>
          <div className="text-white text-lg font-bold mb-1">
            {selectedReportType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/70 text-xs">
              <i className="fas fa-clock text-[10px] mr-1"></i>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          {/* Mini stats row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Period</p>
              <p className="text-white text-sm font-bold">{timeframe}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">View</p>
              <p className="text-white text-sm font-bold">{format}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Type</p>
              <p className="text-white text-sm font-bold">{chartType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Reports & Analytics</h1>
                <p className="header-subtitle mb-0">
                  Comprehensive analytics dashboard for system monitoring and business intelligence
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={handleExportData}
            >
              <i className="fas fa-download mr-1"></i>
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ReportsStatsCards 
        dashboardSummary={dashboardSummary} 
        loading={loading}
      />

      {/* Controls Section */}
      <ReportsControls
        selectedReportType={selectedReportType}
        onReportTypeChange={setSelectedReportType}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        format={format}
        onFormatChange={setFormat}
        loading={loading}
        onRefresh={handleRefreshData}
        onExport={handleExportData}
      />

      {/* Main Content Area */}
      {format === 'chart' ? (
        <ReportsCharts
          chartData={processedData.chartData}
          chartOptions={chartOptions}
          loading={loading}
          selectedReportType={selectedReportType}
          chartType={chartType}
          onChartTypeChange={setChartType}
        />
      ) : (
        <ReportsDataTable
          data={processedData.tableData}
          columns={getTableColumns()}
          loading={loading}
          title={`${selectedReportType.replace('-', ' ').toUpperCase()} Data`}
          searchable={true}
          pagination={true}
          itemsPerPage={25}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-danger mt-4" role="alert">
          <div className="d-flex align-items-center">
            <div className="alert-icon mr-3">
              <i className="fas fa-exclamation-triangle fa-2x"></i>
            </div>
            <div className="alert-content flex-fill">
              <h5 className="alert-heading mb-2">Error Loading Reports Data</h5>
              <p className="mb-0">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Dashboard Footer */}
      <div className="block md:hidden mt-4 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <i className="fas fa-shield-alt text-red-500 text-[10px]"></i>
              </div>
              <span className="text-[10px] text-gray-500">Admin Reports v2.0</span>
            </div>
            <span className="text-[9px] text-gray-400">Auto-refresh: 5min</span>
          </div>
        </div>
      </div>

      {/* Dashboard Footer Info - Desktop */}
      <div className="dashboard-footer mt-5 pt-4 border-top hidden md:block">
        <div className="row">
          <div className="col-md-8">
            <p className="text-muted small mb-0">
              <i className="fas fa-info-circle mr-1"></i>
              Data is refreshed automatically every 5 minutes. Use the refresh button for immediate updates.
            </p>
          </div>
          <div className="col-md-4 text-md-right">
            <p className="text-muted small mb-0">
              <i className="fas fa-shield-alt mr-1 text-success"></i>
              Admin Reports v2.0 | Real-time Analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;