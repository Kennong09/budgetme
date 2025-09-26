/**
 * Notification Filter and Prioritization Service
 * 
 * Advanced filtering, prioritization, and intelligent notification management
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from '../database/notificationService';
import {
  UserNotification,
  NotificationPreferences,
  NotificationPriority,
  NotificationType,
  NotificationSeverity,
  NotificationFilter,
  NotificationSort,
  NotificationGroup,
  NotificationGroupBy
} from '../../types/notifications';

export interface PrioritizationRule {
  id: string;
  name: string;
  condition: (notification: UserNotification) => boolean;
  priority_adjustment: number; // -2 to +2
  is_active: boolean;
  created_at: string;
}

export interface FilterRule {
  id: string;
  name: string;
  user_id: string;
  filter_config: NotificationFilter;
  is_active: boolean;
  created_at: string;
}

export interface SmartNotificationConfig {
  enable_smart_prioritization: boolean;
  enable_quiet_hours: boolean;
  enable_frequency_limiting: boolean;
  enable_duplicate_detection: boolean;
  enable_context_awareness: boolean;
  max_notifications_per_hour: number;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string;   // HH:MM format
  quiet_hours_timezone: string;
}

export interface NotificationAnalytics {
  user_id: string;
  notification_frequency: Record<NotificationType, number>;
  priority_distribution: Record<NotificationPriority, number>;
  response_patterns: {
    avg_read_time: number; // seconds
    read_rate: number; // percentage
    action_rate: number; // percentage
  };
  preferred_times: {
    hour_distribution: number[]; // 24 hours
    day_distribution: number[];  // 7 days
  };
  last_updated: string;
}

/**
 * NotificationFilterService - Advanced notification filtering and prioritization
 * 
 * This service provides:
 * - Smart notification prioritization based on user behavior
 * - Advanced filtering with custom rules
 * - Duplicate detection and suppression
 * - Context-aware notification timing
 * - User preference learning
 */
export class NotificationFilterService {
  private static instance: NotificationFilterService;

  public static getInstance(): NotificationFilterService {
    if (!NotificationFilterService.instance) {
      NotificationFilterService.instance = new NotificationFilterService();
    }
    return NotificationFilterService.instance;
  }

  // =====================================================
  // SMART PRIORITIZATION
  // =====================================================

  /**
   * Apply smart prioritization to notifications
   */
  async applySmartPrioritization(
    notifications: UserNotification[],
    userId: string
  ): Promise<UserNotification[]> {
    try {
      // Get user analytics and preferences
      const [analytics, preferences] = await Promise.all([
        this.getUserAnalytics(userId),
        NotificationService.getNotificationPreferences(userId)
      ]);

      // Apply prioritization rules
      const prioritized = notifications.map(notification => {
        const adjustedPriority = this.calculateSmartPriority(notification, analytics, preferences);
        return {
          ...notification,
          priority: adjustedPriority,
          metadata: {
            ...notification.metadata,
            original_priority: notification.priority,
            smart_priority_applied: true
          }
        };
      });

      // Sort by priority and relevance
      return this.sortByPriorityAndRelevance(prioritized, analytics);

    } catch (error) {
      console.error('Error applying smart prioritization:', error);
      return notifications; // Return original order on error
    }
  }

  /**
   * Calculate smart priority based on user behavior and context
   */
  private calculateSmartPriority(
    notification: UserNotification,
    analytics: NotificationAnalytics | null,
    preferences: NotificationPreferences
  ): NotificationPriority {
    let priorityScore = this.getPriorityScore(notification.priority);

    if (!analytics) return notification.priority;

    // Adjust based on user's interaction patterns
    const typeFrequency = analytics.notification_frequency[notification.notification_type] || 0;
    const avgTypeFrequency = Object.values(analytics.notification_frequency)
      .reduce((sum, freq) => sum + freq, 0) / Object.keys(analytics.notification_frequency).length;

    // Lower priority for over-frequent notification types
    if (typeFrequency > avgTypeFrequency * 1.5) {
      priorityScore -= 0.5;
    }

    // Increase priority for actionable notifications if user has high action rate
    if (notification.is_actionable && analytics.response_patterns.action_rate > 0.7) {
      priorityScore += 0.5;
    }

    // Adjust based on current time preferences
    const currentHour = new Date().getHours();
    const hourPreference = analytics.preferred_times.hour_distribution[currentHour] || 0;
    const avgHourPreference = analytics.preferred_times.hour_distribution
      .reduce((sum, pref) => sum + pref, 0) / 24;

    if (hourPreference > avgHourPreference * 1.2) {
      priorityScore += 0.3;
    } else if (hourPreference < avgHourPreference * 0.5) {
      priorityScore -= 0.3;
    }

    // Apply business rules
    priorityScore += this.applyBusinessPriorityRules(notification);

    // Convert score back to priority level
    return this.scoreToPriority(priorityScore);
  }

  /**
   * Get numeric score for priority level
   */
  private getPriorityScore(priority: NotificationPriority): number {
    switch (priority) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'urgent': return 4;
      default: return 2;
    }
  }

  /**
   * Convert numeric score to priority level
   */
  private scoreToPriority(score: number): NotificationPriority {
    if (score >= 3.5) return 'urgent';
    if (score >= 2.5) return 'high';
    if (score >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Apply business-specific priority rules
   */
  private applyBusinessPriorityRules(notification: UserNotification): number {
    let adjustment = 0;

    // Budget exceeded notifications are always high priority
    if (notification.event_type === 'budget_exceeded') {
      adjustment += 1;
    }

    // Goal completion notifications are always high priority
    if (notification.event_type === 'goal_completed') {
      adjustment += 1;
    }

    // Family invitations are time-sensitive
    if (notification.event_type === 'family_invitation_received') {
      const createdAt = new Date(notification.created_at);
      const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursOld < 24) {
        adjustment += 0.5;
      }
    }

    // Large transaction alerts need immediate attention
    if (notification.event_type === 'large_transaction_alert') {
      adjustment += 0.5;
    }

    return adjustment;
  }

  /**
   * Sort notifications by priority and relevance
   */
  private sortByPriorityAndRelevance(
    notifications: UserNotification[],
    analytics: NotificationAnalytics | null
  ): UserNotification[] {
    return notifications.sort((a, b) => {
      // Primary sort: priority
      const priorityDiff = this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort: actionable notifications first
      if (a.is_actionable !== b.is_actionable) {
        return b.is_actionable ? 1 : -1;
      }

      // Tertiary sort: recency
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  // =====================================================
  // ADVANCED FILTERING
  // =====================================================

  /**
   * Apply advanced filters to notifications
   */
  async applyAdvancedFilters(
    notifications: UserNotification[],
    filters: NotificationFilter,
    userId: string
  ): Promise<UserNotification[]> {
    try {
      let filtered = [...notifications];

      // Apply type filter
      if (filters.notification_type) {
        filtered = filtered.filter(n => n.notification_type === filters.notification_type);
      }

      // Apply priority filter
      if (filters.priority) {
        filtered = filtered.filter(n => n.priority === filters.priority);
      }

      // Apply severity filter
      if (filters.severity) {
        filtered = filtered.filter(n => n.severity === filters.severity);
      }

      // Apply read status filter
      if (typeof filters.is_read === 'boolean') {
        filtered = filtered.filter(n => n.is_read === filters.is_read);
      }

      // Apply date range filter
      if (filters.date_range) {
        const start = new Date(filters.date_range.start);
        const end = new Date(filters.date_range.end);
        
        filtered = filtered.filter(n => {
          const created = new Date(n.created_at);
          return created >= start && created <= end;
        });
      }

      // Apply quiet hours filter
      const preferences = await NotificationService.getNotificationPreferences(userId);
      if (preferences.quiet_hours?.enabled) {
        filtered = this.applyQuietHoursFilter(filtered, preferences.quiet_hours);
      }

      return filtered;

    } catch (error) {
      console.error('Error applying advanced filters:', error);
      return notifications; // Return original on error
    }
  }

  /**
   * Apply quiet hours filter
   */
  private applyQuietHoursFilter(
    notifications: UserNotification[],
    quietHours: { start?: string; end?: string; timezone?: string }
  ): UserNotification[] {
    if (!quietHours.start || !quietHours.end) return notifications;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Check if current time is within quiet hours
    const isQuietTime = startTime <= endTime 
      ? currentTime >= startTime && currentTime <= endTime
      : currentTime >= startTime || currentTime <= endTime;

    if (!isQuietTime) return notifications;

    // During quiet hours, only show urgent notifications
    return notifications.filter(n => n.priority === 'urgent');
  }

  // =====================================================
  // DUPLICATE DETECTION
  // =====================================================

  /**
   * Detect and remove duplicate notifications
   */
  async detectAndRemoveDuplicates(
    notifications: UserNotification[],
    userId: string
  ): Promise<UserNotification[]> {
    try {
      const duplicateGroups = this.groupDuplicateNotifications(notifications);
      const deduplicated: UserNotification[] = [];

      for (const group of duplicateGroups) {
        if (group.length === 1) {
          deduplicated.push(group[0]);
        } else {
          // Keep the most recent notification and mark others as consolidated
          const latest = group.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          // Update the latest notification with consolidated information
          const consolidatedNotification = await this.createConsolidatedNotification(group, latest);
          deduplicated.push(consolidatedNotification);

          // Mark other notifications as read/processed
          const duplicateIds = group.slice(1).map(n => n.id);
          if (duplicateIds.length > 0) {
            await NotificationService.markMultipleAsRead(duplicateIds, userId);
          }
        }
      }

      return deduplicated;

    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return notifications;
    }
  }

  /**
   * Group duplicate notifications
   */
  private groupDuplicateNotifications(notifications: UserNotification[]): UserNotification[][] {
    const groups: UserNotification[][] = [];
    const processed = new Set<string>();

    for (const notification of notifications) {
      if (processed.has(notification.id)) continue;

      const duplicates = notifications.filter(n => 
        n.id !== notification.id &&
        !processed.has(n.id) &&
        this.areDuplicateNotifications(notification, n)
      );

      const group = [notification, ...duplicates];
      groups.push(group);

      // Mark all as processed
      group.forEach(n => processed.add(n.id));
    }

    return groups;
  }

  /**
   * Check if two notifications are duplicates
   */
  private areDuplicateNotifications(a: UserNotification, b: UserNotification): boolean {
    // Same type and event
    if (a.notification_type !== b.notification_type || a.event_type !== b.event_type) {
      return false;
    }

    // Same related entity
    if (a.related_budget_id !== b.related_budget_id ||
        a.related_goal_id !== b.related_goal_id ||
        a.related_family_id !== b.related_family_id ||
        a.related_transaction_id !== b.related_transaction_id) {
      return false;
    }

    // Created within short time window (1 hour)
    const timeDiff = Math.abs(
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oneHour = 60 * 60 * 1000;
    
    return timeDiff <= oneHour;
  }

  /**
   * Create consolidated notification from duplicates
   */
  private async createConsolidatedNotification(
    duplicates: UserNotification[],
    latest: UserNotification
  ): Promise<UserNotification> {
    const count = duplicates.length;
    
    return {
      ...latest,
      title: `${latest.title} (${count} similar)`,
      message: `${latest.message}\n\nThis notification represents ${count} similar alerts.`,
      metadata: {
        ...latest.metadata,
        is_consolidated: true,
        duplicate_count: count,
        consolidated_ids: duplicates.map(d => d.id)
      }
    };
  }

  // =====================================================
  // CONTEXT-AWARE FILTERING
  // =====================================================

  /**
   * Apply context-aware filtering based on user activity
   */
  async applyContextAwareFiltering(
    notifications: UserNotification[],
    userId: string
  ): Promise<UserNotification[]> {
    try {
      const userContext = await this.getUserContext(userId);
      
      return notifications.filter(notification => 
        this.isNotificationRelevantInContext(notification, userContext)
      );

    } catch (error) {
      console.error('Error applying context-aware filtering:', error);
      return notifications;
    }
  }

  /**
   * Get user context information
   */
  private async getUserContext(userId: string): Promise<{
    recent_activity: string[];
    current_session_duration: number;
    last_active_module: string;
    has_pending_actions: boolean;
  }> {
    // This would typically fetch from user activity logs
    // For now, return mock context
    return {
      recent_activity: [],
      current_session_duration: 0,
      last_active_module: 'dashboard',
      has_pending_actions: false
    };
  }

  /**
   * Check if notification is relevant in current context
   */
  private isNotificationRelevantInContext(
    notification: UserNotification,
    context: any
  ): boolean {
    // Don't show budget notifications if user just viewed budgets
    if (notification.notification_type === 'budget' && 
        context.last_active_module === 'budget' && 
        context.current_session_duration < 300) { // 5 minutes
      return false;
    }

    // Prioritize actionable notifications when user has pending actions
    if (context.has_pending_actions && !notification.is_actionable) {
      return false;
    }

    return true;
  }

  // =====================================================
  // GROUPING AND ORGANIZATION
  // =====================================================

  /**
   * Group notifications by specified criteria
   */
  groupNotifications(
    notifications: UserNotification[],
    groupBy: NotificationGroupBy
  ): NotificationGroup[] {
    const groups = new Map<string, UserNotification[]>();

    notifications.forEach(notification => {
      const key = this.getGroupKey(notification, groupBy);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(notification);
    });

    return Array.from(groups.entries()).map(([key, notifications]) => ({
      key,
      label: this.getGroupLabel(key, groupBy),
      count: notifications.length,
      notifications: notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }));
  }

  /**
   * Get grouping key for a notification
   */
  private getGroupKey(notification: UserNotification, groupBy: NotificationGroupBy): string {
    switch (groupBy) {
      case 'type':
        return notification.notification_type;
      case 'priority':
        return notification.priority;
      case 'read_status':
        return notification.is_read ? 'read' : 'unread';
      case 'date':
        return new Date(notification.created_at).toDateString();
      default:
        return 'all';
    }
  }

  /**
   * Get display label for group
   */
  private getGroupLabel(key: string, groupBy: NotificationGroupBy): string {
    switch (groupBy) {
      case 'type':
        return this.capitalizeFirst(key) + ' Notifications';
      case 'priority':
        return this.capitalizeFirst(key) + ' Priority';
      case 'read_status':
        return key === 'read' ? 'Read' : 'Unread';
      case 'date':
        return key;
      default:
        return 'All Notifications';
    }
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // =====================================================
  // USER ANALYTICS
  // =====================================================

  /**
   * Get user notification analytics
   */
  async getUserAnalytics(userId: string): Promise<NotificationAnalytics | null> {
    try {
      // Get user's notification interaction data from the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: notifications, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (error || !notifications) return null;

      return this.calculateAnalytics(notifications, userId);

    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

  /**
   * Calculate analytics from notification data
   */
  private calculateAnalytics(
    notifications: UserNotification[],
    userId: string
  ): NotificationAnalytics {
    const total = notifications.length;
    const read = notifications.filter(n => n.is_read).length;
    const withActions = notifications.filter(n => n.is_actionable && n.clicked_at).length;
    const actionable = notifications.filter(n => n.is_actionable).length;

    // Calculate frequency by type
    const typeFrequency: Record<NotificationType, number> = {
      budget: 0,
      goal: 0,
      family: 0,
      transaction: 0,
      system: 0
    };

    // Calculate priority distribution
    const priorityDistribution: Record<NotificationPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    // Calculate hour and day distributions
    const hourDistribution = new Array(24).fill(0);
    const dayDistribution = new Array(7).fill(0);

    notifications.forEach(n => {
      typeFrequency[n.notification_type]++;
      priorityDistribution[n.priority]++;

      if (n.read_at) {
        const readDate = new Date(n.read_at);
        hourDistribution[readDate.getHours()]++;
        dayDistribution[readDate.getDay()]++;
      }
    });

    // Calculate average read time
    const readTimes = notifications
      .filter(n => n.read_at)
      .map(n => {
        const created = new Date(n.created_at).getTime();
        const read = new Date(n.read_at!).getTime();
        return (read - created) / 1000; // seconds
      });

    const avgReadTime = readTimes.length > 0 
      ? readTimes.reduce((sum, time) => sum + time, 0) / readTimes.length 
      : 0;

    return {
      user_id: userId,
      notification_frequency: typeFrequency,
      priority_distribution: priorityDistribution,
      response_patterns: {
        avg_read_time: Math.round(avgReadTime),
        read_rate: total > 0 ? (read / total) * 100 : 0,
        action_rate: actionable > 0 ? (withActions / actionable) * 100 : 0
      },
      preferred_times: {
        hour_distribution: hourDistribution,
        day_distribution: dayDistribution
      },
      last_updated: new Date().toISOString()
    };
  }

  // =====================================================
  // FREQUENCY LIMITING
  // =====================================================

  /**
   * Apply frequency limiting to notifications
   */
  async applyFrequencyLimiting(
    notifications: UserNotification[],
    userId: string,
    maxPerHour: number = 10
  ): Promise<UserNotification[]> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get recent notifications count
      const { data: recentNotifications, error } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('Error checking recent notifications:', error);
        return notifications;
      }

      const recentCount = recentNotifications?.length || 0;
      
      if (recentCount >= maxPerHour) {
        // Only allow urgent notifications when limit is exceeded
        return notifications.filter(n => n.priority === 'urgent');
      }

      // Limit new notifications to stay within threshold
      const allowedCount = maxPerHour - recentCount;
      
      if (notifications.length <= allowedCount) {
        return notifications;
      }

      // Prioritize and limit
      const prioritized = await this.applySmartPrioritization(notifications, userId);
      return prioritized.slice(0, allowedCount);

    } catch (error) {
      console.error('Error applying frequency limiting:', error);
      return notifications;
    }
  }
}

// Export singleton instance
export default NotificationFilterService.getInstance();