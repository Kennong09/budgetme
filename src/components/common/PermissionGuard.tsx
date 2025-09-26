import React from 'react';
import { useFamilyPermissions } from '../../hooks/useFamilyPermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireFamilyMembership?: boolean;
  allowedRoles?: ('admin' | 'member' | 'viewer')[];
  requireOwnership?: boolean;
  requireGoalCreation?: boolean;
  requireContribution?: boolean;
  showLoadingState?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on family permissions
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  fallback = null,
  requireFamilyMembership = false,
  allowedRoles,
  requireOwnership = false,
  requireGoalCreation = false,
  requireContribution = false,
  showLoadingState = true,
  loadingComponent
}) => {
  const permissions = useFamilyPermissions();

  // Show loading state if requested and permissions are loading
  if (showLoadingState && permissions.loading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="d-flex justify-content-center align-items-center p-3">
        <div className="spinner-border spinner-border-sm text-primary mr-2" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <span className="text-muted">Checking permissions...</span>
      </div>
    );
  }

  // Check family membership requirement
  if (requireFamilyMembership && !permissions.isFamilyMember) {
    return <>{fallback}</>;
  }

  // Check ownership requirement
  if (requireOwnership && !permissions.isOwner) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (allowedRoles && permissions.familyRole && !allowedRoles.includes(permissions.familyRole)) {
    return <>{fallback}</>;
  }

  // Check goal creation permission
  if (requireGoalCreation && !permissions.canCreateFamilyGoals) {
    return <>{fallback}</>;
  }

  // Check contribution permission
  if (requireContribution && !permissions.canContributeToGoals) {
    return <>{fallback}</>;
  }

  // All permissions satisfied, render children
  return <>{children}</>;
};

interface PermissionAwareButtonProps {
  onClick?: () => void;
  onPermissionDenied?: (userRole?: string) => void;
  requireFamilyMembership?: boolean;
  allowedRoles?: ('admin' | 'member' | 'viewer')[];
  requireOwnership?: boolean;
  requireGoalCreation?: boolean;
  requireContribution?: boolean;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

/**
 * Button component that automatically handles permission checking
 */
export const PermissionAwareButton: React.FC<PermissionAwareButtonProps> = ({
  onClick,
  onPermissionDenied,
  requireFamilyMembership = false,
  allowedRoles,
  requireOwnership = false,
  requireGoalCreation = false,
  requireContribution = false,
  className = 'btn btn-primary',
  children,
  disabled = false,
  type = 'button',
  title
}) => {
  const permissions = useFamilyPermissions();

  const handleClick = () => {
    // Check family membership requirement
    if (requireFamilyMembership && !permissions.isFamilyMember) {
      onPermissionDenied?.();
      return;
    }

    // Check ownership requirement
    if (requireOwnership && !permissions.isOwner) {
      onPermissionDenied?.(permissions.familyRole || undefined);
      return;
    }

    // Check role requirements
    if (allowedRoles && permissions.familyRole && !allowedRoles.includes(permissions.familyRole)) {
      onPermissionDenied?.(permissions.familyRole);
      return;
    }

    // Check goal creation permission
    if (requireGoalCreation && !permissions.canCreateFamilyGoals) {
      onPermissionDenied?.(permissions.familyRole || undefined);
      return;
    }

    // Check contribution permission
    if (requireContribution && !permissions.canContributeToGoals) {
      onPermissionDenied?.(permissions.familyRole || undefined);
      return;
    }

    // All permissions satisfied, execute onClick
    onClick?.();
  };

  const isDisabled = disabled || permissions.loading;

  return (
    <button
      type={type}
      className={className}
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
    >
      {permissions.loading ? (
        <>
          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
          Checking...
        </>
      ) : (
        children
      )}
    </button>
  );
};

interface RoleBasedContentProps {
  userRole: 'admin' | 'member' | 'viewer' | null;
  adminContent?: React.ReactNode;
  memberContent?: React.ReactNode;
  viewerContent?: React.ReactNode;
  nonMemberContent?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that renders different content based on user role
 */
export const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
  userRole,
  adminContent,
  memberContent,
  viewerContent,
  nonMemberContent,
  fallback = null
}) => {
  switch (userRole) {
    case 'admin':
      return <>{adminContent || fallback}</>;
    case 'member':
      return <>{memberContent || fallback}</>;
    case 'viewer':
      return <>{viewerContent || fallback}</>;
    case null:
      return <>{nonMemberContent || fallback}</>;
    default:
      return <>{fallback}</>;
  }
};

interface PermissionStatusBadgeProps {
  showRole?: boolean;
  showPermissionLevel?: boolean;
  className?: string;
}

/**
 * Component that displays user's current permission status
 */
export const PermissionStatusBadge: React.FC<PermissionStatusBadgeProps> = ({
  showRole = true,
  showPermissionLevel = false,
  className = ''
}) => {
  const permissions = useFamilyPermissions();

  if (permissions.loading) {
    return (
      <span className={`badge badge-secondary ${className}`}>
        <i className="fas fa-spinner fa-spin mr-1"></i>
        Loading...
      </span>
    );
  }

  if (!permissions.isFamilyMember) {
    return (
      <span className={`badge badge-light ${className}`}>
        <i className="fas fa-user mr-1"></i>
        Personal Account
      </span>
    );
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'badge-primary';
      case 'member':
        return 'badge-success';
      case 'viewer':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'fas fa-user-shield';
      case 'member':
        return 'fas fa-user';
      case 'viewer':
        return 'fas fa-eye';
      default:
        return 'fas fa-question';
    }
  };

  const getPermissionLevel = () => {
    if (permissions.isOwner) return 'Full Access';
    if (permissions.canCreateFamilyGoals) return 'Admin Access';
    if (permissions.canContributeToGoals) return 'Contributor';
    return 'Read Only';
  };

  return (
    <span className={`badge ${getRoleBadgeClass(permissions.familyRole || '')} ${className}`}>
      <i className={`${getRoleIcon(permissions.familyRole || '')} mr-1`}></i>
      {permissions.isOwner && <i className="fas fa-crown mr-1 text-warning"></i>}
      {showRole && (
        <span className="text-capitalize">
          {permissions.familyRole}
          {permissions.isOwner && ' (Owner)'}
        </span>
      )}
      {showPermissionLevel && !showRole && getPermissionLevel()}
      {showPermissionLevel && showRole && ` - ${getPermissionLevel()}`}
    </span>
  );
};

export default PermissionGuard;