import React from 'react';
import { PERMISSION_CONTEXT_MESSAGES, PermissionErrorType } from '../../constants/permissionErrors';

interface PermissionErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorTitle: string;
  errorMessage: string;
  suggestedActions?: string[];
  userRole?: string;
  showUpgradeOption?: boolean;
  onUpgradeRole?: () => void;
  errorType?: PermissionErrorType;
  showRoleContext?: boolean;
}

const PermissionErrorModal: React.FC<PermissionErrorModalProps> = ({
  isOpen,
  onClose,
  errorTitle,
  errorMessage,
  suggestedActions = [],
  userRole,
  showUpgradeOption = false,
  onUpgradeRole,
  errorType,
  showRoleContext = true
}) => {
  if (!isOpen) return null;

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'viewer':
        return 'fas fa-eye';
      case 'member':
        return 'fas fa-user';
      case 'admin':
        return 'fas fa-user-shield';
      case 'owner':
        return 'fas fa-crown';
      default:
        return 'fas fa-exclamation-triangle';
    }
  };

  const getErrorTypeIcon = (type?: PermissionErrorType) => {
    switch (type) {
      case PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED:
        return 'fas fa-users';
      case PermissionErrorType.FAMILY_GOAL_CREATION_DENIED:
        return 'fas fa-bullseye';
      case PermissionErrorType.CONTRIBUTION_ACCESS_DENIED:
        return 'fas fa-coins';
      case PermissionErrorType.ROLE_MANAGEMENT_DENIED:
        return 'fas fa-user-shield';
      case PermissionErrorType.ADMIN_LIMITATION:
        return 'fas fa-crown';
      default:
        return 'fas fa-exclamation-triangle';
    }
  };

  const getErrorTypeColor = (type?: PermissionErrorType) => {
    switch (type) {
      case PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED:
        return 'text-primary';
      case PermissionErrorType.FAMILY_GOAL_CREATION_DENIED:
      case PermissionErrorType.CONTRIBUTION_ACCESS_DENIED:
        return 'text-warning';
      case PermissionErrorType.ROLE_MANAGEMENT_DENIED:
        return 'text-danger';
      case PermissionErrorType.ADMIN_LIMITATION:
        return 'text-info';
      default:
        return 'text-warning';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'viewer':
        return 'text-info';
      case 'member':
        return 'text-success';
      case 'admin':
        return 'text-primary';
      case 'owner':
        return 'text-warning';
      default:
        return 'text-warning';
    }
  };

  const getDisplayIcon = () => {
    return errorType ? getErrorTypeIcon(errorType) : getRoleIcon(userRole);
  };

  const getDisplayColor = () => {
    return errorType ? getErrorTypeColor(errorType) : getRoleColor(userRole);
  };

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onClose}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        role="dialog"
        style={{ zIndex: 1050 }}
        aria-labelledby="permissionErrorModalLabel"
        aria-hidden="false"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <div className="d-flex align-items-center w-100">
                <div className="mr-3">
                  <div 
                    className={`rounded-circle p-3 ${getDisplayColor()} bg-light`}
                    style={{ fontSize: '1.5rem' }}
                  >
                    <i className={getDisplayIcon()}></i>
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h5 className="modal-title font-weight-bold text-gray-800 mb-0" id="permissionErrorModalLabel">
                    {errorTitle}
                  </h5>
                  {userRole && (
                    <small className={`text-muted ${getRoleColor(userRole)}`}>
                      Your current role: <span className="font-weight-bold text-capitalize">{userRole}</span>
                    </small>
                  )}
                </div>
                <button 
                  type="button" 
                  className="close" 
                  onClick={onClose}
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>

            <div className="modal-body pt-2">
              {/* Error Message */}
              <div className="alert alert-warning border-left-warning mb-4" role="alert">
                <div className="d-flex align-items-start">
                  <div className="mr-2 mt-1">
                    <i className="fas fa-exclamation-triangle text-warning"></i>
                  </div>
                  <div>
                    <p className="mb-0">{errorMessage}</p>
                  </div>
                </div>
              </div>

              {/* Suggested Actions */}
              {suggestedActions.length > 0 && (
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body py-3">
                    <h6 className="card-title font-weight-bold text-gray-800 mb-3">
                      <i className="fas fa-lightbulb text-warning mr-2"></i>
                      What you can do:
                    </h6>
                    <ul className="list-unstyled mb-0">
                      {suggestedActions.map((action, index) => (
                        <li key={index} className="mb-2 d-flex align-items-start">
                          <div className="mr-2 mt-1">
                            <i className="fas fa-check-circle text-success" style={{ fontSize: '0.8rem' }}></i>
                          </div>
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Role Information */}
              {showRoleContext && userRole && (
                <div className="card border-left-info mb-3">
                  <div className="card-body py-3">
                    <h6 className="card-title font-weight-bold text-info mb-2">
                      <i className="fas fa-info-circle mr-2"></i>
                      About {userRole === 'member' ? 'Member' : userRole === 'viewer' ? 'Viewer' : userRole === 'admin' ? 'Admin' : userRole === 'owner' ? 'Owner' : 'your'} Role:
                    </h6>
                    <p className="text-gray-700 mb-0 small">
                      {PERMISSION_CONTEXT_MESSAGES[userRole as keyof typeof PERMISSION_CONTEXT_MESSAGES] || 
                       'Your role determines what actions you can perform within the family.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0">
              <div className="d-flex justify-content-between w-100">
                <div>
                  {showUpgradeOption && onUpgradeRole && (
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={onUpgradeRole}
                    >
                      <i className="fas fa-level-up-alt mr-2"></i>
                      Request Role Upgrade
                    </button>
                  )}
                </div>
                <div>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={onClose}
                  >
                    <i className="fas fa-check mr-2"></i>
                    I Understand
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

export default PermissionErrorModal;