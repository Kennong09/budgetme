/**
 * Centralized constants for permission error messages and role-specific messaging
 * This provides consistent error messaging across the application
 */

// Error types
export enum PermissionErrorType {
  FAMILY_MEMBERSHIP_REQUIRED = 'FAMILY_MEMBERSHIP_REQUIRED',
  ROLE_RESTRICTED = 'ROLE_RESTRICTED',
  FAMILY_GOAL_CREATION_DENIED = 'FAMILY_GOAL_CREATION_DENIED',
  CONTRIBUTION_ACCESS_DENIED = 'CONTRIBUTION_ACCESS_DENIED',
  GOAL_ACCESS_DENIED = 'GOAL_ACCESS_DENIED',
  PERMISSION_CHECK_FAILED = 'PERMISSION_CHECK_FAILED',
  ROLE_MANAGEMENT_DENIED = 'ROLE_MANAGEMENT_DENIED',
  ADMIN_LIMITATION = 'ADMIN_LIMITATION'
}

// Role-specific error titles
export const PERMISSION_ERROR_TITLES = {
  [PermissionErrorType.FAMILY_MEMBERSHIP_REQUIRED]: 'Family Membership Required',
  [PermissionErrorType.ROLE_RESTRICTED]: 'Action Restricted',
  [PermissionErrorType.FAMILY_GOAL_CREATION_DENIED]: 'Family Goal Creation Denied',
  [PermissionErrorType.CONTRIBUTION_ACCESS_DENIED]: 'Contribution Access Denied',
  [PermissionErrorType.GOAL_ACCESS_DENIED]: 'Goal Access Denied',
  [PermissionErrorType.PERMISSION_CHECK_FAILED]: 'Permission Check Failed',
  [PermissionErrorType.ROLE_MANAGEMENT_DENIED]: 'Role Management Denied',
  [PermissionErrorType.ADMIN_LIMITATION]: 'Administrative Limitation'
} as const;

// Role-specific error messages
export const ROLE_ERROR_MESSAGES = {
  member: {
    create_family_goals: 'As a family member, you can contribute to existing goals but cannot create new family goals. Only family admins can create goals for the entire family.',
    manage_roles: 'Members cannot manage family roles. Only owners and admins can assign roles.',
    default: 'This action is restricted for family members. Contact your family admin for assistance.'
  },
  viewer: {
    create_family_goals: 'Viewers have read-only access to family financial information. You cannot create family goals.',
    contribute_to_goals: 'Viewers have read-only access to family financial information. You cannot make contributions to family goals.',
    manage_roles: 'Viewers cannot manage family roles. Only owners and admins can assign roles.',
    default: 'Viewers have read-only access only. Contact your family admin to upgrade your role if needed.'
  },
  admin: {
    manage_owner: 'Admin role cannot manage the family owner. Only the owner can change their own role or transfer ownership.',
    default: 'This action has administrative limitations. Some actions may require family owner permissions.'
  },
  owner: {
    default: 'As the family owner, you have full permissions. This restriction should not apply to you.'
  }
} as const;

// Role-specific suggested actions
export const ROLE_SUGGESTED_ACTIONS = {
  member: {
    create_family_goals: [
      'Ask a family admin to create the goal',
      'Create a personal goal instead',
      'Contribute to existing family goals'
    ],
    manage_roles: [
      'Contact your family admin for role management',
      'Ask a family owner or admin to make role changes'
    ],
    default: [
      'Contact your family admin for assistance',
      'Check with family admin about your permissions'
    ]
  },
  viewer: {
    create_family_goals: [
      'Contact your family admin to upgrade your role',
      'Create a personal goal instead'
    ],
    contribute_to_goals: [
      'Contact your family admin to upgrade your role if you need contribution access'
    ],
    manage_roles: [
      'Contact your family admin to upgrade your role',
      'Ask a family owner or admin for role changes'
    ],
    default: [
      'Contact your family admin to upgrade your role if needed'
    ]
  },
  admin: {
    manage_owner: [
      'Contact the family owner for ownership changes',
      'Only the owner can transfer ownership'
    ],
    default: [
      'Contact the family owner for additional permissions',
      'Some actions require owner-level access'
    ]
  },
  owner: {
    default: [
      'You have full permissions as the family owner',
      'Contact support if you believe this is an error'
    ]
  },
  not_member: {
    default: [
      'Join an existing family',
      'Create a new family',
      'Ask for a family invitation'
    ]
  }
} as const;

// Permission context messages
export const PERMISSION_CONTEXT_MESSAGES = {
  member: 'Members can participate in family activities and contribute to goals, but cannot create family-wide goals or manage other members.',
  viewer: 'Viewers have read-only access to family financial information. They can view data but cannot make changes or contributions.',
  admin: 'Admins can manage most family activities but may have some limitations compared to the family owner.',
  owner: 'Family owners have complete control over all family activities and member management.'
} as const;

// Action-specific error messages
export const ACTION_ERROR_MESSAGES = {
  create_family_goals: {
    title: 'Family Goal Creation Restricted',
    not_member: 'You must be part of a family to create family goals.',
    member: ROLE_ERROR_MESSAGES.member.create_family_goals,
    viewer: ROLE_ERROR_MESSAGES.viewer.create_family_goals
  },
  contribute_to_goals: {
    title: 'Goal Contribution Restricted',
    not_member: 'You must be part of a family to contribute to family goals.',
    viewer: ROLE_ERROR_MESSAGES.viewer.contribute_to_goals
  },
  manage_roles: {
    title: 'Role Management Denied',
    member: ROLE_ERROR_MESSAGES.member.manage_roles,
    viewer: ROLE_ERROR_MESSAGES.viewer.manage_roles,
    admin: ROLE_ERROR_MESSAGES.admin.manage_owner
  },
  access_goals: {
    title: 'Goal Access Denied',
    default: 'You do not have permission to access this goal.'
  }
} as const;

// Helper function to get error message for specific role and action
export function getPermissionErrorMessage(
  role: 'admin' | 'member' | 'viewer' | 'owner' | null,
  action: string
): string {
  if (!role) {
    return 'You must be a family member to perform this action.';
  }

  const roleMessages = ROLE_ERROR_MESSAGES[role];
  return roleMessages?.[action as keyof typeof roleMessages] || roleMessages?.default || 'You do not have permission to perform this action.';
}

// Helper function to get suggested actions for specific role and action
export function getPermissionSuggestedActions(
  role: 'admin' | 'member' | 'viewer' | 'owner' | null,
  action: string
): string[] {
  if (!role) {
    return ROLE_SUGGESTED_ACTIONS.not_member.default;
  }

  const roleActions = ROLE_SUGGESTED_ACTIONS[role];
  return roleActions?.[action as keyof typeof roleActions] || roleActions?.default || [];
}

// Helper function to get error title for specific action
export function getPermissionErrorTitle(
  action: string,
  errorType?: PermissionErrorType
): string {
  if (errorType) {
    return PERMISSION_ERROR_TITLES[errorType];
  }

  const actionError = ACTION_ERROR_MESSAGES[action as keyof typeof ACTION_ERROR_MESSAGES];
  return actionError?.title || 'Permission Denied';
}

// Permission check result builder
export interface PermissionErrorResult {
  hasPermission: boolean;
  errorTitle?: string;
  errorMessage?: string;
  suggestedActions?: string[];
  userRole?: string;
  errorType?: PermissionErrorType;
}

export function buildPermissionError(
  role: 'admin' | 'member' | 'viewer' | 'owner' | null,
  action: string,
  errorType?: PermissionErrorType
): PermissionErrorResult {
  return {
    hasPermission: false,
    errorTitle: getPermissionErrorTitle(action, errorType),
    errorMessage: getPermissionErrorMessage(role, action),
    suggestedActions: getPermissionSuggestedActions(role, action),
    userRole: role || undefined,
    errorType
  };
}

// Validation constants
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format provided',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
  FAMILY_MEMBERSHIP_REQUIRED: 'Family membership is required for this action',
  GOAL_NOT_FOUND: 'The requested goal could not be found',
  ACCESS_DENIED: 'Access denied to the requested resource'
} as const;

// Toast notification messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    CONTRIBUTION_CREATED: 'Contribution made successfully!',
    GOAL_CREATED: 'Goal created successfully!',
    PERMISSION_UPDATED: 'Permissions updated successfully!'
  },
  ERROR: {
    CONTRIBUTION_FAILED: 'Failed to make contribution',
    GOAL_CREATION_FAILED: 'Failed to create goal',
    PERMISSION_DENIED: 'Permission denied',
    NETWORK_ERROR: 'Network error occurred. Please try again.'
  },
  WARNING: {
    PERMISSION_LIMITED: 'You have limited permissions for this action',
    ROLE_RESTRICTED: 'This action is restricted for your current role'
  }
} as const;

export default {
  PermissionErrorType,
  PERMISSION_ERROR_TITLES,
  ROLE_ERROR_MESSAGES,
  ROLE_SUGGESTED_ACTIONS,
  PERMISSION_CONTEXT_MESSAGES,
  ACTION_ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  TOAST_MESSAGES,
  getPermissionErrorMessage,
  getPermissionSuggestedActions,
  getPermissionErrorTitle,
  buildPermissionError
};