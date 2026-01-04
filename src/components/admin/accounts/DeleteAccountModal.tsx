import React, { FC, useState } from "react";
import { AdminAccount, ACCOUNT_TYPE_CONFIGS } from "./types";

interface DeleteAccountModalProps {
  show: boolean;
  onClose: () => void;
  onDelete: (accountId: string) => Promise<boolean>;
  account: AdminAccount | null;
  loading?: boolean;
}

const DeleteAccountModal: FC<DeleteAccountModalProps> = ({
  show,
  onClose,
  onDelete,
  account
}) => {
  const [confirmText, setConfirmText] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);

  const handleDelete = async () => {
    if (!account || confirmText !== account.account_name) {
      return;
    }

    setDeleting(true);
    try {
      const success = await onDelete(account.id!);
      if (success) {
        setConfirmText("");
        setAcknowledgeWarnings(false);
        onClose();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setConfirmText("");
      setAcknowledgeWarnings(false);
      onClose();
    }
  };

  if (!show || !account) return null;

  const typeConfig = ACCOUNT_TYPE_CONFIGS.find(config => config.value === account.account_type) || ACCOUNT_TYPE_CONFIGS[5];
  const isConfirmValid = confirmText === account.account_name && acknowledgeWarnings;

  // Calculate potential impact
  const warnings: { type: string; icon: string; message: string }[] = [];
  
  if (account.is_default) {
    warnings.push({
      type: "danger",
      icon: "fas fa-star",
      message: "This is the default account for the user. Deleting it may affect user functionality."
    });
  }
  
  if (account.balance !== 0) {
    warnings.push({
      type: "warning", 
      icon: "fas fa-coins",
      message: `Account has a non-zero balance of ${account.display_balance}. This balance will be lost.`
    });
  }
  
  if (account.transaction_count && account.transaction_count > 0) {
    warnings.push({
      type: "info",
      icon: "fas fa-exchange-alt", 
      message: `This account has ${account.transaction_count} associated transactions. Consider the impact on financial records.`
    });
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '450px', width: 'calc(100% - 16px)' }}
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
                  <i className="fas fa-trash-alt" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Delete Account</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>This action cannot be undone</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={deleting}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fas fa-times text-danger" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>

            {/* Body - Mobile Responsive */}
            <div 
              className="modal-body" 
              style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}
            >
              
              {/* Account Info Card */}
              <div className="mb-3 p-3 text-center" style={{ background: '#fff5f5', borderRadius: '8px', border: '2px solid #dc3545' }}>
                <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '50px', height: '50px', backgroundColor: '#dc354520', borderRadius: '50%' }}>
                  <i className={typeConfig.icon} style={{ color: '#dc3545', fontSize: '1.5rem' }}></i>
                </div>
                <h6 className="font-weight-bold mb-1" style={{ fontSize: '0.95rem' }}>{account.account_name}</h6>
                <small className="text-muted d-block mb-2">{account.user_name} • {account.user_email}</small>
                <div className="d-flex justify-content-center flex-wrap" style={{ gap: '8px', fontSize: '0.8rem' }}>
                  <span><strong>Type:</strong> {typeConfig.label}</span>
                  <span><strong>Balance:</strong> <span className={account.balance >= 0 ? 'text-success' : 'text-danger'}>{account.display_balance}</span></span>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-exclamation-triangle mr-2"></i>Impact Assessment</h6>
                  {warnings.map((warning, index) => (
                    <div key={index} className="p-2 mb-2 d-flex align-items-start" style={{ background: warning.type === 'danger' ? '#fff5f5' : warning.type === 'warning' ? '#fff8e6' : '#e8f4fc', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <i className={`${warning.icon} mr-2 mt-1`} style={{ color: warning.type === 'danger' ? '#dc3545' : warning.type === 'warning' ? '#f6c23e' : '#36b9cc', fontSize: '0.75rem' }}></i>
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmation Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-keyboard mr-2"></i>Confirmation Required</h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <p className="mb-2" style={{ fontSize: '0.8rem' }}>
                    Type the account name to confirm: <code className="text-danger">{account.account_name}</code>
                  </p>
                  <input type="text" className={`form-control form-control-sm ${confirmText === account.account_name ? 'is-valid' : confirmText ? 'is-invalid' : ''}`} placeholder={`Type "${account.account_name}"`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={deleting} style={{ fontSize: '0.85rem' }} />
                  {confirmText && confirmText !== account.account_name && (
                    <small className="text-danger">Account name doesn't match</small>
                  )}
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="acknowledgeWarnings" checked={acknowledgeWarnings} onChange={(e) => setAcknowledgeWarnings(e.target.checked)} disabled={deleting} />
                <label className="form-check-label" htmlFor="acknowledgeWarnings" style={{ fontSize: '0.8rem' }}>
                  <strong>I understand and want to permanently delete this account</strong>
                </label>
              </div>

              {/* Final Warning */}
              <div className="p-2" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                <div className="d-flex align-items-center">
                  <i className="fas fa-skull-crossbones text-danger mr-2"></i>
                  <div>
                    <strong className="text-danger" style={{ fontSize: '0.8rem' }}>Permanent Deletion</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>This cannot be undone and may affect financial reports.</p>
                  </div>
                </div>
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{account.id?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClose} 
                  disabled={deleting}
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
                  onClick={handleDelete} 
                  disabled={!isConfirmValid || deleting}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {deleting ? (<><span className="spinner-border spinner-border-sm mr-1"></span>Deleting...</>) : (<><i className="fas fa-trash mr-1"></i>Delete</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteAccountModal;
