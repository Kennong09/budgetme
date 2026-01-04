import { FC, memo, useState } from 'react';
import { TransactionFiltersProps } from '../types';
import { generateYearOptions } from '../utils';

const TransactionFilters: FC<TransactionFiltersProps> = memo(({
  filter,
  userData,
  onFilterChange,
  onResetFilters,
  isFiltering
}) => {
  const yearOptions = generateYearOptions(5);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = 
    filter.type !== 'all' || 
    filter.accountId !== 'all' || 
    filter.categoryId !== 'all' || 
    filter.month !== 'all' || 
    filter.year !== 'all' || 
    filter.search !== '' ||
    filter.scope !== 'all';

  const getActiveFilterCount = () => {
    let count = 0;
    if (filter.type !== 'all') count++;
    if (filter.accountId !== 'all') count++;
    if (filter.categoryId !== 'all') count++;
    if (filter.month !== 'all') count++;
    if (filter.year !== 'all') count++;
    if (filter.search !== '') count++;
    if (filter.scope !== 'all') count++;
    return count;
  };

  const getMonthName = (monthValue: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthValue !== 'all' ? months[parseInt(monthValue)] : '';
  };

  return (
    <>
      {/* Mobile Filter Controls - Pill-based quick filters */}
      <div className="block md:hidden px-3 py-2 bg-gray-50 border-b border-gray-100">
        {/* Quick filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Filter toggle button */}
          <button
            onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              hasActiveFilters 
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <i className="fas fa-sliders-h text-[10px]"></i>
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                {getActiveFilterCount()}
              </span>
            )}
          </button>

          {/* Type quick filters */}
          {['all', 'income', 'expense'].map((type) => (
            <button
              key={type}
              onClick={() => onFilterChange({ target: { name: 'type', value: type } } as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                filter.type === type
                  ? type === 'income' ? 'bg-emerald-500 text-white shadow-sm' 
                    : type === 'expense' ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}

          {/* Active filter badges */}
          {filter.month !== 'all' && (
            <span className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
              {getMonthName(filter.month)}
            </span>
          )}
          {filter.year !== 'all' && (
            <span className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
              {filter.year}
            </span>
          )}

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
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
              {/* Type */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Type</label>
                <select 
                  name="type"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={filter.type}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="contribution">Contribution</option>
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Account</label>
                <select 
                  name="accountId"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={filter.accountId}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All Accounts</option>
                  {userData?.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category - Full width */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                <select 
                  name="categoryId"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={filter.categoryId}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All Categories</option>
                  <option value="uncategorized">Uncategorized</option>
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
                  {filter.type === 'income' && userData?.incomeCategories.map((cat) => (
                    <option key={`income-${cat.id}`} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                  {filter.type === 'expense' && userData?.expenseCategories.map((cat) => (
                    <option key={`expense-${cat.id}`} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Month</label>
                <select 
                  name="month"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  value={filter.month}
                  onChange={onFilterChange}
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

              {/* Year */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Year</label>
                <select 
                  name="year"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  value={filter.year}
                  onChange={onFilterChange}
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

              {/* Search - Full width */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Search</label>
                <input 
                  type="text"
                  name="search"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  placeholder="Search notes..."
                  value={filter.search}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                />
              </div>

              {/* Scope */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Scope</label>
                <select 
                  name="scope"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  value={filter.scope}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All</option>
                  <option value="personal">Personal</option>
                  <option value="family">Family</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={onResetFilters}
                className="text-[10px] text-gray-500 font-medium"
                disabled={isFiltering}
              >
                <i className="fas fa-undo mr-1 text-[8px]"></i>
                Reset
              </button>
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
      <div className="desktop-filters-section card-body border-bottom bg-light py-2">
        <div className="row align-items-end">
          <div className="col-lg-2 col-md-3 col-6 mb-2">
            <label htmlFor="type" className="text-xs font-weight-bold text-gray-700 mb-1">
              Type
            </label>
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

          <div className="col-lg-2 col-md-3 col-6 mb-2">
            <label htmlFor="accountId" className="text-xs font-weight-bold text-gray-700 mb-1">
              Account
            </label>
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

          <div className="col-lg-2 col-md-4 col-6 mb-2">
            <label htmlFor="categoryId" className="text-xs font-weight-bold text-gray-700 mb-1">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={filter.categoryId}
              onChange={onFilterChange}
              className={`form-control form-control-sm ${filter.type !== "all" ? "border-info" : ""}`}
              disabled={isFiltering}
            >
              <option value="all">All</option>
              <option value="uncategorized">Uncategorized</option>
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

          <div className="col-lg-1 col-md-2 col-6 mb-2">
            <label htmlFor="month" className="text-xs font-weight-bold text-gray-700 mb-1">
              Month
            </label>
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

          <div className="col-lg-1 col-md-2 col-3 mb-2">
            <label htmlFor="year" className="text-xs font-weight-bold text-gray-700 mb-1">
              Year
            </label>
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

          <div className="col-lg-2 col-md-4 col-6 mb-2">
            <label htmlFor="search" className="text-xs font-weight-bold text-gray-700 mb-1">
              Search
            </label>
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

          <div className="col-lg-2 col-md-3 col-3 mb-2">
            <label htmlFor="scope" className="text-xs font-weight-bold text-gray-700 mb-1">
              Scope
            </label>
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
              className="inline-flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onResetFilters}
              disabled={isFiltering}
            >
              <i className="fas fa-undo text-xs mr-1"></i>
              {isFiltering ? 'Filtering...' : 'Reset Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for desktop-only section */}
      <style>{`
        .desktop-filters-section { display: none; }
        @media (min-width: 768px) {
          .desktop-filters-section { display: block; }
        }
      `}</style>
    </>
  );
});

TransactionFilters.displayName = 'TransactionFilters';

export default TransactionFilters;
