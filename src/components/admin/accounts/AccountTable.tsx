import React, { FC, useState } from "react";
import { AdminAccount, AccountFilters, ACCOUNT_TYPE_CONFIGS, ACCOUNT_STATUS_CONFIGS } from "./types";

interface AccountTableProps {
  accounts: AdminAccount[];
  filters: AccountFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onAccountView: (account: AdminAccount) => void;
  onAccountEdit: (account: AdminAccount) => void;
  onAccountDelete: (account: AdminAccount) => void;
  onSetDefault?: (account: AdminAccount) => void;
}

const AccountTable: FC<AccountTableProps> = ({
  accounts,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onAccountView,
  onAccountEdit,
  onAccountDelete,
  onSetDefault
}) => {
  const { currentPage, pageSize, sortField, sortDirection } = filters;
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const handleSort = (field: string) => {
    onSort(field);
  };

  const getSortIcon = (field: string) => {
    if (sortField === field) {
      return (
        <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
      );
    }
    return <i className="ml-1 fas fa-sort text-gray-400"></i>;
  };

  const getAccountTypeConfig = (type: string) => {
    return ACCOUNT_TYPE_CONFIGS.find(config => config.value === type) || ACCOUNT_TYPE_CONFIGS[5]; // Default to 'other'
  };

  const getAccountStatusConfig = (status: string) => {
    return ACCOUNT_STATUS_CONFIGS.find(config => config.value === status) || ACCOUNT_STATUS_CONFIGS[0]; // Default to 'active'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(account => account.id!));
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return `₱${Math.abs(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      {/* Mobile Account Cards */}
      <div className="d-block d-md-none">
        {/* Mobile Section Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-university text-red-500 text-[10px]"></i>
              Accounts
              <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                {totalItems}
              </span>
            </h6>
            <span className="text-[9px] text-gray-400">
              {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </span>
          </div>

          {/* Mobile Account List */}
          {loading ? (
            <div className="p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse mb-3 last:mb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-university text-gray-400 text-lg"></i>
              </div>
              <p className="text-xs text-gray-500 font-medium">No accounts found</p>
              <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accounts.map((account) => {
                const typeConfig = getAccountTypeConfig(account.account_type);
                const statusConfig = getAccountStatusConfig(account.status);
                
                return (
                  <div 
                    key={account.id} 
                    className="p-3 hover:bg-gray-50 transition-colors"
                    onClick={() => onAccountView(account)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Account Icon */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: (account.color || typeConfig.color) + '20',
                          color: account.color || typeConfig.color
                        }}
                      >
                        <i className={`${typeConfig.icon} text-sm`}></i>
                      </div>
                      
                      {/* Account Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h6 className="text-xs font-bold text-gray-800 truncate">
                            {account.account_name}
                          </h6>
                          {account.is_default && (
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                              <i className="fas fa-star text-amber-500 text-[8px]"></i>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-gray-500 truncate">
                            {account.user_name || account.user_email}
                          </span>
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium"
                            style={{ 
                              backgroundColor: statusConfig.value === 'active' ? '#dcfce7' : statusConfig.value === 'inactive' ? '#f3f4f6' : '#fee2e2',
                              color: statusConfig.value === 'active' ? '#16a34a' : statusConfig.value === 'inactive' ? '#6b7280' : '#dc2626'
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: typeConfig.color + '20', color: typeConfig.color }}
                          >
                            {typeConfig.label}
                          </span>
                          <span className={`text-sm font-bold ${account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.balance >= 0 ? '' : '-'}{formatCurrency(account.balance)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Chevron */}
                      <div className="flex-shrink-0 self-center">
                        <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAccountView(account); }}
                        className="px-2 py-1 text-[9px] text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <i className="fas fa-eye mr-1"></i>View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAccountEdit(account); }}
                        className="px-2 py-1 text-[9px] text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition-colors"
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAccountDelete(account); }}
                        className="px-2 py-1 text-[9px] text-rose-600 bg-rose-50 rounded hover:bg-rose-100 transition-colors"
                      >
                        <i className="fas fa-trash mr-1"></i>Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left mr-1"></i>Prev
              </button>
              <span className="text-[10px] text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next<i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="card shadow d-none d-md-block">
        <div className="card-header bg-white border-0 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-danger">
              <i className="fas fa-table mr-2"></i>
              Accounts ({totalItems})
            </h6>
            <div className="table-actions d-flex align-items-center">
              {selectedAccounts.length > 0 && (
                <div className="mr-3">
                  <span className="badge badge-info mr-2">
                    {selectedAccounts.length} selected
                  </span>
                  <button className="btn btn-outline-danger btn-sm">
                    <i className="fas fa-trash mr-1"></i>
                    Bulk Delete
                  </button>
                </div>
              )}
              <small className="text-muted">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
              </small>
            </div>
          </div>
        </div>
      
      {loading ? (
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table modern-table mb-0">
              <thead className="table-header">
                <tr>
                  <th style={{ width: '40px' }}>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '20px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '80px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '100px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '60px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '80px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '70px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '60px', height: '16px' }}></div>
                  </th>
                  <th>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '80px', height: '16px' }}></div>
                  </th>
                  <th className="text-center" style={{ width: '120px' }}>
                    <div className="skeleton-line skeleton-table-header" style={{ width: '60px', height: '16px', margin: '0 auto' }}></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td>
                      <div className="skeleton-checkbox"></div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="skeleton-circle mr-2" style={{ width: '32px', height: '32px' }}></div>
                        <div>
                          <div className="skeleton-line mb-1" style={{ width: '120px', height: '16px' }}></div>
                          <div className="skeleton-line" style={{ width: '80px', height: '12px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="skeleton-line" style={{ width: '100px', height: '16px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton-line" style={{ width: '60px', height: '16px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton-line" style={{ width: '80px', height: '16px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton-badge" style={{ width: '70px', height: '24px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton-line" style={{ width: '60px', height: '12px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton-line" style={{ width: '70px', height: '12px' }}></div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <div className="skeleton-button mr-1" style={{ width: '32px', height: '32px' }}></div>
                        <div className="skeleton-button mr-1" style={{ width: '32px', height: '32px' }}></div>
                        <div className="skeleton-button" style={{ width: '32px', height: '32px' }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover modern-table mb-0">
                <thead className="table-header">
                  <tr>
                    <th className="border-0" style={{ width: '40px' }}>
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="selectAll"
                          checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                          onChange={handleSelectAll}
                        />
                        <label className="custom-control-label" htmlFor="selectAll"></label>
                      </div>
                    </th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("account_name")}
                      style={{ cursor: 'pointer' }}
                    >
                      Account {getSortIcon("account_name")}
                    </th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("user_email")}
                      style={{ cursor: 'pointer' }}
                    >
                      User {getSortIcon("user_email")}
                    </th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("account_type")}
                      style={{ cursor: 'pointer' }}
                    >
                      Type {getSortIcon("account_type")}
                    </th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("balance")}
                      style={{ cursor: 'pointer' }}
                    >
                      Balance {getSortIcon("balance")}
                    </th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("status")}
                      style={{ cursor: 'pointer' }}
                    >
                      Status {getSortIcon("status")}
                    </th>
                    <th className="border-0">Default</th>
                    <th 
                      className="border-0 sortable-header" 
                      onClick={() => handleSort("created_at")}
                      style={{ cursor: 'pointer' }}
                    >
                      Created {getSortIcon("created_at")}
                    </th>
                    <th className="border-0 text-center" style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-5">
                        <div className="text-center">
                          <div className="empty-state-container">
                            <i className="fas fa-university fa-4x text-gray-300 mb-4"></i>
                            <h4 className="text-gray-700 mb-3">No Accounts Found</h4>
                            <p className="text-muted mb-4 max-width-sm mx-auto">
                              No accounts match your current filters. Try adjusting your search criteria or add a new account to get started.
                            </p>
                            <div className="d-flex justify-content-center gap-2">
                              <button className="btn btn-outline-primary btn-sm mr-2">
                                <i className="fas fa-filter mr-2"></i>
                                Clear Filters
                              </button>
                              <button className="btn btn-primary btn-sm">
                                <i className="fas fa-plus mr-2"></i>
                                Add First Account
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => {
                      const typeConfig = getAccountTypeConfig(account.account_type);
                      const statusConfig = getAccountStatusConfig(account.status);
                      
                      return (
                        <tr key={account.id} className="table-row">
                          <td>
                            <div className="custom-control custom-checkbox">
                              <input
                                type="checkbox"
                                className="custom-control-input"
                                id={`select-${account.id}`}
                                checked={selectedAccounts.includes(account.id!)}
                                onChange={() => handleSelectAccount(account.id!)}
                              />
                              <label className="custom-control-label" htmlFor={`select-${account.id}`}></label>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className="rounded-circle d-flex align-items-center justify-content-center mr-3"
                                style={{ 
                                  width: '32px', 
                                  height: '32px',
                                  backgroundColor: account.color || typeConfig.color + '20',
                                  color: account.color || typeConfig.color
                                }}
                              >
                                <i className={typeConfig.icon} style={{ fontSize: '14px' }}></i>
                              </div>
                              <div>
                                <div className="font-weight-bold text-gray-800">
                                  {account.account_name}
                                </div>
                                {account.institution_name && (
                                  <small className="text-muted">
                                    {account.institution_name}
                                    {account.account_number_masked && ` •••• ${account.account_number_masked}`}
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              {account.user_avatar && (
                                <img
                                  src={account.user_avatar}
                                  alt="User"
                                  className="rounded-circle mr-2"
                                  style={{ width: '24px', height: '24px' }}
                                />
                              )}
                              <div>
                                <div className="font-weight-bold text-gray-800">
                                  {account.user_name || 'Unknown User'}
                                </div>
                                <small className="text-muted">{account.user_email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: typeConfig.color + '20', color: typeConfig.color }}>
                              <i className={`${typeConfig.icon} mr-1`}></i>
                              {typeConfig.label}
                            </span>
                          </td>
                          <td>
                            <span className={account.balance_class}>
                              {account.display_balance}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${statusConfig.badge}`}>
                              <i className={`${statusConfig.icon} mr-1`}></i>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td>
                            {account.is_default ? (
                              <span className="badge badge-warning">
                                <i className="fas fa-star mr-1"></i>
                                Default
                              </span>
                            ) : (
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => onSetDefault && onSetDefault(account)}
                                title="Set as default"
                              >
                                <i className="far fa-star"></i>
                              </button>
                            )}
                          </td>
                          <td>
                            <small className="text-muted">
                              {account.created_at ? formatDate(account.created_at) : 'N/A'}
                            </small>
                          </td>
                          <td className="py-3 text-center">
                            <div className="action-buttons">
                              <button
                                className="btn btn-sm btn-outline-primary mr-1"
                                onClick={() => onAccountView(account)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning mr-1"
                                onClick={() => onAccountEdit(account)}
                                title="Edit Account"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onAccountDelete(account)}
                                title="Delete Account"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
                </div>
                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => onPageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
};

export default AccountTable;
