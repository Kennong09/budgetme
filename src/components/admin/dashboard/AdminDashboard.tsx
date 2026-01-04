import { FC, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardStatsCards, DashboardCharts, RecentActivity } from "./index";
import { useDashboardData } from "./useDashboardData";

const AdminDashboard: FC = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    statCards,
    chartData,
    recentUsers,
    systemStatus,
    loading,
    refreshData
  } = useDashboardData();

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [refreshData]);

  // Loading state
  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard-loading">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading admin dashboard...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Header Skeleton */}
          <div className="dashboard-header mb-4">
            <div className="skeleton-line skeleton-header-title mb-2"></div>
            <div className="skeleton-line skeleton-header-subtitle"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="row mb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
                <div className="card shadow h-100 py-3 admin-card admin-card-loading">
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="skeleton-line skeleton-title mb-2"></div>
                        <div className="skeleton-line skeleton-value mb-3"></div>
                        <div className="skeleton-line skeleton-change"></div>
                      </div>
                      <div className="col-auto d-none d-sm-block">
                        <div className="skeleton-icon"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="row mb-4">
            <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
              <div className="card shadow mb-4 admin-card">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-line skeleton-chart-title"></div>
                </div>
                <div className="card-body">
                  <div className="skeleton-chart"></div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
              <div className="card shadow mb-4 admin-card">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-line skeleton-chart-title"></div>
                </div>
                <div className="card-body">
                  <div className="skeleton-chart"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="row">
            <div className="col-lg-6 col-md-12 mb-4">
              <div className="card shadow mb-4 admin-card">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-line skeleton-section-title"></div>
                </div>
                <div className="card-body">
                  <div className="skeleton-table"></div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 col-md-12 mb-4">
              <div className="card shadow mb-4 admin-card">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-line skeleton-section-title"></div>
                </div>
                <div className="card-body">
                  <div className="skeleton-progress-section"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard modern-dashboard">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshData}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <Link
              to="/admin/users"
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Manage users"
            >
              <i className="fas fa-users text-xs"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile System Status Card */}
      <div className="block md:hidden mb-4">
        <div className={`bg-gradient-to-br ${
          systemStatus.errorRate === 0 ? 'from-emerald-500 via-teal-500 to-cyan-500' :
          systemStatus.errorRate < 5 ? 'from-amber-500 via-orange-500 to-yellow-500' :
          'from-rose-500 via-red-500 to-orange-500'
        } rounded-2xl p-4 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">System Status</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className={`fas fa-${systemStatus.errorRate === 0 ? 'check-circle' : systemStatus.errorRate < 5 ? 'exclamation-circle' : 'exclamation-triangle'} text-white text-sm`}></i>
            </div>
          </div>
          <div className="text-white text-lg font-bold mb-1">
            {systemStatus.errorRate === 0 ? 'All Systems Operational' : 
             systemStatus.errorRate < 5 ? 'Minor Issues Detected' : 'System Issues'}
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
              <p className="text-white/60 text-[9px] uppercase">DB</p>
              <p className="text-white text-sm font-bold">{systemStatus.dbStorage}%</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Load</p>
              <p className="text-white text-sm font-bold">{systemStatus.serverLoad}%</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Errors</p>
              <p className="text-white text-sm font-bold">{systemStatus.errorRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Dashboard Header - Desktop */}
      <div className="dashboard-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="dashboard-icon-container mr-3">
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <div>
                <h1 className="dashboard-title mb-1">Admin Dashboard</h1>
                <p className="dashboard-subtitle mb-0">
                  Comprehensive overview of BudgetMe platform analytics and operations
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
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh All'}
            </button>
          </div>
        </div>
        
        {/* Dashboard Status Indicator - Dynamic based on real system status */}
        <div className="dashboard-status-bar mt-3">
          <div className="d-flex align-items-center">
            <div className={`status-indicator ${systemStatus.errorRate === 0 ? 'status-online' : systemStatus.errorRate < 5 ? 'status-warning' : 'status-error'} mr-2`}></div>
            <span className={`small font-weight-medium ${systemStatus.errorRate === 0 ? 'text-success' : systemStatus.errorRate < 5 ? 'text-warning' : 'text-danger'}`}>
              {systemStatus.errorRate === 0 
                ? 'System operational - All services running normally' 
                : systemStatus.errorRate < 5 
                  ? `Minor issues detected - ${systemStatus.errorRate}% error rate`
                  : `System issues - ${systemStatus.errorRate}% error rate`}
            </span>
            <div className="ml-auto d-flex align-items-center">
              <span className="small text-muted mr-2">
                DB: {systemStatus.dbStorage}% | Load: {systemStatus.serverLoad}%
              </span>
              <span className={`badge ${systemStatus.errorRate === 0 ? 'badge-success' : systemStatus.errorRate < 5 ? 'badge-warning' : 'badge-danger'} badge-pill`}>
                <i className={`fas ${systemStatus.errorRate === 0 ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
                Live Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Section */}
      <div className="dashboard-section stats-section mb-5">
        <DashboardStatsCards 
          statCards={statCards} 
          loading={loading} 
          onRefresh={handleRefreshData}
        />
      </div>

      {/* Charts Section */}
      <div className="dashboard-section charts-section mb-5">
        {/* Mobile Section Header */}
        <div className="block md:hidden mb-3">
          <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-chart-line text-red-500 text-xs"></i>
            Analytics & Insights
          </h6>
          <p className="text-[10px] text-gray-500 mt-0.5">Last 30 days data visualization</p>
        </div>
        
        {/* Desktop Section Header */}
        <div className="section-header mb-4 hidden md:block">
          <h5 className="section-title text-gray-800 font-weight-bold mb-1">
            Analytics & Insights
          </h5>
          <p className="section-subtitle text-muted mb-0">
            Detailed charts and data visualization for the last 30 days
          </p>
        </div>
        <DashboardCharts chartData={chartData} loading={loading} />
      </div>

      {/* Activity & Status Section */}
      <div className="dashboard-section activity-section">
        {/* Mobile Section Header */}
        <div className="block md:hidden mb-3">
          <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-history text-red-500 text-xs"></i>
            Recent Activity
          </h6>
          <p className="text-[10px] text-gray-500 mt-0.5">Latest users and system metrics</p>
        </div>
        
        {/* Desktop Section Header */}
        <div className="section-header mb-4 hidden md:block">
          <h5 className="section-title text-gray-800 font-weight-bold mb-1">
            Recent Activity & System Status
          </h5>
          <p className="section-subtitle text-muted mb-0">
            Latest user registrations and real-time system performance metrics
          </p>
        </div>
        <RecentActivity
          recentUsers={recentUsers}
          systemStatus={systemStatus}
          loading={loading}
        />
      </div>

      {/* Mobile Dashboard Footer */}
      <div className="block md:hidden mt-4 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <i className="fas fa-shield-alt text-red-500 text-[10px]"></i>
              </div>
              <span className="text-[10px] text-gray-500">Admin Dashboard v2.0</span>
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
              Admin Dashboard v2.0 | Secure & Optimized
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;