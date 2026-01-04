import React, { FC, useState, useEffect } from "react";
import { formatCurrency, formatDate, getRemainingDays } from "../../../utils/helpers";
import { GoalTableProps } from "./types";

const GoalTable: FC<GoalTableProps> = ({
  goals,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onGoalSelect,
  onGoalEdit,
  onGoalDelete
}) => {
  // Dropdown state for action menu
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (goalId: string) => {
    setActiveDropdown(activeDropdown === goalId ? null : goalId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu') && !(event.target as Element).closest('.dropdown-toggle')) {
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
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    // Treat cancelled and paused as active
    const normalizedStatus = (status === 'cancelled' || status === 'paused') ? 'active' : status;
    switch (normalizedStatus) {
      case 'active': return 'badge-primary';
      case 'completed': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'primary';
    if (percentage >= 25) return 'warning';
    return 'danger';
  };

  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) {
      return <i className="fas fa-sort text-muted ml-1"></i>;
    }
    return (
      <i className={`fas fa-sort-${filters.sortOrder === 'asc' ? 'up' : 'down'} text-primary ml-1`}></i>
    );
  };

  if (loading) {
    return (
      <div className="table-section">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-3 py-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="card shadow">
            <div className="card-header py-3">
              <div className="skeleton-line skeleton-table-header"></div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table modern-table">
                  <thead className="table-header">
                    <tr>
                      {Array.from({ length: 7 }).map((_, index) => (
                        <th key={index}>
                          <div className="skeleton-line skeleton-th"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="table-row">
                        {Array.from({ length: 7 }).map((_, colIndex) => (
                          <td key={colIndex}>
                            <div className="skeleton-line skeleton-td"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-section">
      {/* Mobile Goals Card List */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                <i className="fas fa-bullseye text-red-500 text-[10px]"></i>
              </div>
              <span className="text-xs font-semibold text-gray-700">Goals ({totalItems})</span>
            </div>
            <span className="text-[9px] text-gray-400">
              {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)}-{Math.min(filters.currentPage * filters.pageSize, totalItems)}
            </span>
          </div>

          {/* Mobile Goals List */}
          {goals.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-bullseye text-gray-400 text-lg"></i>
              </div>
              <p className="text-xs text-gray-500 font-medium">No goals found</p>
              <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {goals.map((goal) => {
                const progressPercentage = goal.target_amount > 0 
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;
                const daysRemaining = getRemainingDays(goal.target_date);
                const isOverdue = daysRemaining < 0 && goal.status !== 'completed';
                const displayStatus = progressPercentage >= 100 ? 'completed' : 'active';

                return (
                  <div 
                    key={goal.id} 
                    className="px-3 py-3 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    onClick={() => onGoalSelect(goal)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Goal Icon with Progress */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          displayStatus === 'completed' 
                            ? 'bg-green-100' 
                            : isOverdue 
                              ? 'bg-red-100' 
                              : 'bg-red-100'
                        }`}>
                          <i className={`fas ${displayStatus === 'completed' ? 'fa-check-circle text-green-500' : 'fa-bullseye text-red-500'} text-sm`}></i>
                        </div>
                        {/* Mini progress ring */}
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                          title={`${progressPercentage.toFixed(0)}%`}
                        >
                          <span className="text-[7px] font-bold text-gray-600">{Math.round(progressPercentage)}</span>
                        </div>
                      </div>

                      {/* Goal Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800 truncate">{goal.goal_name}</span>
                          {goal.is_family_goal && (
                            <span className="flex-shrink-0 px-1 py-0.5 text-[7px] font-medium bg-blue-100 text-blue-600 rounded">
                              <i className="fas fa-users text-[6px] mr-0.5"></i>Family
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-gray-500">{goal.user_name || goal.user_email}</span>
                          {goal.category && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] text-gray-400 truncate">{goal.category}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-1.5">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                progressPercentage >= 100 ? 'bg-green-500' :
                                progressPercentage >= 75 ? 'bg-blue-500' :
                                progressPercentage >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-gray-700">
                              {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 text-[8px] font-semibold rounded-full ${
                              goal.priority === 'high' 
                                ? 'bg-red-100 text-red-600' 
                                : goal.priority === 'medium' 
                                  ? 'bg-amber-100 text-amber-600' 
                                  : 'bg-blue-100 text-blue-600'
                            }`}>
                              {goal.priority.toUpperCase()}
                            </span>
                            <span className={`text-[9px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {isOverdue ? `${Math.abs(daysRemaining)}d late` : `${daysRemaining}d`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Dropdown */}
                      <div className="relative flex-shrink-0">
                        <button
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(goal.id); }}
                          onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(goal.id); }}
                          aria-label="More actions"
                        >
                          <i className="fas fa-ellipsis-v text-[10px]"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === goal.id && (
                          <div className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 99999, transform: 'translateX(-84px) translateY(4px)' }}>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onGoalSelect(goal); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onGoalSelect(goal); }}
                            >
                              <i className="fas fa-eye text-blue-500 text-[10px]"></i>
                              <span className="text-gray-700">View</span>
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onGoalEdit(goal); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onGoalEdit(goal); }}
                            >
                              <i className="fas fa-edit text-amber-500 text-[10px]"></i>
                              <span className="text-gray-700">Edit</span>
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onGoalDelete(goal); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onGoalDelete(goal); }}
                            >
                              <i className="fas fa-trash text-red-500 text-[10px]"></i>
                              <span className="text-red-600">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <button
                className="px-2.5 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))}
                disabled={filters.currentPage === 1}
              >
                <i className="fas fa-chevron-left mr-1"></i>
                Prev
              </button>
              <span className="text-[10px] text-gray-500 font-medium">
                {filters.currentPage} / {totalPages}
              </span>
              <button
                className="px-2.5 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))}
                disabled={filters.currentPage === totalPages}
              >
                Next
                <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-table mr-2"></i>
                Goals ({totalItems})
              </h6>
              <div className="table-actions">
                <small className="text-muted">
                  Showing {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)} to {Math.min(filters.currentPage * filters.pageSize, totalItems)} of {totalItems} entries
                </small>
              </div>
            </div>
          </div>
        
          <div className="card-body p-0">
            {goals.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state-container">
                <i className="fas fa-bullseye fa-4x text-gray-300 mb-4"></i>
                <h4 className="text-gray-700 mb-3">
                  {Object.values(filters).some(f => f !== '' && f !== 'goal_name' && f !== 'desc' && f !== 1 && f !== 10 && f !== false) 
                    ? 'No Matching Goals' 
                    : 'No Goals Yet'
                  }
                </h4>
                <p className="text-muted mb-4 max-width-sm mx-auto">
                  {Object.values(filters).some(f => f !== '' && f !== 'goal_name' && f !== 'desc' && f !== 1 && f !== 10 && f !== false) 
                    ? 'Try adjusting your filters or search criteria to find the goals you\'re looking for.' 
                    : 'Users haven\'t created any goals yet. Once they start adding goals, they will appear here.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover modern-table mb-0">
                <thead className="table-header">
                  <tr>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('goal_name')}
                    >
                      Goal {getSortIcon('goal_name')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('user_id')}
                    >
                      User {getSortIcon('user_id')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('target_amount')}
                    >
                      Target Amount {getSortIcon('target_amount')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('current_amount')}
                    >
                      Progress {getSortIcon('current_amount')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('target_date')}
                    >
                      Target Date {getSortIcon('target_date')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('priority')}
                    >
                      Priority {getSortIcon('priority')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer" 
                      onClick={() => onSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => {
                    const progressPercentage = goal.target_amount > 0 
                      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                      : 0;
                    
                    const daysRemaining = getRemainingDays(goal.target_date);
                    const isOverdue = daysRemaining < 0 && goal.status !== 'completed';
                    
                    return (
                      <tr key={goal.id} className="table-row">
                        <td className="py-3">
                          <div 
                            className="goal-info cursor-pointer" 
                            onClick={() => onGoalSelect(goal)}
                          >
                            <div className="goal-name font-weight-bold text-primary">
                              {goal.goal_name}
                            </div>
                            {goal.category && (
                              <div className="goal-category text-muted small">
                                <i className="fas fa-tag mr-1"></i>
                                {goal.category}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="user-avatar-container mr-3">
                              <img
                                src={goal.user_avatar || "../images/placeholder.png"}
                                alt={goal.user_name || "User"}
                                className="user-table-avatar"
                                onError={(e) => {
                                  e.currentTarget.src = "../images/placeholder.png";
                                }}
                              />
                              <div className={`user-status-dot status-${goal.status || 'inactive'}`}></div>
                            </div>
                            <div className="user-info">
                              <div className="user-name font-weight-medium">
                                {goal.user_name || goal.user_email || 'Unknown User'}
                              </div>
                              {goal.is_family_goal && (
                                <span className="badge badge-info badge-sm">
                                  <i className="fas fa-users mr-1"></i>
                                  Family Goal
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="target-amount">
                            <div className="font-weight-bold">
                              {formatCurrency(goal.target_amount)}
                            </div>
                            <div className="text-muted small">
                              {formatCurrency(goal.current_amount)} saved
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="goal-progress">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="small font-weight-bold">
                                {progressPercentage.toFixed(1)}%
                              </span>
                              <span className="small text-muted">
                                {formatCurrency(goal.target_amount - goal.current_amount)} left
                              </span>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar bg-${getProgressColor(progressPercentage)}`}
                                role="progressbar"
                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="target-date">
                            <div className={`font-weight-medium ${isOverdue ? 'text-danger' : ''}`}>
                              {formatDate(goal.target_date)}
                              {isOverdue && (
                                <i className="fas fa-exclamation-triangle text-danger ml-1" title="Overdue"></i>
                              )}
                            </div>
                            <div className={`text-muted small ${isOverdue ? 'text-danger' : daysRemaining < 30 ? 'text-warning' : ''}`}>
                              {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <span className={`badge ${getPriorityBadgeClass(goal.priority)} p-2`}>
                            <i className={`fas ${
                              goal.priority === 'high' ? 'fa-exclamation' :
                              goal.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down'
                            } mr-1`}></i>
                            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                          </span>
                        </td>

                        <td className="py-3">
                          {(() => {
                            // Determine status based on progress percentage
                            const progressPercent = goal.target_amount > 0 
                              ? (goal.current_amount / goal.target_amount) * 100 
                              : 0;
                            const displayStatus = progressPercent >= 100 ? 'completed' : 'active';
                            return (
                              <span className={`badge ${displayStatus === 'completed' ? 'badge-success' : 'badge-primary'} p-2`}>
                                <i className={`fas ${
                                  displayStatus === 'active' ? 'fa-play' : 'fa-check-circle'
                                } mr-1`}></i>
                                {displayStatus === 'active' ? 'Active' : 'Completed'}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-3 text-center">
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline-primary mr-1"
                              onClick={(e) => { e.stopPropagation(); onGoalSelect(goal); }}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning mr-1"
                              onClick={(e) => { e.stopPropagation(); onGoalEdit(goal); }}
                              title="Edit Goal"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={(e) => { e.stopPropagation(); onGoalDelete(goal); }}
                              title="Delete Goal"
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0">
            <div className="d-flex justify-content-between align-items-center">
              <div className="pagination-info">
                <small className="text-muted">
                  Page {filters.currentPage} of {totalPages}
                </small>
              </div>
              <nav aria-label="Goal pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => onPageChange(1)}
                      disabled={filters.currentPage === 1}
                    >
                      <i className="fas fa-angle-double-left"></i>
                    </button>
                  </li>
                  <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))}
                      disabled={filters.currentPage === 1}
                    >
                      <i className="fas fa-angle-left"></i>
                    </button>
                  </li>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (filters.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (filters.currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = filters.currentPage - 2 + i;
                    }
                    
                    return (
                      <li key={pageNum} className={`page-item ${filters.currentPage === pageNum ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => onPageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))}
                      disabled={filters.currentPage === totalPages}
                    >
                      <i className="fas fa-angle-right"></i>
                    </button>
                  </li>
                  <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => onPageChange(totalPages)}
                      disabled={filters.currentPage === totalPages}
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

      <style>{`
        .cursor-pointer {
          cursor: pointer;
        }
        
        .goal-info:hover .goal-name {
          text-decoration: underline;
        }
        
        .user-table-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .user-avatar-container {
          position: relative;
        }
        
        .user-status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }
        
        .status-active { background-color: #28a745; }
        .status-completed { background-color: #17a2b8; }
        .status-paused { background-color: #28a745; } /* Treat paused as active */
        .status-cancelled { background-color: #28a745; } /* Treat cancelled as active */
        .status-inactive { background-color: #6c757d; }
        
        .goal-progress .progress {
          background-color: #e9ecef;
        }
        
        .action-buttons .btn {
          transition: all 0.15s ease-in-out;
        }
        
        .action-buttons .btn:hover {
          transform: translateY(-1px);
        }
        
        .table-row:hover {
          background-color: #f8f9fa;
        }
        
        .badge-sm {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        .empty-state-container {
          max-width: 400px;
          margin: 0 auto;
        }
        
        .max-width-sm {
          max-width: 300px;
        }
      `}</style>
    </div>
  );
};

export default GoalTable;
