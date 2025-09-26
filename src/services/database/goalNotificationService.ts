/**
 * Goal Notification Service
 * 
 * Service for triggering goal-related notifications based on contribution progress,
 * milestone achievements, deadline proximity, and goal lifecycle events
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from './notificationService';
import {
  CreateNotificationData,
  GoalNotificationData,
  NotificationError
} from '../../types/notifications';

export interface GoalProgress {
  goal_id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: string;
  status: string;
  currency: string;
  percentage_complete: number;
  family_id?: string;
}

export interface GoalContribution {
  goal_id: string;
  user_id: string;
  amount: number;
  contribution_date: string;
  transaction_id?: string;
}

export interface GoalMilestone {
  milestone_percentage: number;
  milestone_name: string;
  celebration_message: string;
}

/**
 * Goal Notification Service
 * 
 * Handles all goal-related notification triggers and events
 */
export class GoalNotificationService {
  private static instance: GoalNotificationService;

  // Define milestone thresholds
  private static readonly MILESTONES: GoalMilestone[] = [
    { milestone_percentage: 0.25, milestone_name: '25% Complete', celebration_message: 'Great start! You\'re a quarter of the way there!' },
    { milestone_percentage: 0.50, milestone_name: '50% Complete', celebration_message: 'Halfway there! You\'re doing amazing!' },
    { milestone_percentage: 0.75, milestone_name: '75% Complete', celebration_message: 'Almost there! Just 25% to go!' },
    { milestone_percentage: 1.00, milestone_name: 'Goal Achieved', celebration_message: 'Congratulations! You\'ve achieved your goal!' }
  ];

  public static getInstance(): GoalNotificationService {
    if (!GoalNotificationService.instance) {
      GoalNotificationService.instance = new GoalNotificationService();
    }
    return GoalNotificationService.instance;
  }

  // =====================================================
  // GOAL MILESTONE NOTIFICATIONS
  // =====================================================

  /**
   * Check goal progress and trigger milestone notifications
   */
  async checkGoalMilestones(goalId?: string): Promise<void> {
    try {
      let query = supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          target_amount,
          current_amount,
          target_date,
          priority,
          status,
          currency,
          family_id,
          milestone_25_notified,
          milestone_50_notified,
          milestone_75_notified,
          goal_completed_notified
        `)
        .in('status', ['active', 'in_progress']);

      if (goalId) {
        query = query.eq('id', goalId);
      }

      const { data: goals, error } = await query;

      if (error) {
        console.error('Error fetching goals for milestone check:', error);
        throw new NotificationError('Failed to fetch goals', 'FETCH_ERROR', error);
      }

      if (!goals || goals.length === 0) return;

      // Check each goal for milestone achievements
      for (const goal of goals) {
        await this.checkSingleGoalMilestones(goal);
      }

    } catch (error) {
      console.error('Error in checkGoalMilestones:', error);
      throw error;
    }
  }

  /**
   * Check a single goal for milestone achievements
   */
  private async checkSingleGoalMilestones(goal: any): Promise<void> {
    const percentageComplete = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) : 0;

    // Check each milestone
    for (const milestone of GoalNotificationService.MILESTONES) {
      const milestoneKey = this.getMilestoneNotifiedKey(milestone.milestone_percentage);
      
      // Check if milestone is reached and notification not yet sent
      if (percentageComplete >= milestone.milestone_percentage && !goal[milestoneKey]) {
        await this.triggerGoalMilestoneNotification({
          goal_id: goal.id,
          user_id: goal.user_id,
          goal_name: goal.goal_name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          percentage_complete: percentageComplete,
          milestone_percentage: milestone.milestone_percentage,
          target_date: goal.target_date,
          currency: goal.currency
        }, milestone);

        // Mark milestone as notified
        await this.updateMilestoneNotificationStatus(goal.id, milestoneKey);
      }
    }
  }

  /**
   * Get the database column key for milestone notification status
   */
  private getMilestoneNotifiedKey(percentage: number): string {
    switch (percentage) {
      case 0.25: return 'milestone_25_notified';
      case 0.50: return 'milestone_50_notified';
      case 0.75: return 'milestone_75_notified';
      case 1.00: return 'goal_completed_notified';
      default: return 'milestone_25_notified';
    }
  }

  /**
   * Update milestone notification status in database
   */
  private async updateMilestoneNotificationStatus(goalId: string, milestoneKey: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ [milestoneKey]: true })
        .eq('id', goalId);

      if (error) {
        console.error(`Error updating milestone status ${milestoneKey}:`, error);
      }
    } catch (error) {
      console.error('Error updating milestone notification status:', error);
    }
  }

  /**
   * Trigger goal milestone notification
   */
  async triggerGoalMilestoneNotification(
    goalData: GoalNotificationData, 
    milestone: GoalMilestone
  ): Promise<void> {
    try {
      const eventType = this.getEventTypeForMilestone(milestone.milestone_percentage);
      const priority = milestone.milestone_percentage >= 1.0 ? 'high' : 'medium';
      
      const notificationData: CreateNotificationData = {
        user_id: goalData.user_id,
        notification_type: 'goal',
        event_type: eventType,
        template_data: {
          goal_name: goalData.goal_name,
          current_amount: this.formatCurrency(goalData.current_amount, goalData.currency),
          target_amount: this.formatCurrency(goalData.target_amount, goalData.currency),
          percentage: Math.round(goalData.percentage_complete * 100),
          milestone_name: milestone.milestone_name,
          celebration_message: milestone.celebration_message
        },
        priority: priority,
        severity: 'success',
        is_actionable: milestone.milestone_percentage >= 1.0,
        action_url: milestone.milestone_percentage >= 1.0 ? `/goals/${goalData.goal_id}` : undefined,
        action_text: milestone.milestone_percentage >= 1.0 ? 'View Goal' : undefined,
        related_goal_id: goalData.goal_id,
        metadata: {
          target_amount: goalData.target_amount,
          current_amount: goalData.current_amount,
          percentage_complete: goalData.percentage_complete,
          milestone_percentage: milestone.milestone_percentage,
          milestone_name: milestone.milestone_name
        },
        expires_in_hours: milestone.milestone_percentage >= 1.0 ? 168 : 72 // 7 days for completion, 3 days for milestones
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Goal milestone notification sent: ${goalData.goal_name} - ${milestone.milestone_name}`);

    } catch (error) {
      console.error('Error triggering goal milestone notification:', error);
      throw new NotificationError('Failed to trigger goal milestone notification', 'NOTIFICATION_ERROR', error);
    }
  }

  /**
   * Get event type for milestone percentage
   */
  private getEventTypeForMilestone(percentage: number): string {
    switch (percentage) {
      case 0.25: return 'goal_milestone_25';
      case 0.50: return 'goal_milestone_50';
      case 0.75: return 'goal_milestone_75';
      case 1.00: return 'goal_completed';
      default: return 'goal_milestone_25';
    }
  }

  // =====================================================
  // GOAL CONTRIBUTION NOTIFICATIONS
  // =====================================================

  /**
   * Handle goal contribution and trigger appropriate notifications
   */
  async handleGoalContribution(contribution: GoalContribution): Promise<void> {
    try {
      // Get goal details
      const { data: goal, error } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          target_amount,
          current_amount,
          target_date,
          currency,
          family_id
        `)
        .eq('id', contribution.goal_id)
        .single();

      if (error) {
        console.error('Error fetching goal for contribution:', error);
        throw new NotificationError('Failed to fetch goal', 'FETCH_ERROR', error);
      }

      if (!goal) return;

      // Trigger contribution acknowledgment notification
      await this.triggerGoalContributionNotification({
        goal_id: goal.id,
        user_id: goal.user_id,
        goal_name: goal.goal_name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        contribution_amount: contribution.amount,
        target_date: goal.target_date,
        currency: goal.currency
      });

      // Check for milestone achievements after contribution
      await this.checkSingleGoalMilestones(goal);

    } catch (error) {
      console.error('Error in handleGoalContribution:', error);
      throw error;
    }
  }

  /**
   * Trigger goal contribution notification
   */
  async triggerGoalContributionNotification(data: GoalNotificationData & { contribution_amount: number }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'goal',
        event_type: 'goal_contribution_added',
        template_data: {
          goal_name: data.goal_name,
          amount: this.formatCurrency(data.contribution_amount, data.currency),
          current_amount: this.formatCurrency(data.current_amount, data.currency),
          target_amount: this.formatCurrency(data.target_amount, data.currency),
          percentage: Math.round((data.current_amount / data.target_amount) * 100)
        },
        priority: 'low',
        severity: 'success',
        is_actionable: false,
        related_goal_id: data.goal_id,
        metadata: {
          contribution_amount: data.contribution_amount,
          new_current_amount: data.current_amount,
          target_amount: data.target_amount
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Goal contribution notification sent: ${data.goal_name} - ${this.formatCurrency(data.contribution_amount, data.currency)}`);

    } catch (error) {
      console.error('Error triggering goal contribution notification:', error);
      throw new NotificationError('Failed to trigger goal contribution notification', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // GOAL DEADLINE NOTIFICATIONS
  // =====================================================

  /**
   * Check for goals approaching deadlines and send warnings
   */
  async checkGoalDeadlines(): Promise<void> {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Check for goals with deadlines in the next 2 weeks
      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          target_amount,
          current_amount,
          target_date,
          priority,
          currency,
          deadline_warning_sent
        `)
        .in('status', ['active', 'in_progress'])
        .gte('target_date', now.toISOString())
        .lte('target_date', twoWeeksFromNow.toISOString())
        .neq('deadline_warning_sent', true);

      if (error) {
        console.error('Error fetching goals with approaching deadlines:', error);
        throw new NotificationError('Failed to fetch goals with deadlines', 'FETCH_ERROR', error);
      }

      if (!goals || goals.length === 0) return;

      // Check each goal for deadline proximity
      for (const goal of goals) {
        const targetDate = new Date(goal.target_date);
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send warning if deadline is within a week or for high priority goals within 2 weeks
        if (daysLeft <= 7 || (goal.priority === 'high' && daysLeft <= 14)) {
          await this.triggerGoalDeadlineWarning({
            goal_id: goal.id,
            user_id: goal.user_id,
            goal_name: goal.goal_name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            target_date: goal.target_date,
            currency: goal.currency,
            percentage_complete: goal.current_amount / goal.target_amount,
            days_left: daysLeft
          });

          // Mark deadline warning as sent
          await supabase
            .from('goals')
            .update({ deadline_warning_sent: true })
            .eq('id', goal.id);
        }
      }

    } catch (error) {
      console.error('Error in checkGoalDeadlines:', error);
      throw error;
    }
  }

  /**
   * Trigger goal deadline warning notification
   */
  async triggerGoalDeadlineWarning(data: GoalNotificationData & { days_left: number }): Promise<void> {
    try {
      const percentageComplete = (data.current_amount / data.target_amount) * 100;
      const amountNeeded = data.target_amount - data.current_amount;
      
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'goal',
        event_type: 'goal_deadline_warning',
        template_data: {
          goal_name: data.goal_name,
          days_left: data.days_left,
          target_date: new Date(data.target_date).toLocaleDateString(),
          percentage_complete: Math.round(percentageComplete),
          amount_needed: this.formatCurrency(amountNeeded, data.currency),
          current_amount: this.formatCurrency(data.current_amount, data.currency),
          target_amount: this.formatCurrency(data.target_amount, data.currency)
        },
        priority: data.days_left <= 3 ? 'high' : 'medium',
        severity: 'warning',
        is_actionable: true,
        action_url: `/goals/${data.goal_id}`,
        action_text: 'Update Goal',
        related_goal_id: data.goal_id,
        metadata: {
          days_left: data.days_left,
          target_date: data.target_date,
          percentage_complete: percentageComplete,
          amount_needed: amountNeeded
        },
        expires_in_hours: 24 // 1 day
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Goal deadline warning sent: ${data.goal_name} - ${data.days_left} days left`);

    } catch (error) {
      console.error('Error triggering goal deadline warning:', error);
      throw new NotificationError('Failed to trigger goal deadline warning', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // GOAL STATUS CHANGE NOTIFICATIONS
  // =====================================================

  /**
   * Handle goal status changes and trigger notifications
   */
  async handleGoalStatusChange(goalId: string, oldStatus: string, newStatus: string): Promise<void> {
    try {
      if (oldStatus === newStatus) return;

      const { data: goal, error } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          target_amount,
          current_amount,
          target_date,
          currency
        `)
        .eq('id', goalId)
        .single();

      if (error) {
        console.error('Error fetching goal for status change:', error);
        return;
      }

      if (!goal) return;

      // Handle specific status transitions
      if (newStatus === 'completed' && oldStatus !== 'completed') {
        await this.triggerGoalCompletionNotification({
          goal_id: goal.id,
          user_id: goal.user_id,
          goal_name: goal.goal_name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          target_date: goal.target_date,
          currency: goal.currency,
          percentage_complete: 1.0
        });
      } else if (newStatus === 'paused' && oldStatus === 'active') {
        await this.triggerGoalPausedNotification(goal);
      } else if (newStatus === 'active' && oldStatus === 'paused') {
        await this.triggerGoalResumedNotification(goal);
      }

    } catch (error) {
      console.error('Error in handleGoalStatusChange:', error);
    }
  }

  /**
   * Trigger goal completion notification
   */
  async triggerGoalCompletionNotification(data: GoalNotificationData): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'goal',
        event_type: 'goal_completed',
        template_data: {
          goal_name: data.goal_name,
          target_amount: this.formatCurrency(data.target_amount, data.currency),
          completion_date: new Date().toLocaleDateString()
        },
        priority: 'high',
        severity: 'success',
        is_actionable: true,
        action_url: `/goals/${data.goal_id}`,
        action_text: 'View Achievement',
        related_goal_id: data.goal_id,
        metadata: {
          target_amount: data.target_amount,
          completion_date: new Date().toISOString()
        },
        expires_in_hours: 168 // 7 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Goal completion notification sent: ${data.goal_name}`);

    } catch (error) {
      console.error('Error triggering goal completion notification:', error);
      throw new NotificationError('Failed to trigger goal completion notification', 'NOTIFICATION_ERROR', error);
    }
  }

  /**
   * Trigger goal paused notification
   */
  async triggerGoalPausedNotification(goal: any): Promise<void> {
    // Implementation for goal paused notification
    // This would be used if we want to notify users when their goals are paused
  }

  /**
   * Trigger goal resumed notification
   */
  async triggerGoalResumedNotification(goal: any): Promise<void> {
    // Implementation for goal resumed notification
    // This would be used if we want to notify users when their goals are resumed
  }

  // =====================================================
  // FAMILY GOAL NOTIFICATIONS
  // =====================================================

  /**
   * Handle family goal contributions and shared notifications
   */
  async handleFamilyGoalContribution(
    goalId: string, 
    contributorUserId: string, 
    amount: number
  ): Promise<void> {
    try {
      // Get goal and family information
      const { data: goal, error } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          target_amount,
          current_amount,
          currency,
          family_id
        `)
        .eq('id', goalId)
        .single();

      if (error || !goal || !goal.family_id) return;

      // Get family members to notify
      const { data: familyMembers, error: familyError } = await supabase
        .from('family_members')
        .select('member_user_id')
        .eq('family_id', goal.family_id);

      if (familyError || !familyMembers) return;

      // Get contributor's name
      const { data: contributor, error: contributorError } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('id', contributorUserId)
        .single();

      const contributorName = contributor?.full_name || contributor?.first_name || 'A family member';

      // Notify all family members except the contributor
      for (const member of familyMembers) {
        if (member.member_user_id !== contributorUserId) {
          await this.triggerFamilyGoalContributionNotification({
            goal_id: goalId,
            user_id: member.member_user_id,
            goal_name: goal.goal_name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            currency: goal.currency,
            contributor_name: contributorName,
            contribution_amount: amount
          });
        }
      }

    } catch (error) {
      console.error('Error in handleFamilyGoalContribution:', error);
    }
  }

  /**
   * Trigger family goal contribution notification
   */
  async triggerFamilyGoalContributionNotification(data: any): Promise<void> {
    try {
      const percentageComplete = (data.current_amount / data.target_amount) * 100;
      
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'goal',
        event_type: 'goal_contribution_added',
        template_data: {
          contributor_name: data.contributor_name,
          goal_name: data.goal_name,
          amount: this.formatCurrency(data.contribution_amount, data.currency),
          current_amount: this.formatCurrency(data.current_amount, data.currency),
          target_amount: this.formatCurrency(data.target_amount, data.currency),
          percentage: Math.round(percentageComplete)
        },
        priority: 'medium',
        severity: 'success',
        is_actionable: false,
        related_goal_id: data.goal_id,
        metadata: {
          contributor_name: data.contributor_name,
          contribution_amount: data.contribution_amount,
          is_family_goal: true
        },
        expires_in_hours: 72 // 3 days
      };

      await NotificationService.createNotification(notificationData);

    } catch (error) {
      console.error('Error triggering family goal contribution notification:', error);
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
   * Check if user has goal notification preferences enabled
   */
  async checkUserGoalNotificationPreferences(userId: string, eventType: string): Promise<boolean> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      switch (eventType) {
        case 'goal_milestone_25':
        case 'goal_milestone_50':
        case 'goal_milestone_75':
          return preferences.goal_milestone_alerts;
        case 'goal_completed':
          return preferences.goal_completion_celebrations;
        case 'goal_deadline_warning':
          return preferences.goal_deadline_reminders;
        case 'goal_contribution_added':
          return preferences.goal_contribution_confirmations;
        default:
          return true; // Default to enabled for unknown event types
      }
    } catch (error) {
      console.error('Error checking user goal notification preferences:', error);
      return true; // Default to enabled if preferences can't be fetched
    }
  }

  /**
   * Cleanup old goal notifications
   */
  async cleanupOldGoalNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: deletedNotifications, error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_type', 'goal')
        .lt('created_at', cutoffDate)
        .eq('is_read', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up old goal notifications:', error);
        return 0;
      }

      const deletedCount = deletedNotifications?.length || 0;
      console.log(`Cleaned up ${deletedCount} old goal notifications`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error in cleanupOldGoalNotifications:', error);
      return 0;
    }
  }

  /**
   * Reset milestone notification flags (for testing or data correction)
   */
  async resetGoalMilestoneFlags(goalId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          milestone_25_notified: false,
          milestone_50_notified: false,
          milestone_75_notified: false,
          goal_completed_notified: false,
          deadline_warning_sent: false
        })
        .eq('id', goalId);

      if (error) {
        console.error('Error resetting goal milestone flags:', error);
        throw new NotificationError('Failed to reset milestone flags', 'UPDATE_ERROR', error);
      }

      console.log(`Reset milestone flags for goal: ${goalId}`);

    } catch (error) {
      console.error('Error in resetGoalMilestoneFlags:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default GoalNotificationService.getInstance();