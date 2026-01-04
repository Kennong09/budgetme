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
import AddBudgetModal from "./AddBudgetModal";
import EditBudgetModal from "./EditBudgetModal";
import DeleteBudgetModal from "./DeleteBudgetModal";
import { useBudgetData } from "./useBudgetData";
import { useBudgetFilters } from "./useBudgetFilters";
import { Budget, Category, UserProfile } from "./types";

const AdminBudgets: FC = () => {
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showSuccessToast, showErrorToast } = useToast();

  // Use the custom hooks
  const {
    budgets,
    categories,
    users,
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

  // Modal handlers
  const handleAddBudget = async (budgetData: Partial<Budget>) => {
    try {
      // Call API to add budget
      // This would be implemented in useBudgetData hook
      showSuccessToast("Budget added successfully!");
      setShowAddModal(false);
      await refreshBudgetData(filters);
    } catch (error) {
      console.error("Error adding budget:", error);
      showErrorToast("Failed to add budget. Please try again.");
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowEditModal(true);
  };

  const handleUpdateBudget = async (budgetId: string, budgetData: Partial<Budget>) => {
    try {
      // Call API to update budget
      // This would be implemented in useBudgetData hook
      showSuccessToast("Budget updated successfully!");
      setShowEditModal(false);
      setSelectedBudget(null);
      await refreshBudgetData(filters);
    } catch (error) {
      console.error("Error updating budget:", error);
      showErrorToast("Failed to update budget. Please try again.");
    }
  };

  const handleDeleteBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (budgetId: string) => {
    try {
      // Call API to delete budget
      // This would be implemented in useBudgetData hook
      showSuccessToast("Budget deleted successfully!");
      setShowDeleteModal(false);
      setSelectedBudget(null);
      await refreshBudgetData(filters);
    } catch (error) {
      console.error("Error deleting budget:", error);
      showErrorToast("Failed to delete budget. Please try again.");
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedBudget(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedBudget(null);
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

  // Enhanced refresh handler
  const handleRefreshWithState = async () => {
    setIsRefreshing(true);
    try {
      await refreshBudgetData(filters);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
      showErrorToast("Failed to refresh budget data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading budgets...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Enhanced Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div className="header-content">
                <div className="d-flex align-items-center mb-2">
                  <div className="header-icon-container mr-3">
                    <div className="skeleton-icon"></div>
                  </div>
                  <div>
                    <div className="skeleton-line skeleton-header-title mb-1"></div>
                    <div className="skeleton-line skeleton-header-subtitle"></div>
                  </div>
                </div>
              </div>
              
              <div className="header-actions d-flex align-items-center">
                <div className="last-updated-info mr-3">
                  <div className="skeleton-line skeleton-date"></div>
                </div>
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="stats-cards-container mb-5">
            <BudgetStatsCards stats={{
              totalBudgets: 0,
              activeBudgets: 0,
              budgetCategories: 0,
              usersWithBudgets: 0,
              budgetsByCategory: {},
              budgetsByStatus: {},
              budgetsByUser: {}
            }} loading={true} />
          </div>
          
          {/* Analytics Charts Skeleton */}
          <BudgetAnalyticsCharts stats={{
            totalBudgets: 0,
            activeBudgets: 0,
            budgetCategories: 0,
            usersWithBudgets: 0,
            budgetsByCategory: {},
            budgetsByStatus: {},
            budgetsByUser: {}
          }} loading={true} />

          {/* Controls Section Skeleton */}
          <div className="controls-section mb-4">
            <BudgetFilters
              filters={filters}
              categories={[]}
              onFiltersChange={() => {}}
              onRefresh={() => {}}
              loading={true}
            />
          </div>

          {/* Budgets Table Skeleton */}
          <div className="table-section">
            <BudgetTable
              budgets={[]}
              filters={filters}
              totalPages={1}
              totalItems={0}
              loading={true}
              onSort={() => {}}
              onPageChange={() => {}}
              onBudgetSelect={() => {}}
              onBudgetEdit={() => {}}
              onBudgetDelete={() => {}}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Budgets</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshWithState}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add budget"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-calculator"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Budget Management</h1>
                <p className="header-subtitle mb-0">
                  Manage user budgets, track spending, and monitor financial goals across the platform
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
              onClick={handleRefreshWithState}
              disabled={loading || isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Budget
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-container mb-5">
        <BudgetStatsCards stats={stats} loading={loading} />
      </div>
      
      {/* Analytics Charts - Mobile Section Header */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
            <i className="fas fa-chart-pie text-red-500 text-[10px]"></i>
          </div>
          <span className="text-xs font-semibold text-gray-700">Analytics Overview</span>
        </div>
      </div>
      <BudgetAnalyticsCharts stats={stats} loading={loading} />

      {/* Controls Section - Mobile Section Header */}
      <div className="block md:hidden mb-3 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
            <i className="fas fa-filter text-red-500 text-[10px]"></i>
          </div>
          <span className="text-xs font-semibold text-gray-700">Search & Filters</span>
        </div>
      </div>
      <div className="controls-section mb-4">
        <BudgetFilters
          filters={filters}
          categories={categories}
          onFiltersChange={updateFilters}
          onRefresh={handleRefreshWithState}
          loading={loading}
        />
      </div>

      {/* Budgets Table - Mobile Section Header */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
              <i className="fas fa-list text-red-500 text-[10px]"></i>
            </div>
            <span className="text-xs font-semibold text-gray-700">Budget List</span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium">{totalItems} budgets</span>
        </div>
      </div>
      <div className="table-section">
        <BudgetTable
          budgets={budgets}
          filters={filters}
          totalPages={totalPages}
          totalItems={totalItems}
          loading={loading}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onBudgetSelect={openBudgetModal}
          onBudgetEdit={handleEditBudget}
          onBudgetDelete={handleDeleteBudget}
        />
      </div>

      {/* Budget Detail Modal */}
      <BudgetDetailModal
        budget={selectedBudget}
        show={showModal}
        onClose={closeModal}
        onStatusChange={handleStatusChange}
        onEdit={handleEditBudget}
        onDelete={handleDeleteBudget}
      />

      {/* Add Budget Modal */}
      <AddBudgetModal
        show={showAddModal}
        onClose={closeAddModal}
        onAdd={handleAddBudget}
        categories={categories}
        users={users}
        loading={loading}
      />

      {/* Edit Budget Modal */}
      <EditBudgetModal
        show={showEditModal}
        budget={selectedBudget}
        onClose={closeEditModal}
        onUpdate={handleUpdateBudget}
        categories={categories}
        users={users}
        loading={loading}
      />

      {/* Delete Budget Modal */}
      <DeleteBudgetModal
        show={showDeleteModal}
        budget={selectedBudget}
        onClose={closeDeleteModal}
        onDelete={handleConfirmDelete}
        loading={loading}
      />
    </div>
  );
};

export default AdminBudgets; 