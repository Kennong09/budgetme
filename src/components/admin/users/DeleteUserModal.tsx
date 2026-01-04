import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { User } from "./types";

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: (userId: string) => void;
}

const DeleteUserModal: FC<DeleteUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserDeleted
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { showSuccessToast, showErrorToast } = useToast();

  const handleDelete = async () => {
    if (!user) return;
    if (deleteConfirmation !== "DELETE") {
      setError("Please type 'DELETE' to confirm");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { error: authError } = await supabaseAdmin!.auth.admin.deleteUser(user.id);
      if (authError) throw authError;

      showSuccessToast("User deleted successfully");
      onUserDeleted(user.id);
      handleClose();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError(err.message || "Failed to delete user");
      showErrorToast("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmation("");
    setError("");
    onClose();
  };

  if (!isOpen || !user) return null;

  const isConfirmed = deleteConfirmation === "DELETE";
  const memberDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: window.innerWidth < 768 ? '0' : '12px', 
              overflow: 'hidden', 
              maxHeight: window.innerWidth < 768 ? '100vh' : '85vh',
              minHeight: window.innerWidth < 768 ? '100vh' : 'auto'
            }}
          >
            
            {/* Header - Mobile Optimized */}
            <div className="modal-header border-0 text-white py-2 md:py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2" 
                  style={{ 
                    width: window.innerWidth < 768 ? '32px' : '40px', 
                    height: window.innerWidth < 768 ? '32px' : '40px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '8px' 
                  }}
                >
                  <i className={`fas fa-trash-alt ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">Delete User</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    This action cannot be undone
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={loading}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
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
                      This will permanently remove the user account and all associated data including transactions, budgets, goals, and family associations.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center mb-3">
                  <div className="position-relative mr-2">
                    <img 
                      src={user.user_metadata?.avatar_url || "../images/placeholder.png"} 
                      alt={user.user_metadata?.full_name || "User"} 
                      className="rounded-circle"
                      style={{ width: '50px', height: '50px', objectFit: 'cover', border: '2px solid #dc3545' }}
                      onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                    />
                    <div className="position-absolute d-flex align-items-center justify-content-center"
                         style={{ bottom: '-2px', right: '-2px', width: '20px', height: '20px', background: '#dc3545', borderRadius: '50%', border: '2px solid white' }}>
                      <i className="fas fa-times text-white" style={{ fontSize: '0.6rem' }}></i>
                    </div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{user.user_metadata?.full_name || 'Unknown User'}</strong>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user.email}</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="row text-center g-2">
                  <div className="col-4">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                        {memberDays}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Days Member</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <Badge bg={user.status === 'active' ? 'success' : 'secondary'} style={{ fontSize: '0.7rem' }}>
                        {user.status || 'Inactive'}
                      </Badge>
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Status</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                      <Badge bg={user.email_confirmed_at ? 'info' : 'warning'} style={{ fontSize: '0.7rem' }}>
                        {user.email_confirmed_at ? 'Verified' : 'Pending'}
                      </Badge>
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Email</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Will Be Deleted */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>Data to be removed:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-user', label: 'Account' },
                    { icon: 'fa-database', label: 'Profile' },
                    { icon: 'fa-exchange-alt', label: 'Transactions' },
                    { icon: 'fa-wallet', label: 'Budgets' },
                    { icon: 'fa-bullseye', label: 'Goals' },
                    { icon: 'fa-users', label: 'Family Data' }
                  ].map((item, i) => (
                    <span key={i} className="badge badge-light px-2 py-1" 
                          style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                      <i className={`fas ${item.icon} text-danger mr-1`}></i>{item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <label className="mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-keyboard text-danger mr-2"></i>
                  Type <strong className="text-danger">DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  className={`form-control form-control-sm ${deleteConfirmation && !isConfirmed ? 'is-invalid' : ''}`}
                  placeholder="Type 'DELETE' to confirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  disabled={loading}
                  style={{ fontSize: '0.85rem' }}
                  autoComplete="off"
                />
                {deleteConfirmation && !isConfirmed && (
                  <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>
                    Please type "DELETE" exactly as shown above.
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{user.id?.substring(0, 12)}...</code>
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
                  onClick={handleDelete} 
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

export default DeleteUserModal;
