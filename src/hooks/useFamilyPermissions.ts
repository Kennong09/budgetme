import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../utils/AuthContext';
import { familyPermissionService, FamilyPermissionState, PermissionCheckResult } from '../services/database/familyPermissionService';

/**
 * Hook for accessing family permissions and role-based restrictions
 */
export const useFamilyPermissions = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<FamilyPermissionState>({
    isFamilyMember: false,
    familyRole: null,
    familyId: null,
    canCreateFamilyGoals: false,
    canContributeToGoals: false,
    canManageFamilyRoles: false,
    isOwner: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load family permissions for the current user
   */
  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissionState({
        isFamilyMember: false,
        familyRole: null,
        familyId: null,
        canCreateFamilyGoals: false,
        canContributeToGoals: false,
        canManageFamilyRoles: false,
        isOwner: false
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const permissions = await familyPermissionService.getFamilyPermissionState(user.id);
      setPermissionState(permissions);
    } catch (err) {
      console.error('Error loading family permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load permissions when user changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * Check if user can create family goals
   */
  const checkCanCreateFamilyGoals = useCallback(async (): Promise<PermissionCheckResult> => {
    if (!user?.id) {
      return {
        hasPermission: false,
        errorMessage: 'You must be logged in to create family goals',
        restrictions: ['Please sign in to continue']
      };
    }

    return await familyPermissionService.canCreateFamilyGoals(user.id);
  }, [user?.id]);

  /**
   * Check if user can contribute to goals
   */
  const checkCanContributeToGoals = useCallback(async (): Promise<PermissionCheckResult> => {
    if (!user?.id) {
      return {
        hasPermission: false,
        errorMessage: 'You must be logged in to contribute to goals',
        restrictions: ['Please sign in to continue']
      };
    }

    return await familyPermissionService.canContributeToGoals(user.id);
  }, [user?.id]);

  /**
   * Check if user can access a specific goal
   */
  const checkCanAccessGoal = useCallback(async (goalId: string): Promise<PermissionCheckResult> => {
    if (!user?.id) {
      return {
        hasPermission: false,
        errorMessage: 'You must be logged in to access goals',
        restrictions: ['Please sign in to continue']
      };
    }

    return await familyPermissionService.canAccessGoal(user.id, goalId);
  }, [user?.id]);

  /**
   * Get user-friendly error message for a specific action
   */
  const getPermissionErrorMessage = useCallback((action: string): string => {
    if (!permissionState.familyRole) {
      return 'You must be a family member to perform this action.';
    }

    return familyPermissionService.getPermissionErrorMessage(permissionState.familyRole, action);
  }, [permissionState.familyRole]);

  /**
   * Validate general permissions with custom options
   */
  const validatePermissions = useCallback(async (options: {
    requireFamilyMembership?: boolean;
    allowedRoles?: ('admin' | 'member' | 'viewer')[];
    action?: string;
  }): Promise<PermissionCheckResult> => {
    if (!user?.id) {
      return {
        hasPermission: false,
        errorMessage: 'You must be logged in to perform this action',
        restrictions: ['Please sign in to continue']
      };
    }

    return await familyPermissionService.validatePermissions(user.id, options);
  }, [user?.id]);

  /**
   * Refresh permissions (useful after role changes)
   */
  const refreshPermissions = useCallback(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    // Permission state
    ...permissionState,
    loading,
    error,

    // Permission checking functions
    checkCanCreateFamilyGoals,
    checkCanContributeToGoals,
    checkCanAccessGoal,
    validatePermissions,
    
    // Utility functions
    getPermissionErrorMessage,
    refreshPermissions,

    // Convenience boolean flags
    hasBasicAccess: permissionState.isFamilyMember,
    hasAdminAccess: permissionState.isOwner || permissionState.familyRole === 'admin',
    hasContributionAccess: permissionState.canContributeToGoals,
    hasGoalCreationAccess: permissionState.canCreateFamilyGoals,
    isViewer: permissionState.familyRole === 'viewer',
    isMember: permissionState.familyRole === 'member',
    isAdmin: permissionState.familyRole === 'admin',
  };
};

/**
 * Hook for checking permissions for specific family goal creation scenarios
 */
export const useFamilyGoalPermissions = () => {
  const familyPermissions = useFamilyPermissions();

  /**
   * Check if user can create family goals and return detailed validation
   */
  const validateFamilyGoalCreation = useCallback(async (): Promise<{
    canCreate: boolean;
    errorTitle?: string;
    errorMessage?: string;
    suggestedActions?: string[];
    userRole?: string;
  }> => {
    const result = await familyPermissions.checkCanCreateFamilyGoals();

    if (result.hasPermission) {
      return { canCreate: true };
    }

    // Map permission results to user-friendly messages
    if (!familyPermissions.isFamilyMember) {
      return {
        canCreate: false,
        errorTitle: 'Family Membership Required',
        errorMessage: 'You must be part of a family to create family goals.',
        suggestedActions: [
          'Join an existing family',
          'Create a new family',
          'Create a personal goal instead'
        ]
      };
    }

    if (familyPermissions.familyRole === 'member') {
      return {
        canCreate: false,
        errorTitle: 'Family Goal Creation Restricted',
        errorMessage: 'As a family member, you can contribute to existing goals but cannot create new family goals. Only family admins can create goals for the entire family.',
        suggestedActions: [
          'Ask a family admin to create the goal',
          'Create a personal goal instead',
          'Contribute to existing family goals'
        ],
        userRole: 'member'
      };
    }

    if (familyPermissions.familyRole === 'viewer') {
      return {
        canCreate: false,
        errorTitle: 'Family Goal Creation Denied',
        errorMessage: 'Viewers have read-only access to family financial information. You cannot create family goals.',
        suggestedActions: [
          'Contact your family admin to upgrade your role',
          'Create a personal goal instead'
        ],
        userRole: 'viewer'
      };
    }

    return {
      canCreate: false,
      errorTitle: 'Permission Denied',
      errorMessage: result.errorMessage || 'You do not have permission to create family goals.',
      suggestedActions: ['Contact your family admin for assistance'],
      userRole: result.userRole
    };
  }, [familyPermissions]);

  return {
    ...familyPermissions,
    validateFamilyGoalCreation
  };
};

/**
 * Hook for checking permissions for goal contribution scenarios
 */
export const useGoalContributionPermissions = () => {
  const familyPermissions = useFamilyPermissions();

  /**
   * Check if user can contribute to goals and return detailed validation
   */
  const validateGoalContribution = useCallback(async (): Promise<{
    canContribute: boolean;
    errorTitle?: string;
    errorMessage?: string;
    suggestedActions?: string[];
    userRole?: string;
  }> => {
    const result = await familyPermissions.checkCanContributeToGoals();

    if (result.hasPermission) {
      return { canContribute: true };
    }

    // Map permission results to user-friendly messages
    if (!familyPermissions.isFamilyMember) {
      return {
        canContribute: false,
        errorTitle: 'Family Membership Required',
        errorMessage: 'You must be part of a family to contribute to family goals.',
        suggestedActions: [
          'Join an existing family',
          'Create a new family'
        ]
      };
    }

    if (familyPermissions.familyRole === 'viewer') {
      return {
        canContribute: false,
        errorTitle: 'Contribution Access Denied',
        errorMessage: 'Viewers have read-only access to family financial information. You cannot make contributions to family goals.',
        suggestedActions: [
          'Contact your family admin to upgrade your role if you need contribution access'
        ],
        userRole: 'viewer'
      };
    }

    return {
      canContribute: false,
      errorTitle: 'Permission Denied',
      errorMessage: result.errorMessage || 'You do not have permission to contribute to goals.',
      suggestedActions: ['Contact your family admin for assistance'],
      userRole: result.userRole
    };
  }, [familyPermissions]);

  return {
    ...familyPermissions,
    validateGoalContribution
  };
};