import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "../../../utils/highchartsInit";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  BudgetStatsCards,
  BudgetAnalyticsCharts,
  BudgetFilters,
  BudgetTable,
  BudgetDetailModal
} from "./index";
import { useBudgetData } from "./useBudgetData";
import { useBudgetFilters } from "./useBudgetFilters";
import { Budget, Category, UserProfile } from "./types";

const AdminBudgets: FC = () => {
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const { showSuccessToast, showErrorToast } = useToast();

  // Use the custom hooks
  const {
    budgets,
    categories,
    userProfiles,
    stats,
    loading,
    totalPages,
    totalItems,
    fetchBudgets,
    refreshBudgetData,
    changeBudgetStatus
  } = useBudgetData();

  const {
    filters,
    updateFilters,
    resetFilters
  } = useBudgetFilters();

  // Initialize data on mount
  useEffect(() => {
    fetchBudgets(filters);
  }, [fetchBudgets, filters]);

  // Event handlers
  const openBudgetModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedBudget(null);
    setShowModal(false);
  };

  const handleRefresh = async () => {
    await refreshBudgetData(filters);
  };

  const handleStatusChange = async (budget: Budget, newStatus: "active" | "completed" | "archived") => {
    await changeBudgetStatus(budget, newStatus);
  };

  const handleSort = (field: string) => {
    const newDirection = filters.sortField === field && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    updateFilters({
      ...filters,
      sortField: field,
      sortDirection: newDirection
    });
  };

  const handlePageChange = (page: number) => {
    updateFilters({
      ...filters,
      currentPage: page
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Budgets</h2>
        <p className="admin-loader-subtitle">Please wait while we prepare your budget data...</p>
      </div>
    );
  }

  return (
    <div className="admin-budgets">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Budget Management</h1>
      </div>
      
      {/* Summary Stats Cards */}
      <BudgetStatsCards stats={stats} loading={loading} />
      
      {/* Analytics Charts */}
      <BudgetAnalyticsCharts stats={stats} loading={loading} />

      {/* Filters */}
      <BudgetFilters
        filters={filters}
        categories={categories}
        onFiltersChange={updateFilters}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Budgets Table */}
      <BudgetTable
        budgets={budgets}
        filters={filters}
        totalPages={totalPages}
        totalItems={totalItems}
        loading={loading}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onBudgetSelect={openBudgetModal}
      />

      {/* Budget Detail Modal */}
      <BudgetDetailModal
        budget={selectedBudget}
        show={showModal}
        onClose={closeModal}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default AdminBudgets; 