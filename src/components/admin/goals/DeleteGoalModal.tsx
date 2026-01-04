import React, { FC, useState } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { DeleteGoalModalProps } from "./types";

const DeleteGoalModal: FC<DeleteGoalModalProps> = ({
  show,
  onClose,
  goal,
  onGoalDeleted
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { showSuccessToast, showErrorToast } = useToast();

  const handleDelete = async () => {
    if (!goal) return;

    if (deleteConfirmation !== "DELETE") {
      showErrorToast("Please type 'DELETE' to confirm");
      return;
    }

    setLoading(true);
    try {
      // Delete goal from Supabase
      const { error } = await supabaseAdmin
        .from('goals')
        .delete()
        .eq('id', goal.id);
      
      if (error) throw error;

      // The related transactions should be handled via foreign key constraints or cascade delete
      showSuccessToast("Goal deleted successfully");
      onGoalDeleted(goal.id);
      handleClose();
    } catch (error) {
      console.error("Error deleting goal:", error);
      showErrorToast("Failed to delete goal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmation("");
    onClose();
  };

  const isDeleteEnabled = deleteConfirmation === "DELETE" && !loading;

  if (!show || !goal) return null;

  const progressPercentage = goal.target_amount > 0 
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  const isActiveWithSavings = goal.status === 'active' && goal.current_amount > 0;

  return (
    <>
      {/* Mobile Modal */}
      <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white w-full rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate__animated animate__slideInUp animate__faster">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-white text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Goal</h3>
                <p className="text-[10px] text-white/80">This cannot be undone</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>

          {/* Mobile Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Warning Banner */}
            <div className="p-3 bg-red-50 rounded-xl border-l-2 border-red-500 mb-3">
              <div className="flex items-start gap-2">
                <i className="fas fa-exclamation-circle text-red-500 text-sm mt-0.5"></i>
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1">Warning: Permanent Deletion</p>
                  <p className="text-[10px] text-red-700">This goal and all its associated data will be permanently deleted. This action cannot be undone.</p>
                </div>
              </div>
            </div>

            {/* Goal Summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-bullseye text-red-500 text-xs"></i>
                <span className="text-[10px] font-semibold text-gray-600 uppercase">Goal to Delete</span>
              </div>
              <div className="mb-2">
                <p className="text-sm font-bold text-gray-800 mb-1">{goal.goal_name}</p>
                <p className="text-[10px] text-gray-500">{goal.category || 'No category'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase">Target</p>
                  <p className="text-xs font-semibold text-gray-700">{formatCurrency(goal.target_amount)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase">Saved</p>
                  <p className="text-xs font-semibold text-green-600">{formatCurrency(goal.current_amount)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    progressPercentage >= 100 ? 'bg-green-500' :
                    progressPercentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-[9px] text-gray-500 mt-1">{progressPercentage.toFixed(0)}% complete</p>
            </div>

            {/* Active Goal Warning */}
            {isActiveWithSavings && (
              <div className="p-3 bg-amber-50 rounded-xl border-l-2 border-amber-400 mb-3">
                <div className="flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5"></i>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-1">Active Goal with Savings</p>
                    <p className="text-[10px] text-amber-700">
                      This goal has {formatCurrency(goal.current_amount)} in savings. Deleting it will remove all tracking for these savings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Input */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-3">
              <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                Type <span className="text-red-500 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${
                  deleteConfirmation === 'DELETE' ? 'border-green-400 bg-green-50' : 'border-gray-200'
                }`}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                placeholder="Type DELETE"
                disabled={loading}
              />
              {deleteConfirmation && deleteConfirmation !== 'DELETE' && (
                <p className="text-[10px] text-red-500 mt-1">Please type DELETE exactly to confirm</p>
              )}
            </div>

            {/* What Will Be Deleted */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-list text-red-500 text-xs"></i>
                <span className="text-[10px] font-semibold text-gray-600 uppercase">What will be deleted</span>
              </div>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-[10px] text-gray-600">
                  <i className="fas fa-check text-red-400 text-[8px]"></i>
                  Goal and all its settings
                </li>
                <li className="flex items-center gap-2 text-[10px] text-gray-600">
                  <i className="fas fa-check text-red-400 text-[8px]"></i>
                  Progress tracking history
                </li>
                <li className="flex items-center gap-2 text-[10px] text-gray-600">
                  <i className="fas fa-check text-red-400 text-[8px]"></i>
                  Associated contribution records
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleteConfirmation !== 'DELETE'}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash text-xs"></i>
                  Delete
                </>
              )}
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
          onClick={handleClose}
        ></div>

        {/* Modal */}
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ zIndex: 1050 }}
          onClick={handleClose}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              
              {/* Header - Modern Design */}
              <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
                <div className="d-flex align-items-center w-100">
                  <div className="d-flex align-items-center justify-content-center mr-2" 
                       style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                    <i className="fas fa-exclamation-triangle fa-lg"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-0 font-weight-bold">Delete Goal</h6>
                    <small style={{ opacity: 0.9 }}>This action cannot be undone</small>
                  </div>
                  <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={loading}
                          style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                    <i className="fas fa-times text-danger"></i>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="modal-body py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
              {/* Warning Banner */}
              <div className="p-3 mb-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-exclamation-triangle text-danger mr-2 mt-1"></i>
                  <div>
                    <strong className="text-danger" style={{ fontSize: '0.9rem' }}>Permanent Deletion Warning</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      You are about to permanently delete this financial goal. This action cannot be reversed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Goal Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-bullseye text-danger mr-2"></i>
                  Goal Information
                </h6>
                <div className="d-flex align-items-center mb-3">
                  <div className="flex-grow-1">
                    <div className="font-weight-bold" style={{ fontSize: '1rem' }}>{goal.goal_name}</div>
                    <small className="text-muted">
                      <i className="fas fa-user mr-1"></i>
                      {goal.user_name || goal.user_email}
                    </small>
                  </div>
                  <span className={`badge badge-${goal.status === 'completed' ? 'success' : 'primary'}`}>
                    {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted">Progress</small>
                    <small className="font-weight-bold">{progressPercentage.toFixed(1)}%</small>
                  </div>
                  <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                    <div
                      className={`progress-bar ${
                        progressPercentage >= 100 ? 'bg-success' :
                        progressPercentage >= 50 ? 'bg-primary' : 'bg-warning'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%`, borderRadius: '4px' }}
                    ></div>
                  </div>
                </div>
                
                {/* Financial Summary */}
                <div className="row text-center mt-3">
                  <div className="col-4">
                    <div className="font-weight-bold text-success" style={{ fontSize: '0.95rem' }}>
                      {formatCurrency(goal.current_amount)}
                    </div>
                    <small className="text-muted">Current</small>
                  </div>
                  <div className="col-4" style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6' }}>
                    <div className="font-weight-bold text-primary" style={{ fontSize: '0.95rem' }}>
                      {formatCurrency(goal.target_amount)}
                    </div>
                    <small className="text-muted">Target</small>
                  </div>
                  <div className="col-4">
                    <div className="font-weight-bold text-muted" style={{ fontSize: '0.95rem' }}>
                      {formatDate(goal.target_date)}
                    </div>
                    <small className="text-muted">Due Date</small>
                  </div>
                </div>
              </div>

              {/* What will be deleted */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h6 className="mb-2" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-trash-alt text-danger mr-2"></i>
                  What will be deleted:
                </h6>
                <div style={{ fontSize: '0.85rem' }}>
                  <div className="d-flex align-items-center mb-1">
                    <i className="fas fa-check text-danger mr-2" style={{ fontSize: '0.7rem' }}></i>
                    <span className="text-muted">Goal record and all data</span>
                  </div>
                  <div className="d-flex align-items-center mb-1">
                    <i className="fas fa-check text-danger mr-2" style={{ fontSize: '0.7rem' }}></i>
                    <span className="text-muted">Progress history</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-check text-danger mr-2" style={{ fontSize: '0.7rem' }}></i>
                    <span className="text-muted">Related transactions</span>
                  </div>
                </div>
              </div>

              {/* Active Goal Warning */}
              {goal.status === 'active' && goal.current_amount > 0 && (
                <div className="p-3 mb-3" style={{ background: '#fff8e1', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-exclamation-circle text-warning mr-2"></i>
                    <small className="text-muted">
                      <strong>Active Goal:</strong> {formatCurrency(goal.current_amount)} saved will be lost.
                    </small>
                  </div>
                </div>
              )}

              {/* Confirmation Input */}
              <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                <h6 className="mb-2" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-keyboard text-danger mr-2"></i>
                  Type Confirmation
                </h6>
                <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                  Type <code className="bg-danger text-white px-2 py-1 rounded">DELETE</code> to confirm:
                </p>
                <input
                  type="text"
                  className={`form-control ${deleteConfirmation && deleteConfirmation !== "DELETE" ? "is-invalid" : ""}`}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  disabled={loading}
                  autoComplete="off"
                  style={{ fontSize: '0.9rem' }}
                />
                {deleteConfirmation && deleteConfirmation !== "DELETE" && (
                  <div className="invalid-feedback">Type "DELETE" exactly.</div>
                )}
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{goal.id?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-times mr-1"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={!isDeleteEnabled}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt mr-1"></i>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default DeleteGoalModal;
