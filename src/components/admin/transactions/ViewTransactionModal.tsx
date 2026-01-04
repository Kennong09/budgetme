import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { AdminTransaction, ViewTransactionModalProps } from "./types";

const ViewTransactionModal: FC<ViewTransactionModalProps> = ({
  transaction,
  show,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!show || !transaction) return null;

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'income':
        return { label: 'Income', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)', icon: 'fa-plus-circle', badge: 'success' };
      case 'expense':
        return { label: 'Expense', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.1)', icon: 'fa-minus-circle', badge: 'danger' };
      case 'contribution':
        return { label: 'Contribution', color: '#17a2b8', bgColor: 'rgba(23, 162, 184, 0.1)', icon: 'fa-flag', badge: 'info' };
      default:
        return { label: 'Transaction', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)', icon: 'fa-exchange-alt', badge: 'secondary' };
    }
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const typeInfo = getTransactionTypeInfo(transaction.type);
  const transactionDate = new Date(transaction.date);
  const daysSinceTransaction = Math.floor((Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '600px', width: 'calc(100% - 16px)' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: '16px', 
              overflow: 'hidden', 
              maxHeight: '90vh',
              margin: '8px'
            }}
          >
            
            {/* Header - Mobile Responsive */}
            <div 
              className="modal-header border-0 text-white" 
              style={{ 
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                padding: '12px 16px'
              }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center flex-shrink-0" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '10px',
                    marginRight: '10px'
                  }}
                >
                  <i className={`fas ${typeInfo.icon}`} style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Transaction Details</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>
                    {typeInfo.label} • {formatCurrency(transaction.amount)}
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose}
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '8px', 
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-times text-danger" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Compact */}
            <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${typeInfo.icon} mr-2`} style={{ color: typeInfo.color }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Type</small>
                      <strong style={{ color: typeInfo.color, fontSize: '0.8rem' }}>{typeInfo.label}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-coins text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Amount</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formatCurrency(transaction.amount)}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-calendar-alt text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Days Ago</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{daysSinceTransaction}d</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${transaction.goal_id ? 'fa-flag text-info' : 'fa-tag text-secondary'} mr-2`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Goal</small>
                      <strong style={{ fontSize: '0.8rem' }} className={transaction.goal_id ? 'text-info' : 'text-secondary'}>
                        {transaction.goal_id ? 'Linked' : 'None'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Compact */}
            <div className="px-3 pt-2">
              <div className="d-flex" style={{ gap: '6px' }}>
                {[
                  { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                  { id: 'details', icon: 'fa-info-circle', label: 'Details' },
                  { id: 'actions', icon: 'fa-cogs', label: 'Actions' }
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

            {/* Modal Body - Mobile Responsive */}
            <div 
              className="modal-body" 
              style={{ 
                maxHeight: 'calc(90vh - 180px)', 
                overflowY: 'auto',
                padding: '12px 16px',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row">
                  {/* Left Column - Transaction Summary */}
                  <div className="col-lg-5 text-center mb-3 mb-lg-0">
                    <div className="d-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '80px', height: '80px', background: typeInfo.bgColor, borderRadius: '50%', margin: '0 auto', border: `3px solid ${typeInfo.color}` }}>
                      <i className={`fas ${typeInfo.icon} fa-2x`} style={{ color: typeInfo.color }}></i>
                    </div>
                    <h5 className="font-weight-bold mb-1" style={{ color: typeInfo.color }}>{formatCurrency(transaction.amount)}</h5>
                    <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>{typeInfo.label} Transaction</p>
                    <div className="d-flex justify-content-center flex-wrap" style={{ gap: '6px' }}>
                      <Badge bg={typeInfo.badge} style={{ fontSize: '0.7rem' }}>
                        <i className={`fas ${typeInfo.icon} mr-1`}></i>{typeInfo.label}
                      </Badge>
                      {transaction.goal_id && (
                        <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                          <i className="fas fa-flag mr-1"></i>Goal Linked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Quick Info */}
                  <div className="col-lg-7">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Quick Info</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Transaction ID</small>
                        <code style={{ fontSize: '0.75rem' }}>{transaction.id?.substring(0, 16)}...</code>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Date</small>
                        <span style={{ fontSize: '0.8rem' }}>{formatDate(transaction.date)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Account</small>
                        <span style={{ fontSize: '0.8rem' }}>{transaction.account_name || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <small className="text-muted">Category</small>
                        <span style={{ fontSize: '0.8rem' }}>
                          {transaction.category_icon && <span className="mr-1">{transaction.category_icon}</span>}
                          {transaction.category_name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>

                    {/* User Info */}
                    <h6 className="text-danger mb-2 mt-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-user mr-2"></i>User</h6>
                    <div className="d-flex align-items-center p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <img
                        src={transaction.user_avatar || "../images/placeholder.png"}
                        alt={transaction.user_name || "User"}
                        className="rounded-circle mr-2"
                        style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <div>
                        <div className="font-weight-medium" style={{ fontSize: '0.85rem' }}>{transaction.user_name || 'Unknown User'}</div>
                        <small className="text-muted">{transaction.user_email || 'No email'}</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-receipt mr-2"></i>Transaction Info</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr><td className="text-muted py-1">Amount</td><td className="text-right py-1"><strong style={{ color: typeInfo.color }}>{formatCurrency(transaction.amount)}</strong></td></tr>
                            <tr><td className="text-muted py-1">Type</td><td className="text-right py-1"><Badge bg={typeInfo.badge} style={{ fontSize: '0.65rem' }}>{typeInfo.label}</Badge></td></tr>
                            <tr><td className="text-muted py-1">Date</td><td className="text-right py-1">{formatDate(transaction.date)}</td></tr>
                            <tr><td className="text-muted py-1">Created</td><td className="text-right py-1">{formatFullDate(transaction.created_at)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-wallet mr-2"></i>Account & Category</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr><td className="text-muted py-1">Account</td><td className="text-right py-1"><strong>{transaction.account_name || 'N/A'}</strong></td></tr>
                            <tr><td className="text-muted py-1">Account Type</td><td className="text-right py-1">{transaction.account_type || 'N/A'}</td></tr>
                            <tr><td className="text-muted py-1">Category</td><td className="text-right py-1">{transaction.category_name || 'Uncategorized'}</td></tr>
                            <tr><td className="text-muted py-1">Category Icon</td><td className="text-right py-1">{transaction.category_icon || '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {(transaction.notes || transaction.description) && (
                    <div className="mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-align-left mr-2"></i>Description</h6>
                      <div className="p-2" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                        <p className="mb-0" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{transaction.notes || transaction.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Goal Info */}
                  {transaction.goal_id && (
                    <div>
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-flag mr-2"></i>Goal Information</h6>
                      <div className="p-2" style={{ background: 'rgba(23, 162, 184, 0.1)', borderRadius: '8px', border: '1px solid rgba(23, 162, 184, 0.2)' }}>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-flag text-info mr-2"></i>
                          <div>
                            <strong style={{ fontSize: '0.85rem' }}>{transaction.goal_name || 'Unknown Goal'}</strong>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>This transaction contributes to a financial goal</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <div>
                  <h6 className="text-danger mb-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-tools mr-2"></i>Transaction Actions</h6>
                  <div className="row g-2">
                    {onEdit && (
                      <div className="col-md-6 mb-2">
                        <div 
                          className="p-3 text-center h-100" 
                          style={{ background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                          onClick={() => onEdit(transaction)}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffc107'; e.currentTarget.style.background = '#fff8e1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8f9fa'; }}
                        >
                          <div className="d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', margin: '0 auto' }}>
                            <i className="fas fa-edit text-warning"></i>
                          </div>
                          <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Edit Transaction</h6>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Modify amount, date, or details</small>
                        </div>
                      </div>
                    )}
                    {onDelete && (
                      <div className="col-md-6 mb-2">
                        <div 
                          className="p-3 text-center h-100" 
                          style={{ background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                          onClick={() => onDelete(transaction)}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc3545'; e.currentTarget.style.background = '#fff5f5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8f9fa'; }}
                        >
                          <div className="d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '8px', margin: '0 auto' }}>
                            <i className="fas fa-trash-alt text-danger"></i>
                          </div>
                          <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Delete Transaction</h6>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Permanently remove this record</small>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction Impact Info */}
                  <div className="mt-3">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Impact Summary</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className={`fas ${transaction.type === 'income' ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger'} mr-2`}></i>
                        <small>
                          {transaction.type === 'income' 
                            ? `Added ${formatCurrency(transaction.amount)} to account balance`
                            : `Deducted ${formatCurrency(transaction.amount)} from account balance`
                          }
                        </small>
                      </div>
                      {transaction.goal_id && (
                        <div className="d-flex align-items-center">
                          <i className="fas fa-flag text-info mr-2"></i>
                          <small>Contributed {formatCurrency(transaction.amount)} toward goal progress</small>
                        </div>
                      )}
                    </div>
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{transaction.id?.substring(0, 12)}...</code>
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
    </>
  );
};

export default ViewTransactionModal;
