/**
 * Budget Notification Service
 * 
 * Service for triggering budget-related notifications based on spending patterns,
 * threshold breaches, and budget lifecycle events
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from './notificationService';
import {
  CreateNotificationData,
  BudgetNotificationData,
  NotificationError
} from '../../types/notifications';

export interface BudgetAlert {
  budget_id: string;
  user_id: string;
  budget_name: string;
  budget_amount: number;
  spent_amount: number;
  percentage_used: number;
  threshold_percentage: number;
  currency: string;
  period: string;
  end_date: string;
}

export interface BudgetSummary {
  user_id: string;
  period: string;
  total_budgets: number;
  total_budget_amount: number;
  total_spent: number;
  budgets_exceeded: number;
  budgets_on_track: number;
  currency: string;
}

/**
 * Budget Notification Service
 * 
 * Handles all budget-related notification triggers and events
 */
export class BudgetNotificationService {
  private static instance: BudgetNotificationService;

  public static getInstance(): BudgetNotificationService {
    if (!BudgetNotificationService.instance) {
      BudgetNotificationService.instance = new BudgetNotificationService();
    }
    return BudgetNotificationService.instance;
  }

  // =====================================================
  // BUDGET THRESHOLD NOTIFICATIONS
  // =====================================================

  /**
   * Check and trigger budget threshold warning notifications
   */
  async checkBudgetThresholds(budgetId?: string): Promise<void> {
    try {
      let query = supabase
        .from('budgets')
        .select(`
          id,
          user_id,
          budget_name,
          amount,
          spent,
          currency,
          period,
          end_date,
          alert_threshold,
          alert_enabled,
          last_alert_sent
        `)
        .eq('status', 'active')
        .eq('alert_enabled', true);

      if (budgetId) {
        query = query.eq('id', budgetId);
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('Error fetching budgets for threshold check:', error);
        throw new NotificationError('Failed to fetch budgets', 'FETCH_ERROR', error);
      }

      if (!budgets || budgets.length === 0) return;

      // Check each budget for threshold breaches
      for (const budget of budgets) {
        await this.checkSingleBudgetThreshold(budget);
      }

    } catch (error) {
      console.error('Error in checkBudgetThresholds:', error);
      throw error;
    }
  }

  /**
   * Check a single budget for threshold breach
   */
  private async checkSingleBudgetThreshold(budget: any): Promise<void> {
    const percentageUsed = budget.amount > 0 ? (budget.spent / budget.amount) : 0;
    const threshold = budget.alert_threshold || 0.80; // Default 80%

    // Check if threshold is exceeded and no alert was sent recently
    if (percentageUsed >= threshold && percentageUsed < 1.0) {
      const lastAlertDate = budget.last_alert_sent ? new Date(budget.last_alert_sent) : null;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Only send alert if no alert was sent in the last 24 hours
      if (!lastAlertDate || lastAlertDate < oneDayAgo) {
        await this.triggerBudgetThresholdWarning({
          budget_id: budget.id,
          user_id: budget.user_id,
          budget_name: budget.budget_name,
          budget_amount: budget.amount,
          spent_amount: budget.spent,
          percentage_used: percentageUsed,
          threshold_percentage: threshold,
          currency: budget.currency,
          period: budget.period,
          end_date: budget.end_date
        });

        // Update last alert sent timestamp
        await supabase
          .from('budgets')
          .update({ last_alert_sent: new Date().toISOString() })
          .eq('id', budget.id);
      }
    }
  }

  /**
   * Trigger budget threshold warning notification
   */
  async triggerBudgetThresholdWarning(alert: BudgetAlert): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: alert.user_id,
        notification_type: 'budget',
        event_type: 'budget_threshold_warning',
        template_data: {
          budget_name: alert.budget_name,
          percentage: Math.round(alert.percentage_used * 100),
          amount: this.formatCurrency(alert.spent_amount, alert.currency),
          budget_amount: this.formatCurrency(alert.budget_amount, alert.currency),
          threshold: Math.round(alert.threshold_percentage * 100)
        },
        priority: 'high',
        severity: 'warning',
        is_actionable: true,
        action_url: `/budget/${alert.budget_id}`,
        action_text: 'Review Budget',
        related_budget_id: alert.budget_id,
        metadata: {
          budget_amount: alert.budget_amount,
          spent_amount: alert.spent_amount,
          percentage_used: alert.percentage_used,
          threshold_percentage: alert.threshold_percentage
        },
        expires_in_hours: 72 // 3 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Budget threshold warning sent for budget: ${alert.budget_name} (${Math.round(alert.percentage_used * 100)}%)`);

    } catch (error) {
      console.error('Error triggering budget threshold warning:', error);
      throw new NotificationError('Failed to trigger budget threshold warning', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // BUDGET EXCEEDED NOTIFICATIONS
  // =====================================================

  /**
   * Check and trigger budget exceeded notifications
   */
  async checkBudgetExceeded(budgetId?: string): Promise<void> {
    try {
      let query = supabase
        .from('budgets')
        .select(`
          id,
          user_id,
          budget_name,
          amount,
          spent,
          currency,
          period,
          end_date,
          alert_enabled,
          last_alert_sent
        `)
        .eq('status', 'active')
        .eq('alert_enabled', true)
        .gt('spent', supabase.raw('amount')); // spent > amount

      if (budgetId) {
        query = query.eq('id', budgetId);
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('Error fetching exceeded budgets:', error);
        throw new NotificationError('Failed to fetch exceeded budgets', 'FETCH_ERROR', error);
      }

      if (!budgets || budgets.length === 0) return;

      // Check each exceeded budget
      for (const budget of budgets) {
        await this.checkSingleBudgetExceeded(budget);
      }

    } catch (error) {
      console.error('Error in checkBudgetExceeded:', error);
      throw error;
    }
  }

  /**
   * Check a single budget for exceeded amount
   */
  private async checkSingleBudgetExceeded(budget: any): Promise<void> {
    const amountOver = budget.spent - budget.amount;
    
    if (amountOver > 0) {
      const lastAlertDate = budget.last_alert_sent ? new Date(budget.last_alert_sent) : null;
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      // Only send alert if no alert was sent in the last 6 hours (more frequent for exceeded budgets)
      if (!lastAlertDate || lastAlertDate < sixHoursAgo) {
        await this.triggerBudgetExceededAlert({
          budget_id: budget.id,
          user_id: budget.user_id,
          budget_name: budget.budget_name,
          budget_amount: budget.amount,
          spent_amount: budget.spent,
          percentage_used: budget.spent / budget.amount,
          threshold_percentage: 1.0,
          currency: budget.currency,
          period: budget.period,
          end_date: budget.end_date
        });

        // Update last alert sent timestamp
        await supabase
          .from('budgets')
          .update({ last_alert_sent: new Date().toISOString() })
          .eq('id', budget.id);
      }
    }
  }

  /**
   * Trigger budget exceeded notification
   */
  async triggerBudgetExceededAlert(alert: BudgetAlert): Promise<void> {
    try {
      const amountOver = alert.spent_amount - alert.budget_amount;
      
      const notificationData: CreateNotificationData = {
        user_id: alert.user_id,
        notification_type: 'budget',
        event_type: 'budget_exceeded',
        template_data: {
          budget_name: alert.budget_name,
          amount_over: this.formatCurrency(amountOver, alert.currency),
          spent_amount: this.formatCurrency(alert.spent_amount, alert.currency),
          budget_amount: this.formatCurrency(alert.budget_amount, alert.currency)
        },
        priority: 'urgent',
        severity: 'error',
        is_actionable: true,
        action_url: `/budget/${alert.budget_id}`,
        action_text: 'Adjust Budget',
        related_budget_id: alert.budget_id,
        metadata: {
          budget_amount: alert.budget_amount,
          spent_amount: alert.spent_amount,
          amount_over: amountOver,
          percentage_used: alert.percentage_used
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Budget exceeded alert sent for budget: ${alert.budget_name} (${this.formatCurrency(amountOver, alert.currency)} over)`);

    } catch (error) {
      console.error('Error triggering budget exceeded alert:', error);
      throw new NotificationError('Failed to trigger budget exceeded alert', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // BUDGET PERIOD EXPIRING NOTIFICATIONS
  // =====================================================

  /**
   * Check for budgets expiring soon and send notifications
   */
  async checkBudgetExpiringPeriods(): Promise<void> {
    try {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          id,
          user_id,
          budget_name,
          amount,
          spent,
          currency,
          period,
          end_date,
          alert_enabled
        `)
        .eq('status', 'active')
        .eq('alert_enabled', true)
        .lte('end_date', threeDaysFromNow)
        .gt('end_date', new Date().toISOString());

      if (error) {
        console.error('Error fetching expiring budgets:', error);
        throw new NotificationError('Failed to fetch expiring budgets', 'FETCH_ERROR', error);
      }

      if (!budgets || budgets.length === 0) return;

      // Send expiring notifications
      for (const budget of budgets) {
        await this.triggerBudgetExpiringNotification(budget);
      }

    } catch (error) {
      console.error('Error in checkBudgetExpiringPeriods:', error);
      throw error;
    }
  }

  /**
   * Trigger budget period expiring notification
   */
  async triggerBudgetExpiringNotification(budget: any): Promise<void> {
    try {
      const endDate = new Date(budget.end_date);
      const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      const notificationData: CreateNotificationData = {
        user_id: budget.user_id,
        notification_type: 'budget',
        event_type: 'budget_period_expiring',
        template_data: {
          budget_name: budget.budget_name,
          days_left: daysLeft,
          end_date: endDate.toLocaleDateString(),
          spent_amount: this.formatCurrency(budget.spent, budget.currency),
          budget_amount: this.formatCurrency(budget.amount, budget.currency)
        },
        priority: 'medium',
        severity: 'warning',
        is_actionable: true,
        action_url: `/budget/${budget.id}`,
        action_text: 'Review Budget',
        related_budget_id: budget.id,
        metadata: {
          days_left: daysLeft,
          end_date: budget.end_date,
          budget_amount: budget.amount,
          spent_amount: budget.spent
        },
        expires_in_hours: 24 // 1 day
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Budget expiring notification sent for budget: ${budget.budget_name} (${daysLeft} days left)`);

    } catch (error) {
      console.error('Error triggering budget expiring notification:', error);
      throw new NotificationError('Failed to trigger budget expiring notification', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // MONTHLY BUDGET SUMMARY
  // =====================================================

  /**
   * Generate and send monthly budget summaries
   */
  async generateMonthlySummaries(): Promise<void> {
    try {
      // Get all users with active budgets
      const { data: users, error } = await supabase
        .from('budgets')
        .select('user_id')
        .eq('status', 'active')
        .eq('alert_enabled', true);

      if (error) {
        console.error('Error fetching users for monthly summary:', error);
        throw new NotificationError('Failed to fetch users', 'FETCH_ERROR', error);
      }

      if (!users || users.length === 0) return;

      // Get unique user IDs
      const uniqueUserIds = [...new Set(users.map(u => u.user_id))];

      // Generate summary for each user
      for (const userId of uniqueUserIds) {
        await this.generateUserMonthlySummary(userId);
      }

    } catch (error) {
      console.error('Error in generateMonthlySummaries:', error);
      throw error;
    }
  }

  /**
   * Generate monthly summary for a specific user
   */
  async generateUserMonthlySummary(userId: string): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          id,
          budget_name,
          amount,
          spent,
          currency,
          period,
          status
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .like('start_date', `${currentMonth}%`);

      if (error) {
        console.error('Error fetching user budgets for summary:', error);
        return;
      }

      if (!budgets || budgets.length === 0) return;

      // Calculate summary statistics
      const summary = this.calculateBudgetSummary(budgets, userId, currentMonth);
      
      await this.triggerMonthlySummaryNotification(summary);

    } catch (error) {
      console.error('Error generating user monthly summary:', error);
    }
  }

  /**
   * Calculate budget summary statistics
   */
  private calculateBudgetSummary(budgets: any[], userId: string, period: string): BudgetSummary {
    const totalBudgets = budgets.length;
    const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const budgetsExceeded = budgets.filter(b => b.spent > b.amount).length;
    const budgetsOnTrack = totalBudgets - budgetsExceeded;
    const currency = budgets[0]?.currency || 'USD';

    return {
      user_id: userId,
      period,
      total_budgets: totalBudgets,
      total_budget_amount: totalBudgetAmount,
      total_spent: totalSpent,
      budgets_exceeded: budgetsExceeded,
      budgets_on_track: budgetsOnTrack,
      currency
    };
  }

  /**
   * Trigger monthly summary notification
   */
  async triggerMonthlySummaryNotification(summary: BudgetSummary): Promise<void> {
    try {
      const monthName = new Date(summary.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const spendingPercentage = summary.total_budget_amount > 0 ? 
        Math.round((summary.total_spent / summary.total_budget_amount) * 100) : 0;

      const notificationData: CreateNotificationData = {
        user_id: summary.user_id,
        notification_type: 'budget',
        event_type: 'budget_monthly_summary',
        template_data: {
          month: monthName,
          total_budgets: summary.total_budgets,
          total_spent: this.formatCurrency(summary.total_spent, summary.currency),
          total_budget: this.formatCurrency(summary.total_budget_amount, summary.currency),
          budgets_exceeded: summary.budgets_exceeded,
          budgets_on_track: summary.budgets_on_track,
          spending_percentage: spendingPercentage
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        related_budget_id: undefined,
        metadata: {
          period: summary.period,
          summary: summary
        },
        expires_in_hours: 168 // 7 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Monthly budget summary sent for user: ${summary.user_id} (${monthName})`);

    } catch (error) {
      console.error('Error triggering monthly summary notification:', error);
      throw new NotificationError('Failed to trigger monthly summary notification', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // TRANSACTION-TRIGGERED BUDGET CHECKS
  // =====================================================

  /**
   * Handle budget notifications when a transaction affects a budget
   */
  async handleTransactionBudgetUpdate(transactionData: {
    user_id: string;
    amount: number;
    category_id?: string;
    account_id: string;
    transaction_date: string;
  }): Promise<void> {
    try {
      // Find budgets that might be affected by this transaction
      const { data: affectedBudgets, error } = await supabase
        .from('budgets')
        .select(`
          id,
          user_id,
          budget_name,
          amount,
          spent,
          currency,
          period,
          end_date,
          alert_threshold,
          alert_enabled
        `)
        .eq('user_id', transactionData.user_id)
        .eq('status', 'active')
        .eq('alert_enabled', true)
        .or(`category_id.eq.${transactionData.category_id},category_id.is.null`);

      if (error) {
        console.error('Error fetching affected budgets:', error);
        return;
      }

      if (!affectedBudgets || affectedBudgets.length === 0) return;

      // Check each affected budget for threshold breaches
      for (const budget of affectedBudgets) {
        await this.checkSingleBudgetThreshold(budget);
        await this.checkSingleBudgetExceeded(budget);
      }

    } catch (error) {
      console.error('Error in handleTransactionBudgetUpdate:', error);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number, currency: string = 'PHP'): string {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `₱${amount.toFixed(2)}`;
    }
  }

  /**
   * Check if user has budget notification preferences enabled
   */
  async checkUserBudgetNotificationPreferences(userId: string, eventType: string): Promise<boolean> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      switch (eventType) {
        case 'budget_threshold_warning':
          return preferences.budget_threshold_warnings;
        case 'budget_exceeded':
          return preferences.budget_exceeded_alerts;
        case 'budget_period_expiring':
          return preferences.budget_period_expiring;
        case 'budget_monthly_summary':
          return preferences.budget_monthly_summaries;
        default:
          return true; // Default to enabled for unknown event types
      }
    } catch (error) {
      console.error('Error checking user notification preferences:', error);
      return true; // Default to enabled if preferences can't be fetched
    }
  }

  /**
   * Cleanup old budget notifications
   */
  async cleanupOldBudgetNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: deletedNotifications, error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_type', 'budget')
        .lt('created_at', cutoffDate)
        .eq('is_read', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up old budget notifications:', error);
        return 0;
      }

      const deletedCount = deletedNotifications?.length || 0;
      console.log(`Cleaned up ${deletedCount} old budget notifications`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error in cleanupOldBudgetNotifications:', error);
      return 0;
    }
  }
}

// Export singleton instance
export default BudgetNotificationService.getInstance();