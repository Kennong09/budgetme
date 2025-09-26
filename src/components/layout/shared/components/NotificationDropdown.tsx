import React, { FC, useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../../utils/AuthContext";
import NotificationService from "../../../../services/database/notificationService";
import { 
  UserNotification, 
  LegacyNotification, 
  toLegacyNotification,
  NotificationDropdownProps as NewNotificationDropdownProps
} from "../../../../types/notifications";

// Legacy interface for backward compatibility
export interface Notification {
  id: number;
  text: string;
  time: string;
  isRead: boolean;
  type?: "info" | "warning" | "success" | "error";
}

// Legacy props interface for backward compatibility
export interface LegacyNotificationDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onToggle: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onShowAll?: () => void;
  unreadCount?: number;
  className?: string;
  style?: React.CSSProperties;
  variant?: "user" | "admin";
}

// Combined props interface - supports both legacy and new props
export interface NotificationDropdownProps extends Partial<LegacyNotificationDropdownProps>, Partial<NewNotificationDropdownProps> {
  // Core required props
  isOpen: boolean;
  onToggle: () => void;
  
  // Optional props for different modes
  notifications?: Notification[]; // Legacy mode
  userId?: string; // New mode
  enableRealTimeUpdates?: boolean;
  maxDisplayCount?: number;
  filterByPriority?: string[];
  filterByType?: string[];
  onMarkAllRead?: () => void;
  
  // Common optional props
  onNotificationClick?: (notification: Notification | UserNotification) => void;
  onShowAll?: () => void;
  unreadCount?: number;
  className?: string;
  style?: React.CSSProperties;
  variant?: "user" | "admin";
}

const NotificationDropdown: FC<NotificationDropdownProps> = ({
  // Legacy props
  notifications: legacyNotifications,
  
  // Common props
  isOpen,
  onToggle,
  onNotificationClick,
  onShowAll,
  unreadCount: providedUnreadCount,
  className = "",
  style = {},
  variant = "user",
  
  // New props
  userId,
  enableRealTimeUpdates = true,
  maxDisplayCount = 10,
  filterByPriority,
  filterByType,
  onMarkAllRead
}) => {
  const { user } = useAuth();
  const [realTimeNotifications, setRealTimeNotifications] = useState<UserNotification[]>([]);
  const [legacyFormattedNotifications, setLegacyFormattedNotifications] = useState<LegacyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);

  // Determine which mode we're in (legacy or new)
  const isLegacyMode = legacyNotifications !== undefined;
  const effectiveUserId = userId || user?.id;

  // Load notifications from service if in new mode
  const loadNotifications = useCallback(async () => {
    if (isLegacyMode || !effectiveUserId) return;

    try {
      setLoading(true);
      setError(null);
      
      const [notifications, count] = await Promise.all([
        NotificationService.getNotifications(effectiveUserId, {
          limit: maxDisplayCount,
          sort_by: 'created_at',
          sort_order: 'desc'
        }),
        NotificationService.getUnreadCount(effectiveUserId)
      ]);
      
      setRealTimeNotifications(notifications);
      setUnreadCount(count);
      
      // Convert to legacy format for display
      const legacyFormatted = notifications.map(toLegacyNotification);
      setLegacyFormattedNotifications(legacyFormatted);
      
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isLegacyMode, effectiveUserId, maxDisplayCount]);

  // Set up real-time subscription
  const setupRealtimeSubscription = useCallback(async () => {
    if (isLegacyMode || !effectiveUserId || !enableRealTimeUpdates) return;

    try {
      const unsubscribe = await NotificationService.subscribeToNotifications(
        effectiveUserId,
        (notification) => {
          // Update notifications list
          setRealTimeNotifications(prev => [notification, ...prev.slice(0, maxDisplayCount - 1)]);
          
          // Update legacy formatted list
          const legacyNotification = toLegacyNotification(notification);
          setLegacyFormattedNotifications(prev => [legacyNotification, ...prev.slice(0, maxDisplayCount - 1)]);
          
          // Update unread count if it's an unread notification
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      );
      
      setRealtimeUnsubscribe(() => unsubscribe);
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
    }
  }, [isLegacyMode, effectiveUserId, enableRealTimeUpdates, maxDisplayCount]);

  // Load notifications on mount and when dependencies change
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    setupRealtimeSubscription();
    
    // Cleanup subscription on unmount
    return () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, [setupRealtimeSubscription]);

  // Determine which notifications to display
  const displayNotifications = isLegacyMode ? legacyNotifications : legacyFormattedNotifications;
  const calculatedUnreadCount = providedUnreadCount ?? 
    (isLegacyMode ? displayNotifications.filter(n => !n.isRead).length : unreadCount);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read if in new mode
    if (!isLegacyMode && effectiveUserId && !notification.isRead) {
      try {
        // Convert legacy ID back to UUID for API call
        const realNotification = realTimeNotifications.find(n => 
          parseInt(n.id.replace(/-/g, '').substring(0, 8), 16) === notification.id
        );
        
        if (realNotification) {
          await NotificationService.markAsRead(realNotification.id, effectiveUserId);
          
          // Update local state
          setRealTimeNotifications(prev => prev.map(n => 
            n.id === realNotification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          ));
          
          setLegacyFormattedNotifications(prev => prev.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          ));
          
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    
    // Call the provided click handler
    onNotificationClick?.(notification);
  }, [isLegacyMode, effectiveUserId, realTimeNotifications, onNotificationClick]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    if (!isLegacyMode && effectiveUserId) {
      try {
        const markedCount = await NotificationService.markAllAsRead(effectiveUserId);
        
        // Update local state
        setRealTimeNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        setLegacyFormattedNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
      }
    }
    
    onMarkAllRead?.();
  }, [isLegacyMode, effectiveUserId, onMarkAllRead]);

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "warning":
        return "fas fa-exclamation-triangle text-warning";
      case "success":
        return "fas fa-check-circle text-success";
      case "error":
        return "fas fa-times-circle text-danger";
      default:
        return "fas fa-file-alt text-white";
    }
  };

  const getIconBackgroundColor = (notification: Notification) => {
    if (notification.isRead) return "bg-secondary";
    
    switch (notification.type) {
      case "warning":
        return "bg-warning";
      case "success":
        return "bg-success";
      case "error":
        return "bg-danger";
      default:
        return variant === "admin" ? "bg-danger" : "bg-primary";
    }
  };

  return (
    <li className={`nav-item dropdown no-arrow mx-1 d-flex align-items-center position-relative ${className}`} style={style}>
      <i 
        className="fas fa-bell fa-fw nav-icon position-relative"
        onClick={onToggle}
        style={{ 
          cursor: 'pointer',
          fontSize: '1.1rem',
          color: '#6366f1',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '32px'
        }}
        aria-label="Notifications"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Notification Dot */}
        {calculatedUnreadCount > 0 && (
          <span className="notification-dot" style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            backgroundColor: '#dc3545',
            borderRadius: '50%',
            border: '2px solid white'
          }}></span>
        )}
      </i>
      
      {/* Dropdown - Notifications */}
      {isOpen && (
        <div
          className="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in show"
          aria-labelledby="alertsDropdown"
          style={{ 
            position: "absolute",
            top: "100%",
            right: "-0.5rem",
            left: "auto",
            width: "calc(100vw - 2rem)", 
            maxWidth: "350px",
            marginTop: "0.5rem",
            zIndex: 1050,
            border: "1px solid rgba(0,0,0,.15)",
            borderRadius: "0.375rem",
            backgroundColor: "#fff"
          }}
        >
          {/* Header with actions */}
          <div className="dropdown-header d-flex justify-content-between align-items-center">
            <span>Notifications Center</span>
            {calculatedUnreadCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-link text-primary p-0"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <i className="fas fa-check-double"></i>
              </button>
            )}
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="dropdown-item text-center text-muted">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Loading notifications...
            </div>
          )}
          
          {/* Error state */}
          {error && (
            <div className="dropdown-item text-center text-danger">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}
          
          {/* Notifications list */}
          {!loading && !error && (
            <div className="notification-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {displayNotifications.length === 0 ? (
                <div className="dropdown-item text-center text-muted">
                  <i className="fas fa-bell-slash fa-2x mb-2"></i>
                  <p>No notifications</p>
                </div>
              ) : (
                displayNotifications.slice(0, maxDisplayCount).map((notification) => (
                  <button
                    key={notification.id}
                    className={`dropdown-item d-flex align-items-center ${
                      !notification.isRead ? 'bg-light' : ''
                    }`}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      borderLeft: !notification.isRead ? '3px solid #0d6efd' : 'none'
                    }}
                  >
                    <div className="mr-3">
                      <div className={`icon-circle ${getIconBackgroundColor(notification)}`}>
                        <i className={getNotificationIcon(notification)}></i>
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <div className="small text-gray-500 d-flex justify-content-between align-items-center">
                        <span>{notification.time}</span>
                        {!notification.isRead && (
                          <span className="badge badge-primary badge-sm">New</span>
                        )}
                      </div>
                      <span className={`${notification.isRead ? "" : "font-weight-bold"}`}>
                        {notification.text}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          
          {/* Footer actions */}
          {displayNotifications.length > 0 && (
            <div className="dropdown-divider"></div>
          )}
          {displayNotifications.length > 0 && (
            <button
              className="dropdown-item text-center small text-gray-500"
              type="button"
              onClick={onShowAll}
            >
              Show All Notifications
            </button>
          )}
        </div>
      )}
    </li>
  );
};

export default NotificationDropdown;