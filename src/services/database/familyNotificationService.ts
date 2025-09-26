/**
 * Family Notification Service
 * 
 * Service for triggering family-related notifications including invitations,
 * member activity, role changes, and collaborative events
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from './notificationService';
import {
  CreateNotificationData,
  FamilyNotificationData,
  NotificationError
} from '../../types/notifications';

export interface FamilyInvitation {
  invitation_id: string;
  family_id: string;
  family_name: string;
  inviter_user_id: string;
  inviter_name: string;
  invited_email: string;
  invited_user_id?: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface FamilyMember {
  family_id: string;
  family_name: string;
  member_user_id: string;
  member_name: string;
  role: string;
  join_date: string;
}

export interface FamilyActivity {
  family_id: string;
  family_name: string;
  activity_type: string;
  actor_user_id: string;
  actor_name: string;
  target_user_id?: string;
  target_name?: string;
  description: string;
  metadata: Record<string, any>;
}

/**
 * Family Notification Service
 * 
 * Handles all family-related notification triggers and events
 */
export class FamilyNotificationService {
  private static instance: FamilyNotificationService;

  public static getInstance(): FamilyNotificationService {
    if (!FamilyNotificationService.instance) {
      FamilyNotificationService.instance = new FamilyNotificationService();
    }
    return FamilyNotificationService.instance;
  }

  // =====================================================
  // FAMILY INVITATION NOTIFICATIONS
  // =====================================================

  /**
   * Trigger family invitation notification
   */
  async triggerFamilyInvitationNotification(invitation: FamilyInvitation): Promise<void> {
    try {
      // If invited user exists in system, send notification
      if (invitation.invited_user_id) {
        const notificationData: CreateNotificationData = {
          user_id: invitation.invited_user_id,
          notification_type: 'family',
          event_type: 'family_invitation_received',
          template_data: {
            family_name: invitation.family_name,
            inviter_name: invitation.inviter_name,
            role: invitation.role,
            invitation_id: invitation.invitation_id
          },
          priority: 'medium',
          severity: 'info',
          is_actionable: true,
          action_url: `/family/invitations/${invitation.invitation_id}`,
          action_text: 'View Invitation',
          related_family_id: invitation.family_id,
          metadata: {
            invitation_id: invitation.invitation_id,
            family_id: invitation.family_id,
            inviter_user_id: invitation.inviter_user_id,
            role: invitation.role
          },
          expires_in_hours: 168 // 7 days
        };

        await NotificationService.createNotification(notificationData);
        
        console.log(`Family invitation notification sent to user: ${invitation.invited_user_id} for family: ${invitation.family_name}`);
      }

    } catch (error) {
      console.error('Error triggering family invitation notification:', error);
      throw new NotificationError('Failed to trigger family invitation notification', 'NOTIFICATION_ERROR', error);
    }
  }

  /**
   * Handle family invitation response
   */
  async handleFamilyInvitationResponse(
    invitationId: string,
    response: 'accepted' | 'declined',
    respondentUserId: string
  ): Promise<void> {
    try {
      // Get invitation details
      const { data: invitation, error } = await supabase
        .from('family_invitations')
        .select(`
          id,
          family_id,
          inviter_user_id,
          invited_user_id,
          role,
          families!inner(family_name),
          profiles!invited_user_id(full_name, first_name)
        `)
        .eq('id', invitationId)
        .single();

      if (error || !invitation) {
        console.error('Error fetching invitation details:', error);
        return;
      }

      const familyName = invitation.families?.family_name || 'Family';
      const respondentName = invitation.profiles?.full_name || invitation.profiles?.first_name || 'User';

      // Notify the inviter about the response
      await this.triggerFamilyInvitationResponseNotification({
        family_id: invitation.family_id,
        family_name: familyName,
        inviter_user_id: invitation.inviter_user_id,
        respondent_name: respondentName,
        response: response,
        role: invitation.role
      });

      // If accepted, also notify other family members
      if (response === 'accepted') {
        await this.notifyFamilyMembersOfNewMember({
          family_id: invitation.family_id,
          family_name: familyName,
          new_member_name: respondentName,
          new_member_user_id: respondentUserId,
          role: invitation.role,
          excludeUserId: invitation.inviter_user_id // Already notified above
        });
      }

    } catch (error) {
      console.error('Error in handleFamilyInvitationResponse:', error);
    }
  }

  /**
   * Trigger family invitation response notification
   */
  async triggerFamilyInvitationResponseNotification(data: {
    family_id: string;
    family_name: string;
    inviter_user_id: string;
    respondent_name: string;
    response: 'accepted' | 'declined';
    role: string;
  }): Promise<void> {
    try {
      const eventType = data.response === 'accepted' ? 'family_invitation_accepted' : 'family_invitation_declined';
      const severity = data.response === 'accepted' ? 'success' : 'warning';
      const priority = data.response === 'accepted' ? 'medium' : 'low';

      const notificationData: CreateNotificationData = {
        user_id: data.inviter_user_id,
        notification_type: 'family',
        event_type: eventType,
        template_data: {
          family_name: data.family_name,
          respondent_name: data.respondent_name,
          role: data.role,
          response: data.response
        },
        priority: priority,
        severity: severity,
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          response: data.response,
          respondent_name: data.respondent_name,
          role: data.role
        },
        expires_in_hours: 72 // 3 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Family invitation ${data.response} notification sent to inviter: ${data.inviter_user_id}`);

    } catch (error) {
      console.error('Error triggering family invitation response notification:', error);
    }
  }

  // =====================================================
  // FAMILY MEMBER NOTIFICATIONS
  // =====================================================

  /**
   * Notify family members of a new member joining
   */
  async notifyFamilyMembersOfNewMember(data: {
    family_id: string;
    family_name: string;
    new_member_name: string;
    new_member_user_id: string;
    role: string;
    excludeUserId?: string;
  }): Promise<void> {
    try {
      // Get all family members except the new member and excluded user
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', data.family_id)
        .neq('member_user_id', data.new_member_user_id);

      if (error) {
        console.error('Error fetching family members:', error);
        return;
      }

      if (!familyMembers || familyMembers.length === 0) return;

      // Send notification to each family member
      for (const member of familyMembers) {
        if (member.member_user_id === data.excludeUserId) continue;

        await this.triggerFamilyMemberJoinedNotification({
          user_id: member.member_user_id,
          family_id: data.family_id,
          family_name: data.family_name,
          new_member_name: data.new_member_name,
          role: data.role
        });
      }

    } catch (error) {
      console.error('Error in notifyFamilyMembersOfNewMember:', error);
    }
  }

  /**
   * Trigger family member joined notification
   */
  async triggerFamilyMemberJoinedNotification(data: {
    user_id: string;
    family_id: string;
    family_name: string;
    new_member_name: string;
    role: string;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'family',
        event_type: 'family_member_joined',
        template_data: {
          family_name: data.family_name,
          member_name: data.new_member_name,
          role: data.role
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          new_member_name: data.new_member_name,
          role: data.role
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering family member joined notification:', error);
    }
  }

  /**
   * Handle family member leaving
   */
  async handleFamilyMemberLeft(data: {
    family_id: string;
    family_name: string;
    departed_member_name: string;
    departed_member_user_id: string;
  }): Promise<void> {
    try {
      // Get remaining family members
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', data.family_id)
        .neq('member_user_id', data.departed_member_user_id);

      if (error) {
        console.error('Error fetching family members for departure notification:', error);
        return;
      }

      if (!familyMembers || familyMembers.length === 0) return;

      // Notify remaining family members
      for (const member of familyMembers) {
        await this.triggerFamilyMemberLeftNotification({
          user_id: member.member_user_id,
          family_id: data.family_id,
          family_name: data.family_name,
          departed_member_name: data.departed_member_name
        });
      }

    } catch (error) {
      console.error('Error in handleFamilyMemberLeft:', error);
    }
  }

  /**
   * Trigger family member left notification
   */
  async triggerFamilyMemberLeftNotification(data: {
    user_id: string;
    family_id: string;
    family_name: string;
    departed_member_name: string;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'family',
        event_type: 'family_member_left',
        template_data: {
          family_name: data.family_name,
          member_name: data.departed_member_name
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          departed_member_name: data.departed_member_name
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering family member left notification:', error);
    }
  }

  // =====================================================
  // ROLE CHANGE NOTIFICATIONS
  // =====================================================

  /**
   * Handle family member role changes
   */
  async handleFamilyRoleChange(data: {
    family_id: string;
    family_name: string;
    target_user_id: string;
    target_user_name: string;
    old_role: string;
    new_role: string;
    changed_by_user_id: string;
    changed_by_name: string;
  }): Promise<void> {
    try {
      // Notify the user whose role was changed
      await this.triggerUserRoleChangedNotification({
        user_id: data.target_user_id,
        family_id: data.family_id,
        family_name: data.family_name,
        old_role: data.old_role,
        new_role: data.new_role,
        changed_by_name: data.changed_by_name
      });

      // Notify other family members (except the target user and the one who made the change)
      await this.notifyFamilyMembersOfRoleChange({
        family_id: data.family_id,
        family_name: data.family_name,
        target_user_name: data.target_user_name,
        old_role: data.old_role,
        new_role: data.new_role,
        changed_by_name: data.changed_by_name,
        excludeUserIds: [data.target_user_id, data.changed_by_user_id]
      });

    } catch (error) {
      console.error('Error in handleFamilyRoleChange:', error);
    }
  }

  /**
   * Trigger user role changed notification
   */
  async triggerUserRoleChangedNotification(data: {
    user_id: string;
    family_id: string;
    family_name: string;
    old_role: string;
    new_role: string;
    changed_by_name: string;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'family',
        event_type: 'family_role_changed',
        template_data: {
          family_name: data.family_name,
          old_role: data.old_role,
          new_role: data.new_role,
          changed_by_name: data.changed_by_name
        },
        priority: 'medium',
        severity: 'info',
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          old_role: data.old_role,
          new_role: data.new_role,
          changed_by_name: data.changed_by_name
        },
        expires_in_hours: 72 // 3 days
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering user role changed notification:', error);
    }
  }

  /**
   * Notify family members of role change
   */
  async notifyFamilyMembersOfRoleChange(data: {
    family_id: string;
    family_name: string;
    target_user_name: string;
    old_role: string;
    new_role: string;
    changed_by_name: string;
    excludeUserIds: string[];
  }): Promise<void> {
    try {
      // Get family members excluding specified users
      let query = supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', data.family_id);

      if (data.excludeUserIds.length > 0) {
        query = query.not('member_user_id', 'in', `(${data.excludeUserIds.join(',')})`);
      }

      const { data: familyMembers, error } = await query;

      if (error) {
        console.error('Error fetching family members for role change notification:', error);
        return;
      }

      if (!familyMembers || familyMembers.length === 0) return;

      // Send notification to each family member
      for (const member of familyMembers) {
        const notificationData: CreateNotificationData = {
          user_id: member.member_user_id,
          notification_type: 'family',
          event_type: 'family_role_changed',
          template_data: {
            family_name: data.family_name,
            target_user_name: data.target_user_name,
            old_role: data.old_role,
            new_role: data.new_role,
            changed_by_name: data.changed_by_name
          },
          priority: 'low',
          severity: 'info',
          is_actionable: false,
          related_family_id: data.family_id,
          metadata: {
            target_user_name: data.target_user_name,
            old_role: data.old_role,
            new_role: data.new_role,
            changed_by_name: data.changed_by_name
          },
          expires_in_hours: 48 // 2 days
        };

        await NotificationService.createNotification(notificationData);
      }

    } catch (error) {
      console.error('Error in notifyFamilyMembersOfRoleChange:', error);
    }
  }

  // =====================================================
  // FAMILY ACTIVITY NOTIFICATIONS
  // =====================================================

  /**
   * Handle general family activity notifications
   */
  async handleFamilyActivity(activity: FamilyActivity): Promise<void> {
    try {
      // Get family members to notify (excluding the actor)
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', activity.family_id)
        .neq('member_user_id', activity.actor_user_id);

      if (error) {
        console.error('Error fetching family members for activity notification:', error);
        return;
      }

      if (!familyMembers || familyMembers.length === 0) return;

      // Check user preferences for family activity notifications
      for (const member of familyMembers) {
        const hasPreference = await this.checkUserFamilyActivityPreferences(
          member.member_user_id, 
          activity.activity_type
        );

        if (hasPreference) {
          await this.triggerFamilyActivityNotification({
            user_id: member.member_user_id,
            family_id: activity.family_id,
            family_name: activity.family_name,
            activity_type: activity.activity_type,
            actor_name: activity.actor_name,
            description: activity.description,
            metadata: activity.metadata
          });
        }
      }

    } catch (error) {
      console.error('Error in handleFamilyActivity:', error);
    }
  }

  /**
   * Trigger family activity notification
   */
  async triggerFamilyActivityNotification(data: {
    user_id: string;
    family_id: string;
    family_name: string;
    activity_type: string;
    actor_name: string;
    description: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'family',
        event_type: 'family_activity_update',
        template_data: {
          family_name: data.family_name,
          actor_name: data.actor_name,
          activity_type: data.activity_type,
          description: data.description
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          activity_type: data.activity_type,
          actor_name: data.actor_name,
          ...data.metadata
        },
        expires_in_hours: 24 // 1 day
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering family activity notification:', error);
    }
  }

  // =====================================================
  // FAMILY BUDGET AND GOAL COLLABORATION
  // =====================================================

  /**
   * Handle family budget collaboration notifications
   */
  async handleFamilyBudgetCollaboration(data: {
    family_id: string;
    family_name: string;
    budget_id: string;
    budget_name: string;
    actor_user_id: string;
    actor_name: string;
    action: 'created' | 'updated' | 'deleted' | 'contributed';
    amount?: number;
    currency?: string;
  }): Promise<void> {
    try {
      // Get family members to notify (excluding the actor)
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', data.family_id)
        .neq('member_user_id', data.actor_user_id);

      if (error || !familyMembers || familyMembers.length === 0) return;

      // Send collaboration notification to family members
      for (const member of familyMembers) {
        await this.triggerFamilyBudgetCollaborationNotification({
          user_id: member.member_user_id,
          family_id: data.family_id,
          family_name: data.family_name,
          budget_name: data.budget_name,
          actor_name: data.actor_name,
          action: data.action,
          amount: data.amount,
          currency: data.currency
        });
      }

    } catch (error) {
      console.error('Error in handleFamilyBudgetCollaboration:', error);
    }
  }

  /**
   * Trigger family budget collaboration notification
   */
  async triggerFamilyBudgetCollaborationNotification(data: {
    user_id: string;
    family_id: string;
    family_name: string;
    budget_name: string;
    actor_name: string;
    action: string;
    amount?: number;
    currency?: string;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'family',
        event_type: 'family_activity_update',
        template_data: {
          family_name: data.family_name,
          actor_name: data.actor_name,
          budget_name: data.budget_name,
          action: data.action,
          amount: data.amount ? this.formatCurrency(data.amount, data.currency) : undefined
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        related_family_id: data.family_id,
        metadata: {
          budget_name: data.budget_name,
          action: data.action,
          amount: data.amount,
          currency: data.currency
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering family budget collaboration notification:', error);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number, currency: string = 'PHP'): string {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `₱${amount.toFixed(2)}`;
    }
  }

  /**
   * Check if user has family notification preferences enabled
   */
  async checkUserFamilyNotificationPreferences(userId: string, eventType: string): Promise<boolean> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      switch (eventType) {
        case 'family_invitation_received':
        case 'family_invitation_accepted':
        case 'family_invitation_declined':
          return preferences.family_invitations;
        case 'family_member_joined':
        case 'family_member_left':
          return preferences.family_member_activity;
        case 'family_role_changed':
          return preferences.family_role_changes;
        case 'family_activity_update':
          return preferences.family_member_activity;
        default:
          return true; // Default to enabled for unknown event types
      }
    } catch (error) {
      console.error('Error checking user family notification preferences:', error);
      return true; // Default to enabled if preferences can't be fetched
    }
  }

  /**
   * Check if user wants family activity notifications for specific activity type
   */
  async checkUserFamilyActivityPreferences(userId: string, activityType: string): Promise<boolean> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      // For family activity, check if user has enabled family member activity notifications
      return preferences.family_member_activity;
    } catch (error) {
      console.error('Error checking user family activity preferences:', error);
      return false; // Default to disabled for activity notifications to prevent spam
    }
  }

  /**
   * Get family member information
   */
  async getFamilyMemberInfo(userId: string): Promise<{ name: string; email: string } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, first_name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching family member info:', error);
        return null;
      }

      return {
        name: data?.full_name || data?.first_name || 'User',
        email: data?.email || ''
      };
    } catch (error) {
      console.error('Error in getFamilyMemberInfo:', error);
      return null;
    }
  }

  /**
   * Get family information
   */
  async getFamilyInfo(familyId: string): Promise<{ family_name: string; owner_user_id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('family_name, owner_user_id')
        .eq('id', familyId)
        .single();

      if (error) {
        console.error('Error fetching family info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getFamilyInfo:', error);
      return null;
    }
  }

  /**
   * Cleanup old family notifications
   */
  async cleanupOldFamilyNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: deletedNotifications, error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_type', 'family')
        .lt('created_at', cutoffDate)
        .eq('is_read', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up old family notifications:', error);
        return 0;
      }

      const deletedCount = deletedNotifications?.length || 0;
      console.log(`Cleaned up ${deletedCount} old family notifications`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error in cleanupOldFamilyNotifications:', error);
      return 0;
    }
  }

  /**
   * Check if invitation is still valid
   */
  async isInvitationValid(invitationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select('expires_at, status')
        .eq('id', invitationId)
        .single();

      if (error || !data) return false;

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      return data.status === 'pending' && expiresAt > now;
    } catch (error) {
      console.error('Error checking invitation validity:', error);
      return false;
    }
  }

  /**
   * Bulk notify family members
   */
  async bulkNotifyFamilyMembers(
    familyId: string,
    notificationData: Omit<CreateNotificationData, 'user_id'>,
    excludeUserIds: string[] = []
  ): Promise<number> {
    try {
      let query = supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', familyId);

      if (excludeUserIds.length > 0) {
        query = query.not('member_user_id', 'in', `(${excludeUserIds.join(',')})`);
      }

      const { data: familyMembers, error } = await query;

      if (error || !familyMembers || familyMembers.length === 0) return 0;

      let notificationCount = 0;

      // Send notification to each family member
      for (const member of familyMembers) {
        try {
          await NotificationService.createNotification({
            ...notificationData,
            user_id: member.member_user_id
          });
          notificationCount++;
        } catch (error) {
          console.error(`Error sending notification to family member ${member.member_user_id}:`, error);
        }
      }

      return notificationCount;
    } catch (error) {
      console.error('Error in bulkNotifyFamilyMembers:', error);
      return 0;
    }
  }
}

// Export singleton instance
export default FamilyNotificationService.getInstance();