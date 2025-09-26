/**
 * Transaction Notification Service
 * 
 * Service for triggering transaction-related notifications including large transactions,
 * recurring reminders, categorization suggestions, and spending pattern alerts
 */

import { supabase } from '../../utils/supabaseClient';
import NotificationService from './notificationService';
import BudgetNotificationService from './budgetNotificationService';
import GoalNotificationService from './goalNotificationService';
import {
  CreateNotificationData,
  TransactionNotificationData,
  NotificationError
} from '../../types/notifications';

export interface TransactionData {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'contribution';
  description: string;
  transaction_date: string;
  currency: string;
  goal_id?: string;
  family_id?: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
}

export interface LargeTransactionAlert {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  account_name: string;
  category_name?: string;
  transaction_date: string;
  threshold_amount: number;
}

export interface RecurringTransactionReminder {
  user_id: string;
  recurring_pattern: string;
  expected_amount: number;
  currency: string;
  description: string;
  last_transaction_date: string;
  next_expected_date: string;
  category_name?: string;
}

export interface SpendingSummary {
  user_id: string;
  period: string; // YYYY-MM format
  total_income: number;
  total_expenses: number;
  net_amount: number;
  currency: string;
  top_categories: Array<{
    category_name: string;
    amount: number;
    percentage: number;
  }>;
  comparison_with_previous: {
    income_change: number;
    expense_change: number;
    percentage_change: number;
  };
}

/**
 * Transaction Notification Service
 * 
 * Handles all transaction-related notification triggers and events
 */
export class TransactionNotificationService {
  private static instance: TransactionNotificationService;

  // Default threshold for large transaction alerts (can be overridden by user preferences)
  private static readonly DEFAULT_LARGE_TRANSACTION_THRESHOLD = 5000.00;

  public static getInstance(): TransactionNotificationService {
    if (!TransactionNotificationService.instance) {
      TransactionNotificationService.instance = new TransactionNotificationService();
    }
    return TransactionNotificationService.instance;
  }

  // =====================================================
  // TRANSACTION CREATION HANDLERS
  // =====================================================

  /**
   * Handle new transaction creation and trigger relevant notifications
   */
  async handleTransactionCreated(transaction: TransactionData): Promise<void> {
    try {
      console.log(`Processing transaction notifications for transaction: ${transaction.id}`);

      // Check for large transaction alerts
      await this.checkLargeTransactionAlert(transaction);

      // Check for categorization suggestions
      await this.checkCategorizationSuggestion(transaction);

      // Update related budget notifications (if expense)
      if (transaction.transaction_type === 'expense') {
        await BudgetNotificationService.handleTransactionBudgetUpdate({
          user_id: transaction.user_id,
          amount: transaction.amount,
          category_id: transaction.category_id,
          account_id: transaction.account_id,
          transaction_date: transaction.transaction_date
        });
      }

      // Update related goal notifications (if contribution)
      if (transaction.transaction_type === 'contribution' && transaction.goal_id) {
        await GoalNotificationService.handleGoalContribution({
          goal_id: transaction.goal_id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          contribution_date: transaction.transaction_date,
          transaction_id: transaction.id
        });
      }

    } catch (error) {
      console.error('Error in handleTransactionCreated:', error);
    }
  }

  // =====================================================
  // LARGE TRANSACTION ALERTS
  // =====================================================

  /**
   * Check if transaction exceeds user's large transaction threshold
   */
  async checkLargeTransactionAlert(transaction: TransactionData): Promise<void> {
    try {
      // Get user's large transaction threshold
      const threshold = await this.getUserLargeTransactionThreshold(transaction.user_id);
      
      // Only check for expense and contribution transactions
      if ((transaction.transaction_type === 'expense' || transaction.transaction_type === 'contribution') &&
          transaction.amount >= threshold) {
        
        // Get additional transaction details
        const transactionDetails = await this.getTransactionDetails(transaction.id);
        
        if (transactionDetails) {
          await this.triggerLargeTransactionAlert({
            transaction_id: transaction.id,
            user_id: transaction.user_id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            account_name: transactionDetails.account_name,
            category_name: transactionDetails.category_name,
            transaction_date: transaction.transaction_date,
            threshold_amount: threshold
          });
        }
      }

    } catch (error) {
      console.error('Error in checkLargeTransactionAlert:', error);
    }
  }

  /**
   * Get user's large transaction threshold from preferences
   */
  async getUserLargeTransactionThreshold(userId: string): Promise<number> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      return preferences.large_transaction_threshold || TransactionNotificationService.DEFAULT_LARGE_TRANSACTION_THRESHOLD;
    } catch (error) {
      console.error('Error getting user large transaction threshold:', error);
      return TransactionNotificationService.DEFAULT_LARGE_TRANSACTION_THRESHOLD;
    }
  }

  /**
   * Get additional transaction details for notifications
   */
  async getTransactionDetails(transactionId: string): Promise<{
    account_name: string;
    category_name?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          accounts!inner(account_name),
          expense_categories(category_name),
          income_categories(category_name)
        `)
        .eq('id', transactionId)
        .single();

      if (error) {
        console.error('Error fetching transaction details:', error);
        return null;
      }

      return {
        account_name: data.accounts?.account_name || 'Unknown Account',
        category_name: data.expense_categories?.category_name || data.income_categories?.category_name
      };
    } catch (error) {
      console.error('Error in getTransactionDetails:', error);
      return null;
    }
  }

  /**
   * Trigger large transaction alert notification
   */
  async triggerLargeTransactionAlert(alert: LargeTransactionAlert): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: alert.user_id,
        notification_type: 'transaction',
        event_type: 'large_transaction_alert',
        template_data: {
          amount: this.formatCurrency(alert.amount, alert.currency),
          description: alert.description,
          account_name: alert.account_name,
          category_name: alert.category_name || 'Uncategorized',
          transaction_date: new Date(alert.transaction_date).toLocaleDateString(),
          threshold_amount: this.formatCurrency(alert.threshold_amount, alert.currency)
        },
        priority: 'medium',
        severity: 'warning',
        is_actionable: !alert.category_name, // Actionable if uncategorized
        action_url: alert.category_name ? undefined : `/transactions/${alert.transaction_id}/categorize`,
        action_text: alert.category_name ? undefined : 'Categorize Transaction',
        related_transaction_id: alert.transaction_id,
        metadata: {
          amount: alert.amount,
          threshold_amount: alert.threshold_amount,
          account_name: alert.account_name,
          category_name: alert.category_name,
          needs_categorization: !alert.category_name
        },
        expires_in_hours: 72 // 3 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Large transaction alert sent: ${alert.description} - ${this.formatCurrency(alert.amount, alert.currency)}`);

    } catch (error) {
      console.error('Error triggering large transaction alert:', error);
      throw new NotificationError('Failed to trigger large transaction alert', 'NOTIFICATION_ERROR', error);
    }
  }

  // =====================================================
  // CATEGORIZATION SUGGESTIONS
  // =====================================================

  /**
   * Check if transaction needs categorization suggestion
   */
  async checkCategorizationSuggestion(transaction: TransactionData): Promise<void> {
    try {
      // Only suggest categorization for uncategorized transactions
      if (transaction.category_id) return;

      // Find similar transactions for suggestion
      const suggestion = await this.findCategorizationSuggestion(transaction);
      
      if (suggestion) {
        await this.triggerCategorizationSuggestionNotification({
          transaction_id: transaction.id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          transaction_date: transaction.transaction_date,
          suggested_category: suggestion.category_name,
          confidence_score: suggestion.confidence
        });
      }

    } catch (error) {
      console.error('Error in checkCategorizationSuggestion:', error);
    }
  }

  /**
   * Find categorization suggestion based on similar transactions
   */
  async findCategorizationSuggestion(transaction: TransactionData): Promise<{
    category_name: string;
    category_id: string;
    confidence: number;
  } | null> {
    try {
      // Look for similar transactions by description pattern
      const descriptionWords = transaction.description.toLowerCase().split(/\s+/);
      const searchPattern = descriptionWords.slice(0, 3).join(' '); // Use first 3 words

      const { data: similarTransactions, error } = await supabase
        .from('transactions')
        .select(`
          category_id,
          expense_categories(id, category_name),
          income_categories(id, category_name)
        `)
        .eq('user_id', transaction.user_id)
        .eq('transaction_type', transaction.transaction_type)
        .not('category_id', 'is', null)
        .ilike('description', `%${searchPattern}%`)
        .limit(10);

      if (error || !similarTransactions || similarTransactions.length === 0) {
        return null;
      }

      // Count category occurrences
      const categoryCount: Record<string, { count: number; category_name: string; category_id: string }> = {};
      
      similarTransactions.forEach(t => {
        const category = t.expense_categories || t.income_categories;
        if (category) {
          const key = category.id;
          if (categoryCount[key]) {
            categoryCount[key].count++;
          } else {
            categoryCount[key] = {
              count: 1,
              category_name: category.category_name,
              category_id: category.id
            };
          }
        }
      });

      // Find most common category
      const mostCommon = Object.values(categoryCount)
        .sort((a, b) => b.count - a.count)[0];

      if (mostCommon && mostCommon.count >= 2) { // At least 2 similar transactions
        const confidence = Math.min(mostCommon.count / similarTransactions.length, 1.0);
        return {
          category_name: mostCommon.category_name,
          category_id: mostCommon.category_id,
          confidence: confidence
        };
      }

      return null;
    } catch (error) {
      console.error('Error in findCategorizationSuggestion:', error);
      return null;
    }
  }

  /**
   * Trigger categorization suggestion notification
   */
  async triggerCategorizationSuggestionNotification(data: {
    transaction_id: string;
    user_id: string;
    amount: number;
    currency: string;
    description: string;
    transaction_date: string;
    suggested_category: string;
    confidence_score: number;
  }): Promise<void> {
    try {
      const notificationData: CreateNotificationData = {
        user_id: data.user_id,
        notification_type: 'transaction',
        event_type: 'transaction_categorization_suggestion',
        template_data: {
          description: data.description,
          amount: this.formatCurrency(data.amount, data.currency),
          suggested_category: data.suggested_category,
          confidence_percentage: Math.round(data.confidence_score * 100),
          transaction_date: new Date(data.transaction_date).toLocaleDateString()
        },
        priority: 'low',
        severity: 'info',
        is_actionable: true,
        action_url: `/transactions/${data.transaction_id}/categorize`,
        action_text: 'Categorize',
        related_transaction_id: data.transaction_id,
        metadata: {
          suggested_category: data.suggested_category,
          confidence_score: data.confidence_score,
          amount: data.amount
        },
        expires_in_hours: 48 // 2 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Categorization suggestion sent: ${data.description} -> ${data.suggested_category}`);

    } catch (error) {
      console.error('Error triggering categorization suggestion notification:', error);
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
   * Check if user has transaction notification preferences enabled
   */
  async checkUserTransactionNotificationPreferences(userId: string, eventType: string): Promise<boolean> {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      switch (eventType) {
        case 'large_transaction_alert':
          return preferences.large_transaction_alerts;
        case 'recurring_transaction_reminder':
          return preferences.recurring_transaction_reminders;
        case 'transaction_categorization_suggestion':
          return preferences.categorization_suggestions;
        case 'monthly_spending_summary':
          return preferences.monthly_spending_summaries;
        default:
          return true; // Default to enabled for unknown event types
      }
    } catch (error) {
      console.error('Error checking user transaction notification preferences:', error);
      return true; // Default to enabled if preferences can't be fetched
    }
  }

  /**
   * Cleanup old transaction notifications
   */
  async cleanupOldTransactionNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: deletedNotifications, error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_type', 'transaction')
        .lt('created_at', cutoffDate)
        .eq('is_read', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up old transaction notifications:', error);
        return 0;
      }

      const deletedCount = deletedNotifications?.length || 0;
      console.log(`Cleaned up ${deletedCount} old transaction notifications`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error in cleanupOldTransactionNotifications:', error);
      return 0;
    }
  }

  /**
   * Generate monthly spending summaries for users
   */
  async generateMonthlySpendingSummaries(): Promise<void> {
    try {
      // Get users who have monthly spending summaries enabled
      const { data: users, error } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('monthly_spending_summaries', true);

      if (error || !users || users.length === 0) return;

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Generate summary for each user
      for (const user of users) {
        await this.generateUserMonthlySpendingSummary(user.user_id, currentMonth);
      }

    } catch (error) {
      console.error('Error in generateMonthlySpendingSummaries:', error);
    }
  }

  /**
   * Generate monthly spending summary for a specific user
   */
  async generateUserMonthlySpendingSummary(userId: string, period: string): Promise<void> {
    try {
      const summary = await this.calculateMonthlySpendingSummary(userId, period);
      
      if (summary) {
        await this.triggerMonthlySpendingSummaryNotification(summary);
      }

    } catch (error) {
      console.error('Error in generateUserMonthlySpendingSummary:', error);
    }
  }

  /**
   * Calculate monthly spending summary statistics
   */
  async calculateMonthlySpendingSummary(userId: string, period: string): Promise<SpendingSummary | null> {
    try {
      const startDate = `${period}-01`;
      const endDate = `${period}-31`; // Will be adjusted automatically by SQL

      // Get current month transactions
      const { data: currentTransactions, error: currentError } = await supabase
        .from('transactions')
        .select(`
          amount,
          transaction_type,
          expense_categories(category_name),
          income_categories(category_name)
        `)
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (currentError || !currentTransactions) return null;

      // Calculate current month totals
      const totalIncome = currentTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = currentTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netAmount = totalIncome - totalExpenses;
      const currency = 'PHP';

      // Calculate top categories
      const categoryTotals: Record<string, number> = {};
      currentTransactions
        .filter(t => t.transaction_type === 'expense')
        .forEach(t => {
          const categoryName = t.expense_categories?.category_name || 'Uncategorized';
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount;
        });

      const topCategories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          category_name: name,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        user_id: userId,
        period,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_amount: netAmount,
        currency,
        top_categories: topCategories,
        comparison_with_previous: {
          income_change: 0,
          expense_change: 0,
          percentage_change: 0
        }
      };

    } catch (error) {
      console.error('Error in calculateMonthlySpendingSummary:', error);
      return null;
    }
  }

  /**
   * Trigger monthly spending summary notification
   */
  async triggerMonthlySpendingSummaryNotification(summary: SpendingSummary): Promise<void> {
    try {
      const monthName = new Date(summary.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const savingsRate = summary.total_income > 0 ? ((summary.net_amount / summary.total_income) * 100) : 0;
      const topCategory = summary.top_categories[0];

      const notificationData: CreateNotificationData = {
        user_id: summary.user_id,
        notification_type: 'transaction',
        event_type: 'monthly_spending_summary',
        template_data: {
          month: monthName,
          total_income: this.formatCurrency(summary.total_income, summary.currency),
          total_expenses: this.formatCurrency(summary.total_expenses, summary.currency),
          net_amount: this.formatCurrency(summary.net_amount, summary.currency),
          savings_rate: Math.round(savingsRate),
          top_category: topCategory?.category_name || 'None',
          top_category_amount: topCategory ? this.formatCurrency(topCategory.amount, summary.currency) : '₱0'
        },
        priority: 'low',
        severity: 'info',
        is_actionable: false,
        metadata: {
          period: summary.period,
          total_income: summary.total_income,
          total_expenses: summary.total_expenses,
          savings_rate: savingsRate,
          top_categories: summary.top_categories
        },
        expires_in_hours: 168 // 7 days
      };

      await NotificationService.createNotification(notificationData);
      
      console.log(`Monthly spending summary sent for user: ${summary.user_id} (${monthName})`);

    } catch (error) {
      console.error('Error triggering monthly spending summary notification:', error);
    }
  }
}

// Export singleton instance
export default TransactionNotificationService.getInstance();