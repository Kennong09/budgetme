import React, { FC, memo, useMemo, useCallback, ChangeEvent } from "react";
import { FilterState, ExpenseCategory } from "../../types";

interface FilterControlsProps {
  filter: FilterState;
  categories: ExpenseCategory[];
  onFilterChange: (name: string, value: string) => void;
  onResetFilters: () => void;
  periodTitle: string;
  isFiltering?: boolean;
}

const FilterControls: FC<FilterControlsProps> = memo(({
  filter,
  categories,
  onFilterChange,
  onResetFilters,
  periodTitle,
  isFiltering = false
}) => {
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  }, [onFilterChange]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
      years.push(year);
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ], []);

  return (
    <div className="card shadow mb-3 md:mb-4">
      <div className="card-header py-2 md:py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 text-sm md:text-base font-weight-bold text-primary">
          <span className="hidden sm:inline">Filter Budgets - {periodTitle}</span>
          <span className="sm:hidden">Filters</span>
        </h6>
        <button 
          className="inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 text-xs md:text-sm font-medium rounded shadow-sm transition-colors disabled:opacity-50"
          onClick={onResetFilters}
          disabled={isFiltering}
        >
          <i className="fas fa-undo mr-1 text-xs"></i> Reset
        </button>
      </div>
      <div className="card-body p-3 md:p-4">
        <div className="row">
          <div className="col-md-3 mb-2 md:mb-3">
            <label htmlFor="categoryFilter" className="text-xs md:text-sm font-weight-bold text-gray-800">
              Category
            </label>
            <select
              id="categoryFilter"
              name="categoryId"
              value={filter.categoryId}
              onChange={handleChange}
              className="form-control text-sm md:text-base"
              disabled={isFiltering}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3 mb-2 md:mb-3">
            <label htmlFor="statusFilter" className="text-xs md:text-sm font-weight-bold text-gray-800">
              Status
            </label>
            <select
              id="statusFilter"
              name="status"
              value={filter.status}
              onChange={handleChange}
              className="form-control text-sm md:text-base"
              disabled={isFiltering}
            >
              <option value="all">All Status</option>
              <option value="success">On Track</option>
              <option value="warning">Warning</option>
              <option value="danger">Overspent</option>
            </select>
          </div>

          <div className="col-md-2 mb-2 md:mb-3">
            <label htmlFor="monthFilter" className="text-xs md:text-sm font-weight-bold text-gray-800">
              Month
            </label>
            <select
              id="monthFilter"
              name="month"
              value={filter.month}
              onChange={handleChange}
              className="form-control text-sm md:text-base"
              disabled={isFiltering}
            >
              <option value="all">All Months</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-2 md:mb-3">
            <label htmlFor="yearFilter" className="text-xs md:text-sm font-weight-bold text-gray-800">
              Year
            </label>
            <select
              id="yearFilter"
              name="year"
              value={filter.year}
              onChange={handleChange}
              className="form-control text-sm md:text-base"
              disabled={isFiltering}
            >
              <option value="all">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-2 md:mb-3">
            <label htmlFor="searchFilter" className="text-xs md:text-sm font-weight-bold text-gray-800">
              Search
            </label>
            <input
              type="text"
              id="searchFilter"
              name="search"
              value={filter.search}
              onChange={handleChange}
              className="form-control text-sm md:text-base"
              placeholder="Search budgets..."
              disabled={isFiltering}
            />
          </div>
        </div>

        {isFiltering && (
          <div className="text-center mt-3">
            <div className="spinner-border spinner-border-sm text-primary mr-2" role="status">
              <span className="sr-only">Filtering...</span>
            </div>
            <span className="text-xs md:text-sm text-muted">Applying filters...</span>
          </div>
        )}
      </div>
    </div>
  );
});

FilterControls.displayName = 'FilterControls';

export default FilterControls;
