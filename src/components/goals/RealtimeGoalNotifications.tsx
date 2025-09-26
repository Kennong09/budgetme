import React, { useState, useEffect } from 'react';
import { useGoalRealtime } from '../../hooks/useGoalRealtime';
import { useAuth } from '../../utils/AuthContext';
import { formatCurrency } from '../../utils/helpers';

interface RealtimeNotification {
  id: string;
  type: 'goal_update' | 'contribution' | 'goal_completed';
  title: string;
  message: string;
  timestamp: Date;
  goalId?: string;
  amount?: number;
}

interface RealtimeGoalNotificationsProps {
  maxNotifications?: number;
  autoHideDelay?: number;
}

const RealtimeGoalNotifications: React.FC<RealtimeGoalNotificationsProps> = ({
  maxNotifications = 5,
  autoHideDelay = 5000
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const { isConnected, connectionStatus } = useGoalRealtime({
    onGoalUpdate: (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const newGoal = payload.new;
        const oldGoal = payload.old;
        
        // Check for significant changes
        const amountChanged = newGoal.current_amount !== oldGoal.current_amount;
        const statusChanged = newGoal.status !== oldGoal.status;
        
        if (amountChanged) {
          const difference = newGoal.current_amount - oldGoal.current_amount;
          addNotification({
            id: `goal-update-${Date.now()}`,
            type: difference > 0 ? 'contribution' : 'goal_update',
            title: difference > 0 ? 'New Contribution' : 'Goal Updated',
            message: `${newGoal.goal_name}: ${difference > 0 ? '+' : ''}${formatCurrency(difference)}`,
            timestamp: new Date(),
            goalId: newGoal.id,
            amount: Math.abs(difference)
          });
        }
        
        if (statusChanged && newGoal.status === 'completed') {
          addNotification({
            id: `goal-completed-${Date.now()}`,
            type: 'goal_completed',
            title: '🎉 Goal Completed!',
            message: `Congratulations! \"${newGoal.goal_name}\" has been completed!`,
            timestamp: new Date(),
            goalId: newGoal.id
          });
        }
      }
    },
    onContributionUpdate: (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const contribution = payload.new;
        addNotification({
          id: `contribution-${Date.now()}`,
          type: 'contribution',
          title: 'New Contribution Received',
          message: `${formatCurrency(contribution.amount)} contributed to your goal`,
          timestamp: new Date(),
          goalId: contribution.goal_id,
          amount: contribution.amount
        });
      }
    }
  });

  const addNotification = (notification: RealtimeNotification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    
    setIsVisible(true);
    
    // Auto-hide notification after delay
    if (autoHideDelay > 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, autoHideDelay);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setIsVisible(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return 'fas fa-plus-circle text-success';
      case 'goal_completed':
        return 'fas fa-trophy text-warning';
      case 'goal_update':
        return 'fas fa-sync-alt text-info';
      default:
        return 'fas fa-bell text-primary';
    }
  };

  if (!user || notifications.length === 0) {
    return null;
  }

  return (
    <>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="position-fixed" style={{ top: '60px', right: '20px', zIndex: 1040, maxWidth: '350px' }}>
          <div className="card shadow-lg border-0">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="fas fa-bell mr-2"></i>
                Real-time Updates ({notifications.length})
              </h6>
              <button 
                className="btn btn-sm btn-outline-light"
                onClick={clearAllNotifications}
                title="Clear all notifications"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.map((notification, index) => (
                <div 
                  key={notification.id}
                  className={`p-3 border-bottom ${index === 0 ? 'bg-light' : ''}`}
                >
                  <div className="d-flex align-items-start">
                    <div className="mr-3 mt-1">
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="font-weight-bold text-gray-800 mb-1">
                        {notification.title}
                      </div>
                      <div className="text-muted small mb-2">
                        {notification.message}
                      </div>
                      <div className="text-xs text-muted">
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <button 
                      className="btn btn-sm btn-link text-muted p-0 ml-2"
                      onClick={() => removeNotification(notification.id)}
                      title="Dismiss notification"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RealtimeGoalNotifications;