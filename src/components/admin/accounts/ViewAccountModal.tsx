import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { AdminAccount, ACCOUNT_TYPE_CONFIGS, ACCOUNT_STATUS_CONFIGS } from "./types";
import { getCurrencySymbol } from "../../settings/utils/currencyHelpers";

interface ViewAccountModalProps {
  show: boolean;
  onClose: () => void;
  account: AdminAccount | null;
}

const ViewAccountModal: FC<ViewAccountModalProps> = ({ show, onClose, account }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!show || !account) return null;

  const typeConfig = ACCOUNT_TYPE_CONFIGS.find(config => config.value === account.account_type) || ACCOUNT_TYPE_CONFIGS[5];
  const statusConfig = ACCOUNT_STATUS_CONFIGS.find(config => config.value === account.status) || ACCOUNT_STATUS_CONFIGS[0];
  const currencySymbol = getCurrencySymbol('PHP');

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const balanceDiff = account.balance - (account.initial_balance || 0);
  const accountAge = Math.floor((Date.now() - new Date(account.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '550px', width: 'calc(100% - 16px)' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh', margin: '8px' }}
          >
            
            {/* Header - Mobile Responsive */}
            <div 
              className="modal-header border-0 text-white" 
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', padding: '12px 16px' }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center flex-shrink-0" 
                  style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', marginRight: '10px' }}
                >
                  <i className={typeConfig.icon} style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Account Details</h6>
                  <small className="d-none d-sm-block text-truncate" style={{ opacity: 0.9, fontSize: '11px' }}>{account.account_name}</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fas fa-times text-danger" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile Responsive */}
            <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-1">
                <div className="col-3">
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center">
                    <i className={`${statusConfig.icon}`} style={{ color: statusConfig.value === 'active' ? '#28a745' : statusConfig.value === 'inactive' ? '#6c757d' : '#dc3545', fontSize: '0.8rem' }}></i>
                    <div className="text-center text-sm-left ml-sm-1">
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem', lineHeight: 1 }}>Status</small>
                      <strong style={{ fontSize: '0.7rem', color: statusConfig.value === 'active' ? '#28a745' : statusConfig.value === 'inactive' ? '#6c757d' : '#dc3545' }}>{statusConfig.label}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center">
                    <i className={`${typeConfig.icon} text-danger`} style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-center text-sm-left ml-sm-1">
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem', lineHeight: 1 }}>Type</small>
                      <strong className="text-danger" style={{ fontSize: '0.7rem' }}>{typeConfig.label}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center">
                    <i className="fas fa-calendar-alt text-danger" style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-center text-sm-left ml-sm-1">
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem', lineHeight: 1 }}>Age</small>
                      <strong className="text-danger" style={{ fontSize: '0.7rem' }}>{accountAge}d</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center">
                    <i className={`fas ${account.is_default ? 'fa-star text-warning' : 'fa-circle text-secondary'}`} style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-center text-sm-left ml-sm-1">
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem', lineHeight: 1 }}>Default</small>
                      <strong style={{ fontSize: '0.7rem' }} className={account.is_default ? 'text-warning' : 'text-secondary'}>
                        {account.is_default ? 'Yes' : 'No'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body - Mobile Responsive */}
            <div 
              className="modal-body" 
              style={{ maxHeight: 'calc(90vh - 180px)', overflowY: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}
            >
              
              {/* Balance Card */}
              <div className="mb-3 p-3 text-center" style={{ background: account.balance >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)', borderRadius: '10px' }}>
                <small className="text-muted d-block">Current Balance</small>
                <h4 className={`mb-1 font-weight-bold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {currencySymbol}{Math.abs(account.balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>

              {/* Tab Navigation */}
              <div className="px-3 pt-2">
                <div className="d-flex" style={{ gap: '6px' }}>
                  {[
                    { id: 'overview', icon: 'fa-university', label: 'Overview' },
                    { id: 'financial', icon: 'fa-coins', label: 'Financial' },
                    { id: 'details', icon: 'fa-info-circle', label: 'Details' }
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

              {/* Modal Body */}
              <div className="modal-body py-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="row">
                    {/* Left Column - Account Card */}
                    <div className="col-lg-5 text-center mb-3 mb-lg-0">
                      <div className="position-relative d-inline-block mb-3">
                        <div 
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{ 
                            width: '80px', height: '80px', 
                            backgroundColor: account.color || typeConfig.color + '20',
                            border: `3px solid ${account.color || typeConfig.color}`,
                            margin: '0 auto'
                          }}
                        >
                          <i className={typeConfig.icon} style={{ fontSize: '32px', color: account.color || typeConfig.color }}></i>
                        </div>
                        <div className="position-absolute" style={{ bottom: '5px', right: '5px', width: '18px', height: '18px', borderRadius: '50%', background: statusConfig.value === 'active' ? '#28a745' : '#6c757d', border: '2px solid white' }}></div>
                      </div>
                      <h6 className="font-weight-bold mb-1">{account.account_name}</h6>
                      <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>{typeConfig.description}</p>
                      <div className="d-flex justify-content-center flex-wrap" style={{ gap: '6px' }}>
                        <Badge bg={statusConfig.value === 'active' ? 'success' : statusConfig.value === 'inactive' ? 'secondary' : 'danger'} style={{ fontSize: '0.7rem' }}>
                          <i className={`${statusConfig.icon} mr-1`}></i>{statusConfig.label}
                        </Badge>
                        <Badge bg="danger" style={{ fontSize: '0.7rem' }}>
                          <i className={`${typeConfig.icon} mr-1`}></i>{typeConfig.label}
                        </Badge>
                        {account.is_default && (
                          <Badge bg="warning" style={{ fontSize: '0.7rem' }}>
                            <i className="fas fa-star mr-1"></i>Default
                          </Badge>
                        )}
                      </div>
                      
                      {/* Balance Display */}
                      <div className="mt-3 p-3" style={{ background: account.balance >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)', borderRadius: '8px' }}>
                        <small className="text-muted d-block">Current Balance</small>
                        <h4 className={`mb-0 font-weight-bold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                          {currencySymbol}{Math.abs(account.balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                      </div>
                    </div>

                    {/* Right Column - Quick Info */}
                    <div className="col-lg-7">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Quick Info</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Account ID</small>
                          <code style={{ fontSize: '0.75rem' }}>{account.id?.substring(0, 16)}...</code>
                        </div>
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Owner</small>
                          <span style={{ fontSize: '0.8rem' }}>{account.user_name || 'N/A'}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Email</small>
                          <span style={{ fontSize: '0.8rem' }}>{account.user_email || 'N/A'}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Created</small>
                          <span style={{ fontSize: '0.8rem' }}>{formatDate(account.created_at)}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <small className="text-muted">Currency</small>
                          <Badge bg="info" style={{ fontSize: '0.7rem' }}>{account.currency || 'PHP'}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-wallet mr-2"></i>Balance Summary</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr>
                              <td className="text-muted py-1">Current Balance</td>
                              <td className="text-right py-1">
                                <strong className={account.balance >= 0 ? 'text-success' : 'text-danger'}>
                                  {currencySymbol}{account.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-muted py-1">Initial Balance</td>
                              <td className="text-right py-1">{currencySymbol}{(account.initial_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="text-muted py-1">Net Change</td>
                              <td className="text-right py-1">
                                <strong className={balanceDiff >= 0 ? 'text-success' : 'text-danger'}>
                                  {balanceDiff >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(balanceDiff).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-chart-line mr-2"></i>Performance</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr>
                              <td className="text-muted py-1">Account Age</td>
                              <td className="text-right py-1"><strong className="text-danger">{accountAge} days</strong></td>
                            </tr>
                            <tr>
                              <td className="text-muted py-1">Transactions</td>
                              <td className="text-right py-1">{account.transaction_count || 0}</td>
                            </tr>
                            <tr>
                              <td className="text-muted py-1">Status</td>
                              <td className="text-right py-1">
                                <Badge bg={statusConfig.value === 'active' ? 'success' : 'secondary'} style={{ fontSize: '0.65rem' }}>{statusConfig.label}</Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Balance Progress */}
                    <div className="col-12">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-chart-bar mr-2"></i>Balance Progress</h6>
                      <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="d-flex justify-content-between mb-2">
                          <small className="text-muted">Initial → Current</small>
                          <strong className={balanceDiff >= 0 ? 'text-success' : 'text-danger'} style={{ fontSize: '0.85rem' }}>
                            {balanceDiff >= 0 ? '+' : ''}{((balanceDiff / (account.initial_balance || 1)) * 100).toFixed(1)}%
                          </strong>
                        </div>
                        <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                          <div 
                            className={`progress-bar ${balanceDiff >= 0 ? 'bg-success' : 'bg-danger'}`}
                            style={{ width: `${Math.min(Math.abs((account.balance / (account.initial_balance || account.balance || 1)) * 100), 100)}%`, borderRadius: '4px' }}
                          ></div>
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
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-user mr-2"></i>Owner Details</h6>
                        <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                          <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                            <tbody>
                              <tr><td className="text-muted py-1">User ID</td><td className="text-right py-1"><code style={{ fontSize: '0.7rem' }}>{account.user_id?.substring(0, 12)}...</code></td></tr>
                              <tr><td className="text-muted py-1">Name</td><td className="text-right py-1">{account.user_name || 'N/A'}</td></tr>
                              <tr><td className="text-muted py-1">Email</td><td className="text-right py-1">{account.user_email || 'N/A'}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-clock mr-2"></i>Timestamps</h6>
                        <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                          <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                            <tbody>
                              <tr><td className="text-muted py-1">Created</td><td className="text-right py-1">{formatDate(account.created_at)}</td></tr>
                              <tr><td className="text-muted py-1">Updated</td><td className="text-right py-1">{formatDate(account.updated_at)}</td></tr>
                              <tr><td className="text-muted py-1">Age</td><td className="text-right py-1"><strong className="text-danger">{accountAge} days</strong></td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(account.description || account.institution_name || account.account_number_masked || account.admin_notes) && (
                      <>
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-file-alt mr-2"></i>Additional Information</h6>
                        <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                          {account.institution_name && (
                            <div className="mb-2">
                              <small className="text-muted d-block">Institution</small>
                              <span style={{ fontSize: '0.85rem' }}>{account.institution_name}</span>
                            </div>
                          )}
                          {account.account_number_masked && (
                            <div className="mb-2">
                              <small className="text-muted d-block">Account Number</small>
                              <code style={{ fontSize: '0.85rem' }}>****{account.account_number_masked}</code>
                            </div>
                          )}
                          {account.description && (
                            <div className="mb-2">
                              <small className="text-muted d-block">Description</small>
                              <span style={{ fontSize: '0.85rem' }}>{account.description}</span>
                            </div>
                          )}
                          {account.admin_notes && (
                            <div className="p-2 mt-2" style={{ background: '#fff5f5', borderRadius: '6px', borderLeft: '3px solid #dc3545' }}>
                              <small className="text-danger d-block"><i className="fas fa-sticky-note mr-1"></i>Admin Notes</small>
                              <span style={{ fontSize: '0.85rem' }}>{account.admin_notes}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
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
                  <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{account.id?.substring(0, 12)}...</code>
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

export default ViewAccountModal;