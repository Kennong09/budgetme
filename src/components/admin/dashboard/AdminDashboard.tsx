import React, { FC } from "react";
import { DashboardStatsCards, DashboardCharts, RecentActivity } from "./index";
import { useDashboardData } from "./useDashboardData";

const AdminDashboard: FC = () => {
  const {
    statCards,
    chartData,
    recentUsers,
    systemStatus,
    loading,
    refreshData
  } = useDashboardData();

  // Loading state
  if (loading) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Dashboard</h2>
        <p className="admin-loader-subtitle">Please wait while we prepare your financial summary...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h1 className="h3 mb-2 text-gray-800">Admin Dashboard</h1>
      <p className="mb-4">Overview of all BudgetMe statistics and user activities</p>

      {/* Statistics Cards */}
      <DashboardStatsCards statCards={statCards} loading={loading} />

      {/* Charts */}
      <DashboardCharts chartData={chartData} loading={loading} />

      {/* Recent Activity */}
      <RecentActivity
        recentUsers={recentUsers}
        systemStatus={systemStatus}
        loading={loading}
      />
    </div>
  );
};

export default AdminDashboard;