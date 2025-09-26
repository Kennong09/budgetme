import React from 'react';
import { TransactionFiltersProps } from '../types';
import { generateYearOptions } from '../utils';

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filter,
  userData,
  onFilterChange,
  onResetFilters,
  isFiltering
}) => {
  const yearOptions = generateYearOptions(5);

  return (
    <div className="card-body border-bottom bg-light py-2">
      <div className="row align-items-end">
        <div className="col-lg-2 col-md-3 mb-2">
          <label htmlFor="type" className="text-xs font-weight-bold text-gray-700 mb-1">Type</label>
          <select
            id="type"
            name="type"
            value={filter.type}
            onChange={onFilterChange}
            className={`form-control form-control-sm ${filter.categoryId !== "all" ? "border-info" : ""}`}
            disabled={isFiltering}
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="contribution">Contribution</option>
          </select>
          {filter.categoryId !== "all" && (
            <small className="form-text text-info" style={{ fontSize: "0.7rem", lineHeight: "1.2" }}>
              <i className="fas fa-info-circle mr-1"></i>
              Auto-selected
            </small>
          )}
        </div>

        <div className="col-lg-2 col-md-3 mb-2">
          <label htmlFor="accountId" className="text-xs font-weight-bold text-gray-700 mb-1">Account</label>
          <select
            id="accountId"
            name="accountId"
            value={filter.accountId}
            onChange={onFilterChange}
            className="form-control form-control-sm"
            disabled={isFiltering}
          >
            <option value="all">All</option>
            {userData?.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-lg-2 col-md-4 mb-2">
          <label htmlFor="categoryId" className="text-xs font-weight-bold text-gray-700 mb-1">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            value={filter.categoryId}
            onChange={onFilterChange}
            className={`form-control form-control-sm ${filter.type !== "all" ? "border-info" : ""}`}
            disabled={isFiltering}
          >
            <option value="all">All</option>
            <option value="uncategorized">
              Uncategorized
            </option>
            {filter.type === 'all' && (
              <>
                <optgroup label="Income">
                  {userData?.incomeCategories.map((cat) => (
                    <option key={`income-${cat.id}`} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Expense">
                  {userData?.expenseCategories.map((cat) => (
                    <option key={`expense-${cat.id}`} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
            {filter.type === 'income' && (
              <optgroup label="Income">
                {userData?.incomeCategories.map((cat) => (
                  <option key={`income-${cat.id}`} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </optgroup>
            )}
            {filter.type === 'expense' && (
              <optgroup label="Expense">
                {userData?.expenseCategories.map((cat) => (
                  <option key={`expense-${cat.id}`} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </optgroup>
            )}
            {filter.type === 'contribution' && (
              <optgroup label="Contribution">
                {userData?.expenseCategories.filter(cat => cat.category_name.toLowerCase().includes('contribution')).map((cat) => (
                  <option key={`contribution-${cat.id}`} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {filter.type !== "all" && (
            <small className="form-text text-info" style={{ fontSize: "0.7rem", lineHeight: "1.2" }}>
              <i className="fas fa-filter mr-1"></i>
              {filter.type} only
            </small>
          )}
        </div>

        <div className="col-lg-1 col-md-2 mb-2">
          <label htmlFor="month" className="text-xs font-weight-bold text-gray-700 mb-1">Month</label>
          <select
            id="month"
            name="month"
            value={filter.month}
            onChange={onFilterChange}
            className="form-control form-control-sm"
            disabled={isFiltering}
          >
            <option value="all">All</option>
            <option value="0">Jan</option>
            <option value="1">Feb</option>
            <option value="2">Mar</option>
            <option value="3">Apr</option>
            <option value="4">May</option>
            <option value="5">Jun</option>
            <option value="6">Jul</option>
            <option value="7">Aug</option>
            <option value="8">Sep</option>
            <option value="9">Oct</option>
            <option value="10">Nov</option>
            <option value="11">Dec</option>
          </select>
        </div>

        <div className="col-lg-1 col-md-2 mb-2">
          <label htmlFor="year" className="text-xs font-weight-bold text-gray-700 mb-1">Year</label>
          <select
            id="year"
            name="year"
            value={filter.year}
            onChange={onFilterChange}
            className="form-control form-control-sm"
            disabled={isFiltering}
          >
            <option value="all">All</option>
            {yearOptions.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="col-lg-2 col-md-4 mb-2">
          <label htmlFor="search" className="text-xs font-weight-bold text-gray-700 mb-1">Search</label>
          <input
            type="text"
            id="search"
            name="search"
            value={filter.search}
            onChange={onFilterChange}
            placeholder="Search notes..."
            className="form-control form-control-sm"
            disabled={isFiltering}
          />
        </div>

        <div className="col-lg-2 col-md-3 mb-2">
          <label htmlFor="scope" className="text-xs font-weight-bold text-gray-700 mb-1">Scope</label>
          <select
            id="scope"
            name="scope"
            value={filter.scope}
            onChange={onFilterChange}
            className="form-control form-control-sm"
            disabled={isFiltering}
          >
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="family">Family</option>
          </select>
        </div>
      </div>
      
      {/* Reset Filters Button */}
      <div className="row mt-2">
        <div className="col-12 text-right">
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={onResetFilters}
            disabled={isFiltering}
          >
            <i className="fas fa-undo fa-sm mr-1"></i> 
            {isFiltering ? 'Filtering...' : 'Reset Filters'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionFilters;