import React, { FC, useState, useCallback, useEffect } from "react";
import { Alert, Button } from "react-bootstrap";
import { useToast } from "../../../utils/ToastContext";
import {
  PredictionStatsCards,
  PredictionFilters,
  PredictionTable,
  PredictionAnalyticsCharts,
  ViewPredictionModal,
  AddPredictionModal,
  DeletePredictionModal
} from "./index";
import { usePredictionData } from "./usePredictionData";
import { usePredictionFilters } from "./usePredictionFilters";
import { PredictionSummary, PredictionFormData } from "./types";

const AdminPredictions: FC = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  
  // Modal states
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionSummary | null>(null);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  const { showSuccessToast, showErrorToast } = useToast();

  // Use the custom hooks
  const {
    predictions,
    services,
    users,
    stats,
    modelStats,
    userDistribution,
    historicalAccuracy,
    loading,
    totalPages,
    totalItems,
    fetchPredictions,
    refreshPredictionData,
    regeneratePredictions,
    updateModel
  } = usePredictionData();

  const {
    filters,
    updateFilters,
    resetFilters,
    handleSearch,
    handleStatusFilter,
    handleTypeFilter,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    hasActiveFilters
  } = usePredictionFilters();

  // Memoize the fetch call to prevent infinite loops
  const memoizedFetch = useCallback(() => {
    fetchPredictions(filters);
  }, [fetchPredictions, filters.searchTerm, filters.filterStatus, filters.filterType, filters.sortField, filters.sortDirection, filters.currentPage, filters.pageSize]);

  // Initialize data on mount and when filters change
  useEffect(() => {
    memoizedFetch();
  }, [memoizedFetch]);

  // Event handlers
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    await refreshPredictionData(filters);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [refreshPredictionData, filters]);

  // Modal handlers
  const openViewModal = (prediction: PredictionSummary) => {
    setSelectedPrediction(prediction);
    setShowViewModal(true);
  };

  const openDeleteModal = (prediction: PredictionSummary) => {
    setSelectedPrediction(prediction);
    setShowDeleteModal(true);
  };

  const closeAllModals = () => {
    setSelectedPrediction(null);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setShowAddModal(false);
  };

  // Prediction management handlers
  const handleAddPrediction = async (predictionData: PredictionFormData) => {
    try {
      // Mock implementation - in real app this would call API
      showSuccessToast("Prediction added successfully!");
      setShowAddModal(false);
      await refreshPredictionData(filters);
    } catch (error) {
      console.error("Error adding prediction:", error);
      showErrorToast("Failed to add prediction. Please try again.");
    }
  };

  const handleDeletePrediction = async (userId: string) => {
    try {
      // Mock implementation - in real app this would call API
      showSuccessToast("Prediction deleted successfully!");
      setShowDeleteModal(false);
      setSelectedPrediction(null);
      await refreshPredictionData(filters);
    } catch (error) {
      console.error("Error deleting prediction:", error);
      showErrorToast("Failed to delete prediction. Please try again.");
    }
  };

  const handleRegeneratePredictions = async (userId: string) => {
    try {
      await regeneratePredictions(userId);
      await refreshPredictionData(filters);
    } catch (error) {
      console.error("Error regenerating predictions:", error);
    }
  };

  // Model update handler
  const handleModelUpdate = async () => {
    const success = await updateModel();
    if (success) {
      setShowUpdateAlert(true);
      setTimeout(() => {
        setShowUpdateAlert(false);
      }, 5000);
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading predictions...</p>
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
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="stats-section mb-5">
            <PredictionStatsCards stats={{
              totalPredictions: 0,
              activePredictions: 0,
              predictionUsers: 0,
              averageAccuracy: 95,
              predictionsByStatus: {},
              predictionsByType: {},
              predictionsByUser: {}
            }} loading={true} />
          </div>
          
          {/* Analytics Charts Skeleton */}
          <PredictionAnalyticsCharts 
            stats={stats}
            userDistribution={[]}
            historicalAccuracy={historicalAccuracy}
            predictions={[]}
            loading={true} 
          />

          {/* Controls Section Skeleton */}
          <PredictionFilters
            filters={filters}
            onFiltersChange={() => {}}
            onRefresh={() => {}}
            loading={true}
          />

          {/* Table Skeleton */}
          <PredictionTable
            predictions={[]}
            filters={filters}
            totalPages={1}
            totalItems={0}
            loading={true}
            onSort={() => {}}
            onPageChange={() => {}}
            onPredictionSelect={() => {}}
            onPredictionDelete={() => {}}
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
          <h1 className="text-base font-bold text-gray-800">AI Predictions</h1>
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
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add prediction"
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
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">AI Predictions Management</h1>
                <p className="header-subtitle mb-0">
                  Monitor and manage AI financial predictions across all users in the platform
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
              className="btn btn-outline-secondary btn-sm shadow-sm mr-2"
              onClick={handleModelUpdate}
              disabled={loading}
            >
              <i className="fas fa-sync-alt mr-1"></i>
              Update Model
            </button>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh All'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Prediction
            </button>
          </div>
        </div>
        
        {/* Dashboard Status Indicator */}
        <div className="dashboard-status-bar mt-3">
          <div className="d-flex align-items-center">
            <div className="status-indicator status-online mr-2"></div>
            <span className="small text-success font-weight-medium">
              Prediction services operational - Models running normally
            </span>
            <div className="ml-auto">
              <span className="badge badge-success badge-pill">
                <i className="fas fa-check-circle mr-1"></i>
                Live Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Alert */}
      {showUpdateAlert && (
        <Alert 
          variant="success" 
          onClose={() => setShowUpdateAlert(false)} 
          dismissible
        >
          <Alert.Heading>Model Updated Successfully!</Alert.Heading>
          <p>
            The Prophet model has been updated with the latest data. All user predictions will
            reflect the updated model on their next forecast.
          </p>
        </Alert>
      )}

      {/* Statistics Cards Section */}
      <div className="stats-section mb-5">
        <PredictionStatsCards stats={stats} loading={loading} />
      </div>

      {/* Analytics Charts Section */}
      <PredictionAnalyticsCharts 
        stats={stats}
        userDistribution={userDistribution}
        historicalAccuracy={historicalAccuracy}
        predictions={predictions}
        loading={loading} 
      />

      {/* Controls Section */}
      <PredictionFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onRefresh={handleRefreshData}
        loading={loading}
      />

      {/* Predictions Table */}
      <PredictionTable
        predictions={predictions}
        filters={filters}
        totalPages={totalPages}
        totalItems={totalItems}
        loading={loading}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onPredictionSelect={openViewModal}
        onPredictionDelete={openDeleteModal}
      />

      {/* Modals */}
      <ViewPredictionModal
        prediction={selectedPrediction}
        show={showViewModal}
        onClose={closeAllModals}
        onDelete={openDeleteModal}
      />

      <AddPredictionModal
        show={showAddModal}
        onClose={closeAllModals}
        onAdd={handleAddPrediction}
        users={users}
        loading={loading}
      />

      <DeletePredictionModal
        show={showDeleteModal}
        prediction={selectedPrediction}
        onClose={closeAllModals}
        onDelete={handleDeletePrediction}
        loading={loading}
      />
    </div>
  );
};

export default AdminPredictions; 