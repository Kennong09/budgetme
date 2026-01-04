import React, { FC, useState } from "react";
import { Budget } from "./types";

interface BudgetDetailModalProps {
  budget: Budget | null;
  show: boolean;
  onClose: () => void;
  onStatusChange: (budget: Budget, newStatus: "active" | "completed" | "archived") => void;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
}

const BudgetDetailModal: FC<BudgetDetailModalProps> = ({
  budget,
  show,
  onClose,
  onStatusChange,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!show || !budget) return null;

  // Calculate progress percentage
  const progressPercent = Math.min(Math.round((budget.spent / budget.amount) * 100), 100);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#dc3545';
    if (percent >= 70) return '#fd7e14';
    return '#28a745';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)', icon: 'fa-play-circle' };
      case 'completed':
        return { label: 'Completed', color: '#007bff', bgColor: 'rgba(0, 123, 255, 0.1)', icon: 'fa-check-circle' };
      default:
        return { label: 'Archived', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)', icon: 'fa-archive' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    const end = new Date(budget.end_date);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const statusInfo = getStatusInfo(budget.status);
  const daysRemaining = getDaysRemaining();

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
            
            {/* Header - Compact */}
            <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-calculator fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">Budget Details</h6>
                  <small style={{ opacity: 0.9 }}>{budget.name}</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Desktop */}
            <div className="d-none d-md-block px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-peso-sign text-primary mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Budget</small>
                      <strong className="text-primary" style={{ fontSize: '0.8rem' }}>₱{budget.amount.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-receipt text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Spent</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>₱{budget.spent.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-wallet text-success mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Remaining</small>
                      <strong className="text-success" style={{ fontSize: '0.8rem' }}>₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-chart-pie mr-2" style={{ color: getProgressColor(progressPercent) }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Progress</small>
                      <strong style={{ color: getProgressColor(progressPercent), fontSize: '0.8rem' }}>{progressPercent}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile */}
            <div className="d-block d-md-none px-2 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="d-flex justify-content-between text-center">
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Budget</small>
                  <strong className="text-primary" style={{ fontSize: '0.65rem' }}>₱{budget.amount.toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Spent</small>
                  <strong className="text-danger" style={{ fontSize: '0.65rem' }}>₱{budget.spent.toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Left</small>
                  <strong className="text-success" style={{ fontSize: '0.65rem' }}>₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Progress</small>
                  <strong style={{ color: getProgressColor(progressPercent), fontSize: '0.65rem' }}>{progressPercent}%</strong>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Desktop */}
            <div className="d-none d-md-block px-3 pt-2">
              <div className="d-flex" style={{ gap: '6px' }}>
                {[
                  { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                  { id: 'details', icon: 'fa-info-circle', label: 'Details' },
                  { id: 'owner', icon: 'fa-user', label: 'Owner' },
                  { id: 'status', icon: 'fa-cogs', label: 'Status' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    <i className={`fas ${tab.icon} mr-1`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Navigation - Mobile */}
            <div className="d-block d-md-none px-2 pt-2">
              <div className="d-flex overflow-auto" style={{ gap: '4px' }}>
                {[
                  { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                  { id: 'details', icon: 'fa-info-circle', label: 'Details' },
                  { id: 'owner', icon: 'fa-user', label: 'Owner' },
                  { id: 'status', icon: 'fa-cogs', label: 'Status' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ borderRadius: '12px', padding: '3px 8px', fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                  >
                    <i className={`fas ${tab.icon}`} style={{ marginRight: '2px' }}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - Compact */}
            <div className="modal-body py-3" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row">
                  {/* Left Column - Financial Summary */}
                  <div className="col-lg-7">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-chart-bar mr-2"></i>Financial Summary
                    </h6>
                    <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      {/* Stats Row */}
                      <div className="row text-center mb-3">
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
                      
                      {/* Progress Bar */}
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Spending Progress</small>
                        <small style={{ color: getProgressColor(progressPercent) }}>{progressPercent}%</small>
                      </div>
                      <div className="progress mb-2" style={{ height: '8px', borderRadius: '4px' }}>
                        <div 
                          className="progress-bar"
                          style={{ width: `${progressPercent}%`, background: getProgressColor(progressPercent), borderRadius: '4px' }}
                        ></div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="text-center mt-2">
                        {progressPercent >= 100 ? (
                          <span className="badge badge-danger px-3 py-1"><i className="fas fa-exclamation-triangle mr-1"></i>Over Budget</span>
                        ) : progressPercent >= 80 ? (
                          <span className="badge badge-warning px-3 py-1"><i className="fas fa-exclamation-circle mr-1"></i>Near Limit</span>
                        ) : (
                          <span className="badge badge-success px-3 py-1"><i className="fas fa-check-circle mr-1"></i>On Track</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Quick Info */}
                  <div className="col-lg-5">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-clock mr-2"></i>Timeline
                    </h6>
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Start Date</small>
                        <span style={{ fontSize: '0.85rem' }}>{formatDate(budget.start_date)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">End Date</small>
                        <span style={{ fontSize: '0.85rem' }}>{formatDate(budget.end_date)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Days Left</small>
                        <span style={{ fontSize: '0.85rem', color: daysRemaining < 0 ? '#dc3545' : daysRemaining < 7 ? '#fd7e14' : '#28a745' }}>
                          {daysRemaining < 0 ? `Ended ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days`}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <small className="text-muted">Status</small>
                        <span className="badge px-2 py-1" style={{ background: statusInfo.bgColor, color: statusInfo.color, fontSize: '0.75rem' }}>
                          <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-info-circle mr-2"></i>Budget Information
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <small className="text-muted">Budget ID</small>
                      <code style={{ fontSize: '0.75rem' }}>{budget.id}</code>
                    </div>
                    <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <small className="text-muted">Name</small>
                      <strong>{budget.name}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <small className="text-muted">Category</small>
                      <span><i className="fas fa-tag text-muted mr-1"></i>{budget.category}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <small className="text-muted">Amount</small>
                      <strong className="text-primary">₱{budget.amount.toLocaleString()}</strong>
                    </div>
                    <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <small className="text-muted">Period</small>
                      <span>{formatDate(budget.start_date)} - {formatDate(budget.end_date)}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2">
                      <small className="text-muted">Status</small>
                      <span className="badge px-2 py-1" style={{ background: statusInfo.bgColor, color: statusInfo.color, fontSize: '0.75rem' }}>
                        <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Tab */}
              {activeTab === 'owner' && (
                <div>
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-user mr-2"></i>Budget Owner
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="d-flex align-items-center mb-3">
                      <img
                        src={budget.user_avatar || "../images/placeholder.png"}
                        alt={budget.user_name}
                        className="rounded-circle mr-3"
                        style={{ width: '64px', height: '64px', objectFit: 'cover', border: '3px solid #dc3545' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{budget.user_name}</div>
                        <small className="text-muted">{budget.user_email}</small>
                        <div className="mt-1">
                          <span className="badge px-2 py-1" style={{ background: statusInfo.bgColor, color: statusInfo.color, fontSize: '0.7rem' }}>
                            <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label} Budget
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2" style={{ borderTop: '1px solid #e9ecef' }}>
                      <div className="row text-center" style={{ fontSize: '0.85rem' }}>
                        <div className="col-4">
                          <small className="text-muted d-block">Budget</small>
                          <strong className="text-primary">₱{budget.amount.toLocaleString()}</strong>
                        </div>
                        <div className="col-4">
                          <small className="text-muted d-block">Spent</small>
                          <strong className="text-danger">₱{budget.spent.toLocaleString()}</strong>
                        </div>
                        <div className="col-4">
                          <small className="text-muted d-block">Progress</small>
                          <strong style={{ color: getProgressColor(progressPercent) }}>{progressPercent}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Tab */}
              {activeTab === 'status' && (
                <div>
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-cogs mr-2"></i>Status Management
                  </h6>
                  <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      Current status: <strong style={{ color: statusInfo.color }}>{statusInfo.label}</strong>
                    </p>
                    <div className="d-flex" style={{ gap: '8px' }}>
                      {[
                        { value: 'active', label: 'Active', icon: 'fa-play-circle', color: '#28a745' },
                        { value: 'completed', label: 'Completed', icon: 'fa-check-circle', color: '#007bff' },
                        { value: 'archived', label: 'Archived', icon: 'fa-archive', color: '#6c757d' }
                      ].map(status => (
                        <button
                          key={status.value}
                          type="button"
                          className={`btn btn-sm flex-fill ${budget.status === status.value ? '' : 'btn-outline-secondary'}`}
                          style={{ 
                            borderRadius: '6px',
                            background: budget.status === status.value ? status.color : undefined,
                            borderColor: budget.status === status.value ? status.color : undefined,
                            color: budget.status === status.value ? 'white' : undefined
                          }}
                          onClick={() => onStatusChange(budget, status.value as "active" | "completed" | "archived")}
                        >
                          <i className={`fas ${status.icon} mr-1`}></i>
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                    <small className="text-muted">
                      <i className="fas fa-info-circle mr-1 text-danger"></i>
                      Status changes are saved immediately and may affect the budget's visibility and tracking.
                    </small>
                  </div>
                </div>
              )}
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
                  onClick={onClose}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-times mr-1"></i>Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={() => onEdit && onEdit(budget)}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-edit mr-1"></i>Edit
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => onDelete && onDelete(budget)}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-trash mr-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BudgetDetailModal;