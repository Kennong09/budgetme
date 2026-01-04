import React, { useState, FC } from "react";
import { Badge } from "react-bootstrap";
import { Family } from "./types";
import { useToast } from "../../../utils/ToastContext";

interface DeleteFamilyModalProps {
  show: boolean;
  family: Family | null;
  onClose: () => void;
  onConfirmDelete: (familyId: string) => Promise<boolean>;
}

const DeleteFamilyModal: FC<DeleteFamilyModalProps> = ({
  show,
  family,
  onClose,
  onConfirmDelete
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string>("");
  const { showSuccessToast } = useToast();

  // Handle deletion confirmation
  const handleConfirmDelete = async () => {
    if (!family) return;

    setLoading(true);
    setError("");
    try {
      const success = await onConfirmDelete(family.id);
      if (success) {
        showSuccessToast(`Family "${family.family_name}" has been deleted successfully`);
        handleClose();
      }
    } catch (err: any) {
      console.error('Error in delete confirmation:', err);
      setError(err.message || 'Failed to delete family');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setConfirmText("");
      setError("");
      onClose();
    }
  };

  // Check if confirmation text matches
  const isConfirmed = confirmText.toLowerCase() === 'delete';

  if (!show || !family) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div className="modal-dialog modal-md modal-dialog-centered mx-2 mx-md-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '90vh' }}>
            
            {/* Header */}
            <div className="modal-header border-0 text-white py-2 py-md-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-trash-alt" style={{ fontSize: '1rem' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-truncate" style={{ fontSize: '0.9rem' }}>Delete Family Group</h6>
                  <small className="d-none d-md-block" style={{ opacity: 0.9, fontSize: '0.75rem' }}>This action cannot be undone</small>
                </div>
                <button type="button" className="btn btn-light btn-sm flex-shrink-0" onClick={handleClose} disabled={loading}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-2 py-md-3 px-2 px-md-3" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              
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
                      This will permanently remove the family group and all associated data including members, shared finances, and settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Family Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center mb-3">
                  {family.owner?.avatar_url ? (
                    <img src={family.owner.avatar_url} alt={family.owner.full_name} className="rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', fontSize: '0.9rem', fontWeight: 600 }}>
                      {family.family_name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{family.family_name}</strong>
                    <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                      <Badge bg={family.status === 'active' ? 'success' : 'secondary'} style={{ fontSize: '0.65rem' }}>
                        {family.status}
                      </Badge>
                      <Badge bg={family.is_public ? 'info' : 'secondary'} style={{ fontSize: '0.65rem' }}>
                        {family.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="row" style={{ fontSize: '0.8rem' }}>
                  <div className="col-6 mb-2">
                    <small className="text-muted d-block">Owner</small>
                    <span>{family.owner?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="col-6 mb-2">
                    <small className="text-muted d-block">Members</small>
                    <span className="text-danger font-weight-bold">{family.members_count || 0}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Currency</small>
                    <span>{family.currency_pref}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Family ID</small>
                    <code style={{ fontSize: '0.7rem' }}>{family.id?.substring(0, 8)}...</code>
                  </div>
                </div>
              </div>

              {/* What Will Be Deleted */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>What will be deleted:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-users', label: 'Family Group' },
                    { icon: 'fa-user-friends', label: `${family.members_count || 0} Members` },
                    { icon: 'fa-chart-pie', label: 'Shared Finances' },
                    { icon: 'fa-cog', label: 'Settings' }
                  ].map((item, i) => (
                    <span key={i} className="badge badge-light px-2 py-1" 
                          style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                      <i className={`fas ${item.icon} text-danger mr-1`}></i>{item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="mb-0">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-shield-alt mr-2"></i>Confirmation Required
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                    Type <code className="text-danger">delete</code> to confirm:
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${isConfirmed ? 'is-valid' : confirmText ? 'is-invalid' : ''}`}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "delete" to confirm'
                    disabled={loading}
                    autoComplete="off"
                    style={{ fontSize: '0.85rem' }}
                  />
                  {confirmText && !isConfirmed && (
                    <small className="text-danger" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-exclamation-circle mr-1"></i>Please type "delete" to confirm
                    </small>
                  )}
                  {isConfirmed && (
                    <small className="text-success" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-check-circle mr-1"></i>Confirmed. You can now proceed with deletion.
                    </small>
                  )}
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-exclamation-triangle mr-1"></i>
                {family.members_count || 0} member{(family.members_count || 0) !== 1 ? 's' : ''} will be affected
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
                  onClick={handleConfirmDelete} 
                  disabled={loading || !isConfirmed}
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
                    <><i className="fas fa-trash mr-1"></i>Delete</>
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

export default DeleteFamilyModal;
