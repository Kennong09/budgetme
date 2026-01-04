import React, { useState, useEffect, FC, useCallback } from "react";
import { useToast } from "../../../utils/ToastContext";
import { Family, FamilyFilters } from "./types";
import { useFamilyData } from "./useFamilyData";
import FamilyStatsCards from "./FamilyStatsCards";
import AddFamilyModal from "./AddFamilyModal";
import ViewFamilyModal from "./ViewFamilyModal";
import EditFamilyModal from "./EditFamilyModal";
import DeleteFamilyModal from "./DeleteFamilyModal";
import { formatDate } from "../../../utils/helpers";

const AdminFamily: FC = () => {
  const { showSuccessToast, showErrorToast } = useToast();
  
  // Use the family data hook
  const {
    families,
    users,
    stats,
    loading,
    refreshing,
    totalPages,
    totalItems,
    fetchFamilies,
    refreshFamilyData,
    deleteFamily,
    getFamilyMembers,
    removeFamilyMember,
  } = useFamilyData();

  // Modal states
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Mobile dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Filter and pagination state
  const [filters, setFilters] = useState<FamilyFilters>({
    name: "",
    status: "all",
    minMembers: "",
    maxMembers: "",
    sortBy: "created_at",
    sortOrder: "desc",
    currentPage: 1,
    pageSize: 10
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Mobile dropdown functions
  const closeDropdown = () => setActiveDropdown(null);
  const toggleDropdown = (familyId: string) => {
    setActiveDropdown(activeDropdown === familyId ? null : familyId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  // Load data on component mount
  useEffect(() => {
    fetchFamilies(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update filters when search or status changes
  useEffect(() => {
    const newFilters = {
      ...filters,
      name: searchTerm,
      status: filterStatus,
      currentPage: 1 // Reset to first page when filtering
    };
    setFilters(newFilters);
    fetchFamilies(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshFamilyData(filters);
    setLastUpdated(new Date());
  }, [refreshFamilyData, filters]);

  // Modal handlers
  const openViewModal = (family: Family) => {
    setSelectedFamily(family);
    setShowViewModal(true);
  };

  const openEditModal = (family: Family) => {
    setSelectedFamily(family);
    setShowEditModal(true);
  };

  const openDeleteModal = (family: Family) => {
    setSelectedFamily(family);
    setShowDeleteModal(true);
  };

  const closeAllModals = () => {
    setSelectedFamily(null);
    setShowAddModal(false);
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
  };

  // Handle family addition
  const handleFamilyAdded = useCallback(() => {
    fetchFamilies(filters);
    setLastUpdated(new Date());
  }, [fetchFamilies, filters]);

  // Handle family update
  const handleFamilyUpdated = useCallback((updatedFamily: Family) => {
    fetchFamilies(filters);
    setLastUpdated(new Date());
  }, [fetchFamilies, filters]);

  // Handle family deletion
  const handleDeleteFamily = useCallback(async (familyId: string): Promise<boolean> => {
    const success = await deleteFamily(familyId);
    if (success) {
      setLastUpdated(new Date());
    }
    return success;
  }, [deleteFamily]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, currentPage: page };
    setFilters(newFilters);
    fetchFamilies(newFilters);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    const newFilters = { ...filters, pageSize: newSize, currentPage: 1 };
    setFilters(newFilters);
    fetchFamilies(newFilters);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    const newFilters: FamilyFilters = {
      name: "",
      status: "all",
      minMembers: "",
      maxMembers: "",
      sortBy: "created_at",
      sortOrder: "desc",
      currentPage: 1,
      pageSize: 10
    };
    setFilters(newFilters);
    fetchFamilies(newFilters);
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading families...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="skeleton-icon mr-3"></div>
                <div>
                  <div className="skeleton-line skeleton-header-title mb-2"></div>
                  <div className="skeleton-line skeleton-header-subtitle"></div>
                </div>
              </div>
              <div className="skeleton-line" style={{width: '120px', height: '40px'}}></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="stats-cards-container mb-5">
            <FamilyStatsCards stats={{
              totalFamilies: 0,
              activeFamilies: 0,
              totalMembers: 0,
              avgMembersPerFamily: 0,
            }} loading={true} />
          </div>

          {/* Controls Skeleton */}
          <div className="controls-section mb-4">
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

          {/* Table Skeleton */}
          <div className="table-section">
            <div className="card shadow">
              <div className="card-header">
                <div className="skeleton-line skeleton-table-header"></div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table modern-table">
                    <thead className="table-header">
                      <tr>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <th key={index}>
                            <div className="skeleton-line skeleton-th"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="table-row">
                          {Array.from({ length: 5 }).map((_, colIndex) => (
                            <td key={colIndex}>
                              <div className="skeleton-line skeleton-td"></div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Families</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${refreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add family"
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
                <i className="fas fa-users"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Family Management</h1>
                <p className="header-subtitle mb-0">
                  Manage family groups, members, and shared financial access across the platform
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
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Family
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-container mb-5">
        <FamilyStatsCards stats={stats} loading={refreshing} />
      </div>

      {/* Mobile Controls & Family List */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-users text-red-500 text-[10px]"></i>
              Family List
              {totalItems > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <button 
              className="text-[10px] text-gray-500 flex items-center gap-1"
              onClick={clearFilters}
            >
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          {/* Mobile Search & Filters */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search families..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          {/* Mobile Family Cards List */}
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {refreshing ? (
              <div className="px-3 py-8 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-xs text-gray-500">Loading families...</p>
              </div>
            ) : families.length > 0 ? (
              families.map((family) => (
                <div 
                  key={family.id} 
                  className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => openViewModal(family)}
                >
                  <div className="flex items-center gap-3">
                    {/* Family Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <i className="fas fa-users text-red-500 text-sm"></i>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        family.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    {/* Family Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {family.family_name}
                        </p>
                        <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-semibold ${
                          family.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {family.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        Owner: {family.owner?.full_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[8px] font-medium">
                          <i className="fas fa-user-friends mr-1"></i>
                          {family.members_count || 0} members
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {formatDate(family.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions - Mobile Dropdown */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="relative">
                        <button
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(family.id); }}
                          onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(family.id); }}
                          aria-label="More actions"
                        >
                          <i className="fas fa-ellipsis-v text-[10px]"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === family.id && (
                          <div className="dropdown-menu fixed w-32 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 9999, transform: 'translateX(-100px) translateY(4px)' }}>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); openViewModal(family); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openViewModal(family); }}
                            >
                              <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">View</span>
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); openEditModal(family); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openEditModal(family); }}
                            >
                              <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">Edit</span>
                            </button>
                            <div className="border-t border-gray-200"></div>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); openDeleteModal(family); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openDeleteModal(family); }}
                            >
                              <i className="fas fa-trash text-red-500 text-[10px]"></i>
                              <span className="text-red-600">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-users text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No families found</p>
                <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
          
          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[9px] text-gray-500">
                Page {filters.currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(filters.currentPage - 1)}
                  disabled={filters.currentPage === 1}
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded-lg min-w-[24px] text-center">
                  {filters.currentPage}
                </span>
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(filters.currentPage + 1)}
                  disabled={filters.currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Controls Section */}
      <div className="controls-section mb-4 hidden md:block">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-6 col-lg-4 mb-3 mb-md-0">
                <div className="search-container">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 modern-input"
                      placeholder="Search families by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <div className="page-size-selector">
                  <small className="text-muted mr-2">Show:</small>
                  <select
                    className="form-control form-control-sm d-inline-block w-auto"
                    value={filters.pageSize}
                    onChange={handlePageSizeChange}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <small className="text-muted ml-2">per page</small>
                </div>
              </div>
              <div className="col-md-12 col-lg-4">
                <div className="d-flex justify-content-between align-items-center">
                  {(searchTerm || filterStatus !== "all") && (
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={clearFilters}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Families Table */}
      <div className="table-section hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-table mr-2"></i>
                Families ({totalItems})
              </h6>
              <div className="table-actions">
                <small className="text-muted">
                  Showing {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)} to {Math.min(filters.currentPage * filters.pageSize, totalItems)} of {totalItems} entries
                </small>
              </div>
            </div>
          </div>
        
          <div className="card-body p-0">
            {refreshing ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <h6 className="text-muted mb-2">Refreshing families...</h6>
                <p className="text-sm text-muted">Fetching latest family data and statistics</p>
              </div>
            ) : families.length === 0 ? (
              <div className="text-center py-5">
                <div className="empty-state-container">
                  <i className="fas fa-users fa-4x text-gray-300 mb-4"></i>
                  <h4 className="text-gray-700 mb-3">
                    {searchTerm || filterStatus !== "all" 
                      ? 'No Matching Families' 
                      : 'No Families Yet'
                    }
                  </h4>
                  <p className="text-muted mb-4 max-width-sm mx-auto">
                    {searchTerm || filterStatus !== "all"
                      ? 'Try adjusting your filters or search criteria to find the families you\'re looking for.' 
                      : 'No family groups have been created yet. Create the first family to get started.'
                    }
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    {(searchTerm || filterStatus !== "all") && (
                      <button className="btn btn-outline-primary btn-sm mr-2" onClick={clearFilters}>
                        <i className="fas fa-filter mr-2"></i>
                        Clear Filters
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                      <i className="fas fa-plus mr-2"></i>
                      Create First Family
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover modern-table mb-0">
                  <thead className="table-header">
                    <tr>
                      <th className="border-0">Family Name</th>
                      <th className="border-0">Owner</th>
                      <th className="border-0">Members</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Created</th>
                      <th className="border-0 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {families.map((family) => (
                      <tr key={family.id} className="table-row">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="family-icon mr-3">
                              <i className="fas fa-users text-primary fa-2x"></i>
                            </div>
                            <div>
                              <div className="family-name font-weight-medium">
                                {family.family_name}
                              </div>
                              <div className="family-desc text-muted small">
                                {family.description || 'No description'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <img 
                              src={family.owner?.avatar_url || "../images/placeholder.png"} 
                              className="rounded-circle mr-2" 
                              width="30" 
                              height="30"
                              alt={family.owner?.full_name || "Owner"}
                              onError={(e) => {
                                e.currentTarget.src = "../images/placeholder.png";
                              }}
                            />
                            <div>
                              <div className="owner-name text-sm font-weight-medium">
                                {family.owner?.full_name || 'Unknown Owner'}
                              </div>
                              <div className="owner-email text-muted small">
                                {family.owner?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="badge badge-primary p-2">
                            <i className="fas fa-user-friends mr-1"></i>
                            {family.members_count || 0}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`status-badge status-${family.status === 'active' ? 'success' : 'danger'}`}>
                            <i className={`fas ${family.status === 'active' ? 'fa-check-circle' : 'fa-pause-circle'} mr-1`}></i>
                            {family.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="created-date text-sm">
                            {formatDate(family.created_at)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline-primary mr-1"
                              onClick={() => openViewModal(family)}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning mr-1"
                              onClick={() => openEditModal(family)}
                              title="Edit Family"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openDeleteModal(family)}
                              title="Delete Family"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">
                    Page {filters.currentPage} of {totalPages}
                  </small>
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(filters.currentPage - 1)}
                        disabled={filters.currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 4, filters.currentPage - 2)) + i;
                      if (page <= totalPages) {
                        return (
                          <li key={page} className={`page-item ${filters.currentPage === page ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        );
                      }
                      return null;
                    })}
                    
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(filters.currentPage + 1)}
                        disabled={filters.currentPage === totalPages}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddFamilyModal
        show={showAddModal}
        onClose={closeAllModals}
        onFamilyAdded={handleFamilyAdded}
        users={users}
      />

      <ViewFamilyModal
        show={showViewModal}
        family={selectedFamily}
        onClose={closeAllModals}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onGetMembers={getFamilyMembers}
        onRemoveMember={removeFamilyMember}
      />

      <EditFamilyModal
        show={showEditModal}
        family={selectedFamily}
        onClose={closeAllModals}
        onFamilyUpdated={handleFamilyUpdated}
      />

      <DeleteFamilyModal
        show={showDeleteModal}
        family={selectedFamily}
        onClose={closeAllModals}
        onConfirmDelete={handleDeleteFamily}
      />
    </div>
  );
};

export default AdminFamily;