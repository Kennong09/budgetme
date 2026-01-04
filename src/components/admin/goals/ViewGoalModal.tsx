import React, { FC, useState, useEffect } from "react";
import { formatCurrency, formatDate, getRemainingDays } from "../../../utils/helpers";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { ViewGoalModalProps, GoalTransaction } from "./types";

const ViewGoalModal: FC<ViewGoalModalProps> = ({ 
  show, 
  onClose, 
  goal, 
  onEdit, 
  onDelete 
}) => {
  const [transactions, setTransactions] = useState<GoalTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (show && goal) {
      fetchGoalTransactions();
    }
  }, [show, goal]);

  const fetchGoalTransactions = async () => {
    if (!goal) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('goal_id', goal.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching goal transactions:', error);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching goal transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (!show || !goal) return null;

  const progressPercentage = goal.target_amount > 0 
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  const remaining = goal.target_amount - goal.current_amount;
  const isOverdue = new Date(goal.target_date) < new Date() && goal.status !== 'completed';
  const daysRemaining = getRemainingDays(goal.target_date);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'primary';
    if (percentage >= 25) return 'warning';
    return 'danger';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    // Treat cancelled and paused as active
    const normalizedStatus = (status === 'cancelled' || status === 'paused') ? 'active' : status;
    switch (normalizedStatus) {
      case 'active': return 'primary';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  const displayStatus = progressPercentage >= 100 ? 'completed' : 'active';

  return (
    <>
      {/* Mobile Modal */}
      <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white w-full rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate__animated animate__slideInUp animate__faster">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fas fa-bullseye text-white text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{goal.goal_name}</h3>
                <p className="text-[10px] text-white/80">Goal Details</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>

          {/* Mobile Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Quick Stats - Horizontal Row */}
            <div className="flex items-stretch gap-2 mb-4">
              <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                <i className={`fas ${displayStatus === 'completed' ? 'fa-check-circle text-green-500' : 'fa-play text-blue-500'} text-[10px]`}></i>
                <p className="text-[7px] text-gray-500 uppercase mt-0.5">Status</p>
                <p className={`text-[9px] font-bold ${displayStatus === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                  {displayStatus === 'completed' ? 'Done' : 'Active'}
                </p>
              </div>
              <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                <i className="fas fa-percentage text-red-500 text-[10px]"></i>
                <p className="text-[7px] text-gray-500 uppercase mt-0.5">Progress</p>
                <p className="text-[9px] font-bold text-red-600">{progressPercentage.toFixed(0)}%</p>
              </div>
              <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                <i className={`fas ${goal.priority === 'high' ? 'fa-exclamation text-red-500' : goal.priority === 'medium' ? 'fa-minus text-amber-500' : 'fa-arrow-down text-blue-500'} text-[10px]`}></i>
                <p className="text-[7px] text-gray-500 uppercase mt-0.5">Priority</p>
                <p className={`text-[9px] font-bold ${goal.priority === 'high' ? 'text-red-600' : goal.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'}`}>
                  {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                </p>
              </div>
              <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
                <i className={`fas fa-calendar ${isOverdue ? 'text-red-500' : 'text-blue-500'} text-[10px]`}></i>
                <p className="text-[7px] text-gray-500 uppercase mt-0.5">Days</p>
                <p className={`text-[9px] font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)} late` : daysRemaining}
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-chart-pie text-red-500 text-xs"></i>
                <span className="text-[10px] font-semibold text-gray-600 uppercase">Financial Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(goal.current_amount)}</p>
                  <p className="text-[9px] text-gray-500">Current</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(goal.target_amount)}</p>
                  <p className="text-[9px] text-gray-500">Target</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(remaining))}</p>
                  <p className="text-[9px] text-gray-500">{remaining > 0 ? 'Remaining' : 'Excess'}</p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    progressPercentage >= 100 ? 'bg-green-500' :
                    progressPercentage >= 75 ? 'bg-blue-500' :
                    progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Timeline & User */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fas fa-calendar-alt text-red-500 text-xs"></i>
                  <span className="text-[10px] font-semibold text-gray-600 uppercase">Timeline</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Target</span>
                    <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{formatDate(goal.target_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Created</span>
                    <span className="text-[10px] font-medium text-gray-700">{formatDate(goal.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fas fa-user text-red-500 text-xs"></i>
                  <span className="text-[10px] font-semibold text-gray-600 uppercase">User</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={goal.user_avatar || "../images/placeholder.png"}
                    alt={goal.user_name || "User"}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-gray-700 truncate">{goal.user_name || 'Unknown'}</p>
                    <p className="text-[9px] text-gray-400 truncate">{goal.category || 'No category'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {goal.notes && (
              <div className="p-3 bg-red-50 rounded-xl border-l-2 border-red-400 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <i className="fas fa-sticky-note text-red-500 text-xs"></i>
                  <span className="text-[10px] font-semibold text-gray-600 uppercase">Notes</span>
                </div>
                <p className="text-[11px] text-gray-600">{goal.notes}</p>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-history text-red-500 text-xs"></i>
                <span className="text-[10px] font-semibold text-gray-600 uppercase">Recent Transactions</span>
              </div>
              {loadingTransactions ? (
                <div className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold ${transaction.type === 'contribution' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {transaction.type === 'contribution' ? '+' : '-'}
                        </span>
                        <span className="text-[10px] text-gray-500">{formatDate(transaction.date)}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${transaction.type === 'contribution' ? 'text-green-600' : 'text-amber-600'}`}>
                        {transaction.type === 'contribution' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-2">No transactions found</p>
              )}
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
            <button
              onClick={() => onEdit(goal)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-edit text-xs"></i>
              Edit
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-trash text-xs"></i>
              Delete
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Modal */}
      <div className="hidden md:block">
        {/* Modal Backdrop */}
        <div 
          className="modal-backdrop fade show" 
          style={{ zIndex: 1040 }}
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ zIndex: 1050 }}
          onClick={onClose}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
              
              {/* Header - Modern Design */}
              <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
                <div className="d-flex align-items-center w-100">
                  <div className="d-flex align-items-center justify-content-center mr-2" 
                       style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                    <i className="fas fa-bullseye fa-lg"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-0 font-weight-bold">{goal.goal_name}</h6>
                    <small style={{ opacity: 0.9 }}>Goal Details & Progress</small>
                  </div>
                  <button type="button" className="btn btn-light btn-sm" onClick={onClose}
                          style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                    <i className="fas fa-times text-danger"></i>
                  </button>
                </div>
              </div>

              {/* Quick Stats Bar */}
              <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-${goal.status === 'completed' ? 'check-circle text-success' : goal.status === 'active' ? 'play text-primary' : 'pause text-warning'} mr-2`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Status</small>
                      <strong style={{ fontSize: '0.8rem' }} className={goal.status === 'completed' ? 'text-success' : goal.status === 'active' ? 'text-primary' : 'text-warning'}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-percentage text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Progress</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{progressPercentage.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-${goal.priority === 'high' ? 'exclamation text-danger' : goal.priority === 'medium' ? 'minus text-warning' : 'arrow-down text-info'} mr-2`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Priority</small>
                      <strong style={{ fontSize: '0.8rem' }} className={goal.priority === 'high' ? 'text-danger' : goal.priority === 'medium' ? 'text-warning' : 'text-info'}>
                        {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-calendar ${isOverdue ? 'text-danger' : 'text-primary'} mr-2`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Days</small>
                      <strong style={{ fontSize: '0.8rem' }} className={isOverdue ? 'text-danger' : daysRemaining < 30 ? 'text-warning' : 'text-primary'}>
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} late` : daysRemaining}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body py-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              
              {/* Financial Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-chart-pie text-danger mr-2"></i>
                  Financial Summary
                </h6>
                <div className="row mb-3">
                  <div className="col-4 text-center">
                    <div className="font-weight-bold text-success" style={{ fontSize: '1.1rem' }}>
                      {formatCurrency(goal.current_amount)}
                    </div>
                    <small className="text-muted">Current</small>
                  </div>
                  <div className="col-4 text-center" style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6' }}>
                    <div className="font-weight-bold text-primary" style={{ fontSize: '1.1rem' }}>
                      {formatCurrency(goal.target_amount)}
                    </div>
                    <small className="text-muted">Target</small>
                  </div>
                  <div className="col-4 text-center">
                    <div className={`font-weight-bold ${remaining > 0 ? 'text-warning' : 'text-success'}`} style={{ fontSize: '1.1rem' }}>
                      {formatCurrency(Math.abs(remaining))}
                    </div>
                    <small className="text-muted">{remaining > 0 ? 'Remaining' : 'Excess'}</small>
                  </div>
                </div>
                <div className="progress" style={{ height: '10px', borderRadius: '5px' }}>
                  <div
                    className={`progress-bar bg-${getProgressColor(progressPercentage)}`}
                    role="progressbar"
                    style={{ width: `${Math.min(progressPercentage, 100)}%`, borderRadius: '5px' }}
                  ></div>
                </div>
              </div>

              {/* Goal Details Grid */}
              <div className="row mb-3">
                <div className="col-md-6 mb-3 mb-md-0">
                  <div className="p-3 h-100" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-calendar-alt text-danger mr-2"></i>
                      Timeline
                    </h6>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Target Date</span>
                      <span className={`font-weight-bold ${isOverdue ? 'text-danger' : ''}`} style={{ fontSize: '0.85rem' }}>
                        {formatDate(goal.target_date)}
                        {isOverdue && <i className="fas fa-exclamation-triangle text-danger ml-1"></i>}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Days Remaining</span>
                      <span className={`font-weight-bold ${daysRemaining < 0 ? 'text-danger' : daysRemaining < 30 ? 'text-warning' : 'text-success'}`} style={{ fontSize: '0.85rem' }}>
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Created</span>
                      <span className="font-weight-bold" style={{ fontSize: '0.85rem' }}>{formatDate(goal.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 h-100" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-user text-danger mr-2"></i>
                      Assignment
                    </h6>
                    <div className="d-flex align-items-center mb-2">
                      <img
                        src={goal.user_avatar || "../images/placeholder.png"}
                        alt={goal.user_name || "User"}
                        className="rounded-circle mr-2"
                        style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <div>
                        <div className="font-weight-bold" style={{ fontSize: '0.85rem' }}>{goal.user_name || 'Unknown'}</div>
                        <small className="text-muted">{goal.user_email}</small>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Category</span>
                      <span className="font-weight-bold" style={{ fontSize: '0.85rem' }}>{goal.category || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {goal.notes && (
                <div className="p-3 mb-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                  <h6 className="mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-sticky-note text-danger mr-2"></i>
                    Notes
                  </h6>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.85rem' }}>{goal.notes}</p>
                </div>
              )}

              {/* Recent Transactions */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-history text-danger mr-2"></i>
                  Recent Transactions
                </h6>
                {loadingTransactions ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-danger" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <div>
                          <span className={`badge badge-${transaction.type === 'contribution' ? 'success' : 'warning'} mr-2`} style={{ fontSize: '0.7rem' }}>
                            {transaction.type === 'contribution' ? '+' : '-'}
                          </span>
                          <span style={{ fontSize: '0.8rem' }}>{formatDate(transaction.date)}</span>
                        </div>
                        <span className={`font-weight-bold ${transaction.type === 'contribution' ? 'text-success' : 'text-warning'}`} style={{ fontSize: '0.85rem' }}>
                          {transaction.type === 'contribution' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-muted">
                    <i className="fas fa-inbox mr-1"></i>
                    <span style={{ fontSize: '0.85rem' }}>No transactions found</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="row">
                <div className="col-6">
                  <button 
                    className="btn btn-outline-primary btn-block py-2"
                    onClick={() => onEdit(goal)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <i className="fas fa-edit mr-1"></i>
                    Edit Goal
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    className="btn btn-outline-danger btn-block py-2"
                    onClick={() => onDelete(goal)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <i className="fas fa-trash-alt mr-1"></i>
                    Delete Goal
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer - Mobile Responsive */}
            <div 
              className="modal-footer border-0" 
              style={{ 
                background: '#f8f9fa',
                padding: '10px 16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{goal.id.substring(0, 12)}...</code>
              </small>
              <button 
                type="button" 
                className="btn btn-danger w-100" 
                onClick={onClose}
                style={{ 
                  padding: '10px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  minHeight: '42px'
                }}
              >
                <i className="fas fa-times mr-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ViewGoalModal;
