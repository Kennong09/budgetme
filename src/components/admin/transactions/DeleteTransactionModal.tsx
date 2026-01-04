import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { formatCurrency, formatDate } from "../../../utils/helpers";
import { DeleteTransactionModalProps } from "./types";

const DeleteTransactionModal: FC<DeleteTransactionModalProps> = ({
  transaction,
  show,
  onClose,
  onTransactionDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');
  const { showSuccessToast, showErrorToast } = useToast();

  if (!show || !transaction) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      
      // Get transaction details before deleting
      const { data: transactionData, error: fetchError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transaction.id)
        .single();

      if (fetchError) throw fetchError;

      if (!transactionData) {
        throw new Error("Transaction not found");
      }

      // Delete the transaction
      const { error: deleteError } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteError) throw deleteError;

      // Reverse the transaction's effect on account balance
      const balanceChange = transactionData.type === 'income' ? -transactionData.amount : transactionData.amount;

      await supabaseAdmin.rpc('update_account_balance', {
        p_account_id: transactionData.account_id,
        p_amount_change: balanceChange
      });

      // Reverse the transaction's effect on goal progress (if applicable)
      if (transactionData.goal_id) {
        await supabaseAdmin.rpc('update_goal_progress', {
          p_goal_id: transactionData.goal_id,
          p_amount: -transactionData.amount
        });
      }

      showSuccessToast("Transaction deleted successfully");
      
      if (onTransactionDeleted) {
        onTransactionDeleted(transaction.id);
      }
      
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
      showErrorToast(err.message || "Failed to delete transaction");
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'income': return { label: 'Income', color: '#28a745', bg: 'success', icon: 'fa-plus-circle', impact: 'decrease account balance' };
      case 'expense': return { label: 'Expense', color: '#dc3545', bg: 'danger', icon: 'fa-minus-circle', impact: 'increase account balance' };
      case 'contribution': return { label: 'Contribution', color: '#17a2b8', bg: 'info', icon: 'fa-flag', impact: 'increase account balance and decrease goal progress' };
      default: return { label: 'Transaction', color: '#6c757d', bg: 'secondary', icon: 'fa-exchange-alt', impact: 'affect account balance' };
    }
  };

  const typeInfo = getTypeInfo(transaction.type);
  const isConfirmed = confirmText.toLowerCase() === 'delete';

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '480px', width: 'calc(100% - 16px)' }}
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
                  <i className="fas fa-trash-alt" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Delete Transaction</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>This action cannot be undone</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={isDeleting}
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

            {/* Body - Mobile Responsive */}
            <div 
              className="modal-body" 
              style={{ 
                maxHeight: 'calc(90vh - 140px)', 
                overflowY: 'auto',
                padding: '12px 16px',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
              )}

              {/* Warning Banner */}
              <div className="p-3 mb-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-exclamation-triangle text-danger mr-2 mt-1"></i>
                  <div>
                    <strong className="text-danger" style={{ fontSize: '0.9rem' }}>Permanent Deletion</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      This will permanently remove the transaction and {typeInfo.impact}. All associated data will be lost.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center mb-3">
                  {transaction.user_avatar ? (
                    <img src={transaction.user_avatar} alt={transaction.user_name} className="rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                         onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', fontSize: '0.9rem', fontWeight: 600 }}>
                      {(transaction.user_name || transaction.user_email || 'U')?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{transaction.user_name || transaction.user_email || 'Unknown User'}</strong>
                    <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                      <Badge bg={typeInfo.bg} style={{ fontSize: '0.65rem' }}>
                        <i className={`fas ${typeInfo.icon} mr-1`}></i>{typeInfo.label}
                      </Badge>
                      <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>{transaction.account_name || 'N/A'}</Badge>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="row text-center g-2">
                  <div className="col-3">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <div className="font-weight-bold" style={{ color: typeInfo.color, fontSize: '0.95rem' }}>
                        {formatCurrency(transaction.amount)}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Amount</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                        {formatDate(transaction.date)}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Date</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                        {transaction.category_name?.substring(0, 8) || 'N/A'}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Category</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <div className={`font-weight-bold ${transaction.goal_id ? 'text-info' : 'text-secondary'}`} style={{ fontSize: '0.95rem' }}>
                        {transaction.goal_id ? 'Yes' : 'No'}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Has Goal</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Will Be Affected */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>What will be affected:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-receipt', label: 'Transaction Record' },
                    { icon: 'fa-wallet', label: 'Account Balance' },
                    { icon: 'fa-chart-line', label: 'Statistics' },
                    ...(transaction.goal_id ? [{ icon: 'fa-flag', label: 'Goal Progress' }] : [])
                  ].map((item, i) => (
                    <span key={i} className="badge badge-light px-2 py-1" 
                          style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                      <i className={`fas ${item.icon} text-danger mr-1`}></i>{item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Goal Warning */}
              {transaction.goal_id && (
                <div className="p-2 mb-3" style={{ background: 'rgba(23, 162, 184, 0.1)', borderRadius: '8px', border: '1px solid rgba(23, 162, 184, 0.2)' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-flag text-info mr-2"></i>
                    <small>
                      <strong>Goal Impact:</strong> This will reduce goal progress by {formatCurrency(transaction.amount)}
                    </small>
                  </div>
                </div>
              )}

              {/* Confirmation Input */}
              <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <label className="mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-keyboard text-danger mr-2"></i>
                  Type <strong className="text-danger">delete</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Type 'delete' to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                  style={{ fontSize: '0.85rem' }}
                />
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{transaction.id?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary flex-1" 
                  onClick={handleClose} 
                  disabled={isDeleting}
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
                  className="btn btn-danger flex-1" 
                  onClick={handleDelete} 
                  disabled={isDeleting || !isConfirmed}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {isDeleting ? (
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

export default DeleteTransactionModal;
