/**
 * Enhanced Permission Error Handling Service
 * Provides centralized error messaging, toast notifications, and user guidance
 */

import { 
  PermissionErrorType, 
  buildPermissionError, 
  TOAST_MESSAGES,
  getPermissionErrorTitle,
  getPermissionErrorMessage,
  getPermissionSuggestedActions,
  PermissionErrorResult
} from '../constants/permissionErrors';

export interface PermissionErrorOptions {
  action: string;
  role?: 'admin' | 'member' | 'viewer' | 'owner' | null;
  errorType?: PermissionErrorType;
  customMessage?: string;
  customTitle?: string;
  customSuggestedActions?: string[];
  showToast?: boolean;
  toastType?: 'error' | 'warning';
}

export interface ErrorHandlingResult {
  permissionError: PermissionErrorResult;
  toastMessage?: string;
  shouldShowModal: boolean;
}

/**
 * Enhanced Permission Error Handling Service
 */
class PermissionErrorHandlingService {
  private static instance: PermissionErrorHandlingService;

  public static getInstance(): PermissionErrorHandlingService {
    if (!PermissionErrorHandlingService.instance) {
      PermissionErrorHandlingService.instance = new PermissionErrorHandlingService();
    }
    return PermissionErrorHandlingService.instance;
  }

  /**
   * Create a comprehensive permission error with all messaging
   */
  createPermissionError(options: PermissionErrorOptions): ErrorHandlingResult {
    const {
      action,
      role,
      errorType,
      customMessage,
      customTitle,
      customSuggestedActions,
      showToast = true,
      toastType = 'error'
    } = options;

    // Build the permission error
    const permissionError: PermissionErrorResult = {
      hasPermission: false,
      errorTitle: customTitle || getPermissionErrorTitle(action, errorType),
      errorMessage: customMessage || getPermissionErrorMessage(role, action),
      suggestedActions: customSuggestedActions || getPermissionSuggestedActions(role, action),
      userRole: role || undefined,
      errorType
    };

    // Determine toast message
    let toastMessage: string | undefined;
    if (showToast) {
      toastMessage = this.getToastMessage(action, errorType, toastType);
    }

    return {
      permissionError,
      toastMessage,
      shouldShowModal: true
    };
  }

  /**
   * Handle family goal creation errors
   */
  handleFamilyGoalCreationError(role: 'admin' | 'member' | 'viewer' | 'owner' | null): ErrorHandlingResult {
    let errorType: PermissionErrorType;
    
    if (!role) {
      errorType = PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED;
    } else if (role === 'member') {
      errorType = PermissionErrorType.ROLE_RESTRICTED;
    } else if (role === 'owner') {
      // Owners should never have permission errors for goal creation
      errorType = PermissionErrorType.PERMISSION_CHECK_FAILED;
    } else {
      errorType = PermissionErrorType.FAMILY_GOAL_CREATION_DENIED;
    }

    return this.createPermissionError({
      action: 'create_family_goals',
      role,
      errorType,
      toastType: 'warning'
    });
  }

  /**
   * Handle goal contribution errors
   */
  handleGoalContributionError(role: 'admin' | 'member' | 'viewer' | 'owner' | null): ErrorHandlingResult {
    let errorType: PermissionErrorType;
    
    if (!role) {
      errorType = PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED;
    } else {
      errorType = PermissionErrorType.CONTRIBUTION_ACCESS_DENIED;
    }

    return this.createPermissionError({
      action: 'contribute_to_goals',
      role,
      errorType,
      toastType: 'warning'
    });
  }

  /**
   * Handle role management errors
   */
  handleRoleManagementError(role: 'admin' | 'member' | 'viewer' | 'owner' | null): ErrorHandlingResult {
    const errorType = PermissionErrorType.ROLE_MANAGEMENT_DENIED;

    return this.createPermissionError({
      action: 'manage_roles',
      role,
      errorType,
      toastType: 'error'
    });
  }

  /**
   * Handle goal access errors
   */
  handleGoalAccessError(role: 'admin' | 'member' | 'viewer' | 'owner' | null): ErrorHandlingResult {
    const errorType = PermissionErrorType.GOAL_ACCESS_DENIED;

    return this.createPermissionError({
      action: 'access_goals',
      role,
      errorType,
      customMessage: 'You do not have permission to access this goal.',
      customSuggestedActions: role ? [
        'Contact your family admin for access',
        'Check if this is a family goal'
      ] : [
        'Join the family that owns this goal',
        'Ask for permission from the goal owner'
      ]
    });
  }

  /**
   * Handle admin limitation errors
   */
  handleAdminLimitationError(): ErrorHandlingResult {
    return this.createPermissionError({
      action: 'admin_action',
      role: 'admin',
      errorType: PermissionErrorType.ADMIN_LIMITATION,
      customMessage: 'This action requires family owner permissions.',
      customSuggestedActions: [
        'Contact the family owner',
        'Ask the owner to perform this action'
      ]
    });
  }

  /**
   * Get appropriate toast message for error type
   */
  private getToastMessage(action: string, errorType?: PermissionErrorType, toastType: 'error' | 'warning' = 'error'): string {
    if (toastType === 'warning') {
      switch (errorType) {
        case PermissionErrorType.FAMILY_GOAL_CREATION_DENIED:
          return TOAST_MESSAGES.WARNING.ROLE_RESTRICTED;
        case PermissionErrorType.CONTRIBUTION_ACCESS_DENIED:
          return TOAST_MESSAGES.WARNING.PERMISSION_LIMITED;
        default:
          return TOAST_MESSAGES.WARNING.ROLE_RESTRICTED;
      }
    }

    // Error messages
    switch (errorType) {
      case PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED:
        return 'Family membership required for this action';
      case PermissionErrorType.ROLE_MANAGEMENT_DENIED:
        return TOAST_MESSAGES.ERROR.PERMISSION_DENIED;
      case PermissionErrorType.GOAL_ACCESS_DENIED:
        return 'Goal access denied';
      default:
        return TOAST_MESSAGES.ERROR.PERMISSION_DENIED;
    }
  }

  /**
   * Create a success message for completed actions
   */
  createSuccessMessage(action: string): string {
    switch (action) {
      case 'create_contribution':
        return TOAST_MESSAGES.SUCCESS.CONTRIBUTION_CREATED;
      case 'create_goal':
        return TOAST_MESSAGES.SUCCESS.GOAL_CREATED;
      case 'update_permissions':
        return TOAST_MESSAGES.SUCCESS.PERMISSION_UPDATED;
      default:
        return 'Action completed successfully!';
    }
  }

  /**
   * Validate user permissions and return error result if needed
   */
  validateUserPermission(options: {
    hasPermission: boolean;
    role?: 'admin' | 'member' | 'viewer' | 'owner' | null;
    action: string;
    errorType?: PermissionErrorType;
  }): ErrorHandlingResult | null {
    if (options.hasPermission) {
      return null; // No error
    }

    return this.createPermissionError({
      action: options.action,
      role: options.role,
      errorType: options.errorType
    });
  }

  /**
   * Get user-friendly error explanation for developers
   */
  getErrorExplanation(errorType: PermissionErrorType): string {
    switch (errorType) {
      case PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED:
        return 'User must be part of a family to perform family-related actions.';
      case PermissionErrorType.ROLE_RESTRICTED:
        return 'User role does not have sufficient permissions for this action.';
      case PermissionErrorType.FAMILY_GOAL_CREATION_DENIED:
        return 'Only family admins can create family-wide goals.';
      case PermissionErrorType.CONTRIBUTION_ACCESS_DENIED:
        return 'User role cannot contribute to family goals (viewers are read-only).';
      case PermissionErrorType.GOAL_ACCESS_DENIED:
        return 'User does not have access to the requested goal.';
      case PermissionErrorType.ROLE_MANAGEMENT_DENIED:
        return 'User cannot manage family member roles.';
      case PermissionErrorType.ADMIN_LIMITATION:
        return 'Action requires family owner permissions beyond admin level.';
      default:
        return 'Permission check failed for unknown reason.';
    }
  }
}

// Export singleton instance
export const permissionErrorService = PermissionErrorHandlingService.getInstance();

// Export utility functions
export { PermissionErrorHandlingService };

export default permissionErrorService;