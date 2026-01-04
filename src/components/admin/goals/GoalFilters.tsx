import React, { FC, useState } from "react";
import { GoalFiltersProps } from "./types";

const GoalFilters: FC<GoalFiltersProps> = ({
  filters,
  users,
  categories,
  onFiltersChange,
  onClearFilters,
  loading = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ [key]: value });
  };

  const hasActiveFilters = () => {
    return filters.search !== "" ||
           filters.priority !== "" ||
           filters.status !== "" ||
           filters.user !== "" ||
           filters.category !== "" ||
           filters.startDate !== "" ||
           filters.endDate !== "" ||
           filters.minAmount !== "" ||
           filters.maxAmount !== "" ||
           filters.minProgress !== "" ||
           filters.maxProgress !== "" ||
           filters.isOverdue;
  };

  if (loading) {
    return (
      <div className="controls-section mb-4">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-3">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-lg mb-2"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
                <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
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
      </div>
    );
  }

  return (
    <div className="controls-section mb-4">
      {/* Mobile Filters */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Search & Filters */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search goals..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.priority}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              {hasActiveFilters() && (
                <button 
                  className="px-2 py-1.5 text-[10px] bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  onClick={onClearFilters}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile Advanced Filters Toggle */}
          <div className="px-3 py-2 flex items-center justify-between">
            <button
              className="text-[10px] text-red-600 flex items-center gap-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className={`fas ${showAdvanced ? 'fa-chevron-up' : 'fa-filter'} text-[8px]`}></i>
              {showAdvanced ? 'Hide Filters' : 'More Filters'}
            </button>
            <span className="text-[9px] text-gray-400">
              Show: {filters.pageSize} per page
            </span>
          </div>
          
          {/* Mobile Advanced Filters */}
          {showAdvanced && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  value={filters.user}
                  onChange={(e) => handleFilterChange("user", e.target.value)}
                >
                  <option value="">All Users</option>
                  {users.slice(0, 20).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.user_metadata?.full_name || user.email.split('@')[0]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  placeholder="Category"
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="date"
                  className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
                <input
                  type="date"
                  className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] text-gray-600">
                  <input
                    type="checkbox"
                    className="w-3 h-3 rounded border-gray-300 text-red-500 focus:ring-red-200"
                    checked={filters.isOverdue}
                    onChange={(e) => handleFilterChange("isOverdue", e.target.checked)}
                  />
                  <span>Overdue Only</span>
                </label>
              </div>
            </div>
          )}
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
                      placeholder="Search goals by name or category..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Priority Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange("priority", e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Actions Column */}
              <div className="col-md-12 col-lg-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="page-size-selector">
                    <small className="text-muted mr-2">Show:</small>
                    <select
                      className="form-control form-control-sm d-inline-block w-auto"
                      value={filters.pageSize}
                      onChange={(e) => handleFilterChange("pageSize", Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <small className="text-muted ml-2">per page</small>
                  </div>
                  
                  {hasActiveFilters() && (
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={onClearFilters}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          
          {/* Advanced Filters Row */}
          {showAdvanced && (
            <div className="row mt-3">
              {/* User Filter */}
              <div className="col-md-3 mb-3">
                <select
                  className="form-control modern-select"
                  value={filters.user}
                  onChange={(e) => handleFilterChange("user", e.target.value)}
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.user_metadata?.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="col-md-3 mb-3">
                <input
                  type="text"
                  className="form-control modern-input"
                  placeholder="Category"
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                />
              </div>

              {/* Date Range Filters */}
              <div className="col-md-3 mb-3">
                <input
                  type="date"
                  className="form-control modern-input"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-3">
                <input
                  type="date"
                  className="form-control modern-input"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>

              {/* Amount Range Filters */}
              <div className="col-md-3 mb-3">
                <input
                  type="number"
                  className="form-control modern-input"
                  placeholder="Min Amount"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-3">
                <input
                  type="number"
                  className="form-control modern-input"
                  placeholder="Max Amount"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                />
              </div>

              {/* Progress Range Filters */}
              <div className="col-md-3 mb-3">
                <input
                  type="number"
                  className="form-control modern-input"
                  placeholder="Min Progress %"
                  min="0"
                  max="100"
                  value={filters.minProgress}
                  onChange={(e) => handleFilterChange("minProgress", e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-3">
                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="overdueOnly"
                    checked={filters.isOverdue}
                    onChange={(e) => handleFilterChange("isOverdue", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="overdueOnly">
                    <i className="fas fa-exclamation-triangle text-warning mr-1"></i>
                    Overdue Goals Only
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Advanced Filter Toggle */}
          <div className="row mt-2">
            <div className="col-12">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <i className={`fas ${showAdvanced ? 'fa-chevron-up' : 'fa-filter'} mr-1`}></i>
                {showAdvanced ? 'Hide Advanced Filters' : 'Advanced Filters'}
              </button>
              
              {/* Sort Options */}
              <div className="float-right">
                <div className="d-flex align-items-center">
                  <small className="text-muted mr-2">Sort by:</small>
                  <select
                    className="form-control form-control-sm mr-2"
                    style={{ width: "auto" }}
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  >
                    <option value="goal_name">Name</option>
                    <option value="target_date">Target Date</option>
                    <option value="created_at">Created Date</option>
                    <option value="target_amount">Target Amount</option>
                    <option value="current_amount">Current Amount</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")}
                    title={`Sort ${filters.sortOrder === "asc" ? "Descending" : "Ascending"}`}
                  >
                    <i className={`fas fa-sort-${filters.sortOrder === "asc" ? "up" : "down"}`}></i>
                  </button>
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

export default GoalFilters;
