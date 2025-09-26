import { supabase } from '../../utils/supabaseClient';
import { familyService, FamilyMembershipInfo } from './familyService';

// Types for permission checking
export interface FamilyPermissionState {
  isFamilyMember: boolean;
  familyRole: 'admin' | 'member' | 'viewer' | 'owner' | null;
  familyId: string | null;
  canCreateFamilyGoals: boolean;
  canContributeToGoals: boolean;
  canManageFamilyRoles: boolean;
  isOwner: boolean;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  errorMessage?: string;
  restrictions?: string[];
  userRole?: string;
}

export interface PermissionValidationOptions {
  requireFamilyMembership?: boolean;
  allowedRoles?: ('admin' | 'member' | 'viewer')[];
  action?: string;
}

/**
 * Service for checking family-based permissions and role restrictions
 */
class FamilyPermissionService {
  private static instance: FamilyPermissionService;

  public static getInstance(): FamilyPermissionService {
    if (!FamilyPermissionService.instance) {
      FamilyPermissionService.instance = new FamilyPermissionService();
    }
    return FamilyPermissionService.instance;
  }

  /**
   * Get comprehensive family permission state for a user
   */
  async getFamilyPermissionState(userId: string): Promise<FamilyPermissionState> {
    try {
      // Check family membership
      const membershipInfo = await familyService.checkFamilyMembership(userId);
      
      if (!membershipInfo.is_member || !membershipInfo.family_id) {
        return {
          isFamilyMember: false,
          familyRole: null,
          familyId: null,
          canCreateFamilyGoals: false,
          canContributeToGoals: false,
          canManageFamilyRoles: false,
          isOwner: false
        };
      }

      const familyRole = membershipInfo.role as 'admin' | 'member' | 'viewer';
      
      // Check if user is family owner (created_by field)
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('created_by')
        .eq('id', membershipInfo.family_id)
        .single();

      const isOwner = !familyError && familyData?.created_by === userId;

      // Determine permissions based on role and ownership
      // Owner has all permissions regardless of their role in family_members table
      // Non-owner admins have admin permissions but not ownership privileges
      const canCreateFamilyGoals = isOwner || familyRole === 'admin';
      const canContributeToGoals = familyRole !== 'viewer';
      const canManageFamilyRoles = isOwner || familyRole === 'admin';

      return {
        isFamilyMember: true,
        familyRole: isOwner ? 'owner' as any : familyRole, // Return 'owner' for owners
        familyId: membershipInfo.family_id,
        canCreateFamilyGoals,
        canContributeToGoals,
        canManageFamilyRoles,
        isOwner
      };
    } catch (error) {
      console.error('Error getting family permission state:', error);
      return {
        isFamilyMember: false,
        familyRole: null,
        familyId: null,
        canCreateFamilyGoals: false,
        canContributeToGoals: false,
        canManageFamilyRoles: false,
        isOwner: false
      };
    }
  }

  /**
   * Check if user can create family goals
   */
  async canCreateFamilyGoals(userId: string): Promise<PermissionCheckResult> {
    try {
      const permissionState = await this.getFamilyPermissionState(userId);

      if (!permissionState.isFamilyMember) {
        return {
          hasPermission: false,
          errorMessage: 'You must be a family member to create family goals',
          restrictions: ['Join a family first to create family goals']
        };
      }

      if (!permissionState.canCreateFamilyGoals) {
        const roleRestrictions = this.getRoleRestrictions(permissionState.familyRole!, 'create_family_goals');
        return {
          hasPermission: false,
          errorMessage: roleRestrictions.errorMessage,
          restrictions: roleRestrictions.restrictions,
          userRole: permissionState.familyRole!
        };
      }

      return { hasPermission: true };
    } catch (error) {
      console.error('Error checking family goal creation permission:', error);
      return {
        hasPermission: false,
        errorMessage: 'Unable to verify permissions',
        restrictions: ['Permission check failed']
      };
    }
  }

  /**
   * Check if user can contribute to goals
   */
  async canContributeToGoals(userId: string): Promise<PermissionCheckResult> {
    try {
      const permissionState = await this.getFamilyPermissionState(userId);

      if (!permissionState.isFamilyMember) {
        return {
          hasPermission: false,
          errorMessage: 'You must be a family member to contribute to family goals',
          restrictions: ['Join a family first to contribute to family goals']
        };
      }

      if (!permissionState.canContributeToGoals) {
        const roleRestrictions = this.getRoleRestrictions(permissionState.familyRole!, 'contribute_to_goals');
        return {
          hasPermission: false,
          errorMessage: roleRestrictions.errorMessage,
          restrictions: roleRestrictions.restrictions,
          userRole: permissionState.familyRole!
        };
      }

      return { hasPermission: true };
    } catch (error) {
      console.error('Error checking goal contribution permission:', error);
      return {
        hasPermission: false,
        errorMessage: 'Unable to verify permissions',
        restrictions: ['Permission check failed']
      };
    }
  }

  /**
   * Validate permissions for specific actions
   */
  async validatePermissions(
    userId: string, 
    options: PermissionValidationOptions
  ): Promise<PermissionCheckResult> {
    try {
      const permissionState = await this.getFamilyPermissionState(userId);

      // Check family membership requirement
      if (options.requireFamilyMembership && !permissionState.isFamilyMember) {
        return {
          hasPermission: false,
          errorMessage: `You must be a family member to ${options.action || 'perform this action'}`,
          restrictions: [`Join a family first to ${options.action || 'perform this action'}`]
        };
      }

      // Check role requirements
      if (options.allowedRoles && permissionState.familyRole) {
        if (!options.allowedRoles.includes(permissionState.familyRole)) {
          const roleRestrictions = this.getRoleRestrictions(permissionState.familyRole, options.action || 'perform_action');
          return {
            hasPermission: false,
            errorMessage: roleRestrictions.errorMessage,
            restrictions: roleRestrictions.restrictions,
            userRole: permissionState.familyRole
          };
        }
      }

      return { hasPermission: true };
    } catch (error) {
      console.error('Error validating permissions:', error);
      return {
        hasPermission: false,
        errorMessage: 'Unable to verify permissions',
        restrictions: ['Permission validation failed']
      };
    }
  }

  /**
   * Get role-specific restrictions and error messages
   */
  private getRoleRestrictions(role: 'admin' | 'member' | 'viewer', action: string): {
    errorMessage: string;
    restrictions: string[];
  } {
    const restrictions: Record<string, Record<string, { errorMessage: string; restrictions: string[] }>> = {
      member: {
        create_family_goals: {
          errorMessage: 'Family Goal Creation Restricted',
          restrictions: [
            'As a family member, you can contribute to existing goals but cannot create new family goals.',
            'Only family admins can create goals for the entire family.',
            'You can create personal goals or ask a family admin to create family goals.'
          ]
        },
        perform_action: {
          errorMessage: 'Action Restricted for Members',
          restrictions: [
            'This action is restricted for family members.',
            'Contact your family admin for assistance.'
          ]
        }
      },
      viewer: {
        create_family_goals: {
          errorMessage: 'Family Goal Creation Denied',
          restrictions: [
            'Viewers have read-only access to family financial information.',
            'You cannot create family goals.',
            'Contact your family admin to upgrade your role if needed.'
          ]
        },
        contribute_to_goals: {
          errorMessage: 'Contribution Access Denied',
          restrictions: [
            'Viewers have read-only access to family financial information.',
            'You cannot make contributions to family goals.',
            'Contact your family admin to upgrade your role if you need contribution access.'
          ]
        },
        perform_action: {
          errorMessage: 'Action Denied for Viewers',
          restrictions: [
            'Viewers have read-only access only.',
            'Contact your family admin to upgrade your role if needed.'
          ]
        }
      },
      admin: {
        perform_action: {
          errorMessage: 'Administrative Limitation',
          restrictions: [
            'This action has administrative limitations.',
            'Some actions may require family owner permissions.'
          ]
        }
      }
    };

    return restrictions[role]?.[action] || restrictions[role]?.['perform_action'] || {
      errorMessage: 'Permission Denied',
      restrictions: ['You do not have permission to perform this action.']
    };
  }

  /**
   * Check specific goal permissions for a user
   */
  async canAccessGoal(userId: string, goalId: string): Promise<PermissionCheckResult> {
    try {
      // Get goal information
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('user_id, family_id, is_family_goal')
        .eq('id', goalId)
        .single();

      if (goalError || !goalData) {
        return {
          hasPermission: false,
          errorMessage: 'Goal not found or access denied',
          restrictions: ['Goal does not exist or you do not have access']
        };
      }

      // If it's the user's own goal, they always have access
      if (goalData.user_id === userId) {
        return { hasPermission: true };
      }

      // If it's a family goal, check family membership
      if (goalData.is_family_goal && goalData.family_id) {
        const membershipInfo = await familyService.checkSpecificFamilyMembership(userId, goalData.family_id);
        
        if (membershipInfo.is_member) {
          return { hasPermission: true };
        }
      }

      return {
        hasPermission: false,
        errorMessage: 'Access denied to this goal',
        restrictions: ['You do not have permission to access this goal']
      };
    } catch (error) {
      console.error('Error checking goal access permission:', error);
      return {
        hasPermission: false,
        errorMessage: 'Unable to verify goal access',
        restrictions: ['Goal access check failed']
      };
    }
  }

  /**
   * Get user-friendly error messages for permission violations
   */
  getPermissionErrorMessage(role: 'admin' | 'member' | 'viewer', action: string): string {
    const messages: Record<string, Record<string, string>> = {
      member: {
        create_family_goals: 'As a family member, you can contribute to existing goals but cannot create new family goals. Only family admins can create goals for the entire family.',
        default: 'This action is restricted for family members. Contact your family admin for assistance.'
      },
      viewer: {
        create_family_goals: 'Viewers have read-only access to family financial information. You cannot create family goals. Contact your family admin to upgrade your role if needed.',
        contribute_to_goals: 'Viewers have read-only access to family financial information. You cannot make contributions to family goals. Contact your family admin to upgrade your role if you need contribution access.',
        default: 'Viewers have read-only access only. Contact your family admin to upgrade your role if needed.'
      },
      admin: {
        default: 'This action has administrative limitations. Some actions may require family owner permissions.'
      }
    };

    return messages[role]?.[action] || messages[role]?.default || 'You do not have permission to perform this action.';
  }
}

// Export singleton instance
export const familyPermissionService = FamilyPermissionService.getInstance();