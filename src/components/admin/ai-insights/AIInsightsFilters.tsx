import React, { FC } from "react";
import { Form, InputGroup, Button, Row, Col, Badge, Collapse } from "react-bootstrap";
import { AIInsightFilters, AI_SERVICES, RISK_LEVELS, UserProfile } from "./types";

interface AIInsightsFiltersProps {
  filters: AIInsightFilters;
  users: UserProfile[];
  onFiltersChange: (filters: Partial<AIInsightFilters>) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  loading?: boolean;
}

const AIInsightsFilters: FC<AIInsightsFiltersProps> = ({ 
  filters, 
  users,
  onFiltersChange, 
  onResetFilters, 
  hasActiveFilters,
  activeFilterCount,
  loading = false 
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ aiService: e.target.value as AIInsightFilters['aiService'] });
  };

  const handleRiskLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ riskLevel: e.target.value as AIInsightFilters['riskLevel'] });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ pageSize: Number(e.target.value), currentPage: 1 });
  };

  const clearFilters = () => {
    onResetFilters();
  };

  if (loading) {
    return (
      <div className="controls-section mb-4">
        {/* Mobile Loading State */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse mb-2"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="h-9 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Desktop Loading State */}
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
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          {/* Mobile Search */}
          <div className="relative mb-3">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              placeholder="Search insights..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* Mobile Filter Row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              value={filters.aiService}
              onChange={handleServiceChange}
            >
              <option value="all">All Status</option>
              <option value="openrouter">Active</option>
              <option value="chatbot">Pending</option>
              <option value="prophet">Error</option>
            </select>
            <select
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              value={filters.riskLevel}
              onChange={handleRiskLevelChange}
            >
              <option value="all">All Types</option>
              <option value="high">Income</option>
              <option value="medium">Expense</option>
              <option value="low">Savings</option>
            </select>
          </div>
          
          {/* Mobile Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Show:</span>
              <select
                className="h-7 px-2 text-xs border border-gray-200 rounded bg-white"
                value={filters.pageSize}
                onChange={handlePageSizeChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button 
                className="h-7 px-3 text-xs text-red-500 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                onClick={clearFilters}
              >
                <i className="fas fa-times mr-1"></i>
                Clear
              </button>
            )}
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
                      value={filters.search}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>

              {/* AI Service Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.aiService}
                  onChange={handleServiceChange}
                >
                  <option value="all">All Status</option>
                  <option value="openrouter">Active</option>
                  <option value="chatbot">Pending</option>
                  <option value="prophet">Error</option>
                </select>
              </div>

              {/* Risk Level Filter */}
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.riskLevel}
                  onChange={handleRiskLevelChange}
                >
                  <option value="all">All Types</option>
                  <option value="high">Income</option>
                  <option value="medium">Expense</option>
                  <option value="low">Savings</option>
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
                      onClick={() => window.location.reload()}
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

export default AIInsightsFilters;