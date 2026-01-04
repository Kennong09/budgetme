import React, { FC } from "react";
import { PredictionFilters as FilterType } from "./types";

interface PredictionFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: Partial<FilterType>) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const PredictionFilters: FC<PredictionFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  onRefresh, 
  loading = false 
}) => {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ searchTerm: e.target.value });
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ filterStatus: e.target.value });
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ filterType: e.target.value });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ pageSize: Number(e.target.value), currentPage: 1 });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      filterStatus: "all",
      filterType: "all"
    });
  };

  const hasActiveFilters = filters.searchTerm !== "" || 
                          filters.filterStatus !== "all" || 
                          filters.filterType !== "all";

  if (loading) {
    return (
      <div className="controls-section mb-4">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="h-8 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6 col-lg-4 mb-3 mb-md-0">
                  <div className="skeleton-line skeleton-search-bar"></div>
                </div>
                <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
                <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
                <div className="col-md-12 col-lg-4">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="controls-section mb-4">
      {/* Mobile Filters */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-filter text-red-500 text-[10px]"></i>
              Filters
              {hasActiveFilters && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  Active
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
          <div className="px-3 py-2 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search by username..."
                value={filters.searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterStatus}
                onChange={handleStatusFilter}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </select>
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterType}
                onChange={handleTypeFilter}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:block">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row align-items-center">
              {/* Search Input */}
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
                      placeholder="Search by username..."
                      value={filters.searchTerm}
                      onChange={handleSearch}
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.filterStatus}
                  onChange={handleStatusFilter}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="error">Error</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.filterType}
                  onChange={handleTypeFilter}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              {/* Actions and Page Size */}
              <div className="col-md-12 col-lg-4">
                <div className="d-flex justify-content-between align-items-center">
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
                  
                  <div className="filter-actions">
                    <button 
                      className="btn btn-outline-secondary btn-sm mr-2"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} mr-1`}></i>
                      Refresh
                    </button>
                    {hasActiveFilters && (
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={clearFilters}
                      >
                        <i className="fas fa-times mr-1"></i>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionFilters;
