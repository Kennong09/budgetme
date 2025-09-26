/**
 * Notification Service
 * 
 * Comprehensive service for managing user notifications across all modules
 * with fallback strategy and real-time updates
 */

import { supabase } from '../../utils/supabaseClient';
import { 
  UserNotification, 
  NotificationPreferences, 
  NotificationServiceInterface,
  GetNotificationsOptions,
  CreateNotificationData,
  NotificationCounts,
  NotificationCallback,
  NotificationTemplate,
  NotificationDeliveryLog,
  NotificationError,
  DEFAULT_NOTIFICATION_PREFERENCES,
  toLegacyNotification,
  LegacyNotification
} from '../../types/notifications';

/**
 * NotificationService - Comprehensive notification management
 * 
 * This service implements a robust notification system with:
 * - CRUD operations for notifications
 * - User preference management
 * - Real-time subscription support
 * - Template-based notification creation
 * - Fallback strategies for reliability
 * - Integration with existing service patterns
 */
export class NotificationService implements NotificationServiceInterface {
  private static instance: NotificationService;
  private realtimeSubscription: any = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Retry wrapper for network operations to handle cache race conditions
   */
  private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on non-network errors
        if (error instanceof NotificationError && error.code !== 'FETCH_ERROR') {
          throw error;
        }
        
        // Check if it's a network/fetch error worth retrying
        const isNetworkError = 
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('fetch') ||
          error?.code === 'FETCH_ERROR' ||
          error?.name === 'TypeError' ||
          error?.message?.includes('cache');
        
        if (!isNetworkError || attempt === this.maxRetries) {
          console.error(`${context} failed after ${attempt} attempts:`, error);
          throw error;
        }
        
        console.warn(`${context} attempt ${attempt} failed, retrying in ${this.retryDelay * attempt}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    
    throw lastError;
  }

  // =====================================================
  // CORE CRUD OPERATIONS
  // =====================================================

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getNotifications(userId: string, options: GetNotificationsOptions = {}): Promise<UserNotification[]> {
    return this.withRetry(async () => {
      const {
        limit = 50,
        offset = 0,
        notification_type,
        event_type,
        priority,
        is_read,
        created_after,
        created_before,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      // Build base query with simpler filtering to avoid cache race issues
      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .range(offset, offset + limit - 1)
        .order(sort_by, { ascending: sort_order === 'asc' });

      // Apply filters
      if (notification_type) {
        query = query.eq('notification_type', notification_type);
      }
      if (event_type) {
        query = query.eq('event_type', event_type);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (typeof is_read === 'boolean') {
        query = query.eq('is_read', is_read);
      }
      if (created_after) {
        query = query.gte('created_at', created_after);
      }
      if (created_before) {
        query = query.lte('created_at', created_before);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw new NotificationError('Failed to fetch notifications', 'FETCH_ERROR', error);
      }

      // Filter out expired notifications on the client side to avoid complex OR queries
      const now = new Date();
      const filteredData = (data || []).filter(notification => {
        if (!notification.expires_at) return true; // No expiration
        return new Date(notification.expires_at) > now; // Not expired
      });

      return filteredData;
    }, 'getNotifications').catch(error => {
      // Final fallback for critical failures
      if (error instanceof Error && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('cache') ||
           error.message.includes('chunk'))) {
        console.warn('Network/cache error in getNotifications, returning empty array as fallback');
        return [];
      }
      throw error;
    });
  }

  /**
   * Get a specific notification by ID
   */
  async getNotificationById(notificationId: string, userId: string): Promise<UserNotification | null> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('id', notificationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching notification by ID:', error);
        throw new NotificationError('Failed to fetch notification', 'FETCH_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('NotificationService.getNotificationById error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error fetching notification', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Create a new notification using templates
   */
  async createNotification(data: CreateNotificationData): Promise<UserNotification> {
    try {
      // Use database function for template-based creation if template_data is provided
      if (data.template_data) {
        const { data: result, error } = await supabase
          .rpc('create_notification', {
            p_user_id: data.user_id,
            p_notification_type: data.notification_type,
            p_event_type: data.event_type,
            p_template_data: data.template_data,
            p_related_budget_id: data.related_budget_id,
            p_related_goal_id: data.related_goal_id,
            p_related_family_id: data.related_family_id,
            p_related_transaction_id: data.related_transaction_id,
            p_expires_in_hours: data.expires_in_hours || 168 // 7 days default
          });

        if (error) {
          console.error('Error creating notification with template:', error);
          throw new NotificationError('Failed to create notification', 'CREATE_ERROR', error);
        }

        // Fetch the created notification
        const notification = await this.getNotificationById(result, data.user_id);
        if (!notification) {
          throw new NotificationError('Created notification not found', 'CREATE_ERROR');
        }

        return notification;
      }

      // Direct creation without template
      const notificationData = {
        user_id: data.user_id,
        notification_type: data.notification_type,
        event_type: data.event_type,
        title: data.title || 'Notification',
        message: data.message || 'You have a new notification',
        priority: data.priority || 'medium',
        severity: data.severity || 'info',
        is_actionable: data.is_actionable || false,
        action_url: data.action_url,
        action_text: data.action_text,
        related_budget_id: data.related_budget_id,
        related_goal_id: data.related_goal_id,
        related_family_id: data.related_family_id,
        related_transaction_id: data.related_transaction_id,
        metadata: data.metadata || {},
        expires_at: data.expires_in_hours ? 
          new Date(Date.now() + data.expires_in_hours * 60 * 60 * 1000).toISOString() : 
          null
      };

      const { data: result, error } = await supabase
        .from('user_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw new NotificationError('Failed to create notification', 'CREATE_ERROR', error);
      }

      return result;
    } catch (error) {
      console.error('NotificationService.createNotification error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error creating notification', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          p_notification_id: notificationId,
          p_user_id: userId
        });

      if (error) {
        console.error('Error marking notification as read:', error);
        throw new NotificationError('Failed to mark notification as read', 'UPDATE_ERROR', error);
      }

      return data === true;
    } catch (error) {
      console.error('NotificationService.markAsRead error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error marking notification as read', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw new NotificationError('Failed to mark all notifications as read', 'UPDATE_ERROR', error);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('NotificationService.markAllAsRead error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error marking all notifications as read', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw new NotificationError('Failed to delete notification', 'DELETE_ERROR', error);
      }

      return true;
    } catch (error) {
      console.error('NotificationService.deleteNotification error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error deleting notification', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', notificationIds)
        .eq('is_read', false)
        .select('id');

      if (error) {
        console.error('Error marking multiple notifications as read:', error);
        throw new NotificationError('Failed to mark notifications as read', 'UPDATE_ERROR', error);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('NotificationService.markMultipleAsRead error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error marking notifications as read', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Delete expired notifications for a user
   */
  async deleteExpiredNotifications(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId)
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error deleting expired notifications:', error);
        throw new NotificationError('Failed to delete expired notifications', 'DELETE_ERROR', error);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('NotificationService.deleteExpiredNotifications error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error deleting expired notifications', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // NOTIFICATION PREFERENCES
  // =====================================================

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          return await this.createDefaultPreferences(userId);
        }
        console.error('Error fetching notification preferences:', error);
        throw new NotificationError('Failed to fetch notification preferences', 'FETCH_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('NotificationService.getNotificationPreferences error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error fetching notification preferences', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw new NotificationError('Failed to update notification preferences', 'UPDATE_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('NotificationService.updateNotificationPreferences error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error updating notification preferences', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Create default notification preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPrefs = {
        user_id: userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) {
        console.error('Error creating default notification preferences:', error);
        throw new NotificationError('Failed to create default notification preferences', 'CREATE_ERROR', error);
      }

      return data;
    } catch (error) {
      console.error('NotificationService.createDefaultPreferences error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error creating default notification preferences', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // COUNT AND STATUS OPERATIONS
  // =====================================================

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_notification_count', {
          p_user_id: userId,
          p_unread_only: true
        });

      if (error) {
        console.error('Error getting unread count:', error);
        throw new NotificationError('Failed to get unread count', 'FETCH_ERROR', error);
      }

      return data || 0;
    } catch (error) {
      console.error('NotificationService.getUnreadCount error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error getting unread count', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Get comprehensive notification counts
   */
  async getNotificationCounts(userId: string): Promise<NotificationCounts> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('notification_type, priority, is_read')
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        console.error('Error getting notification counts:', error);
        throw new NotificationError('Failed to get notification counts', 'FETCH_ERROR', error);
      }

      const counts: NotificationCounts = {
        total: data?.length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        by_type: {
          budget: 0,
          goal: 0,
          family: 0,
          transaction: 0,
          system: 0
        },
        by_priority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        }
      };

      data?.forEach(notification => {
        counts.by_type[notification.notification_type]++;
        counts.by_priority[notification.priority]++;
      });

      return counts;
    } catch (error) {
      console.error('NotificationService.getNotificationCounts error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error getting notification counts', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to real-time notification updates
   */
  async subscribeToNotifications(userId: string, callback: NotificationCallback): Promise<() => void> {
    try {
      // Clean up existing subscription
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }

      // Create new subscription
      this.realtimeSubscription = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (payload.new) {
              callback(payload.new as UserNotification);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (payload.new) {
              callback(payload.new as UserNotification);
            }
          }
        )
        .subscribe();

      // Return unsubscribe function
      return () => {
        if (this.realtimeSubscription) {
          this.realtimeSubscription.unsubscribe();
          this.realtimeSubscription = null;
        }
      };
    } catch (error) {
      console.error('NotificationService.subscribeToNotifications error:', error);
      throw new NotificationError('Failed to subscribe to notifications', 'SUBSCRIPTION_ERROR', error);
    }
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * Get notification templates
   */
  async getTemplates(notificationType?: string): Promise<NotificationTemplate[]> {
    try {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('notification_type', { ascending: true });

      if (notificationType) {
        query = query.eq('notification_type', notificationType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification templates:', error);
        throw new NotificationError('Failed to fetch notification templates', 'FETCH_ERROR', error);
      }

      return data || [];
    } catch (error) {
      console.error('NotificationService.getTemplates error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error fetching notification templates', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // DELIVERY TRACKING
  // =====================================================

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryLog[]> {
    try {
      const { data, error } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('notification_id', notificationId)
        .order('attempted_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery status:', error);
        throw new NotificationError('Failed to fetch delivery status', 'FETCH_ERROR', error);
      }

      return data || [];
    } catch (error) {
      console.error('NotificationService.getDeliveryStatus error:', error);
      if (error instanceof NotificationError) throw error;
      throw new NotificationError('Unexpected error fetching delivery status', 'UNKNOWN_ERROR', error);
    }
  }

  // =====================================================
  // LEGACY COMPATIBILITY METHODS
  // =====================================================

  /**
   * Get notifications in legacy format for backward compatibility
   */
  async getLegacyNotifications(userId: string, limit: number = 10): Promise<LegacyNotification[]> {
    try {
      const notifications = await this.getNotifications(userId, { 
        limit,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      return notifications.map(toLegacyNotification);
    } catch (error) {
      console.error('NotificationService.getLegacyNotifications error:', error);
      // Return empty array for backward compatibility
      return [];
    }
  }

  /**
   * Get unread count for legacy components
   */
  async getLegacyUnreadCount(userId: string): Promise<number> {
    try {
      return await this.getUnreadCount(userId);
    } catch (error) {
      console.error('NotificationService.getLegacyUnreadCount error:', error);
      // Return 0 for backward compatibility
      return 0;
    }
  }
}

// Export singleton instance
export default NotificationService.getInstance();