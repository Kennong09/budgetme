/**
 * Comprehensive Type Definitions for Notification System
 * 
 * This file contains all TypeScript interfaces and types for the notification system
 * that integrates with Budget, Goals, Family, and Transaction modules.
 */

// =====================================================
// CORE NOTIFICATION TYPES
// =====================================================

export type NotificationType = 'budget' | 'goal' | 'family' | 'transaction' | 'system';

export type NotificationEventType = 
  // Budget events
  | 'budget_threshold_warning'
  | 'budget_exceeded'
  | 'budget_period_expiring'
  | 'budget_monthly_summary'
  // Goal events
  | 'goal_milestone_25'
  | 'goal_milestone_50'
  | 'goal_milestone_75'
  | 'goal_completed'
  | 'goal_deadline_warning'
  | 'goal_contribution_added'
  // Family events
  | 'family_invitation_received'
  | 'family_invitation_accepted'
  | 'family_invitation_declined'
  | 'family_member_joined'
  | 'family_member_left'
  | 'family_role_changed'
  | 'family_activity_update'
  // Transaction events
  | 'large_transaction_alert'
  | 'recurring_transaction_reminder'
  | 'transaction_categorization_suggestion'
  | 'monthly_spending_summary'
  // System events
  | 'system_maintenance'
  | 'feature_announcement'
  | 'security_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export type DeliveryMethod = 'in_app' | 'email' | 'push';

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export type AggregationStrategy = 'combine' | 'suppress' | 'delay';

// =====================================================
// DATABASE ENTITY INTERFACES
// =====================================================

export interface UserNotification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  event_type: NotificationEventType;
  title: string;
  message: string;
  priority: NotificationPriority;
  severity: NotificationSeverity;
  is_read: boolean;
  is_actionable: boolean;
  action_url?: string;
  action_text?: string;
  related_budget_id?: string;
  related_goal_id?: string;
  related_family_id?: string;
  related_transaction_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  read_at?: string;
  expires_at?: string;
  delivered_at?: string;
  clicked_at?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Budget preferences
  budget_threshold_warnings: boolean;
  budget_exceeded_alerts: boolean;
  budget_period_expiring: boolean;
  budget_monthly_summaries: boolean;
  // Goal preferences
  goal_milestone_alerts: boolean;
  goal_completion_celebrations: boolean;
  goal_deadline_reminders: boolean;
  goal_contribution_confirmations: boolean;
  // Family preferences
  family_invitations: boolean;
  family_member_activity: boolean;
  family_role_changes: boolean;
  family_shared_goal_updates: boolean;
  // Transaction preferences
  large_transaction_alerts: boolean;
  recurring_transaction_reminders: boolean;
  categorization_suggestions: boolean;
  monthly_spending_summaries: boolean;
  // Delivery preferences
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  // Thresholds
  large_transaction_threshold: number;
  budget_warning_threshold: number;
  // Quiet hours
  quiet_hours: {
    enabled: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  delivery_method: DeliveryMethod;
  delivery_status: DeliveryStatus;
  attempted_at: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
  external_id?: string;
  metadata: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  template_key: string;
  notification_type: NotificationType;
  event_type: NotificationEventType;
  title_template: string;
  message_template: string;
  default_priority: NotificationPriority;
  default_severity: NotificationSeverity;
  is_actionable: boolean;
  action_url_template?: string;
  action_text_template?: string;
  is_active: boolean;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface NotificationAggregationRule {
  id: string;
  rule_name: string;
  notification_type: NotificationType;
  event_type: NotificationEventType;
  time_window_minutes: number;
  max_notifications_per_window: number;
  aggregation_strategy: AggregationStrategy;
  combined_title_template?: string;
  combined_message_template?: string;
  is_active: boolean;
  priority_override?: NotificationPriority;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVICE INTERFACES
// =====================================================

export interface NotificationServiceInterface {
  // Core CRUD operations
  getNotifications(userId: string, options?: GetNotificationsOptions): Promise<UserNotification[]>;
  getNotificationById(notificationId: string, userId: string): Promise<UserNotification | null>;
  createNotification(data: CreateNotificationData): Promise<UserNotification>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<number>;
  deleteNotification(notificationId: string, userId: string): Promise<boolean>;
  
  // Bulk operations
  markMultipleAsRead(notificationIds: string[], userId: string): Promise<number>;
  deleteExpiredNotifications(userId: string): Promise<number>;
  
  // Preference management
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  
  // Count and status
  getUnreadCount(userId: string): Promise<number>;
  getNotificationCounts(userId: string): Promise<NotificationCounts>;
  
  // Real-time subscriptions
  subscribeToNotifications(userId: string, callback: NotificationCallback): Promise<() => void>;
  
  // Template management
  getTemplates(notificationType?: NotificationType): Promise<NotificationTemplate[]>;
  
  // Delivery tracking
  getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryLog[]>;
}

// =====================================================
// SERVICE PARAMETER INTERFACES
// =====================================================

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  notification_type?: NotificationType;
  event_type?: NotificationEventType;
  priority?: NotificationPriority;
  is_read?: boolean;
  created_after?: string;
  created_before?: string;
  sort_by?: 'created_at' | 'priority' | 'is_read';
  sort_order?: 'asc' | 'desc';
}

export interface CreateNotificationData {
  user_id: string;
  notification_type: NotificationType;
  event_type: NotificationEventType;
  template_data?: Record<string, any>;
  title?: string;
  message?: string;
  priority?: NotificationPriority;
  severity?: NotificationSeverity;
  is_actionable?: boolean;
  action_url?: string;
  action_text?: string;
  related_budget_id?: string;
  related_goal_id?: string;
  related_family_id?: string;
  related_transaction_id?: string;
  metadata?: Record<string, any>;
  expires_in_hours?: number;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}

export type NotificationCallback = (notification: UserNotification) => void;

// =====================================================
// MODULE-SPECIFIC NOTIFICATION DATA INTERFACES
// =====================================================

export interface BudgetNotificationData {
  budget_id: string;
  budget_name: string;
  budget_amount: number;
  spent_amount: number;
  percentage_used: number;
  threshold_percentage?: number;
  amount_over?: number;
  currency: string;
  period: string;
  end_date: string;
}

export interface GoalNotificationData {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  percentage_complete: number;
  milestone_percentage?: number;
  contribution_amount?: number;
  target_date: string;
  currency: string;
}

export interface FamilyNotificationData {
  family_id: string;
  family_name: string;
  member_name?: string;
  member_role?: string;
  invitation_id?: string;
  activity_type?: string;
  activity_description?: string;
}

export interface TransactionNotificationData {
  transaction_id: string;
  amount: number;
  currency: string;
  category?: string;
  description?: string;
  transaction_date: string;
  account_name?: string;
  suggested_category?: string;
  total_monthly_spending?: number;
}

// =====================================================
// COMPONENT PROP INTERFACES
// =====================================================

export interface NotificationDropdownProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
  onNotificationClick?: (notification: UserNotification) => void;
  onMarkAllRead?: () => void;
  onShowAll?: () => void;
  maxDisplayCount?: number;
  enableRealTimeUpdates?: boolean;
  filterByPriority?: NotificationPriority[];
  filterByType?: NotificationType[];
  className?: string;
  style?: React.CSSProperties;
  variant?: "user" | "admin";
}

export interface NotificationItemProps {
  notification: UserNotification;
  onClick?: (notification: UserNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  showActions?: boolean;
  className?: string;
}

export interface NotificationListProps {
  notifications: UserNotification[];
  onNotificationClick?: (notification: UserNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (notificationId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  showPagination?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export interface NotificationPreferencesProps {
  preferences: NotificationPreferences;
  onUpdate: (preferences: Partial<NotificationPreferences>) => void;
  loading?: boolean;
  disabled?: boolean;
}

// =====================================================
// HOOK INTERFACES
// =====================================================

export interface UseNotificationsOptions extends GetNotificationsOptions {
  enableRealTime?: boolean;
  autoRefreshInterval?: number;
}

export interface UseNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<number>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;
  resetToDefaults: () => Promise<NotificationPreferences>;
}

// =====================================================
// ERROR TYPES
// =====================================================

export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export interface NotificationErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type NotificationFilter = Partial<{
  notification_type: NotificationType;
  event_type: NotificationEventType;
  priority: NotificationPriority;
  severity: NotificationSeverity;
  is_read: boolean;
  date_range: {
    start: string;
    end: string;
  };
}>;

export type NotificationSort = {
  field: 'created_at' | 'priority' | 'is_read' | 'notification_type';
  direction: 'asc' | 'desc';
};

export type NotificationGroupBy = 'type' | 'priority' | 'date' | 'read_status';

export interface NotificationGroup {
  key: string;
  label: string;
  count: number;
  notifications: UserNotification[];
}

// =====================================================
// LEGACY COMPATIBILITY
// =====================================================

/**
 * Legacy notification interface for backward compatibility
 * with existing NotificationDropdown component
 */
export interface LegacyNotification {
  id: number;
  text: string;
  time: string;
  isRead: boolean;
  type?: "info" | "warning" | "success" | "error";
}

/**
 * Function to convert new notification format to legacy format
 */
export function toLegacyNotification(notification: UserNotification): LegacyNotification {
  return {
    id: parseInt(notification.id.replace(/-/g, '').substring(0, 8), 16),
    text: notification.message,
    time: formatRelativeTime(notification.created_at),
    isRead: notification.is_read,
    type: severityToLegacyType(notification.severity)
  };
}

/**
 * Convert notification severity to legacy type
 */
function severityToLegacyType(severity: NotificationSeverity): "info" | "warning" | "success" | "error" {
  switch (severity) {
    case 'warning': return 'warning';
    case 'error': return 'error';
    case 'success': return 'success';
    default: return 'info';
  }
}

/**
 * Format timestamp to relative time string
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// =====================================================
// CONSTANTS
// =====================================================

export const NOTIFICATION_TYPES: Record<NotificationType, string> = {
  budget: 'Budget',
  goal: 'Goal',
  family: 'Family',
  transaction: 'Transaction',
  system: 'System'
};

export const NOTIFICATION_PRIORITIES: Record<NotificationPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#6c757d' },
  medium: { label: 'Medium', color: '#0d6efd' },
  high: { label: 'High', color: '#fd7e14' },
  urgent: { label: 'Urgent', color: '#dc3545' }
};

export const NOTIFICATION_SEVERITIES: Record<NotificationSeverity, { label: string; color: string; icon: string }> = {
  info: { label: 'Info', color: '#0dcaf0', icon: 'fa-info-circle' },
  warning: { label: 'Warning', color: '#ffc107', icon: 'fa-exclamation-triangle' },
  error: { label: 'Error', color: '#dc3545', icon: 'fa-times-circle' },
  success: { label: 'Success', color: '#198754', icon: 'fa-check-circle' }
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Partial<NotificationPreferences> = {
  budget_threshold_warnings: true,
  budget_exceeded_alerts: true,
  budget_period_expiring: true,
  budget_monthly_summaries: true,
  goal_milestone_alerts: true,
  goal_completion_celebrations: true,
  goal_deadline_reminders: true,
  goal_contribution_confirmations: true,
  family_invitations: true,
  family_member_activity: false,
  family_role_changes: true,
  family_shared_goal_updates: true,
  large_transaction_alerts: true,
  recurring_transaction_reminders: false,
  categorization_suggestions: true,
  monthly_spending_summaries: true,
  email_notifications: true,
  push_notifications: true,
  in_app_notifications: true,
  large_transaction_threshold: 5000.00,
  budget_warning_threshold: 0.80,
  quiet_hours: {
    enabled: false
  }
};