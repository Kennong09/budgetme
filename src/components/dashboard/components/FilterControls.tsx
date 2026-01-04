import React, { FC, memo, useState } from "react";
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

const FilterControls: FC<FilterControlsProps> = memo(({
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
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
  
  const getFilterDisplayName = (filterType: DateFilterType): string => {
    switch (filterType) {
      case 'custom':
        return 'Custom';
      case 'current-month':
        return 'This Month';
      case 'last-3-months':
        return '3 Months';
      case 'last-6-months':
        return '6 Months';
      case 'last-year':
        return 'Year';
      default:
        return 'All';
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const expenseCategory = expenseCategories.find(c => c.id === categoryId);
    if (expenseCategory) return expenseCategory.category_name;
    
    const incomeCategory = incomeCategories.find(c => c.id === categoryId);
    if (incomeCategory) return incomeCategory.category_name;
    
    return 'Unknown Category';
  };

  const hasActiveFilters = dateFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <>
      {/* Mobile Filter Controls - Pill-based quick filters */}
      <div className="block md:hidden mb-3">
        {/* Quick filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Filter toggle button */}
          <button
            onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              hasActiveFilters 
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-sliders-h text-[10px]"></i>
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                {(dateFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Date quick filters */}
          {['current-month', 'last-3-months', 'all'].map((filter) => (
            <button
              key={filter}
              onClick={() => onDateFilterChange(filter as DateFilterType)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                dateFilter === filter
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getFilterDisplayName(filter as DateFilterType)}
            </button>
          ))}

          {/* Type quick filters */}
          {typeFilter !== 'all' && (
            <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium ${
              typeFilter === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
            </span>
          )}

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {mobileFiltersExpanded && (
          <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 animate__animated animate__fadeIn">
            <div className="grid grid-cols-2 gap-3">
              {/* Date Range */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Date</label>
                <select 
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={dateFilter}
                  onChange={(e) => onDateFilterChange(e.target.value as DateFilterType)}
                >
                  <option value="all">All Time</option>
                  <option value="current-month">This Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="last-6-months">Last 6 Months</option>
                  <option value="last-year">Last Year</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Type</label>
                <select 
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={typeFilter}
                  onChange={(e) => onTypeFilterChange(e.target.value as TypeFilterType)}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              {/* Category - Full width */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                <select 
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={categoryFilter}
                  onChange={(e) => onCategoryFilterChange(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <optgroup label="Expenses">
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Income">
                    {incomeCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Custom date range */}
              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">From</label>
                    <input 
                      type="date"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                      value={customStartDate}
                      onChange={(e) => onCustomStartDateChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">To</label>
                    <input 
                      type="date"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                      value={customEndDate}
                      onChange={(e) => onCustomEndDateChange(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Results count */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                <span className="font-semibold text-gray-700">{filteredTransactionsCount}</span> of {totalTransactionsCount} transactions
              </span>
              <button
                onClick={() => setMobileFiltersExpanded(false)}
                className="text-[10px] text-indigo-600 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Filter Controls - Original card style */}
      <div className="row mb-4 hidden md:flex">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header py-3 flex items-center justify-between">
              <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                <i className="fas fa-filter mr-2 text-xs"></i>
                Filter Data
              </h6>
              <button 
                className="btn btn-sm btn-outline-secondary flex items-center px-2 py-1 text-xs"
                onClick={onClearFilters}
              >
                <i className="fas fa-times text-xs"></i>
                <span className="ml-1">Clear Filters</span>
              </button>
            </div>
            <div className="card-body p-3">
              <div className="row">
                {/* Date Filter */}
                <div className="col-lg-3 col-md-6 mb-3">
                  <label className="form-label text-xs font-bold text-gray-600">Date Range</label>
                  <select 
                    className="form-control form-control-sm text-sm py-1.5"
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
                      <label className="form-label text-xs font-bold text-gray-600">Start</label>
                      <input 
                        type="date"
                        className="form-control form-control-sm text-sm py-1.5"
                        value={customStartDate}
                        onChange={(e) => onCustomStartDateChange(e.target.value)}
                      />
                    </div>
                    <div className="col-lg-2 col-md-3 mb-3">
                      <label className="form-label text-xs font-bold text-gray-600">End</label>
                      <input 
                        type="date"
                        className="form-control form-control-sm text-sm py-1.5"
                        value={customEndDate}
                        onChange={(e) => onCustomEndDateChange(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Transaction Type Filter */}
                <div className="col-lg-2 col-md-6 mb-3">
                  <label className="form-label text-xs font-bold text-gray-600">Type</label>
                  <select 
                    className="form-control form-control-sm text-sm py-1.5"
                    value={typeFilter}
                    onChange={(e) => onTypeFilterChange(e.target.value as TypeFilterType)}
                  >
                    <option value="all">All</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="col-lg-3 col-md-6 mb-3">
                  <label className="form-label text-xs font-bold text-gray-600">Category</label>
                  <select 
                    className="form-control form-control-sm text-sm py-1.5"
                    value={categoryFilter}
                    onChange={(e) => onCategoryFilterChange(e.target.value)}
                  >
                    <option value="all">All</option>
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
                  <div className="flex items-center text-xs text-gray-600 flex-wrap gap-1">
                    <i className="fas fa-info-circle mr-1 text-xs"></i>
                    <span>
                      Showing {filteredTransactionsCount} of {totalTransactionsCount} transactions
                      {dateFilter !== 'all' && (
                        <span className="badge badge-primary ml-1 text-xs px-1.5 py-0.5">
                          {getFilterDisplayName(dateFilter)}
                        </span>
                      )}
                      {typeFilter !== 'all' && (
                        <span className="badge badge-info ml-1 text-xs px-1.5 py-0.5">
                          {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                        </span>
                      )}
                      {categoryFilter !== 'all' && (
                        <span className="badge badge-success ml-1 text-xs px-1.5 py-0.5">
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
    </>
  );
});

FilterControls.displayName = 'FilterControls';

export default FilterControls;
