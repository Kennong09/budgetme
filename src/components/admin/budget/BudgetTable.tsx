import React, { FC, useState, useEffect } from "react";
import { Budget, BudgetFilters } from "./types";

interface BudgetTableProps {
  budgets: Budget[];
  filters: BudgetFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onBudgetSelect: (budget: Budget) => void;
  onBudgetEdit?: (budget: Budget) => void;
  onBudgetDelete?: (budget: Budget) => void;
}

const BudgetTable: FC<BudgetTableProps> = ({
  budgets,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onBudgetSelect,
  onBudgetEdit,
  onBudgetDelete
}) => {
  const { currentPage, pageSize, sortField, sortDirection } = filters;
  const ITEMS_PER_PAGE = pageSize;

  // Mobile dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (budgetId: string) => {
    setActiveDropdown(activeDropdown === budgetId ? null : budgetId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Close dropdown when clicking outside - same as AdminTransactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  const handleSort = (field: string) => {
    onSort(field);
  };

  const getSortIcon = (field: string, dbField: string) => {
    if (sortField === dbField) {
      return (
        <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
      );
    }
    return null;
  };

  const getProgressBarClass = (percentage: number) => {
    if (percentage >= 90) return "bg-danger";
    if (percentage >= 70) return "bg-warning";
    if (percentage >= 50) return "bg-info";
    return "bg-success";
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "active": return "badge-primary";
      case "completed": return "badge-success";
      default: return "badge-secondary";
    }
  };

  // Mobile progress bar class
  const getMobileProgressClass = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-emerald-500";
  };

  // Mobile status badge class
  const getMobileStatusClass = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "completed": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      {/* Mobile Card List View */}
      <div className="block md:hidden">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-calculator text-red-500"></i>
            </div>
            <p className="text-sm font-medium text-gray-700">No Budgets Found</p>
            <p className="text-[10px] text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {budgets.map(budget => {
              const percentage = Math.round((budget.spent / budget.amount) * 100);
              const progressClass = getMobileProgressClass(percentage);
              const statusClass = getMobileStatusClass(budget.status);
              
              return (
                <div
                  key={budget.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100"
                >
                  {/* Main Card Content */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={budget.user_avatar || "../images/placeholder.png"}
                          alt={budget.user_name || "User"}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = "../images/placeholder.png";
                          }}
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${budget.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                      </div>
                      
                      {/* Budget Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800 truncate">{budget.name}</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-medium rounded-full ${statusClass}`}>
                            {budget.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <i className="fas fa-user text-[8px]"></i>
                          <span className="truncate">{budget.user_name}</span>
                          <span className="text-gray-300">•</span>
                          <i className="fas fa-tag text-[8px]"></i>
                          <span className="truncate">{budget.category}</span>
                        </div>
                      </div>
                      
                      {/* Amount & Dropdown */}
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="text-xs font-bold text-gray-800">₱{budget.amount.toLocaleString()}</div>
                          <div className="text-[9px] text-gray-500">{percentage}% used</div>
                        </div>
                        
                        {/* Actions Dropdown */}
                        <div className="relative">
                          <button
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(budget.id); }}
                            onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(budget.id); }}
                            aria-label="More actions"
                          >
                            <i className="fas fa-ellipsis-v text-[10px]"></i>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {activeDropdown === budget.id && (
                            <div className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 99999, transform: 'translateX(-84px) translateY(4px)' }}>
                              <button
                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); closeDropdown(); onBudgetSelect(budget); }}
                                onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onBudgetSelect(budget); }}
                              >
                                <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                                <span className="text-gray-700">View</span>
                              </button>
                              {onBudgetEdit && (
                                <button
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); closeDropdown(); onBudgetEdit(budget); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onBudgetEdit(budget); }}
                                >
                                  <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                                  <span className="text-gray-700">Edit</span>
                                </button>
                              )}
                              {onBudgetDelete && (
                                <button
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); closeDropdown(); onBudgetDelete(budget); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onBudgetDelete(budget); }}
                                >
                                  <i className="fas fa-trash text-red-500 text-[10px]"></i>
                                  <span className="text-red-600">Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressClass} rounded-full transition-all`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-gray-500">Spent: ₱{budget.spent.toLocaleString()}</span>
                        <span className="text-[9px] text-gray-500">Left: ₱{(budget.amount - budget.spent).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 1 && !loading && (
          <div className="mt-3 flex items-center justify-between px-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-left mr-1"></i>
              Prev
            </button>
            <span className="text-[10px] text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <i className="fas fa-chevron-right ml-1"></i>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-table mr-2"></i>
                Budgets ({totalItems})
              </h6>
              <div className="table-actions">
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
                      <th><div className="skeleton-line skeleton-table-header"></div></th>
                      <th><div className="skeleton-line skeleton-table-header"></div></th>
                      <th><div className="skeleton-line skeleton-table-header"></div></th>
                      <th><div className="skeleton-line skeleton-table-header"></div></th>
                      <th className="text-center"><div className="skeleton-line skeleton-table-header"></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="skeleton-avatar mr-3"></div>
                            <div>
                              <div className="skeleton-line skeleton-budget-name mb-1"></div>
                              <div className="skeleton-line skeleton-budget-email"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3"><div className="skeleton-line skeleton-budget-category"></div></td>
                        <td className="py-3"><div className="skeleton-line skeleton-budget-amount"></div></td>
                        <td className="py-3"><div className="skeleton-budget-status"></div></td>
                        <td className="py-3">
                          <div className="d-flex justify-content-center gap-1">
                            <div className="skeleton-budget-action-btn"></div>
                            <div className="skeleton-budget-action-btn"></div>
                            <div className="skeleton-budget-action-btn"></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : budgets.length === 0 ? (
            <div className="card-body">
              <div className="no-users-container text-center">
                <div className="mb-4">
                  <i className="fas fa-calculator fa-4x text-muted mb-3"></i>
                  <h5 className="text-muted">No Budgets Found</h5>
                  <p className="text-muted mb-4">
                    No budgets match your current search criteria. Try adjusting your filters or create a new budget.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table modern-table mb-0">
                  <thead className="table-header">
                    <tr>
                      <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                        Budget & User
                        {getSortIcon("name", "category_id")}
                      </th>
                      <th onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>
                        Category
                        {getSortIcon("category", "category_id")}
                      </th>
                      <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                        Amount & Progress
                        {getSortIcon("amount", "amount")}
                      </th>
                      <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                        Status
                        {getSortIcon("status", "end_date")}
                      </th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map(budget => {
                      const percentage = Math.round((budget.spent / budget.amount) * 100);
                      const progressClass = getProgressBarClass(percentage);
                      
                      return (
                        <tr key={budget.id} className="table-row">
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <div className="user-avatar-container mr-3">
                                <img
                                  src={budget.user_avatar || "../images/placeholder.png"}
                                  alt={budget.user_name || "User"}
                                  className="user-table-avatar"
                                  onError={(e) => {
                                    e.currentTarget.src = "../images/placeholder.png";
                                  }}
                                />
                                <div className={`user-status-dot status-${budget.status === 'active' ? 'active' : 'inactive'}`}></div>
                              </div>
                              <div className="user-info">
                                <div className="user-name font-weight-medium">
                                  {budget.name}
                                </div>
                                <div className="user-id text-muted small">
                                  User: {budget.user_name} • {budget.user_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <i className="fas fa-tag text-muted mr-2"></i>
                              <span className="font-weight-medium">{budget.category}</span>
                            </div>
                          </td>
                          
                          <td className="py-3">
                            <div className="budget-amount-info">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="font-weight-bold">${budget.amount.toLocaleString()}</span>
                                <span className="text-muted small">{percentage}%</span>
                              </div>
                              <div className="progress mb-1" style={{height: '6px'}}>
                                <div
                                  className={`progress-bar ${progressClass}`}
                                  role="progressbar"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                  aria-valuenow={percentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                </div>
                              </div>
                              <div className="d-flex justify-content-between">
                                <small className="text-muted">Spent: ${budget.spent.toLocaleString()}</small>
                                <small className="text-muted">Remaining: ${(budget.amount - budget.spent).toLocaleString()}</small>
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-3">
                            <span className={`status-badge ${budget.status === 'active' ? 'status-success' : budget.status === 'completed' ? 'status-primary' : 'status-danger'}`}>
                              <i className={`fas ${budget.status === 'active' ? 'fa-check-circle' : budget.status === 'completed' ? 'fa-flag-checkered' : 'fa-archive'} mr-1`}></i>
                              {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
                            </span>
                          </td>
                          
                          <td className="py-3">
                            <div className="action-buttons">
                              <button
                                className="btn btn-outline-info btn-sm"
                                onClick={() => onBudgetSelect(budget)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => onBudgetEdit && onBudgetEdit(budget)}
                                title="Edit Budget"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onBudgetDelete && onBudgetDelete(budget)}
                                title="Delete Budget"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Desktop Pagination */}
          {totalPages > 1 && !loading && (
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">
                    Page {currentPage} of {totalPages} ({totalItems} total budgets)
                  </small>
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-angle-double-left"></i>
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-angle-left"></i>
                      </button>
                    </li>
                    
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = index + 1;
                      } else if (currentPage <= 3) {
                        pageNum = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + index;
                      } else {
                        pageNum = currentPage - 2 + index;
                      }
                      
                      if (pageNum >= 1 && pageNum <= totalPages) {
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
                      }
                      return null;
                    })}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="fas fa-angle-right"></i>
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="fas fa-angle-double-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BudgetTable;