import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import type { UserNotification } from '../../types/notifications';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore
  } = useNotifications({
    limit,
    enableRealTime: true,
    is_read: filter === 'read' ? true : filter === 'unread' ? false : undefined,
    notification_type: typeFilter === 'all' ? undefined : typeFilter as any
  });

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to relevant page if there's an action URL
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (notification: UserNotification) => {
    switch (notification.notification_type) {
      case 'budget':
        return notification.event_type === 'budget_exceeded' 
          ? 'fas fa-exclamation-triangle text-danger'
          : 'fas fa-wallet text-primary';
      case 'goal':
        return notification.event_type === 'goal_completed'
          ? 'fas fa-trophy text-warning'
          : 'fas fa-bullseye text-success';
      case 'family':
        return 'fas fa-users text-info';
      case 'transaction':
        return 'fas fa-exchange-alt text-secondary';
      case 'system':
        return 'fas fa-cog text-muted';
      default:
        return 'fas fa-bell text-primary';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'badge badge-danger';
      case 'high':
        return 'badge badge-warning';
      case 'medium':
        return 'badge badge-info';
      case 'low':
        return 'badge badge-secondary';
      default:
        return 'badge badge-secondary';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Notifications</h1>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Notifications</h1>
        </div>
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Error loading notifications: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-bell mr-2"></i>
          Notifications
          {unreadCount > 0 && (
            <span className="badge badge-danger ml-2">{unreadCount}</span>
          )}
        </h1>
        
        {unreadCount > 0 && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleMarkAllAsRead}
          >
            <i className="fas fa-check-double mr-1"></i>
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    filter === 'all' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilter('all')}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    filter === 'unread' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    filter === 'read' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={() => setFilter('read')}
                >
                  Read ({notifications.length - unreadCount})
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <select
                className="form-control form-control-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="budget">Budget</option>
                <option value="goal">Goals</option>
                <option value="family">Family</option>
                <option value="transaction">Transactions</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card shadow mb-4">
        <div className="card-body p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
              <h5 className="text-muted mb-3">No Notifications</h5>
              <p className="text-muted">
                {filter === 'all'
                  ? "You don't have any notifications yet."
                  : filter === 'unread'
                  ? "You don't have any unread notifications."
                  : "You don't have any read notifications."}
              </p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`list-group-item list-group-item-action ${
                    !notification.is_read ? 'bg-light border-left-primary' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="d-flex align-items-start">
                    <div className="mr-3 mt-1">
                      <i className={getNotificationIcon(notification)}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h6 className="mb-1 font-weight-bold">
                          {notification.title}
                          {!notification.is_read && (
                            <span className="badge badge-primary badge-sm ml-2">New</span>
                          )}
                        </h6>
                        <div className="d-flex align-items-center">
                          <span className={getPriorityBadge(notification.priority)}>
                            {notification.priority}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-danger ml-2"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            title="Delete notification"
                          >
                            <i className="fas fa-trash fa-xs"></i>
                          </button>
                        </div>
                      </div>
                      <p className="mb-1 text-gray-700">{notification.message}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          <i className="fas fa-clock mr-1"></i>
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </small>
                        {notification.is_actionable && notification.action_text && (
                          <small className="text-primary font-weight-bold">
                            <i className="fas fa-external-link-alt mr-1"></i>
                            {notification.action_text}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center p-3">
              <button
                className="btn btn-outline-primary"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chevron-down mr-2"></i>
                    Load More
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;