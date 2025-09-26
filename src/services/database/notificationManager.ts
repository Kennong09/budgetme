/**
 * Notification Manager
 * 
 * Centralized manager for all notification services with real-time updates,
 * scheduled tasks, and cross-module integration
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from './notificationService';
import BudgetNotificationService from './budgetNotificationService';
import GoalNotificationService from './goalNotificationService';
import FamilyNotificationService from './familyNotificationService';
import TransactionNotificationService from './transactionNotificationService';
import { NotificationError } from '../../types/notifications';

export interface NotificationManagerConfig {
  enableRealTimeUpdates: boolean;
  enableScheduledTasks: boolean;
  scheduledTaskInterval: number; // in minutes
  cleanupInterval: number; // in hours
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

export interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  notifications_by_type: Record<string, number>;
  notifications_by_priority: Record<string, number>;
  delivery_success_rate: number;
  avg_response_time: number;
}

/**
 * NotificationManager - Central orchestrator for all notification services
 * 
 * This manager provides:
 * - Real-time notification subscriptions
 * - Scheduled notification tasks
 * - Cross-module notification coordination
 * - Performance monitoring and statistics
 * - Automated cleanup and maintenance
 */
export class NotificationManager {
  private static instance: NotificationManager;
  private config: NotificationManagerConfig;
  private realtimeSubscriptions: Map<string, any> = new Map();
  private scheduledTaskInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: NotificationManagerConfig = {
    enableRealTimeUpdates: true,
    enableScheduledTasks: true,
    scheduledTaskInterval: 60, // 1 hour
    cleanupInterval: 24, // 24 hours
    maxRetries: 3,
    retryDelay: 1000 // 1 second
  };

  private constructor(config?: Partial<NotificationManagerConfig>) {
    this.config = { ...NotificationManager.DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<NotificationManagerConfig>): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager(config);
    }
    return NotificationManager.instance;
  }

  // =====================================================
  // INITIALIZATION AND LIFECYCLE
  // =====================================================

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('NotificationManager already initialized');
      return;
    }

    try {
      console.log('Initializing NotificationManager...');

      // Set up real-time subscriptions if enabled
      if (this.config.enableRealTimeUpdates) {
        await this.setupRealTimeSubscriptions();
      }

      // Start scheduled tasks if enabled
      if (this.config.enableScheduledTasks) {
        this.startScheduledTasks();
      }

      // Start cleanup tasks
      this.startCleanupTasks();

      this.isInitialized = true;
      console.log('NotificationManager initialized successfully');

    } catch (error) {
      console.error('Error initializing NotificationManager:', error);
      throw new NotificationError('Failed to initialize NotificationManager', 'INIT_ERROR', error);
    }
  }

  /**
   * Shutdown the notification manager
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down NotificationManager...');

      // Stop scheduled tasks
      if (this.scheduledTaskInterval) {
        clearInterval(this.scheduledTaskInterval);
        this.scheduledTaskInterval = null;
      }

      // Stop cleanup tasks
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Unsubscribe from real-time updates
      await this.shutdownRealTimeSubscriptions();

      this.isInitialized = false;
      console.log('NotificationManager shut down successfully');

    } catch (error) {
      console.error('Error shutting down NotificationManager:', error);
    }
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Set up real-time subscriptions for database changes
   */
  private async setupRealTimeSubscriptions(): Promise<void> {
    try {
      console.log('Setting up real-time subscriptions...');

      // Subscribe to transaction changes for budget and goal updates
      const transactionSubscription = supabase
        .channel('transaction_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions'
          },
          async (payload) => {
            await this.handleTransactionInsert(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions'
          },
          async (payload) => {
            await this.handleTransactionUpdate(payload.new, payload.old);
          }
        )
        .subscribe();

      this.realtimeSubscriptions.set('transactions', transactionSubscription);

      // Subscribe to budget changes
      const budgetSubscription = supabase
        .channel('budget_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'budgets'
          },
          async (payload) => {
            await this.handleBudgetUpdate(payload.new, payload.old);
          }
        )
        .subscribe();

      this.realtimeSubscriptions.set('budgets', budgetSubscription);

      // Subscribe to goal changes
      const goalSubscription = supabase
        .channel('goal_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'goals'
          },
          async (payload) => {
            await this.handleGoalUpdate(payload.new, payload.old);
          }
        )
        .subscribe();

      this.realtimeSubscriptions.set('goals', goalSubscription);

      // Subscribe to family invitation changes
      const familyInvitationSubscription = supabase
        .channel('family_invitation_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'family_invitations'
          },
          async (payload) => {
            await this.handleFamilyInvitationInsert(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'family_invitations'
          },
          async (payload) => {
            await this.handleFamilyInvitationUpdate(payload.new, payload.old);
          }
        )
        .subscribe();

      this.realtimeSubscriptions.set('family_invitations', familyInvitationSubscription);

      // Subscribe to family member changes
      const familyMemberSubscription = supabase
        .channel('family_member_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'family_members'
          },
          async (payload) => {
            await this.handleFamilyMemberInsert(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'family_members'
          },
          async (payload) => {
            await this.handleFamilyMemberDelete(payload.old);
          }
        )
        .subscribe();

      this.realtimeSubscriptions.set('family_members', familyMemberSubscription);

      console.log('Real-time subscriptions set up successfully');

    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
      throw error;
    }
  }

  /**
   * Shutdown real-time subscriptions
   */
  private async shutdownRealTimeSubscriptions(): Promise<void> {
    try {
      console.log('Shutting down real-time subscriptions...');

      for (const [key, subscription] of this.realtimeSubscriptions) {
        if (subscription) {
          await subscription.unsubscribe();
          console.log(`Unsubscribed from ${key}`);
        }
      }

      this.realtimeSubscriptions.clear();
      console.log('Real-time subscriptions shut down successfully');

    } catch (error) {
      console.error('Error shutting down real-time subscriptions:', error);
    }
  }

  // =====================================================
  // REAL-TIME EVENT HANDLERS
  // =====================================================

  /**
   * Handle transaction insert events
   */
  private async handleTransactionInsert(transaction: any): Promise<void> {
    try {
      console.log(`Handling transaction insert: ${transaction.id}`);
      
      await this.executeWithRetry(async () => {
        await TransactionNotificationService.handleTransactionCreated(transaction);
      });

    } catch (error) {
      console.error('Error handling transaction insert:', error);
    }
  }

  /**
   * Handle transaction update events
   */
  private async handleTransactionUpdate(newTransaction: any, oldTransaction: any): Promise<void> {
    try {
      console.log(`Handling transaction update: ${newTransaction.id}`);

      // Check if category was added (categorization completed)
      if (!oldTransaction.category_id && newTransaction.category_id) {
        console.log(`Transaction categorized: ${newTransaction.id}`);
        // Could trigger additional notifications here if needed
      }

    } catch (error) {
      console.error('Error handling transaction update:', error);
    }
  }

  /**
   * Handle budget update events
   */
  private async handleBudgetUpdate(newBudget: any, oldBudget: any): Promise<void> {
    try {
      console.log(`Handling budget update: ${newBudget.id}`);

      // Check if spent amount increased (new expense)
      if (newBudget.spent > oldBudget.spent) {
        await this.executeWithRetry(async () => {
          await BudgetNotificationService.checkBudgetThresholds(newBudget.id);
          await BudgetNotificationService.checkBudgetExceeded(newBudget.id);
        });
      }

    } catch (error) {
      console.error('Error handling budget update:', error);
    }
  }

  /**
   * Handle goal update events
   */
  private async handleGoalUpdate(newGoal: any, oldGoal: any): Promise<void> {
    try {
      console.log(`Handling goal update: ${newGoal.id}`);

      // Check if current amount increased (new contribution)
      if (newGoal.current_amount > oldGoal.current_amount) {
        await this.executeWithRetry(async () => {
          await GoalNotificationService.checkGoalMilestones(newGoal.id);
        });
      }

      // Check if status changed
      if (newGoal.status !== oldGoal.status) {
        await this.executeWithRetry(async () => {
          await GoalNotificationService.handleGoalStatusChange(
            newGoal.id,
            oldGoal.status,
            newGoal.status
          );
        });
      }

    } catch (error) {
      console.error('Error handling goal update:', error);
    }
  }

  /**
   * Handle family invitation insert events
   */
  private async handleFamilyInvitationInsert(invitation: any): Promise<void> {
    try {
      console.log(`Handling family invitation insert: ${invitation.id}`);

      await this.executeWithRetry(async () => {
        await FamilyNotificationService.triggerFamilyInvitationNotification(invitation);
      });

    } catch (error) {
      console.error('Error handling family invitation insert:', error);
    }
  }

  /**
   * Handle family invitation update events
   */
  private async handleFamilyInvitationUpdate(newInvitation: any, oldInvitation: any): Promise<void> {
    try {
      console.log(`Handling family invitation update: ${newInvitation.id}`);

      // Check if status changed to accepted or declined
      if (oldInvitation.status === 'pending' && newInvitation.status !== 'pending') {
        await this.executeWithRetry(async () => {
          await FamilyNotificationService.handleFamilyInvitationResponse(
            newInvitation.id,
            newInvitation.status,
            newInvitation.invited_user_id
          );
        });
      }

    } catch (error) {
      console.error('Error handling family invitation update:', error);
    }
  }

  /**
   * Handle family member insert events
   */
  private async handleFamilyMemberInsert(member: any): Promise<void> {
    try {
      console.log(`Handling family member insert: ${member.member_user_id}`);

      // Get additional member and family info
      const [memberInfo, familyInfo] = await Promise.all([
        FamilyNotificationService.getFamilyMemberInfo(member.member_user_id),
        FamilyNotificationService.getFamilyInfo(member.family_id)
      ]);

      if (memberInfo && familyInfo) {
        await this.executeWithRetry(async () => {
          await FamilyNotificationService.notifyFamilyMembersOfNewMember({
            family_id: member.family_id,
            family_name: familyInfo.family_name,
            new_member_name: memberInfo.name,
            new_member_user_id: member.member_user_id,
            role: member.role
          });
        });
      }

    } catch (error) {
      console.error('Error handling family member insert:', error);
    }
  }

  /**
   * Handle family member delete events
   */
  private async handleFamilyMemberDelete(member: any): Promise<void> {
    try {
      console.log(`Handling family member delete: ${member.member_user_id}`);

      // Get additional member and family info
      const [memberInfo, familyInfo] = await Promise.all([
        FamilyNotificationService.getFamilyMemberInfo(member.member_user_id),
        FamilyNotificationService.getFamilyInfo(member.family_id)
      ]);

      if (memberInfo && familyInfo) {
        await this.executeWithRetry(async () => {
          await FamilyNotificationService.handleFamilyMemberLeft({
            family_id: member.family_id,
            family_name: familyInfo.family_name,
            departed_member_name: memberInfo.name,
            departed_member_user_id: member.member_user_id
          });
        });
      }

    } catch (error) {
      console.error('Error handling family member delete:', error);
    }
  }

  // =====================================================
  // SCHEDULED TASKS
  // =====================================================

  /**
   * Start scheduled notification tasks
   */
  private startScheduledTasks(): void {
    console.log('Starting scheduled notification tasks...');

    this.scheduledTaskInterval = setInterval(async () => {
      await this.runScheduledTasks();
    }, this.config.scheduledTaskInterval * 60 * 1000); // Convert to milliseconds

    console.log(`Scheduled tasks will run every ${this.config.scheduledTaskInterval} minutes`);
  }

  /**
   * Run all scheduled notification tasks
   */
  private async runScheduledTasks(): Promise<void> {
    try {
      console.log('Running scheduled notification tasks...');

      const tasks = [
        // Budget tasks
        () => BudgetNotificationService.checkBudgetThresholds(),
        () => BudgetNotificationService.checkBudgetExceeded(),
        () => BudgetNotificationService.checkBudgetExpiringPeriods(),

        // Goal tasks
        () => GoalNotificationService.checkGoalMilestones(),
        () => GoalNotificationService.checkGoalDeadlines(),

        // Transaction tasks
        () => TransactionNotificationService.checkRecurringTransactionReminders(),

        // Monthly summaries (run on first day of month)
        ...(this.isFirstDayOfMonth() ? [
          () => BudgetNotificationService.generateMonthlySummaries(),
          () => TransactionNotificationService.generateMonthlySpendingSummaries()
        ] : [])
      ];

      // Run tasks with error handling
      for (const task of tasks) {
        try {
          await this.executeWithRetry(task);
        } catch (error) {
          console.error('Error in scheduled task:', error);
        }
      }

      console.log('Scheduled notification tasks completed');

    } catch (error) {
      console.error('Error running scheduled tasks:', error);
    }
  }

  /**
   * Check if today is the first day of the month
   */
  private isFirstDayOfMonth(): boolean {
    const today = new Date();
    return today.getDate() === 1;
  }

  // =====================================================
  // CLEANUP TASKS
  // =====================================================

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    console.log('Starting cleanup tasks...');

    this.cleanupInterval = setInterval(async () => {
      await this.runCleanupTasks();
    }, this.config.cleanupInterval * 60 * 60 * 1000); // Convert to milliseconds

    console.log(`Cleanup tasks will run every ${this.config.cleanupInterval} hours`);
  }

  /**
   * Run cleanup tasks
   */
  private async runCleanupTasks(): Promise<void> {
    try {
      console.log('Running cleanup tasks...');

      const cleanupTasks = [
        () => NotificationService.cleanupExpiredNotifications(),
        () => BudgetNotificationService.cleanupOldBudgetNotifications(),
        () => GoalNotificationService.cleanupOldGoalNotifications(),
        () => FamilyNotificationService.cleanupOldFamilyNotifications(),
        () => TransactionNotificationService.cleanupOldTransactionNotifications()
      ];

      let totalCleaned = 0;

      for (const task of cleanupTasks) {
        try {
          const cleaned = await this.executeWithRetry(task);
          totalCleaned += cleaned || 0;
        } catch (error) {
          console.error('Error in cleanup task:', error);
        }
      }

      console.log(`Cleanup tasks completed. Cleaned up ${totalCleaned} notifications`);

    } catch (error) {
      console.error('Error running cleanup tasks:', error);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      // Get basic notification counts
      const { data: notifications, error } = await supabase
        .from('user_notifications')
        .select('notification_type, priority, is_read, created_at');

      if (error) {
        throw new NotificationError('Failed to fetch notification stats', 'FETCH_ERROR', error);
      }

      const total = notifications?.length || 0;
      const unread = notifications?.filter(n => !n.is_read).length || 0;

      // Count by type
      const byType: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      notifications?.forEach(n => {
        byType[n.notification_type] = (byType[n.notification_type] || 0) + 1;
        byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
      });

      // Get delivery stats
      const { data: deliveryLogs } = await supabase
        .from('notification_delivery_log')
        .select('delivery_status, attempted_at, delivered_at');

      const totalDeliveries = deliveryLogs?.length || 0;
      const successfulDeliveries = deliveryLogs?.filter(d => d.delivery_status === 'delivered').length || 0;
      const deliveryRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

      // Calculate average response time
      const responseTimes = deliveryLogs?.filter(d => d.delivered_at)
        .map(d => {
          const attempted = new Date(d.attempted_at).getTime();
          const delivered = new Date(d.delivered_at).getTime();
          return delivered - attempted;
        }) || [];

      const avgResponseTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

      return {
        total_notifications: total,
        unread_notifications: unread,
        notifications_by_type: byType,
        notifications_by_priority: byPriority,
        delivery_success_rate: deliveryRate,
        avg_response_time: Math.round(avgResponseTime / 1000) // Convert to seconds
      };

    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Force run scheduled tasks (for testing/manual execution)
   */
  async forceRunScheduledTasks(): Promise<void> {
    console.log('Force running scheduled tasks...');
    await this.runScheduledTasks();
  }

  /**
   * Force run cleanup tasks (for testing/manual execution)
   */
  async forceRunCleanupTasks(): Promise<void> {
    console.log('Force running cleanup tasks...');
    await this.runCleanupTasks();
  }

  /**
   * Get manager status
   */
  getStatus(): {
    isInitialized: boolean;
    config: NotificationManagerConfig;
    subscriptionCount: number;
    hasScheduledTasks: boolean;
    hasCleanupTasks: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      subscriptionCount: this.realtimeSubscriptions.size,
      hasScheduledTasks: this.scheduledTaskInterval !== null,
      hasCleanupTasks: this.cleanupInterval !== null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NotificationManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('NotificationManager configuration updated:', this.config);
  }

  // =====================================================
  // MISSING METHODS REQUIRED BY NOTIFICATION SYSTEM INTEGRATION
  // =====================================================

  /**
   * Start real-time updates for a specific user
   * This method is required by NotificationSystemIntegration
   */
  async startRealTimeUpdates(userId: string, callback: (notification: any) => void): Promise<void> {
    try {
      console.log('Starting real-time updates for user:', userId);
      
      // Auto-initialize if not already initialized
      if (!this.isInitialized) {
        console.log('NotificationManager not initialized, initializing now...');
        await this.initialize();
      }
      
      // Set up user-specific subscription
      this.setupUserSpecificSubscription(userId, callback);
    } catch (error) {
      console.error('Error starting real-time updates:', error);
    }
  }

  /**
   * Stop real-time updates for a specific user
   * This method is required by NotificationSystemIntegration
   */
  stopRealTimeUpdates(userId: string): void {
    try {
      console.log('Stopping real-time updates for user:', userId);
      
      // Remove user-specific subscription
      const userSubKey = `user_${userId}`;
      const subscription = this.realtimeSubscriptions.get(userSubKey);
      
      if (subscription) {
        subscription.unsubscribe();
        this.realtimeSubscriptions.delete(userSubKey);
        console.log(`Stopped real-time updates for user: ${userId}`);
      }
    } catch (error) {
      console.error('Error stopping real-time updates:', error);
    }
  }

  /**
   * Set up user-specific real-time subscription
   * This creates a dedicated channel for user-specific notifications
   */
  private setupUserSpecificSubscription(userId: string, callback: (notification: any) => void): void {
    try {
      const userSubKey = `user_${userId}`;
      
      // Clean up existing subscription for this user
      const existingSub = this.realtimeSubscriptions.get(userSubKey);
      if (existingSub) {
        existingSub.unsubscribe();
      }
      
      // Create new user-specific subscription
      const userSubscription = supabase
        .channel(`user_notifications_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('User notification received:', payload.new);
            callback(payload.new);
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
            console.log('User notification updated:', payload.new);
            callback(payload.new);
          }
        )
        .subscribe();
      
      this.realtimeSubscriptions.set(userSubKey, userSubscription);
      console.log(`Set up user-specific subscription for: ${userId}`);
    } catch (error) {
      console.error('Error setting up user-specific subscription:', error);
    }
  }

  // =====================================================
  // BUDGET NOTIFICATION INTEGRATION METHODS
  // =====================================================

  /**
   * Handle budget threshold reached event
   * This method is called by NotificationSystemIntegration
   */
  async onBudgetThresholdReached(budget: any, threshold: number): Promise<void> {
    try {
      console.log(`Budget threshold reached: ${budget.id} at ${threshold}%`);
      await BudgetNotificationService.handleBudgetThreshold(budget.id, threshold);
    } catch (error) {
      console.error('Error handling budget threshold reached:', error);
    }
  }

  /**
   * Handle budget exceeded event
   * This method is called by NotificationSystemIntegration
   */
  async onBudgetExceeded(budget: any): Promise<void> {
    try {
      console.log(`Budget exceeded: ${budget.id}`);
      await BudgetNotificationService.handleBudgetExceeded(budget.id);
    } catch (error) {
      console.error('Error handling budget exceeded:', error);
    }
  }

  // =====================================================
  // FAMILY NOTIFICATION INTEGRATION METHODS
  // =====================================================

  /**
   * Handle family role changed event
   * This method is called by NotificationSystemIntegration
   */
  async onFamilyRoleChanged(member: any, oldRole: string): Promise<void> {
    try {
      console.log(`Family role changed: ${member.member_user_id} from ${oldRole} to ${member.role}`);
      await FamilyNotificationService.handleFamilyRoleChange(member, oldRole);
    } catch (error) {
      console.error('Error handling family role change:', error);
    }
  }

  /**
   * Handle goal update event
   * This method is called by NotificationSystemIntegration  
   */
  async onGoalUpdate(goal: any): Promise<void> {
    try {
      console.log(`Goal updated: ${goal.id}`);
      await GoalNotificationService.handleGoalUpdate(goal);
    } catch (error) {
      console.error('Error handling goal update:', error);
    }
  }

  /**
   * Handle transaction creation event
   * This method is called by NotificationSystemIntegration
   */
  async onTransactionCreated(transaction: any): Promise<void> {
    try {
      console.log(`Transaction created: ${transaction.id}`);
      await TransactionNotificationService.handleTransactionCreated(transaction);
    } catch (error) {
      console.error('Error handling transaction creation:', error);
    }
  }

  // =====================================================
  // ADDITIONAL NOTIFICATION INTEGRATION METHODS
  // =====================================================

  /**
   * Handle budget creation event
   * This method is called by NotificationSystemIntegration
   */
  async onBudgetCreated(budget: any): Promise<void> {
    try {
      console.log(`Budget created: ${budget.id}`);
      await BudgetNotificationService.handleBudgetCreated(budget);
    } catch (error) {
      console.error('Error handling budget creation:', error);
    }
  }

  /**
   * Handle goal milestone achieved event
   * This method is called by NotificationSystemIntegration
   */
  async onGoalMilestoneAchieved(goal: any, milestone: number): Promise<void> {
    try {
      console.log(`Goal milestone achieved: ${goal.id} at ${milestone}%`);
      await GoalNotificationService.handleGoalMilestone(goal.id, milestone / 100);
    } catch (error) {
      console.error('Error handling goal milestone:', error);
    }
  }

  /**
   * Handle goal completed event
   * This method is called by NotificationSystemIntegration
   */
  async onGoalCompleted(goal: any): Promise<void> {
    try {
      console.log(`Goal completed: ${goal.id}`);
      await GoalNotificationService.handleGoalCompletion(goal.id);
    } catch (error) {
      console.error('Error handling goal completion:', error);
    }
  }

  /**
   * Handle goal deadline approaching event
   * This method is called by NotificationSystemIntegration
   */
  async onGoalDeadlineApproaching(goal: any, daysRemaining: number): Promise<void> {
    try {
      console.log(`Goal deadline approaching: ${goal.id} - ${daysRemaining} days remaining`);
      await GoalNotificationService.handleGoalDeadlineApproaching(goal.id, daysRemaining);
    } catch (error) {
      console.error('Error handling goal deadline approaching:', error);
    }
  }

  /**
   * Handle large transaction detected event
   * This method is called by NotificationSystemIntegration
   */
  async onLargeTransactionDetected(transaction: any): Promise<void> {
    try {
      console.log(`Large transaction detected: ${transaction.id} - ${transaction.amount}`);
      await TransactionNotificationService.handleLargeTransaction(transaction);
    } catch (error) {
      console.error('Error handling large transaction:', error);
    }
  }

  /**
   * Handle monthly transaction summary event
   * This method is called by NotificationSystemIntegration
   */
  async onMonthlyTransactionSummary(summary: any): Promise<void> {
    try {
      console.log(`Monthly transaction summary: ${summary.user_id} - ${summary.month}`);
      await TransactionNotificationService.handleMonthlySummary(summary);
    } catch (error) {
      console.error('Error handling monthly transaction summary:', error);
    }
  }

  /**
   * Handle family invitation sent event
   * This method is called by NotificationSystemIntegration
   */
  async onFamilyInvitationSent(invitation: any): Promise<void> {
    try {
      console.log(`Family invitation sent: ${invitation.id}`);
      await FamilyNotificationService.handleFamilyInvitation(invitation);
    } catch (error) {
      console.error('Error handling family invitation:', error);
    }
  }

  /**
   * Handle family member joined event
   * This method is called by NotificationSystemIntegration
   */
  async onFamilyMemberJoined(member: any): Promise<void> {
    try {
      console.log(`Family member joined: ${member.user_id}`);
      await FamilyNotificationService.handleFamilyMemberJoined(member);
    } catch (error) {
      console.error('Error handling family member joined:', error);
    }
  }
}

// Export singleton instance
export default NotificationManager.getInstance();