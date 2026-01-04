import React, { ChangeEvent, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Goal, FilterState } from '../../types';
import { formatCurrency, formatDate, formatPercentage, getRemainingDays, calculateMonthlySavingsForGoal } from '../../../../utils/helpers';
import { formatStatusName } from '../../utils/goalUtils';
import { useAuth } from '../../../../utils/AuthContext';
import GoalFilters from '../filters/GoalFilters';

interface GoalTableProps {
  filteredGoals: Goal[];
  isFiltering: boolean;
  filter: FilterState;
  onFilterChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onResetFilters: () => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  isFamilyMember: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const GoalTable: React.FC<GoalTableProps> = ({
  filteredGoals,
  isFiltering,
  filter,
  onFilterChange,
  onResetFilters,
  onDeleteGoal,
  onToggleTip,
  isFamilyMember,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange
}) => {
  const { user } = useAuth();
  
  // Dropdown state for mobile goal cards
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
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu') && !(event.target as Element).closest('.dropdown-toggle-btn')) {
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

  const getProgressColors = (progress: number) => {
    if (progress >= 90) return { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' };
    if (progress >= 50) return { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-600' };
    if (progress >= 25) return { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' };
    return { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' };
  };

  const getPriorityColors = (priority: string) => {
    if (priority === 'high') return { bg: 'bg-rose-100', text: 'text-rose-600' };
    if (priority === 'medium') return { bg: 'bg-amber-100', text: 'text-amber-600' };
    return { bg: 'bg-cyan-100', text: 'text-cyan-600' };
  };

  const calculatePercentage = (current: number, target: number): number => {
    if (!target || target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <>
      {/* Mobile Goal List Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-flag text-indigo-500 text-[10px]"></i>
              Goal List
              {totalItems > 0 && (
                <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <button className="text-[10px] text-gray-500 flex items-center gap-1" onClick={onResetFilters}>
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          <GoalFilters
            filter={filter}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            isFiltering={isFiltering}
            isFamilyMember={isFamilyMember}
            showAsCard={false}
          />

          <div className="px-3 py-2">
            {isFiltering ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-gray-500">Filtering goals...</p>
              </div>
            ) : filteredGoals.length > 0 ? (
              <div className="space-y-2">
                {filteredGoals.map((goal, index) => {
                  const progressPercentage = goal.percentage ?? calculatePercentage(goal.current_amount, goal.target_amount);
                  const progressColors = getProgressColors(progressPercentage);
                  const priorityColors = getPriorityColors(goal.priority);
                  const remainingDays = getRemainingDays(goal.target_date);
                  const canEdit = !goal.is_family_goal || goal.user_id === user?.id;
                  const monthlySavingsNeeded = calculateMonthlySavingsForGoal({ target_amount: goal.target_amount, current_amount: goal.current_amount, target_date: goal.target_date });
                  const statusClass = goal.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : goal.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : goal.status === 'not_started' ? 'bg-gray-100 text-gray-600' : 'bg-rose-100 text-rose-600';

                  return (
                    <div
                      key={goal.id}
                      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate__animated animate__fadeIn relative"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      {/* Header Row */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className={`w-11 h-11 rounded-xl ${progressColors.light} flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-[11px] font-bold ${progressColors.text}`}>
                            {Math.round(progressPercentage)}%
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                              {goal.goal_name}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${priorityColors.bg} ${priorityColors.text}`}>
                                {goal.priority.charAt(0).toUpperCase()}
                              </span>
                              {goal.is_family_goal && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                  <i className="fas fa-users text-[7px]"></i>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                            <div
                              className={`${progressColors.bg} h-1.5 rounded-full transition-all duration-500`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          
                          {/* Amount info */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-gray-700">
                              {formatCurrency(goal.current_amount)}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              of {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                        </div>

                        {/* React-controlled Dropdown */}
                        <div className="relative flex-shrink-0">
                          <button
                            className="dropdown-toggle-btn w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleDropdown(goal.id); }}
                            aria-label="More actions"
                            type="button"
                          >
                            <i className="fas fa-ellipsis-v text-[10px]"></i>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {activeDropdown === goal.id && (
                            <div 
                              className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                              style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}
                            >
                              <Link
                                to={`/goals/${goal.id}`}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); closeDropdown(); }}
                              >
                                <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                                <span className="text-gray-700">View</span>
                              </Link>
                              {canEdit && (
                                <>
                                  <Link
                                    to={`/goals/${goal.id}/edit`}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); closeDropdown(); }}
                                  >
                                    <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                                    <span className="text-gray-700">Edit</span>
                                  </Link>
                                  <div className="border-t border-gray-200"></div>
                                  <button
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); closeDropdown(); onDeleteGoal(goal.id); }}
                                    type="button"
                                  >
                                    <i className="fas fa-trash text-red-500 text-[10px]"></i>
                                    <span className="text-red-600">Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info Row */}
                      <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusClass}`}>
                            {formatStatusName(goal.status)}
                          </span>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Due Date</p>
                          <p className={`text-[9px] font-medium ${remainingDays > 0 ? 'text-gray-600' : 'text-rose-500'}`}>
                            {remainingDays > 0 ? `${remainingDays} days` : 'Overdue'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Monthly</p>
                          <p className="text-[9px] font-medium text-indigo-600">
                            {formatCurrency(monthlySavingsNeeded)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-flag text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-1">No goals found</p>
                <p className="text-[10px] text-gray-400 mb-3">Try adjusting your filters</p>
                <Link to="/goals/create" className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg">
                  <i className="fas fa-plus text-[9px]"></i>
                  Create Goal
                </Link>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500">{startIndex + 1}-{endIndex} of {totalItems}</span>
                <select 
                  className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50">
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50">
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Goal Table Card */}
      <div className="card shadow mb-4 goal-table d-none d-md-block">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Goal List
            <div className="ml-2 position-relative">
              <i className="fas fa-info-circle text-gray-400 cursor-pointer" onClick={(e) => onToggleTip('goalList', e)} style={{ cursor: "pointer" }}></i>
            </div>
          </h6>
        </div>
        
        <GoalFilters filter={filter} onFilterChange={onFilterChange} onResetFilters={onResetFilters} isFiltering={isFiltering} isFamilyMember={isFamilyMember} showAsCard={false} />

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th>Goal Name</th>
                  <th>Target Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFiltering ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status"><span className="sr-only">Loading...</span></div>
                      <p className="text-gray-600 mt-3">Filtering goals...</p>
                    </td>
                  </tr>
                ) : filteredGoals.length > 0 ? (
                  filteredGoals.map((goal) => {
                    const progressPercentage = goal.percentage ?? calculatePercentage(goal.current_amount, goal.target_amount);
                    const priorityClass = goal.priority === "high" ? "text-danger" : goal.priority === "medium" ? "text-warning" : "text-info";
                    const statusClass = goal.status === "completed" ? "badge-success" : goal.status === "in_progress" ? "badge-primary" : goal.status === "not_started" ? "badge-secondary" : "badge-danger";
                    const monthlySavingsNeeded = calculateMonthlySavingsForGoal({ target_amount: goal.target_amount, current_amount: goal.current_amount, target_date: goal.target_date });
                    return (
                      <tr key={goal.id}>
                        <td>
                          <div className="font-weight-bold">{goal.goal_name}</div>
                          {goal.is_family_goal ? (
                            <div className="small mt-1">
                              <span className="badge badge-info"><i className="fas fa-users mr-1"></i> Family</span>
                              {goal.shared_by_name && <span className="badge badge-light ml-1 small">{goal.shared_by_name}</span>}
                            </div>
                          ) : (
                            <div className="small mt-1"><span className="badge badge-secondary"><i className="fas fa-user mr-1"></i> Personal</span></div>
                          )}
                        </td>
                        <td>
                          <div>{formatDate(goal.target_date)}</div>
                          <div className="small text-gray-600">{getRemainingDays(goal.target_date) > 0 ? `${getRemainingDays(goal.target_date)} days left` : <span className="text-danger">Past due</span>}</div>
                        </td>
                        <td><span className={`font-weight-bold ${priorityClass}`}><i className={`fas fa-flag mr-1 ${priorityClass}`}></i>{goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}</span></td>
                        <td><span className={`badge ${statusClass}`}>{formatStatusName(goal.status)}</span></td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress mr-2" style={{ height: '10px', width: '80px' }}>
                              <div className={`progress-bar ${progressPercentage >= 90 ? "bg-success" : progressPercentage >= 50 ? "bg-info" : progressPercentage >= 25 ? "bg-warning" : "bg-danger"}`} role="progressbar" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <span>{formatPercentage(progressPercentage)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="font-weight-bold">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                            <small className="text-gray-600">{formatCurrency(monthlySavingsNeeded)} monthly</small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <Link to={`/goals/${goal.id}`} className="inline-flex items-center justify-center w-9 h-9 bg-[#36b9cc] hover:bg-[#2c9faf] text-white rounded-full shadow-sm transition-colors" title="View Goal"><i className="fas fa-eye text-xs"></i></Link>
                            {(!goal.is_family_goal || goal.user_id === user?.id) && (
                              <>
                                <Link to={`/goals/${goal.id}/edit`} className="inline-flex items-center justify-center w-9 h-9 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded-full shadow-sm transition-colors" title="Edit Goal"><i className="fas fa-edit text-xs"></i></Link>
                                <button className="inline-flex items-center justify-center w-9 h-9 bg-[#e74a3b] hover:bg-[#d52a1a] text-white rounded-full shadow-sm transition-colors" onClick={() => onDeleteGoal(goal.id)} title="Delete Goal"><i className="fas fa-trash text-xs"></i></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="text-center py-4"><i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i><p className="text-gray-500">No goals found matching your filters.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer bg-white border-0">
              <div className="row align-items-center">
                <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Showing {Math.min(startIndex + 1, totalItems)} to {endIndex} of {totalItems} entries</span>
                </div>
                <div className="col-md-4 text-center mb-2 mb-md-0">
                  <label className="me-2 mb-0" style={{ fontSize: '0.875rem' }}>Show</label>
                  <select className="form-select d-inline-block w-auto" style={{ fontSize: '0.875rem' }} value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label className="ms-2 mb-0" style={{ fontSize: '0.875rem' }}>per page</label>
                </div>
                <div className="col-md-4 text-center text-md-end">
                  <nav>
                    <ul className="pagination mb-0 justify-content-center justify-content-md-end">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i></button>
                      </li>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (
                          <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(pageNum)} style={currentPage === pageNum ? { color: 'white' } : {}}>{pageNum}</button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i></button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GoalTable;
