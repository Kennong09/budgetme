/**
 * Notification API Service
 * 
 * API service for notification management with RESTful endpoints
 * and utilities for frontend integration
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from '../database/notificationService';
import NotificationManager from '../database/notificationManager';
import {
  UserNotification,
  NotificationPreferences,
  GetNotificationsOptions,
  CreateNotificationData,
  NotificationCounts,
  NotificationError
} from '../../types/notifications';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface NotificationApiOptions {
  baseUrl?: string;
  timeout?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * NotificationApi - RESTful API service for notifications
 * 
 * Provides standardized API endpoints for:
 * - CRUD operations on notifications
 * - User preference management
 * - Real-time subscription management
 * - Statistics and analytics
 */
export class NotificationApi {
  private static instance: NotificationApi;
  private options: NotificationApiOptions;

  private static readonly DEFAULT_OPTIONS: NotificationApiOptions = {
    baseUrl: '/api/notifications',
    timeout: 10000,
    defaultLimit: 20,
    maxLimit: 100
  };

  private constructor(options?: NotificationApiOptions) {
    this.options = { ...NotificationApi.DEFAULT_OPTIONS, ...options };
  }

  public static getInstance(options?: NotificationApiOptions): NotificationApi {
    if (!NotificationApi.instance) {
      NotificationApi.instance = new NotificationApi(options);
    }
    return NotificationApi.instance;
  }

  // =====================================================
  // NOTIFICATION CRUD ENDPOINTS
  // =====================================================

  /**
   * GET /api/notifications
   * Fetch user notifications with pagination and filtering
   */
  async getNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<ApiResponse<UserNotification[]>> {
    try {
      // Validate and sanitize options
      const sanitizedOptions = this.sanitizeGetOptions(options);
      
      const notifications = await NotificationService.getNotifications(userId, sanitizedOptions);
      
      // Get total count for pagination
      const totalCount = await this.getTotalNotificationCount(userId, sanitizedOptions);
      
      const page = Math.floor((sanitizedOptions.offset || 0) / (sanitizedOptions.limit || this.options.defaultLimit!)) + 1;
      const limit = sanitizedOptions.limit || this.options.defaultLimit!;
      const hasMore = (sanitizedOptions.offset || 0) + notifications.length < totalCount;

      return {
        success: true,
        data: notifications,
        pagination: {
          total: totalCount,
          page,
          limit,
          hasMore
        }
      };

    } catch (error) {
      console.error('Error in getNotifications API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications'
      };
    }
  }

  /**
   * GET /api/notifications/:id
   * Fetch a specific notification by ID
   */
  async getNotificationById(
    notificationId: string,
    userId: string
  ): Promise<ApiResponse<UserNotification>> {
    try {
      const notification = await NotificationService.getNotificationById(notificationId, userId);
      
      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      return {
        success: true,
        data: notification
      };

    } catch (error) {
      console.error('Error in getNotificationById API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notification'
      };
    }
  }

  /**
   * POST /api/notifications
   * Create a new notification
   */
  async createNotification(
    notificationData: CreateNotificationData
  ): Promise<ApiResponse<UserNotification>> {
    try {
      // Validate required fields
      const validationError = this.validateCreateNotificationData(notificationData);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      const notification = await NotificationService.createNotification(notificationData);

      return {
        success: true,
        data: notification,
        message: 'Notification created successfully'
      };

    } catch (error) {
      console.error('Error in createNotification API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification'
      };
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark notification as read
   */
  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const success = await NotificationService.markAsRead(notificationId, userId);

      return {
        success: true,
        data: success,
        message: success ? 'Notification marked as read' : 'Notification was already read'
      };

    } catch (error) {
      console.error('Error in markNotificationAsRead API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read'
      };
    }
  }

  /**
   * PUT /api/notifications/mark-all-read
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<ApiResponse<number>> {
    try {
      const markedCount = await NotificationService.markAllAsRead(userId);

      return {
        success: true,
        data: markedCount,
        message: `${markedCount} notifications marked as read`
      };

    } catch (error) {
      console.error('Error in markAllNotificationsAsRead API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const success = await NotificationService.deleteNotification(notificationId, userId);

      return {
        success: true,
        data: success,
        message: 'Notification deleted successfully'
      };

    } catch (error) {
      console.error('Error in deleteNotification API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification'
      };
    }
  }

  // =====================================================
  // NOTIFICATION COUNTS AND STATISTICS
  // =====================================================

  /**
   * GET /api/notifications/unread
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const count = await NotificationService.getUnreadCount(userId);

      return {
        success: true,
        data: count
      };

    } catch (error) {
      console.error('Error in getUnreadCount API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get unread count'
      };
    }
  }

  /**
   * GET /api/notifications/counts
   * Get comprehensive notification counts
   */
  async getNotificationCounts(userId: string): Promise<ApiResponse<NotificationCounts>> {
    try {
      const counts = await NotificationService.getNotificationCounts(userId);

      return {
        success: true,
        data: counts
      };

    } catch (error) {
      console.error('Error in getNotificationCounts API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification counts'
      };
    }
  }

  /**
   * GET /api/notifications/stats
   * Get notification statistics (admin)
   */
  async getNotificationStats(): Promise<ApiResponse<any>> {
    try {
      const stats = await NotificationManager.getNotificationStats();

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Error in getNotificationStats API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification statistics'
      };
    }
  }

  // =====================================================
  // NOTIFICATION PREFERENCES
  // =====================================================

  /**
   * GET /api/notifications/preferences
   * Get user notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);

      return {
        success: true,
        data: preferences
      };

    } catch (error) {
      console.error('Error in getNotificationPreferences API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification preferences'
      };
    }
  }

  /**
   * PUT /api/notifications/preferences
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const validationError = this.validateNotificationPreferences(preferences);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      const updatedPreferences = await NotificationService.updateNotificationPreferences(userId, preferences);

      return {
        success: true,
        data: updatedPreferences,
        message: 'Notification preferences updated successfully'
      };

    } catch (error) {
      console.error('Error in updateNotificationPreferences API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification preferences'
      };
    }
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * PUT /api/notifications/bulk/mark-read
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(
    notificationIds: string[],
    userId: string
  ): Promise<ApiResponse<number>> {
    try {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return {
          success: false,
          error: 'Invalid notification IDs array'
        };
      }

      if (notificationIds.length > 50) {
        return {
          success: false,
          error: 'Too many notifications (max 50 per request)'
        };
      }

      const markedCount = await NotificationService.markMultipleAsRead(notificationIds, userId);

      return {
        success: true,
        data: markedCount,
        message: `${markedCount} notifications marked as read`
      };

    } catch (error) {
      console.error('Error in markMultipleAsRead API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notifications as read'
      };
    }
  }

  /**
   * DELETE /api/notifications/expired
   * Delete expired notifications for a user
   */
  async deleteExpiredNotifications(userId: string): Promise<ApiResponse<number>> {
    try {
      const deletedCount = await NotificationService.deleteExpiredNotifications(userId);

      return {
        success: true,
        data: deletedCount,
        message: `${deletedCount} expired notifications deleted`
      };

    } catch (error) {
      console.error('Error in deleteExpiredNotifications API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete expired notifications'
      };
    }
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * GET /api/notifications/templates
   * Get notification templates
   */
  async getNotificationTemplates(notificationType?: string): Promise<ApiResponse<any[]>> {
    try {
      const templates = await NotificationService.getTemplates(notificationType);

      return {
        success: true,
        data: templates
      };

    } catch (error) {
      console.error('Error in getNotificationTemplates API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification templates'
      };
    }
  }

  // =====================================================
  // SYSTEM MANAGEMENT
  // =====================================================

  /**
   * POST /api/notifications/system/cleanup
   * Force cleanup of old notifications (admin)
   */
  async forceCleanup(): Promise<ApiResponse<number>> {
    try {
      const deletedCount = await NotificationManager.forceRunCleanupTasks();

      return {
        success: true,
        data: deletedCount,
        message: 'Cleanup completed successfully'
      };

    } catch (error) {
      console.error('Error in forceCleanup API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run cleanup'
      };
    }
  }

  /**
   * POST /api/notifications/system/scheduled-tasks
   * Force run scheduled tasks (admin)
   */
  async forceScheduledTasks(): Promise<ApiResponse<boolean>> {
    try {
      await NotificationManager.forceRunScheduledTasks();

      return {
        success: true,
        data: true,
        message: 'Scheduled tasks completed successfully'
      };

    } catch (error) {
      console.error('Error in forceScheduledTasks API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run scheduled tasks'
      };
    }
  }

  /**
   * GET /api/notifications/system/status
   * Get notification system status (admin)
   */
  async getSystemStatus(): Promise<ApiResponse<any>> {
    try {
      const status = NotificationManager.getStatus();

      return {
        success: true,
        data: status
      };

    } catch (error) {
      console.error('Error in getSystemStatus API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system status'
      };
    }
  }

  // =====================================================
  // VALIDATION AND UTILITY METHODS
  // =====================================================

  /**
   * Sanitize and validate get options
   */
  private sanitizeGetOptions(options: GetNotificationsOptions): GetNotificationsOptions {
    const sanitized: GetNotificationsOptions = { ...options };

    // Validate and limit the limit parameter
    if (sanitized.limit !== undefined) {
      sanitized.limit = Math.max(1, Math.min(sanitized.limit, this.options.maxLimit!));
    } else {
      sanitized.limit = this.options.defaultLimit;
    }

    // Validate offset
    if (sanitized.offset !== undefined) {
      sanitized.offset = Math.max(0, sanitized.offset);
    }

    // Validate sort order
    if (sanitized.sort_order && !['asc', 'desc'].includes(sanitized.sort_order)) {
      sanitized.sort_order = 'desc';
    }

    // Validate sort field
    const validSortFields = ['created_at', 'priority', 'is_read', 'notification_type'];
    if (sanitized.sort_by && !validSortFields.includes(sanitized.sort_by)) {
      sanitized.sort_by = 'created_at';
    }

    return sanitized;
  }

  /**
   * Validate create notification data
   */
  private validateCreateNotificationData(data: CreateNotificationData): string | null {
    if (!data.user_id) {
      return 'User ID is required';
    }

    if (!data.notification_type) {
      return 'Notification type is required';
    }

    if (!data.event_type) {
      return 'Event type is required';
    }

    if (!data.title && !data.template_data) {
      return 'Title is required when not using template data';
    }

    if (!data.message && !data.template_data) {
      return 'Message is required when not using template data';
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      return 'Invalid priority value';
    }

    // Validate severity
    const validSeverities = ['info', 'warning', 'error', 'success'];
    if (data.severity && !validSeverities.includes(data.severity)) {
      return 'Invalid severity value';
    }

    return null;
  }

  /**
   * Validate notification preferences
   */
  private validateNotificationPreferences(preferences: Partial<NotificationPreferences>): string | null {
    // Validate threshold values
    if (preferences.large_transaction_threshold !== undefined) {
      if (typeof preferences.large_transaction_threshold !== 'number' || 
          preferences.large_transaction_threshold < 0) {
        return 'Large transaction threshold must be a positive number';
      }
    }

    if (preferences.budget_warning_threshold !== undefined) {
      if (typeof preferences.budget_warning_threshold !== 'number' || 
          preferences.budget_warning_threshold < 0 || 
          preferences.budget_warning_threshold > 1) {
        return 'Budget warning threshold must be between 0 and 1';
      }
    }

    // Validate quiet hours
    if (preferences.quiet_hours !== undefined) {
      if (typeof preferences.quiet_hours !== 'object') {
        return 'Quiet hours must be an object';
      }

      if (preferences.quiet_hours.enabled && 
          (!preferences.quiet_hours.start || !preferences.quiet_hours.end)) {
        return 'Start and end times are required when quiet hours are enabled';
      }
    }

    return null;
  }

  /**
   * Get total notification count for pagination
   */
  private async getTotalNotificationCount(
    userId: string, 
    options: GetNotificationsOptions
  ): Promise<number> {
    try {
      let query = supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()');

      // Apply same filters as in the main query
      if (options.notification_type) {
        query = query.eq('notification_type', options.notification_type);
      }
      if (options.event_type) {
        query = query.eq('event_type', options.event_type);
      }
      if (options.priority) {
        query = query.eq('priority', options.priority);
      }
      if (typeof options.is_read === 'boolean') {
        query = query.eq('is_read', options.is_read);
      }
      if (options.created_after) {
        query = query.gte('created_at', options.created_after);
      }
      if (options.created_before) {
        query = query.lte('created_at', options.created_before);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting total count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalNotificationCount:', error);
      return 0;
    }
  }

  /**
   * Format API response for consistency
   */
  static formatResponse<T>(
    success: boolean,
    data?: T,
    error?: string,
    message?: string,
    pagination?: any
  ): ApiResponse<T> {
    return {
      success,
      data,
      error,
      message,
      pagination
    };
  }

  /**
   * Create error response
   */
  static errorResponse(error: string): ApiResponse<never> {
    return {
      success: false,
      error
    };
  }

  /**
   * Create success response
   */
  static successResponse<T>(data: T, message?: string, pagination?: any): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      pagination
    };
  }
}

// Export singleton instance
export default NotificationApi.getInstance();