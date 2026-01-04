import React, { FC } from "react";
import { Category, BudgetFilters } from "./types";

interface BudgetFiltersProps {
  filters: BudgetFilters;
  categories: Category[];
  onFiltersChange: (filters: Partial<BudgetFilters>) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const BudgetFiltersComponent: FC<BudgetFiltersProps> = ({
  filters,
  categories,
  onFiltersChange,
  onRefresh,
  loading = false
}) => {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ currentPage: 1 });
  };

  const handleFilterChange = () => {
    onFiltersChange({ currentPage: 1 });
  };

  const handleResetFilters = () => {
    onFiltersChange({
      searchTerm: "",
      filterCategory: "all",
      filterStatus: "all",
      currentPage: 1
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    onFiltersChange({
      pageSize: newSize,
      currentPage: 1
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.searchTerm || filters.filterCategory !== "all" || filters.filterStatus !== "all";

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
            <div className="h-9 bg-gray-200 rounded-lg mb-2"></div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 h-8 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4 mb-3">
                  <div className="skeleton-line skeleton-budget-search"></div>
                </div>
                <div className="col-md-2 mb-3">
                  <div className="skeleton-line skeleton-budget-filter"></div>
                </div>
                <div className="col-md-2 mb-3">
                  <div className="skeleton-line skeleton-budget-filter"></div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="skeleton-line skeleton-budget-controls"></div>
                </div>
                <div className="col-md-1 mb-3">
                  <div className="d-flex justify-content-end">
                    <div className="skeleton-budget-action-btn mr-2"></div>
                    <div className="skeleton-budget-action-btn"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Filters */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Search & Filter Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Filter Budgets</span>
            {hasActiveFilters && (
              <button 
                className="text-[10px] text-red-500 flex items-center gap-1 font-medium"
                onClick={handleResetFilters}
              >
                <i className="fas fa-times text-[8px]"></i>
                Clear
              </button>
            )}
          </div>
          
          {/* Mobile Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search budgets..."
                value={filters.searchTerm}
                onChange={e => onFiltersChange({ searchTerm: e.target.value })}
              />
            </div>
          </div>
          
          {/* Mobile Filter Dropdowns */}
          <div className="px-3 py-2 flex gap-2">
            <select
              className="flex-1 px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              value={filters.filterCategory}
              onChange={e => {
                onFiltersChange({ filterCategory: e.target.value });
                handleFilterChange();
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>
            <select
              className="flex-1 px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              value={filters.filterStatus}
              onChange={e => {
                onFiltersChange({ filterStatus: e.target.value });
                handleFilterChange();
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:block">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row align-items-center">
              {/* Search Input */}
              <div className="col-md-4 mb-3">
                <div className="search-container">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control modern-input"
                      placeholder="Search budgets, users, or categories..."
                      value={filters.searchTerm}
                      onChange={e => onFiltersChange({ searchTerm: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Category Filter */}
              <div className="col-md-2 mb-3">
                <select
                  className="form-control modern-select"
                  value={filters.filterCategory}
                  onChange={e => {
                    onFiltersChange({ filterCategory: e.target.value });
                    handleFilterChange();
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="col-md-2 mb-3">
                <select
                  className="form-control modern-select"
                  value={filters.filterStatus}
                  onChange={e => {
                    onFiltersChange({ filterStatus: e.target.value });
                    handleFilterChange();
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              {/* Page Size Selector */}
              <div className="col-md-3 mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="page-size-selector">
                    <small className="text-muted mr-2">Show:</small>
                    <select
                      className="form-control form-control-sm d-inline-block w-auto"
                      value={filters.pageSize}
                      onChange={handlePageSizeChange}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <small className="text-muted ml-2">per page</small>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="col-md-1 mb-3">
                <div className="d-flex justify-content-end">
                  <button
                    className="btn btn-outline-secondary btn-sm mr-2"
                    onClick={handleResetFilters}
                    title="Clear Filters"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={onRefresh}
                    disabled={loading}
                    title="Refresh Data"
                  >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BudgetFiltersComponent;