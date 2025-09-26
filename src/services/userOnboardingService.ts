import { DefaultConfigurationService } from './database/defaultConfigurationService';
import { supabase } from '../utils/supabaseClient';

/**
 * User Onboarding Service
 * 
 * Handles user onboarding flow including default configuration setup
 * Replaces hardcoded defaults with service-based approach
 */
export class UserOnboardingService {
  // Simple in-memory cache to prevent concurrent onboarding calls
  private static onboardingCache = new Map<string, { timestamp: number; result: boolean }>();
  
  /**
   * Complete user onboarding setup
   * Called after user registration/authentication
   */
  static async completeUserOnboarding(userId: string): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      console.log(`Starting onboarding for user: ${userId}`);
      
      // Check if user already has complete setup
      const validation = await DefaultConfigurationService.validateUserHasDefaults(userId);
      
      if (validation.missing_defaults.length === 0) {
        console.log(`User ${userId} already has complete setup`);
        return {
          success: true,
          details: {
            message: 'User already has complete setup',
            existing_setup: true
          }
        };
      }
      
      console.log(`User ${userId} missing defaults: ${validation.missing_defaults.join(', ')}`);
      
      // Initialize user defaults
      const initResult = await DefaultConfigurationService.initializeUserDefaults(userId);
      
      if (!initResult.success) {
        console.error(`Failed to initialize defaults for user ${userId}:`, initResult.errors);
        return {
          success: false,
          error: `Failed to initialize user defaults: ${initResult.errors?.join(', ')}`,
          details: initResult
        };
      }
      
      console.log(`Successfully initialized defaults for user ${userId}`);
      console.log(`- Accounts created: ${initResult.accounts_created}`);
      console.log(`- Income categories created: ${initResult.income_categories_created}`);
      console.log(`- Expense categories created: ${initResult.expense_categories_created}`);
      
      return {
        success: true,
        details: {
          message: 'User onboarding completed successfully',
          accounts_created: initResult.accounts_created,
          income_categories_created: initResult.income_categories_created,
          expense_categories_created: initResult.expense_categories_created
        }
      };
      
    } catch (error) {
      console.error(`Error during user onboarding for ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: { originalError: error }
      };
    }
  }
  
  /**
   * Check user onboarding status
   */
  static async checkOnboardingStatus(userId: string): Promise<{
    isComplete: boolean;
    missingDefaults: string[];
    details?: any;
  }> {
    try {
      const validation = await DefaultConfigurationService.validateUserHasDefaults(userId);
      
      return {
        isComplete: validation.missing_defaults.length === 0,
        missingDefaults: validation.missing_defaults,
        details: {
          has_accounts: validation.has_accounts,
          has_income_categories: validation.has_income_categories,
          has_expense_categories: validation.has_expense_categories
        }
      };
    } catch (error) {
      console.error(`Error checking onboarding status for ${userId}:`, error);
      return {
        isComplete: false,
        missingDefaults: ['unknown'],
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  /**
   * Get user's default accounts (for display in UI)
   */
  static async getUserDefaultAccounts(userId: string) {
    try {
      return await DefaultConfigurationService.getUserDefaultAccounts(userId);
    } catch (error) {
      console.error(`Error fetching user default accounts for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get user's default income categories (for display in UI)
   */
  static async getUserDefaultIncomeCategories(userId: string) {
    try {
      return await DefaultConfigurationService.getUserDefaultIncomeCategories(userId);
    } catch (error) {
      console.error(`Error fetching user default income categories for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get user's default expense categories (for display in UI)
   */
  static async getUserDefaultExpenseCategories(userId: string) {
    try {
      return await DefaultConfigurationService.getUserDefaultExpenseCategories(userId);
    } catch (error) {
      console.error(`Error fetching user default expense categories for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Reset user's default configurations
   * Use with caution - this will remove all default accounts and categories
   */
  static async resetUserDefaults(userId: string): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      console.log(`Resetting defaults for user: ${userId}`);
      
      const resetResult = await DefaultConfigurationService.resetUserDefaults(userId);
      
      if (!resetResult.success) {
        console.error(`Failed to reset defaults for user ${userId}:`, resetResult.errors);
        return {
          success: false,
          error: `Failed to reset user defaults: ${resetResult.errors?.join(', ')}`,
          details: resetResult
        };
      }
      
      console.log(`Successfully reset defaults for user ${userId}`);
      console.log(`- Accounts removed: ${resetResult.accounts_removed}`);
      console.log(`- Income categories removed: ${resetResult.income_categories_removed}`);
      console.log(`- Expense categories removed: ${resetResult.expense_categories_removed}`);
      
      return {
        success: true,
        details: {
          message: 'User defaults reset successfully',
          accounts_removed: resetResult.accounts_removed,
          income_categories_removed: resetResult.income_categories_removed,
          expense_categories_removed: resetResult.expense_categories_removed
        }
      };
      
    } catch (error) {
      console.error(`Error resetting user defaults for ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: { originalError: error }
      };
    }
  }
  
  /**
   * Handle new user registration
   * Should be called from authentication flow
   */
  static async handleNewUserRegistration(userId: string, userEmail?: string): Promise<void> {
    try {
      console.log(`Handling new user registration: ${userId} (${userEmail || 'no email'})`);
      
      // Small delay to ensure user record is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Complete onboarding
      const onboardingResult = await this.completeUserOnboarding(userId);
      
      if (!onboardingResult.success) {
        // Log error but don't throw - user registration should still succeed
        console.error(`Onboarding failed for new user ${userId}:`, onboardingResult.error);
        
        // Optionally, you could send an alert or notification here
        // for manual intervention
      } else {
        console.log(`New user ${userId} onboarding completed successfully`);
      }
      
    } catch (error) {
      console.error(`Error handling new user registration for ${userId}:`, error);
      // Don't throw - we don't want to break user registration
    }
  }
  
  /**
   * Check if user needs onboarding
   * Can be called from various parts of the app to ensure user setup is complete
   * Includes race condition protection
   */
  static async ensureUserSetup(userId: string): Promise<boolean> {
    try {
      // Add a simple in-memory cache to prevent concurrent calls for the same user
      const cacheKey = `onboarding_${userId}`;
      const now = Date.now();
      
      // Check if we recently processed this user (within last 30 seconds)
      if (this.onboardingCache.has(cacheKey)) {
        const cacheEntry = this.onboardingCache.get(cacheKey)!;
        if (now - cacheEntry.timestamp < 30000) { // 30 seconds
          console.log(`Skipping ensureUserSetup for ${userId} - recently processed`);
          return cacheEntry.result;
        }
      }

      console.log(`Ensuring user setup for ${userId}...`);
      const status = await this.checkOnboardingStatus(userId);
      
      if (!status.isComplete) {
        console.log(`User ${userId} setup incomplete, running onboarding...`);
        const result = await this.completeUserOnboarding(userId);
        
        // Cache the result
        this.onboardingCache.set(cacheKey, {
          timestamp: now,
          result: result.success
        });
        
        return result.success;
      }
      
      // Cache the successful result
      this.onboardingCache.set(cacheKey, {
        timestamp: now,
        result: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error ensuring user setup for ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Get onboarding progress information
   */
  static async getOnboardingProgress(userId: string): Promise<{
    completed: boolean;
    progress: number;
    steps: {
      accounts: boolean;
      income_categories: boolean;
      expense_categories: boolean;
    };
  }> {
    try {
      const validation = await DefaultConfigurationService.validateUserHasDefaults(userId);
      
      const steps = {
        accounts: validation.has_accounts,
        income_categories: validation.has_income_categories,
        expense_categories: validation.has_expense_categories
      };
      
      const completedSteps = Object.values(steps).filter(Boolean).length;
      const totalSteps = Object.keys(steps).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      
      return {
        completed: validation.missing_defaults.length === 0,
        progress,
        steps
      };
      
    } catch (error) {
      console.error(`Error getting onboarding progress for ${userId}:`, error);
      return {
        completed: false,
        progress: 0,
        steps: {
          accounts: false,
          income_categories: false,
          expense_categories: false
        }
      };
    }
  }
}

export default UserOnboardingService;