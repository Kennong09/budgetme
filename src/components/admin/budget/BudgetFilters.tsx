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

  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 admin-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-danger">Budget Filters</h6>
          <div className="d-flex align-items-center">
            <div className="input-group input-group-sm mr-3" style={{ width: "auto" }}>
              <div className="input-group-prepend">
                <span 
                  className="input-group-text border-right-0" 
                  style={{ 
                    backgroundColor: "#e74a3b", 
                    color: "white", 
                    borderColor: "#e74a3b"
                  }}
                >
                  Show
                </span>
              </div>
              <select 
                className="form-control form-control-sm border-left-0 border-right-0" 
                style={{ width: "70px" }}
                value={filters.pageSize}
                onChange={handlePageSizeChange}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <div className="input-group-append">
                <span 
                  className="input-group-text border-left-0" 
                  style={{ 
                    backgroundColor: "#e74a3b", 
                    color: "white", 
                    borderColor: "#e74a3b" 
                  }}
                >
                  entries
                </span>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-outline-danger" 
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Budget Data"
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="row align-items-center">
          {/* Search */}
          <div className="col-md-5 mb-3">
            <form onSubmit={handleSearch}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-light border-0 small"
                  placeholder="Search budgets or users..."
                  value={filters.searchTerm}
                  onChange={e => onFiltersChange({ searchTerm: e.target.value })}
                />
                <div className="input-group-append">
                  <button className="btn btn-danger" type="submit">
                    <i className="fas fa-search fa-sm"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Category Filter */}
          <div className="col-md-3 mb-3">
            <select
              className="form-control"
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
          <div className="col-md-3 mb-3">
            <select
              className="form-control"
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
          
          {/* Reset Filters */}
          <div className="col-md-1 mb-3 text-right">
            <button
              className="btn btn-light"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              <i className="fas fa-undo"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetFiltersComponent;