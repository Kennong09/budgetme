import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { addAdminRole, removeAdminRole } from "../../../utils/adminHelpers";
import { useToast } from "../../../utils/ToastContext";
import { User } from "./types";

interface AdminRoleModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdated: (userId: string, isAdmin: boolean) => void;
  isCurrentlyAdmin: boolean;
}

const AdminRoleModal: FC<AdminRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onRoleUpdated,
  isCurrentlyAdmin
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { showSuccessToast, showErrorToast } = useToast();

  const handleToggleAdminRole = async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      if (isCurrentlyAdmin) {
        await removeAdminRole(user.id);
        showSuccessToast("Admin role removed successfully");
        onRoleUpdated(user.id, false);
      } else {
        await addAdminRole(user.id);
        showSuccessToast("Admin role granted successfully");
        onRoleUpdated(user.id, true);
      }
      onClose();
    } catch (err: any) {
      console.error("Error updating admin role:", err);
      setError(err.message || "Failed to update admin role");
      showErrorToast("Failed to update admin role");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  if (!isOpen || !user) return null;

  const actionTitle = isCurrentlyAdmin ? "Remove Admin Role" : "Grant Admin Role";
  const actionIcon = isCurrentlyAdmin ? "fa-user-minus" : "fa-user-shield";
  const actionColor = isCurrentlyAdmin ? "#fd7e14" : "#17a2b8";

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
                  <i className={`fas ${actionIcon} ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">{actionTitle}</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    Administrative permissions
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

            {/* Quick Stats Bar */}
            <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-4">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${isCurrentlyAdmin ? 'fa-shield-alt' : 'fa-user'} mr-2`} style={{ color: isCurrentlyAdmin ? '#dc3545' : '#007bff' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Current</small>
                      <strong style={{ fontSize: '0.8rem', color: isCurrentlyAdmin ? '#dc3545' : '#007bff' }}>
                        {isCurrentlyAdmin ? 'Admin' : 'User'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-arrow-right text-muted mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Action</small>
                      <strong style={{ fontSize: '0.8rem', color: actionColor }}>
                        {isCurrentlyAdmin ? 'Demote' : 'Promote'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${isCurrentlyAdmin ? 'fa-user' : 'fa-shield-alt'} mr-2`} style={{ color: isCurrentlyAdmin ? '#007bff' : '#dc3545' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>New Role</small>
                      <strong style={{ fontSize: '0.8rem', color: isCurrentlyAdmin ? '#007bff' : '#dc3545' }}>
                        {isCurrentlyAdmin ? 'User' : 'Admin'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
              )}

              {/* User Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center">
                  <div className="position-relative mr-3">
                    <img 
                      src={user.user_metadata?.avatar_url || "../images/placeholder.png"} 
                      alt={user.user_metadata?.full_name || "User"} 
                      className="rounded-circle"
                      style={{ width: '60px', height: '60px', objectFit: 'cover', border: `3px solid ${isCurrentlyAdmin ? '#dc3545' : '#007bff'}` }}
                      onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                    />
                    <div className="position-absolute d-flex align-items-center justify-content-center"
                         style={{ bottom: '-2px', right: '-2px', width: '22px', height: '22px', background: isCurrentlyAdmin ? '#dc3545' : '#007bff', borderRadius: '50%', border: '2px solid white' }}>
                      <i className={`fas ${isCurrentlyAdmin ? 'fa-shield-alt' : 'fa-user'} text-white`} style={{ fontSize: '0.6rem' }}></i>
                    </div>
                  </div>
                  <div>
                    <h6 className="mb-1 font-weight-bold">{user.user_metadata?.full_name || 'Unknown User'}</h6>
                    <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>{user.email}</p>
                    <Badge bg={isCurrentlyAdmin ? 'danger' : 'primary'} style={{ fontSize: '0.7rem' }}>
                      <i className={`fas ${isCurrentlyAdmin ? 'fa-shield-alt' : 'fa-user'} mr-1`}></i>
                      {isCurrentlyAdmin ? 'Administrator' : 'Regular User'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Description */}
              <div className="p-3 mb-3" style={{ 
                background: isCurrentlyAdmin ? 'rgba(253, 126, 20, 0.1)' : 'rgba(23, 162, 184, 0.1)', 
                borderRadius: '8px', 
                borderLeft: `3px solid ${actionColor}` 
              }}>
                <div className="d-flex align-items-start">
                  <i className={`fas ${isCurrentlyAdmin ? 'fa-exclamation-triangle' : 'fa-info-circle'} mr-2 mt-1`} style={{ color: actionColor }}></i>
                  <div>
                    <strong style={{ color: actionColor, fontSize: '0.9rem' }}>{actionTitle}</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      {isCurrentlyAdmin 
                        ? "This user will lose administrative privileges and access to admin features."
                        : "This user will gain full administrative access to the system."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions Overview */}
              <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-key mr-2"></i>
                {isCurrentlyAdmin ? "Permissions to be Removed:" : "Permissions to be Granted:"}
              </h6>
              <div className="row g-2">
                {[
                  { icon: 'fa-users', color: 'primary', title: 'User Management', items: ['View all users', 'Create/edit users', 'Manage roles'] },
                  { icon: 'fa-chart-bar', color: 'success', title: 'Analytics', items: ['Admin dashboard', 'System stats', 'Reports'] },
                  { icon: 'fa-cog', color: 'warning', title: 'Settings', items: ['System config', 'Integrations', 'Security'] },
                  { icon: 'fa-database', color: 'info', title: 'Data', items: ['Database admin', 'Backups', 'Exports'] }
                ].map((perm, i) => (
                  <div key={i} className="col-6 mb-2">
                    <div className="p-2 h-100" style={{ background: '#f8f9fa', borderRadius: '6px' }}>
                      <div className="d-flex align-items-center mb-1">
                        <i className={`fas ${perm.icon} text-${perm.color} mr-2`} style={{ fontSize: '0.8rem' }}></i>
                        <strong style={{ fontSize: '0.8rem' }}>{perm.title}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem' }}>
                        {perm.items.map((item, j) => (
                          <div key={j} className="text-muted">
                            <i className={`fas ${isCurrentlyAdmin ? 'fa-minus' : 'fa-plus'} mr-1`} style={{ fontSize: '0.6rem', color: isCurrentlyAdmin ? '#dc3545' : '#28a745' }}></i>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security Notice */}
              {!isCurrentlyAdmin && (
                <div className="mt-3 p-2" style={{ background: '#f8f9fa', borderRadius: '6px' }}>
                  <small className="text-muted">
                    <i className="fas fa-shield-alt mr-1 text-secondary"></i>
                    <strong>Security Notice:</strong> Admin privileges should only be granted to trusted users. This action will be logged.
                  </small>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 py-2" style={{ background: '#f8f9fa' }}>
              <small className="text-muted mr-auto" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-clock mr-1"></i>Changes take effect immediately
              </small>
              <button type="button" className="btn btn-secondary btn-sm mr-2" onClick={handleClose} disabled={loading}>
                <i className="fas fa-times mr-1"></i>Cancel
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${isCurrentlyAdmin ? 'btn-warning' : 'btn-danger'}`}
                onClick={handleToggleAdminRole}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm mr-1"></span>Processing...</>
                ) : (
                  <><i className={`fas ${actionIcon} mr-1`}></i>{isCurrentlyAdmin ? 'Remove Admin' : 'Grant Admin'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminRoleModal;
