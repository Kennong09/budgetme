import React, { FC, useState } from "react";
import { Budget } from "./types";

interface DeleteBudgetModalProps {
  show: boolean;
  budget: Budget | null;
  onClose: () => void;
  onDelete: (budgetId: string) => void;
  loading?: boolean;
}

const DeleteBudgetModal: FC<DeleteBudgetModalProps> = ({
  show,
  budget,
  onClose,
  onDelete,
  loading = false
}) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmationInput(value);
    setConfirmed(value.toLowerCase() === "delete");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (budget && confirmed) {
      onDelete(budget.id);
    }
  };

  const handleClose = () => {
    setConfirmationInput("");
    setConfirmed(false);
    onClose();
  };

  if (!show || !budget) return null;

  const hasSpending = budget.spent > 0;
  const isActive = budget.status === "active";
  const progressPercent = Math.min(Math.round((budget.spent / budget.amount) * 100), 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#dc3545';
    if (percent >= 70) return '#fd7e14';
    return '#28a745';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: '#28a745', icon: 'fa-play-circle' };
      case 'completed':
        return { label: 'Completed', color: '#007bff', icon: 'fa-check-circle' };
      default:
        return { label: 'Archived', color: '#6c757d', icon: 'fa-archive' };
    }
  };

  const statusInfo = getStatusInfo(budget.status);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div className="modal-dialog modal-md modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
            
            {/* Header - Matching View Modal Style */}
            <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-trash-alt fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">Delete Budget</h6>
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
                    <strong className="text-danger" style={{ fontSize: '0.9rem' }}>Permanent Deletion</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      This will permanently remove the budget and all associated data including spending history and analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Budget Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center mb-3">
                  {budget.user_avatar ? (
                    <img src={budget.user_avatar} alt={budget.user_name} className="rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                      <i className="fas fa-calculator"></i>
                    </div>
                  )}
                  <div className="flex-grow-1">
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{budget.name}</div>
                    <small className="text-muted">{budget.user_name} • {budget.category}</small>
                  </div>
                  <span className="badge px-2 py-1" style={{ background: `${statusInfo.color}20`, color: statusInfo.color, fontSize: '0.7rem' }}>
                    <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                  </span>
                </div>

                {/* Quick Stats - Desktop */}
                <div className="d-none d-md-block">
                  <div className="row text-center mb-2" style={{ fontSize: '0.8rem' }}>
                    <div className="col-4">
                      <div className="p-2" style={{ background: 'rgba(0,123,255,0.1)', borderRadius: '6px' }}>
                        <small className="text-muted d-block">Budget</small>
                        <strong className="text-primary">₱{budget.amount.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2" style={{ background: 'rgba(220,53,69,0.1)', borderRadius: '6px' }}>
                        <small className="text-muted d-block">Spent</small>
                        <strong className="text-danger">₱{budget.spent.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2" style={{ background: 'rgba(40,167,69,0.1)', borderRadius: '6px' }}>
                        <small className="text-muted d-block">Remaining</small>
                        <strong className="text-success">₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats - Mobile */}
                <div className="d-block d-md-none mb-2">
                  <div className="d-flex text-center" style={{ gap: '4px' }}>
                    <div className="flex-fill p-1" style={{ background: 'rgba(0,123,255,0.1)', borderRadius: '6px' }}>
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>Budget</small>
                      <strong className="text-primary" style={{ fontSize: '0.7rem' }}>₱{budget.amount.toLocaleString()}</strong>
                    </div>
                    <div className="flex-fill p-1" style={{ background: 'rgba(220,53,69,0.1)', borderRadius: '6px' }}>
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>Spent</small>
                      <strong className="text-danger" style={{ fontSize: '0.7rem' }}>₱{budget.spent.toLocaleString()}</strong>
                    </div>
                    <div className="flex-fill p-1" style={{ background: 'rgba(40,167,69,0.1)', borderRadius: '6px' }}>
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>Left</small>
                      <strong className="text-success" style={{ fontSize: '0.7rem' }}>₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Progress</small>
                  <small style={{ color: getProgressColor(progressPercent) }}>{progressPercent}%</small>
                </div>
                <div className="progress" style={{ height: '4px', borderRadius: '2px' }}>
                  <div className="progress-bar" style={{ width: `${progressPercent}%`, background: getProgressColor(progressPercent), borderRadius: '2px' }}></div>
                </div>
              </div>

              {/* Impact Warning */}
              {(hasSpending || isActive) && (
                <div className="p-3 mb-3" style={{ background: '#fff8e1', borderRadius: '8px', border: '1px solid #ffc107' }}>
                  <h6 className="text-warning mb-2" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-exclamation-triangle mr-2"></i>Deletion Impact
                  </h6>
                  <ul className="mb-0 pl-3" style={{ fontSize: '0.8rem' }}>
                    {hasSpending && (
                      <li className="text-muted">This budget has <strong className="text-danger">₱{budget.spent.toLocaleString()}</strong> in recorded spending</li>
                    )}
                    {isActive && (
                      <li className="text-muted">This is an <strong>active budget</strong> currently in use</li>
                    )}
                    <li className="text-muted">All history and analytics will be permanently lost</li>
                  </ul>
                </div>
              )}

              {/* Timeline Info */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-calendar-alt mr-2"></i>Budget Period
                </h6>
                <div className="d-flex justify-content-between" style={{ fontSize: '0.8rem' }}>
                  <div>
                    <small className="text-muted d-block">Start Date</small>
                    <span>{new Date(budget.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="text-center">
                    <i className="fas fa-arrow-right text-muted"></i>
                  </div>
                  <div className="text-right">
                    <small className="text-muted d-block">End Date</small>
                    <span>{new Date(budget.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-shield-alt mr-2"></i>Confirm Deletion
                </h6>
                <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                  Type <strong className="text-danger">delete</strong> to confirm:
                </p>
                <input
                  type="text"
                  className={`form-control form-control-sm ${confirmationInput && !confirmed ? 'is-invalid' : confirmed ? 'is-valid' : ''}`}
                  placeholder="Type 'delete' to confirm"
                  value={confirmationInput}
                  onChange={handleConfirmationChange}
                  autoComplete="off"
                  disabled={loading}
                  style={{ borderRadius: '6px' }}
                />
                {confirmationInput && !confirmed && (
                  <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>Please type "delete" exactly to confirm</div>
                )}
                {confirmed && (
                  <div className="valid-feedback" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-check-circle mr-1"></i>Ready to delete
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Mobile Responsive */}
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{budget.id?.substring(0, 12)}...</code>
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
                  <i className="fas fa-times mr-1"></i>Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleSubmit}
                  disabled={!confirmed || loading}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span>Deleting...</>
                  ) : (
                    <><i className="fas fa-trash-alt mr-1"></i>Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteBudgetModal;
