/**
 * Notification System Integration
 * 
 * This file serves as the central integration point for the notification system,
 * connecting all modules and ensuring proper initialization and event handling
 * across the entire BudgetMe application.
 */

import { NotificationManager } from '../services/database/notificationManager';
import { BudgetNotificationService } from '../services/database/budgetNotificationService';
import { GoalNotificationService } from '../services/database/goalNotificationService';
import { FamilyNotificationService } from '../services/database/familyNotificationService';
import { TransactionNotificationService } from '../services/database/transactionNotificationService';
import { NotificationFilterService } from '../services/database/notificationFilterService';
import { NotificationApi } from '../services/api/notificationApi';
import type { Budget } from '../types/budget';
import type { Goal } from '../types/goal';
import type { Transaction } from '../types/transaction';
import type { FamilyMember, FamilyInvitation } from '../types/family';

/**
 * Central notification system coordinator
 * Manages all notification services and provides unified interface for the application
 */
export class NotificationSystemIntegration {
  private static instance: NotificationSystemIntegration;
  private notificationManager: NotificationManager;
  private budgetService: BudgetNotificationService;
  private goalService: GoalNotificationService;
  private familyService: FamilyNotificationService;
  private transactionService: TransactionNotificationService;
  private filterService: NotificationFilterService;
  private apiService: NotificationApi;
  private isInitialized = false;

  private constructor() {
    this.notificationManager = NotificationManager.getInstance();
    this.budgetService = BudgetNotificationService.getInstance();
    this.goalService = GoalNotificationService.getInstance();
    this.familyService = FamilyNotificationService.getInstance();
    this.transactionService = TransactionNotificationService.getInstance();
    this.filterService = NotificationFilterService.getInstance();
    this.apiService = NotificationApi.getInstance();
  }

  public static getInstance(): NotificationSystemIntegration {
    if (!NotificationSystemIntegration.instance) {
      NotificationSystemIntegration.instance = new NotificationSystemIntegration();
    }
    return NotificationSystemIntegration.instance;
  }

  /**
   * Initialize the notification system for a user
   */
  public async initialize(userId: string): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.log('Notification system already initialized');
        return true;
      }

      console.log('Initializing notification system for user:', userId);

      // Initialize the notification manager first
      await this.notificationManager.initialize();

      // Start real-time updates after manager is initialized
      this.notificationManager.startRealTimeUpdates(userId, (notification) => {
        console.log('Real-time notification received:', notification);
        // Emit custom event for UI components to listen to
        window.dispatchEvent(new CustomEvent('notification-received', {
          detail: notification
        }));
      });

      // Initialize filter service with user preferences (optional, with error handling)
      try {
        if (this.filterService && typeof this.filterService.initializeUserPreferences === 'function') {
          await this.filterService.initializeUserPreferences(userId);
        } else {
          console.log('Filter service initialization skipped - method not available');
        }
      } catch (filterError) {
        console.warn('Filter service initialization failed, continuing without it:', filterError);
      }

      // Clean up expired notifications (optional, with error handling)
      try {
        if (this.apiService && typeof this.apiService.cleanupExpiredNotifications === 'function') {
          await this.apiService.cleanupExpiredNotifications(userId);
        } else {
          console.log('Notification cleanup skipped - method not available');
        }
      } catch (cleanupError) {
        console.warn('Notification cleanup failed, continuing without it:', cleanupError);
      }

      this.isInitialized = true;
      console.log('Notification system initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification system:', error);
      return false;
    }
  }

  /**
   * Cleanup notification system when user logs out
   */
  public cleanup(userId: string): void {
    try {
      this.notificationManager.stopRealTimeUpdates(userId);
      this.isInitialized = false;
      console.log('Notification system cleaned up for user:', userId);
    } catch (error) {
      console.error('Error during notification system cleanup:', error);
    }
  }

  // Budget Integration Methods
  public async handleBudgetUpdate(budget: Budget, previousSpent?: number): Promise<void> {
    try {
      const spentPercentage = (budget.spent / budget.amount) * 100;
      const previousPercentage = previousSpent ? (previousSpent / budget.amount) * 100 : 0;

      // Check for threshold crossings
      const thresholds = [50, 75, 90];
      for (const threshold of thresholds) {
        if (spentPercentage >= threshold && previousPercentage < threshold) {
          await this.notificationManager.onBudgetThresholdReached(budget, threshold);
        }
      }

      // Check if budget exceeded
      if (spentPercentage > 100 && previousPercentage <= 100) {
        await this.notificationManager.onBudgetExceeded(budget);
      }
    } catch (error) {
      console.error('Error handling budget update notification:', error);
    }
  }

  public async handleBudgetCreation(budget: Budget): Promise<void> {
    try {
      await this.notificationManager.onBudgetCreated(budget);
    } catch (error) {
      console.error('Error handling budget creation notification:', error);
    }
  }

  // Goal Integration Methods
  public async handleGoalUpdate(goal: Goal, previousAmount?: number): Promise<void> {
    try {
      const currentPercentage = (goal.current_amount / goal.target_amount) * 100;
      const previousPercentage = previousAmount ? (previousAmount / goal.target_amount) * 100 : 0;

      // Check for milestone achievements
      const milestones = [25, 50, 75, 90];
      for (const milestone of milestones) {
        if (currentPercentage >= milestone && previousPercentage < milestone) {
          await this.notificationManager.onGoalMilestoneAchieved(goal, milestone);
        }
      }

      // Check if goal completed
      if (currentPercentage >= 100 && previousPercentage < 100) {
        await this.notificationManager.onGoalCompleted(goal);
      }

      // Check deadline approaching
      if (goal.target_date) {
        const daysUntilDeadline = Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if ([30, 7, 1].includes(daysUntilDeadline) && currentPercentage < 100) {
          await this.notificationManager.onGoalDeadlineApproaching(goal, daysUntilDeadline);
        }
      }
    } catch (error) {
      console.error('Error handling goal update notification:', error);
    }
  }

  // Transaction Integration Methods
  public async handleTransactionCreation(transaction: Transaction): Promise<void> {
    try {
      // Check for large transactions (>$1000 or user-defined threshold)
      const largeTransactionThreshold = 1000;
      if (Math.abs(transaction.amount) >= largeTransactionThreshold) {
        await this.notificationManager.onLargeTransactionDetected(transaction);
      }

      // Check for unusual spending patterns (to be implemented with historical data analysis)
      // This would require additional data analysis service
    } catch (error) {
      console.error('Error handling transaction creation notification:', error);
    }
  }

  public async handleMonthlyTransactionSummary(userId: string, month: string): Promise<void> {
    try {
      // This would typically be called by a scheduled job
      // For now, we'll create a placeholder implementation
      const summary = {
        user_id: userId,
        month: month,
        total_income: 0, // Would be calculated from actual data
        total_expenses: 0, // Would be calculated from actual data
        net_savings: 0, // Would be calculated from actual data
        transaction_count: 0, // Would be calculated from actual data
        top_categories: [] // Would be calculated from actual data
      };

      await this.notificationManager.onMonthlyTransactionSummary(summary);
    } catch (error) {
      console.error('Error handling monthly transaction summary notification:', error);
    }
  }

  // Family Integration Methods
  public async handleFamilyInvitation(invitation: FamilyInvitation): Promise<void> {
    try {
      await this.notificationManager.onFamilyInvitationSent(invitation);
    } catch (error) {
      console.error('Error handling family invitation notification:', error);
    }
  }

  public async handleFamilyMemberJoined(member: FamilyMember): Promise<void> {
    try {
      await this.notificationManager.onFamilyMemberJoined(member);
    } catch (error) {
      console.error('Error handling family member joined notification:', error);
    }
  }

  public async handleFamilyRoleChange(member: FamilyMember, oldRole: string): Promise<void> {
    try {
      await this.notificationManager.onFamilyRoleChanged(member, oldRole);
    } catch (error) {
      console.error('Error handling family role change notification:', error);
    }
  }

  // Utility Methods
  public async getNotificationStats(userId: string): Promise<any> {
    try {
      return await this.apiService.getNotificationStats(userId);
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { success: false, error: 'Failed to get notification stats' };
    }
  }

  public async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const result = await this.apiService.markAllNotificationsAsRead(userId);
      return result.success;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  public async deleteOldNotifications(userId: string, daysOld: number = 30): Promise<boolean> {
    try {
      // This would be implemented in the API service
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // For now, just cleanup expired notifications
      const result = await this.apiService.cleanupExpiredNotifications(userId);
      return result.success;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      return false;
    }
  }

  // Health check method
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const health = {
      isHealthy: true,
      services: {
        notificationManager: false,
        budgetService: false,
        goalService: false,
        familyService: false,
        transactionService: false,
        filterService: false,
        apiService: false
      },
      errors: [] as string[]
    };

    try {
      // Test each service
      health.services.notificationManager = !!this.notificationManager;
      health.services.budgetService = !!this.budgetService;
      health.services.goalService = !!this.goalService;
      health.services.familyService = !!this.familyService;
      health.services.transactionService = !!this.transactionService;
      health.services.filterService = !!this.filterService;
      health.services.apiService = !!this.apiService;

      // Check if any service failed to initialize
      const failedServices = Object.entries(health.services)
        .filter(([, isHealthy]) => !isHealthy)
        .map(([service]) => service);

      if (failedServices.length > 0) {
        health.isHealthy = false;
        health.errors.push(`Failed services: ${failedServices.join(', ')}`);
      }

    } catch (error) {
      health.isHealthy = false;
      health.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return health;
  }
}

// Export singleton instance
export const notificationSystem = NotificationSystemIntegration.getInstance();

// Export integration hooks for React components
export const useNotificationIntegration = () => {
  return {
    initialize: notificationSystem.initialize.bind(notificationSystem),
    cleanup: notificationSystem.cleanup.bind(notificationSystem),
    handleBudgetUpdate: notificationSystem.handleBudgetUpdate.bind(notificationSystem),
    handleBudgetCreation: notificationSystem.handleBudgetCreation.bind(notificationSystem),
    handleGoalUpdate: notificationSystem.handleGoalUpdate.bind(notificationSystem),
    handleTransactionCreation: notificationSystem.handleTransactionCreation.bind(notificationSystem),
    handleFamilyInvitation: notificationSystem.handleFamilyInvitation.bind(notificationSystem),
    handleFamilyMemberJoined: notificationSystem.handleFamilyMemberJoined.bind(notificationSystem),
    handleFamilyRoleChange: notificationSystem.handleFamilyRoleChange.bind(notificationSystem),
    getNotificationStats: notificationSystem.getNotificationStats.bind(notificationSystem),
    markAllAsRead: notificationSystem.markAllAsRead.bind(notificationSystem),
    healthCheck: notificationSystem.healthCheck.bind(notificationSystem)
  };
};

// Global event listeners for notification system events
if (typeof window !== 'undefined') {
  // Listen for page visibility changes to refresh notifications
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      window.dispatchEvent(new CustomEvent('notification-refresh-requested'));
    }
  });

  // Listen for online/offline events to handle reconnection
  window.addEventListener('online', () => {
    window.dispatchEvent(new CustomEvent('notification-reconnect-requested'));
  });
}

export default NotificationSystemIntegration;