import React, { FC } from "react";
import { DateFilterType, TypeFilterType, Category } from "../types";

interface FilterControlsProps {
  dateFilter: DateFilterType;
  typeFilter: TypeFilterType;
  categoryFilter: string;
  customStartDate: string;
  customEndDate: string;
  filteredTransactionsCount: number;
  totalTransactionsCount: number;
  expenseCategories: Category[];
  incomeCategories: Category[];
  onDateFilterChange: (value: DateFilterType) => void;
  onTypeFilterChange: (value: TypeFilterType) => void;
  onCategoryFilterChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onClearFilters: () => void;
}

const FilterControls: FC<FilterControlsProps> = ({
  dateFilter,
  typeFilter,
  categoryFilter,
  customStartDate,
  customEndDate,
  filteredTransactionsCount,
  totalTransactionsCount,
  expenseCategories,
  incomeCategories,
  onDateFilterChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onClearFilters,
}) => {
  const getFilterDisplayName = (filterType: DateFilterType): string => {
    switch (filterType) {
      case 'custom':
        return 'Custom Range';
      case 'current-month':
        return 'Current Month';
      case 'last-3-months':
        return 'Last 3 Months';
      case 'last-6-months':
        return 'Last 6 Months';
      case 'last-year':
        return 'Last Year';
      default:
        return filterType;
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const expenseCategory = expenseCategories.find(c => c.id === categoryId);
    if (expenseCategory) return expenseCategory.category_name;
    
    const incomeCategory = incomeCategories.find(c => c.id === categoryId);
    if (incomeCategory) return incomeCategory.category_name;
    
    return 'Unknown Category';
  };

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card shadow-sm">
          <div className="card-header py-3 d-flex align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              <i className="fas fa-filter mr-2"></i>
              Filter Data
            </h6>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={onClearFilters}
            >
              <i className="fas fa-times mr-1"></i>
              Clear Filters
            </button>
          </div>
          <div className="card-body">
            <div className="row">
              {/* Date Filter */}
              <div className="col-lg-3 col-md-6 mb-3">
                <label className="form-label text-sm font-weight-bold text-gray-600">Date Range</label>
                <select 
                  className="form-control form-control-sm"
                  value={dateFilter}
                  onChange={(e) => onDateFilterChange(e.target.value as DateFilterType)}
                >
                  <option value="all">All Time</option>
                  <option value="current-month">Current Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="last-6-months">Last 6 Months</option>
                  <option value="last-year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <>
                  <div className="col-lg-2 col-md-3 mb-3">
                    <label className="form-label text-sm font-weight-bold text-gray-600">Start Date</label>
                    <input 
                      type="date"
                      className="form-control form-control-sm"
                      value={customStartDate}
                      onChange={(e) => onCustomStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="col-lg-2 col-md-3 mb-3">
                    <label className="form-label text-sm font-weight-bold text-gray-600">End Date</label>
                    <input 
                      type="date"
                      className="form-control form-control-sm"
                      value={customEndDate}
                      onChange={(e) => onCustomEndDateChange(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Transaction Type Filter */}
              <div className="col-lg-2 col-md-6 mb-3">
                <label className="form-label text-sm font-weight-bold text-gray-600">Transaction Type</label>
                <select 
                  className="form-control form-control-sm"
                  value={typeFilter}
                  onChange={(e) => onTypeFilterChange(e.target.value as TypeFilterType)}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="col-lg-3 col-md-6 mb-3">
                <label className="form-label text-sm font-weight-bold text-gray-600">Category</label>
                <select 
                  className="form-control form-control-sm"
                  value={categoryFilter}
                  onChange={(e) => onCategoryFilterChange(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {expenseCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                  {incomeCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex align-items-center text-sm text-gray-600">
                  <i className="fas fa-info-circle mr-2"></i>
                  <span>
                    Showing {filteredTransactionsCount} of {totalTransactionsCount} transactions
                    {dateFilter !== 'all' && (
                      <span className="badge badge-primary ml-2">
                        {getFilterDisplayName(dateFilter)}
                      </span>
                    )}
                    {typeFilter !== 'all' && (
                      <span className="badge badge-info ml-1">
                        {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                      </span>
                    )}
                    {categoryFilter !== 'all' && (
                      <span className="badge badge-success ml-1">
                        {getCategoryName(categoryFilter)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
