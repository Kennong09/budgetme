/**
 * React Hooks for Notification Management
 * 
 * Custom hooks that provide easy-to-use interfaces for notification functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';
import { NotificationService } from '../services/database/notificationService';
import {
  UserNotification,
  NotificationPreferences,
  UseNotificationsOptions,
  UseNotificationsReturn,
  UseNotificationPreferencesReturn,
  GetNotificationsOptions,
  CreateNotificationData,
  NotificationCallback
} from '../types/notifications';

/**
 * Hook for managing user notifications with real-time updates
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { user } = useAuth();
  const {
    enableRealTime = true,
    autoRefreshInterval = 0,
    limit = 50,
    ...queryOptions
  } = options;

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);

  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load notifications from the service
  const loadNotifications = useCallback(async (reset: boolean = false) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const queryParams: GetNotificationsOptions = {
        ...queryOptions,
        limit,
        offset: currentOffset
      };

      const [notificationsData, unreadCountData] = await Promise.all([
        NotificationService.getInstance().getNotifications(user.id, queryParams),
        NotificationService.getInstance().getUnreadCount(user.id)
      ]);

      if (reset) {
        setNotifications(notificationsData);
        setOffset(limit);
      } else {
        setNotifications(prev => [...prev, ...notificationsData]);
        setOffset(prev => prev + limit);
      }

      setUnreadCount(unreadCountData);
      setTotalCount(notificationsData.length);
      setHasMore(notificationsData.length === limit);

    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, queryOptions, limit, offset]);

  // Refresh notifications (reset to first page)
  const refresh = useCallback(async () => {
    setOffset(0);
    await loadNotifications(true);
  }, [loadNotifications]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadNotifications(false);
  }, [hasMore, loading, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.getInstance().markAsRead(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        ));
        
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      const markedCount = await NotificationService.getInstance().markAllAsRead(user.id);
      
      if (markedCount > 0) {
        setNotifications(prev => prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        })));
        
        setUnreadCount(0);
      }
      
      return markedCount;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return 0;
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.getInstance().deleteNotification(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update unread count if the deleted notification was unread
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      
      return success;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, [user?.id, notifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealTime || !user?.id) return;

    const setupRealtimeSubscription = async () => {
      try {
        const unsubscribe = await NotificationService.getInstance().subscribeToNotifications(
          user.id,
          (notification: UserNotification) => {
            // Add new notification to the list
            setNotifications(prev => {
              // Check if notification already exists to avoid duplicates
              const exists = prev.some(n => n.id === notification.id);
              if (exists) return prev;
              
              return [notification, ...prev];
            });
            
            // Update unread count if it's an unread notification
            if (!notification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        );

        realtimeUnsubscribeRef.current = unsubscribe;
      } catch (err) {
        console.error('Error setting up real-time subscription:', err);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current();
        realtimeUnsubscribeRef.current = null;
      }
    };
  }, [enableRealTime, user?.id]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    autoRefreshIntervalRef.current = setInterval(() => {
      refresh();
    }, autoRefreshInterval);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      refresh();
    }
  }, [user?.id, queryOptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current();
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    hasMore
  };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const prefs = await NotificationService.getInstance().getNotificationPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedPrefs = await NotificationService.getInstance().updateNotificationPreferences(user.id, updates);
      setPreferences(updatedPrefs);
      
      return updatedPrefs;
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Reset to defaults
  const resetToDefaults = useCallback(async (): Promise<NotificationPreferences> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get default preferences and update
      const { DEFAULT_NOTIFICATION_PREFERENCES } = await import('../types/notifications');
      const updatedPrefs = await NotificationService.getInstance().updateNotificationPreferences(user.id, DEFAULT_NOTIFICATION_PREFERENCES);
      setPreferences(updatedPrefs);
      
      return updatedPrefs;
    } catch (err) {
      console.error('Error resetting notification preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load preferences on mount
  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id, loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetToDefaults
  };
}

/**
 * Hook for creating notifications
 */
export function useCreateNotification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createNotification = useCallback(async (data: Omit<CreateNotificationData, 'user_id'>): Promise<UserNotification | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const notification = await NotificationService.getInstance().createNotification({
        ...data,
        user_id: user.id
      });
      
      return notification;
    } catch (err) {
      console.error('Error creating notification:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notification';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    createNotification,
    loading,
    error
  };
}

/**
 * Hook for notification counts
 */
export function useNotificationCounts() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const count = await NotificationService.getInstance().getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading notification count:', err);
      setError(err instanceof Error ? err.message : 'Failed to load count');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Set up real-time count updates
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribe: (() => void) | null = null;

    const setupRealtimeCountUpdates = async () => {
      try {
        unsubscribe = await NotificationService.getInstance().subscribeToNotifications(
          user.id,
          (notification: UserNotification) => {
            if (!notification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        );
      } catch (err) {
        console.error('Error setting up real-time count updates:', err);
      }
    };

    setupRealtimeCountUpdates();
    refreshCount();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, refreshCount]);

  return {
    unreadCount,
    loading,
    error,
    refreshCount
  };
}