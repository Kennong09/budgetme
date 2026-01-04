// Export all admin reports components
export { default as AdminReports } from './AdminReports';
export { default as ReportsStatsCards } from './ReportsStatsCards';
export { default as ReportsCharts } from './ReportsCharts';
export { default as ReportsDataTable } from './ReportsDataTable';
export { default as ReportsControls } from './ReportsControls';

// Export types and utilities
export type { AdminReportType } from './utils/adminDataProcessing';
export { 
  processSystemActivityData,
  processUserEngagementData,
  processFinancialHealthData,
  processAIMLAnalyticsData,
  processChatbotAnalyticsData,
  generateAdminChartOptions
} from './utils/adminDataProcessing';

// Export hooks
export { useAdminReportsData } from './hooks/useAdminReportsData';
export type { 
  AdminDashboardSummary,
  SystemActivityData,
  UserEngagementData,
  FinancialSystemHealth,
  AIMLAnalytics,
  ChatbotAnalytics
} from './hooks/useAdminReportsData';
