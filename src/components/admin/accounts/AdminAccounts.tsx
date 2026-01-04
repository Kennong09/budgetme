import React, { FC, useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../../utils/ToastContext";
import AccountStatsCards from "./AccountStatsCards";
import AccountFilters from "./AccountFilters";
import AccountTable from "./AccountTable";
import AddAccountModal from "./AddAccountModal";
import EditAccountModal from "./EditAccountModal";
import ViewAccountModal from "./ViewAccountModal";
import DeleteAccountModal from "./DeleteAccountModal";
import { useAccountData } from "./useAccountData";
import { useAccountFilters } from "./useAccountFilters";
import { AdminAccount, AccountFormData } from "./types";

const AdminAccounts: FC = () => {
  // Modal states
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // UI states
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);

  const { showSuccessToast, showErrorToast } = useToast();

  // Use custom hooks
  const {
    accounts,
    users,
    stats,
    loading,
    error,
    totalPages,
    totalItems,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    refreshData
  } = useAccountData();

  const {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    updateSort,
    updatePage
  } = useAccountFilters();

  // Fetch accounts when filters change (skip initial load as it's handled in useAccountData)
  const isInitialMount = useRef(true);
  const prevFiltersRef = useRef(filters);
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFiltersRef.current = filters;
      return;
    }
    
    // Only fetch if filters actually changed and we're not loading
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    
    if (filtersChanged && !loading && users.length > 0) {
      prevFiltersRef.current = filters;
      fetchAccounts(filters);
    }
  }, [filters, loading, users.length, fetchAccounts]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData(filters);
      setLastUpdated(new Date());
      setShowUpdateAlert(true);
      setTimeout(() => setShowUpdateAlert(false), 3000);
    } catch (err) {
      console.error('Error refreshing data:', err);
      showErrorToast("Failed to refresh account data");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, filters, showErrorToast]);

  // Modal handlers
  const handleViewAccount = useCallback((account: AdminAccount) => {
    setSelectedAccount(account);
    setShowViewModal(true);
  }, []);

  const handleEditAccount = useCallback((account: AdminAccount) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  }, []);

  const handleDeleteAccount = useCallback((account: AdminAccount) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  }, []);

  const handleSetDefaultAccount = useCallback(async (account: AdminAccount) => {
    try {
      const success = await setDefaultAccount(account.id!, account.user_id);
      if (success) {
        // Refresh data to show updated default status
        await fetchAccounts(filters);
      }
    } catch (error) {
      console.error('Error setting default account:', error);
    }
  }, [setDefaultAccount, fetchAccounts, filters]);

  // CRUD operations
  const handleAddAccount = useCallback(async (accountData: AccountFormData): Promise<boolean> => {
    try {
      const success = await createAccount(accountData);
      if (success) {
        await fetchAccounts(filters);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding account:', error);
      return false;
    }
  }, [createAccount, fetchAccounts, filters]);

  const handleUpdateAccount = useCallback(async (accountId: string, accountData: Partial<AccountFormData>): Promise<boolean> => {
    try {
      const success = await updateAccount(accountId, accountData);
      if (success) {
        await fetchAccounts(filters);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating account:', error);
      return false;
    }
  }, [updateAccount, fetchAccounts, filters]);

  const handleDeleteAccountConfirmed = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      const success = await deleteAccount(accountId);
      if (success) {
        await fetchAccounts(filters);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }, [deleteAccount, fetchAccounts, filters]);

  // Close modals
  const closeModals = useCallback(() => {
    setSelectedAccount(null);
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
  }, []);

  // Loading state with comprehensive skeleton
  if (loading) {
    return (
      <div className="modern-user-management">
        {/* Mobile Loading State */}
        <div className="d-block d-md-none py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading accounts...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="d-none d-md-block">
          {/* Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div className="header-content">
                <div className="d-flex align-items-center mb-2">
                  <div className="skeleton-icon mr-3"></div>
                  <div>
                    <div className="skeleton-line skeleton-header-title mb-2"></div>
                    <div className="skeleton-line skeleton-header-subtitle"></div>
                  </div>
                </div>
              </div>
              <div className="header-actions d-flex align-items-center">
                <div className="skeleton-line mr-3" style={{width: '150px', height: '16px'}}></div>
                <div className="skeleton-line" style={{width: '120px', height: '40px'}}></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="stats-cards-container mb-5">
            <div className="row">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-3">
                  <div className="user-stat-card admin-card-loading">
                    <div className="stat-content">
                      <div className="stat-icon">
                        <div className="skeleton-icon"></div>
                      </div>
                      <div className="stat-info">
                        <div className="skeleton-line skeleton-stat-value mb-2"></div>
                        <div className="skeleton-line skeleton-stat-title"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Skeleton */}
          <div className="controls-section mb-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="skeleton-line skeleton-search-bar"></div>
                  </div>
                  <div className="col-md-3">
                    <div className="skeleton-line skeleton-filter"></div>
                  </div>
                  <div className="col-md-3">
                    <div className="skeleton-line skeleton-filter"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="table-section">
            <div className="card shadow">
              <div className="card-header py-3">
                <div className="skeleton-line skeleton-section-title"></div>
              </div>
              <div className="card-body p-0">
                <div className="skeleton-table">
                  <div className="skeleton-table-header mb-3"></div>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="skeleton-table-row mb-2">
                      <div className="skeleton-line skeleton-table-cell"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="d-block d-md-none mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Accounts</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add account"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop */}
      <div className="user-management-header mb-5 d-none d-md-block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-university"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Account Management</h1>
                <p className="header-subtitle mb-0">
                  Monitor and manage user accounts across the platform with advanced filtering and analytics
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            {showUpdateAlert && (
              <div className="alert alert-success alert-dismissible fade show mr-3 mb-0 py-2 px-3" role="alert">
                <i className="fas fa-check-circle mr-1"></i>
                Data updated successfully!
              </div>
            )}
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddModal(true)}
              disabled={loading || isRefreshing}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <strong>Error:</strong> {error}
          <button type="button" className="close" onClick={() => window.location.reload()}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Statistics Cards Section */}
      <div className="stats-cards-container mb-5">
        <AccountStatsCards stats={stats} loading={loading} />
      </div>

      {/* Filters Section */}
      <div className="controls-section mb-4">
        <AccountFilters
          filters={filters}
          users={users}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
          loading={loading}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={getActiveFilterCount}
        />
      </div>

      {/* Accounts Table Section */}
      <div className="table-section">
        <AccountTable
          accounts={accounts}
          filters={filters}
          totalPages={totalPages}
          totalItems={totalItems}
          loading={loading}
          onSort={updateSort}
          onPageChange={updatePage}
          onAccountView={handleViewAccount}
          onAccountEdit={handleEditAccount}
          onAccountDelete={handleDeleteAccount}
          onSetDefault={handleSetDefaultAccount}
        />
      </div>

      {/* Modals */}
      <AddAccountModal
        show={showAddModal}
        onClose={closeModals}
        onAdd={handleAddAccount}
        users={users}
        loading={loading}
      />

      <EditAccountModal
        show={showEditModal}
        onClose={closeModals}
        onUpdate={handleUpdateAccount}
        account={selectedAccount}
        users={users}
        loading={loading}
      />

      <ViewAccountModal
        show={showViewModal}
        onClose={closeModals}
        account={selectedAccount}
      />

      <DeleteAccountModal
        show={showDeleteModal}
        onClose={closeModals}
        onDelete={handleDeleteAccountConfirmed}
        account={selectedAccount}
        loading={loading}
      />
    </div>
  );
};

export default AdminAccounts;
