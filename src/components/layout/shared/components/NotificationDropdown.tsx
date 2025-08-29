import React, { FC } from "react";

export interface Notification {
  id: number;
  text: string;
  time: string;
  isRead: boolean;
  type?: "info" | "warning" | "success" | "error";
}

export interface NotificationDropdownProps {
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

const NotificationDropdown: FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onToggle,
  onNotificationClick,
  onShowAll,
  unreadCount,
  className = "",
  style = {},
  variant = "user"
}) => {
  const calculatedUnreadCount = unreadCount ?? notifications.filter(n => !n.isRead).length;
  const badgeColor = variant === "admin" ? "badge-danger" : "badge-danger";
  const iconColor = variant === "admin" ? "text-danger" : "text-primary";

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
    <li className={`nav-item dropdown no-arrow mx-1 ${className}`} style={style}>
      <i 
        className="fas fa-bell fa-fw nav-icon position-relative"
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
        aria-label="Notifications"
      >
        {/* Notification Dot */}
        {calculatedUnreadCount > 0 && (
          <span className="notification-dot"></span>
        )}
      </i>
      
      {/* Dropdown - Notifications */}
      {isOpen && (
        <div
          className="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in show position-absolute"
          aria-labelledby="alertsDropdown"
          style={{ width: "calc(100vw - 2rem)", maxWidth: "350px" }}
        >
          <h6 className="dropdown-header">Notifications Center</h6>
          <div className="notification-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div className="dropdown-item text-center text-muted">
                <i className="fas fa-bell-slash fa-2x mb-2"></i>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className="dropdown-item d-flex align-items-center"
                  type="button"
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className="mr-3">
                    <div className={`icon-circle ${getIconBackgroundColor(notification)}`}>
                      <i className={getNotificationIcon(notification)}></i>
                    </div>
                  </div>
                  <div>
                    <div className="small text-gray-500">
                      {notification.time}
                    </div>
                    <span className={`${notification.isRead ? "" : "font-weight-bold"}`}>
                      {notification.text}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          {notifications.length > 0 && (
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