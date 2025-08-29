import React, { FC, ChangeEvent } from "react";
import { FilterState, ExpenseCategory } from "../../types";

interface FilterControlsProps {
  filter: FilterState;
  categories: ExpenseCategory[];
  onFilterChange: (name: string, value: string) => void;
  onResetFilters: () => void;
  periodTitle: string;
  isFiltering?: boolean;
}

const FilterControls: FC<FilterControlsProps> = ({
  filter,
  categories,
  onFilterChange,
  onResetFilters,
  periodTitle,
  isFiltering = false
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
      years.push(year);
    }
    return years;
  };

  const getMonthOptions = () => {
    return [
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
    ];
  };

  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary">
          Filter Budgets - {periodTitle}
        </h6>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={onResetFilters}
          disabled={isFiltering}
        >
          <i className="fas fa-undo mr-1"></i> Reset
        </button>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-3 mb-3">
            <label htmlFor="categoryFilter" className="font-weight-bold text-gray-800">
              Category
            </label>
            <select
              id="categoryFilter"
              name="categoryId"
              value={filter.categoryId}
              onChange={handleChange}
              className="form-control"
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

          <div className="col-md-3 mb-3">
            <label htmlFor="statusFilter" className="font-weight-bold text-gray-800">
              Status
            </label>
            <select
              id="statusFilter"
              name="status"
              value={filter.status}
              onChange={handleChange}
              className="form-control"
              disabled={isFiltering}
            >
              <option value="all">All Status</option>
              <option value="success">On Track</option>
              <option value="warning">Warning</option>
              <option value="danger">Overspent</option>
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label htmlFor="monthFilter" className="font-weight-bold text-gray-800">
              Month
            </label>
            <select
              id="monthFilter"
              name="month"
              value={filter.month}
              onChange={handleChange}
              className="form-control"
              disabled={isFiltering}
            >
              <option value="all">All Months</option>
              {getMonthOptions().map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label htmlFor="yearFilter" className="font-weight-bold text-gray-800">
              Year
            </label>
            <select
              id="yearFilter"
              name="year"
              value={filter.year}
              onChange={handleChange}
              className="form-control"
              disabled={isFiltering}
            >
              <option value="all">All Years</option>
              {getYearOptions().map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label htmlFor="searchFilter" className="font-weight-bold text-gray-800">
              Search
            </label>
            <input
              type="text"
              id="searchFilter"
              name="search"
              value={filter.search}
              onChange={handleChange}
              className="form-control"
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
            <span className="text-muted">Applying filters...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterControls;
