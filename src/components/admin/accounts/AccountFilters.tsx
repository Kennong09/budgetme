import React, { FC, useState, useEffect } from "react";
import { AccountFilters, AccountUser, ACCOUNT_TYPE_CONFIGS, ACCOUNT_STATUS_CONFIGS } from "./types";

interface AccountFiltersProps {
  filters: AccountFilters;
  users: AccountUser[];
  onFiltersChange: (filters: Partial<AccountFilters>) => void;
  onReset: () => void;
  loading?: boolean;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
}

const AccountFiltersComponent: FC<AccountFiltersProps> = ({
  filters,
  users,
  onFiltersChange,
  onReset,
  loading = false,
  hasActiveFilters = false,
  activeFilterCount = 0
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [localBalanceMin, setLocalBalanceMin] = useState<string>(filters.balanceMin?.toString() || "");
  const [localBalanceMax, setLocalBalanceMax] = useState<string>(filters.balanceMax?.toString() || "");

  // Update local balance values when filters change
  useEffect(() => {
    setLocalBalanceMin(filters.balanceMin?.toString() || "");
    setLocalBalanceMax(filters.balanceMax?.toString() || "");
  }, [filters.balanceMin, filters.balanceMax]);

  // Handle balance filter updates with debouncing
  const handleBalanceChange = (min: string, max: string) => {
    const minValue = min === "" ? undefined : parseFloat(min);
    const maxValue = max === "" ? undefined : parseFloat(max);
    
    if ((minValue === undefined || !isNaN(minValue)) && (maxValue === undefined || !isNaN(maxValue))) {
      onFiltersChange({
        balanceMin: minValue,
        balanceMax: maxValue
      });
    }
  };

  return (
    <>
      {/* Mobile Filters */}
      <div className="d-block d-md-none mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Filter Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-filter text-red-500 text-[10px]"></i>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {activeFilterCount}
                </span>
              )}
            </h6>
            <button 
              className="text-[10px] text-gray-500 flex items-center gap-1"
              onClick={onReset}
              disabled={loading}
            >
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          {/* Mobile Search & Filters */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search accounts..."
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterType}
                onChange={(e) => onFiltersChange({ filterType: e.target.value })}
                disabled={loading}
              >
                <option value="all">All Types</option>
                {ACCOUNT_TYPE_CONFIGS.map(config => (
                  <option key={config.value} value={config.value}>{config.label}</option>
                ))}
              </select>
              <select
                className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterStatus}
                onChange={(e) => onFiltersChange({ filterStatus: e.target.value })}
                disabled={loading}
              >
                <option value="all">All Status</option>
                {ACCOUNT_STATUS_CONFIGS.map(config => (
                  <option key={config.value} value={config.value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <select
                className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterUser}
                onChange={(e) => onFiltersChange({ filterUser: e.target.value })}
                disabled={loading}
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
              <select
                className="px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.filterDefault}
                onChange={(e) => onFiltersChange({ filterDefault: e.target.value })}
                disabled={loading}
              >
                <option value="all">All Accounts</option>
                <option value="default">Default Only</option>
                <option value="non-default">Non-Default</option>
              </select>
            </div>
          </div>

          {/* Mobile Active Filters Tags */}
          {hasActiveFilters && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5">
              {filters.searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[9px]">
                  "{filters.searchTerm}"
                  <button onClick={() => onFiltersChange({ searchTerm: "" })} className="hover:text-red-900">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </span>
              )}
              {filters.filterType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[9px]">
                  {ACCOUNT_TYPE_CONFIGS.find(c => c.value === filters.filterType)?.label}
                  <button onClick={() => onFiltersChange({ filterType: "all" })} className="hover:text-blue-900">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </span>
              )}
              {filters.filterStatus !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px]">
                  {ACCOUNT_STATUS_CONFIGS.find(c => c.value === filters.filterStatus)?.label}
                  <button onClick={() => onFiltersChange({ filterStatus: "all" })} className="hover:text-amber-900">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </span>
              )}
              {filters.filterUser !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px]">
                  {users.find(u => u.id === filters.filterUser)?.full_name?.substring(0, 10) || 'User'}
                  <button onClick={() => onFiltersChange({ filterUser: "all" })} className="hover:text-emerald-900">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="card shadow mb-4 d-none d-md-block">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-danger">
            <i className="fas fa-filter mr-2"></i>
            Account Filters
            {activeFilterCount > 0 && (
              <span className="badge badge-danger ml-2">{activeFilterCount}</span>
            )}
          </h6>
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mr-2"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'} mr-1`}></i>
              Advanced
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={onReset}
                disabled={loading}
              >
                <i className="fas fa-times mr-1"></i>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
        {/* Basic Filters Row */}
        <div className="row">
          {/* Search */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-search mr-1"></i>
              Search Accounts
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Account name, institution..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
              disabled={loading}
            />
          </div>

          {/* User Filter */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-user mr-1"></i>
              User
            </label>
            <select
              className="form-control"
              value={filters.filterUser}
              onChange={(e) => onFiltersChange({ filterUser: e.target.value })}
              disabled={loading}
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email} 
                  {user.account_count !== undefined && ` (${user.account_count} accounts)`}
                </option>
              ))}
            </select>
          </div>

          {/* Account Type Filter */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-tags mr-1"></i>
              Account Type
            </label>
            <select
              className="form-control"
              value={filters.filterType}
              onChange={(e) => onFiltersChange({ filterType: e.target.value })}
              disabled={loading}
            >
              <option value="all">All Types</option>
              {ACCOUNT_TYPE_CONFIGS.map(config => (
                <option key={config.value} value={config.value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row - Status and Default */}
        <div className="row">
          {/* Status Filter */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-toggle-on mr-1"></i>
              Status
            </label>
            <select
              className="form-control"
              value={filters.filterStatus}
              onChange={(e) => onFiltersChange({ filterStatus: e.target.value })}
              disabled={loading}
            >
              <option value="all">All Status</option>
              {ACCOUNT_STATUS_CONFIGS.map(config => (
                <option key={config.value} value={config.value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Default Account Filter */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-star mr-1"></i>
              Default Account
            </label>
            <select
              className="form-control"
              value={filters.filterDefault}
              onChange={(e) => onFiltersChange({ filterDefault: e.target.value })}
              disabled={loading}
            >
              <option value="all">All Accounts</option>
              <option value="default">Default Only</option>
              <option value="non-default">Non-Default Only</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="col-md-4 mb-3">
            <label className="form-label text-gray-700 font-weight-bold">
              <i className="fas fa-list mr-1"></i>
              Items per Page
            </label>
            <select
              className="form-control"
              value={filters.pageSize}
              onChange={(e) => onFiltersChange({ pageSize: parseInt(e.target.value) })}
              disabled={loading}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="border-top pt-3 mt-3">
            <h6 className="text-gray-700 font-weight-bold mb-3">
              <i className="fas fa-cogs mr-2"></i>
              Advanced Filters
            </h6>
            
            <div className="row">
              {/* Date Range */}
              <div className="col-md-6 mb-3">
                <label className="form-label text-gray-700 font-weight-bold">
                  <i className="fas fa-calendar mr-1"></i>
                  Creation Date Range
                </label>
                <div className="row">
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="From date"
                      value={filters.dateFrom}
                      onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="To date"
                      value={filters.dateTo}
                      onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <small className="text-muted mt-1 d-block">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger"
                      onClick={() => onFiltersChange({ dateFrom: "", dateTo: "" })}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear dates
                    </button>
                  </small>
                )}
              </div>

              {/* Balance Range */}
              <div className="col-md-6 mb-3">
                <label className="form-label text-gray-700 font-weight-bold">
                  <i className="fas fa-peso-sign mr-1"></i>
                  Balance Range (PHP)
                </label>
                <div className="row">
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min balance"
                      value={localBalanceMin}
                      onChange={(e) => {
                        setLocalBalanceMin(e.target.value);
                        handleBalanceChange(e.target.value, localBalanceMax);
                      }}
                      disabled={loading}
                      step="0.01"
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max balance"
                      value={localBalanceMax}
                      onChange={(e) => {
                        setLocalBalanceMax(e.target.value);
                        handleBalanceChange(localBalanceMin, e.target.value);
                      }}
                      disabled={loading}
                      step="0.01"
                    />
                  </div>
                </div>
                {(filters.balanceMin !== undefined || filters.balanceMax !== undefined) && (
                  <small className="text-muted mt-1 d-block">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger"
                      onClick={() => {
                        setLocalBalanceMin("");
                        setLocalBalanceMax("");
                        onFiltersChange({ balanceMin: undefined, balanceMax: undefined });
                      }}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear balance range
                    </button>
                  </small>
                )}
              </div>
            </div>

            {/* Sort Options */}
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label text-gray-700 font-weight-bold">
                  <i className="fas fa-sort mr-1"></i>
                  Sort By
                </label>
                <select
                  className="form-control"
                  value={filters.sortField}
                  onChange={(e) => onFiltersChange({ sortField: e.target.value })}
                  disabled={loading}
                >
                  <option value="created_at">Creation Date</option>
                  <option value="updated_at">Last Modified</option>
                  <option value="account_name">Account Name</option>
                  <option value="balance">Balance</option>
                  <option value="account_type">Account Type</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label text-gray-700 font-weight-bold">
                  <i className="fas fa-sort-amount-down mr-1"></i>
                  Sort Direction
                </label>
                <select
                  className="form-control"
                  value={filters.sortDirection}
                  onChange={(e) => onFiltersChange({ sortDirection: e.target.value as "asc" | "desc" })}
                  disabled={loading}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="border-top pt-3 mt-3">
            <h6 className="text-gray-700 font-weight-bold mb-2">
              <i className="fas fa-filter mr-2"></i>
              Active Filters ({activeFilterCount})
            </h6>
            <div className="d-flex flex-wrap">
              {filters.searchTerm && (
                <span className="badge badge-primary mr-2 mb-2">
                  Search: "{filters.searchTerm}"
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ml-1 text-white"
                    onClick={() => onFiltersChange({ searchTerm: "" })}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {filters.filterUser !== "all" && (
                <span className="badge badge-info mr-2 mb-2">
                  User: {users.find(u => u.id === filters.filterUser)?.full_name || filters.filterUser}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ml-1 text-white"
                    onClick={() => onFiltersChange({ filterUser: "all" })}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {filters.filterType !== "all" && (
                <span className="badge badge-success mr-2 mb-2">
                  Type: {ACCOUNT_TYPE_CONFIGS.find(c => c.value === filters.filterType)?.label || filters.filterType}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ml-1 text-white"
                    onClick={() => onFiltersChange({ filterType: "all" })}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {filters.filterStatus !== "all" && (
                <span className="badge badge-warning mr-2 mb-2">
                  Status: {ACCOUNT_STATUS_CONFIGS.find(c => c.value === filters.filterStatus)?.label || filters.filterStatus}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ml-1 text-white"
                    onClick={() => onFiltersChange({ filterStatus: "all" })}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
              {filters.filterDefault !== "all" && (
                <span className="badge badge-secondary mr-2 mb-2">
                  Default: {filters.filterDefault === "default" ? "Default Only" : "Non-Default Only"}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ml-1 text-white"
                    onClick={() => onFiltersChange({ filterDefault: "all" })}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default AccountFiltersComponent;
