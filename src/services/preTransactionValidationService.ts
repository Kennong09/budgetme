import { supabase } from '../lib/supabaseClient';
import { AccountService } from './database/accountService';
import { UserOnboardingService } from './userOnboardingService';
import { ValidationEngine } from '../components/budget/utils/ValidationEngine';

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
  status: string;
  is_default: boolean;
  currency: string;
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface BudgetFormData {
  budget_name: string;
  category_id: string;
  category_name: string;
  amount: number;
  period: string;
  start_date: string;
  alert_threshold: number;
}

interface TransactionFormData {
  type: string;
  amount: number;
  account_id: string;
  account_name: string;
  category_id: string;
  category_name: string;
  date: string;
  description: string;
  goal_id?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

interface AccountSetupValidation {
  hasAccounts: boolean;
  defaultAccount?: Account;
  requiresSetup: boolean;
  availableAccounts: Account[];
}

interface TransactionSuggestion {
  suggestedAmount: number;
  suggestedDescription: string;
  suggestedDate: string;
  reasoning: string;
}

/**
 * Pre-Transaction Validation Service
 * Handles comprehensive validation for budget-first workflows including account setup,
 * budget-transaction consistency, and smart default population.
 */
export class PreTransactionValidationService {
  
  /**
   * Validate account setup for the user
   */
  static async validateAccountSetup(userId: string): Promise<AccountSetupValidation> {
    try {
      // Fetch user accounts
      const accountsResult = await AccountService.fetchUserAccounts(userId);
      
      if (!accountsResult.success) {
        return {
          hasAccounts: false,
          requiresSetup: true,
          availableAccounts: []
        };
      }

      const accounts = accountsResult.data || [];
      
      // Check if user has any accounts
      if (accounts.length === 0) {
        return {
          hasAccounts: false,
          requiresSetup: true,
          availableAccounts: []
        };
      }

      // Find default account
      const defaultAccount = accounts.find(acc => acc.is_default);
      
      return {
        hasAccounts: true,
        defaultAccount,
        requiresSetup: false,
        availableAccounts: accounts
      };
    } catch (error) {
      console.error('Error validating account setup:', error);
      return {
        hasAccounts: false,
        requiresSetup: true,
        availableAccounts: []
      };
    }
  }

  /**
   * Validate budget-transaction consistency for budget-first workflow
   */
  static validateBudgetTransactionConsistency(
    budgetData: BudgetFormData,
    transactionData: TransactionFormData
  ): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Validate category consistency
    if (budgetData.category_id && transactionData.category_id) {
      if (budgetData.category_id !== transactionData.category_id) {
        errors.categoryMismatch = 'Transaction category must match budget category in budget-first workflow';
      }
    }

    // Validate transaction type alignment with budget
    if (transactionData.type !== 'expense' && transactionData.type !== 'contribution') {
      warnings.transactionType = 'Budget categories typically track expenses. Consider if this transaction type aligns with your budget goals.';
    }

    // Validate amount relationship
    if (budgetData.amount > 0 && transactionData.amount > 0) {
      if (transactionData.amount > budgetData.amount) {
        warnings.amountExceedsBudget = `Transaction amount (₱${transactionData.amount.toFixed(2)}) exceeds budget amount (₱${budgetData.amount.toFixed(2)})`;
      }
      
      // Check if transaction is a significant portion of budget
      const percentage = (transactionData.amount / budgetData.amount) * 100;
      if (percentage > 50) {
        warnings.significantBudgetUsage = `This transaction will use ${percentage.toFixed(1)}% of your budget`;
      }
    }

    // Validate date alignment with budget period
    if (budgetData.start_date && transactionData.date) {
      try {
        const budgetStartDate = new Date(budgetData.start_date + '-01');
        const transactionDate = new Date(transactionData.date);
        
        // Calculate budget end date
        const budgetEndDate = new Date(budgetStartDate);
        switch (budgetData.period) {
          case 'month':
            budgetEndDate.setMonth(budgetEndDate.getMonth() + 1);
            break;
          case 'quarter':
            budgetEndDate.setMonth(budgetEndDate.getMonth() + 3);
            break;
          case 'year':
            budgetEndDate.setFullYear(budgetEndDate.getFullYear() + 1);
            break;
        }
        
        if (transactionDate < budgetStartDate || transactionDate >= budgetEndDate) {
          errors.dateOutOfRange = `Transaction date must be within budget period (${budgetStartDate.toLocaleDateString()} - ${budgetEndDate.toLocaleDateString()})`;
        }
      } catch (error) {
        console.warn('Error validating date alignment:', error);
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate smart default suggestions for transaction form based on budget data
   */
  static generateTransactionSuggestions(budgetData: BudgetFormData): TransactionSuggestion[] {
    const suggestions: TransactionSuggestion[] = [];
    
    if (!budgetData.amount || budgetData.amount <= 0) {
      return suggestions;
    }

    // Generate amount suggestions (10%, 25%, 50% of budget)
    const percentages = [10, 25, 50];
    
    percentages.forEach(percentage => {
      const suggestedAmount = (budgetData.amount * percentage) / 100;
      
      suggestions.push({
        suggestedAmount: Math.round(suggestedAmount * 100) / 100, // Round to 2 decimal places
        suggestedDescription: `${budgetData.budget_name} - ${percentage}% usage`,
        suggestedDate: budgetData.start_date ? 
          new Date(budgetData.start_date + '-01').toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0],
        reasoning: `${percentage}% of budget amount (₱${budgetData.amount.toFixed(2)})`
      });
    });

    return suggestions;
  }

  /**
   * Auto-populate transaction form with budget data
   */
  static autoPopulateTransactionData(
    budgetData: BudgetFormData,
    defaultAccount?: Account
  ): Partial<TransactionFormData> {
    const currentDate = new Date().toISOString().split('T')[0];
    const budgetStartDate = budgetData.start_date ? 
      new Date(budgetData.start_date + '-01').toISOString().split('T')[0] : 
      currentDate;

    // Suggest 25% of budget amount as default
    const suggestedAmount = budgetData.amount > 0 ? 
      Math.round((budgetData.amount * 0.25) * 100) / 100 : 0;

    return {
      type: 'expense', // Budget categories typically track expenses
      category_id: budgetData.category_id,
      category_name: budgetData.category_name,
      amount: suggestedAmount,
      account_id: defaultAccount?.id || '',
      account_name: defaultAccount?.account_name || '',
      date: budgetStartDate,
      description: `${budgetData.budget_name} - Initial transaction`
    };
  }

  /**
   * Validate account ownership and balance for transaction
   */
  static async validateAccountForTransaction(
    accountId: string,
    userId: string,
    transactionAmount: number,
    transactionType: string
  ): Promise<ValidationResult> {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    try {
      // Validate account ownership
      const isValidAccount = await AccountService.validateAccountOwnership(accountId, userId);
      if (!isValidAccount) {
        errors.accountOwnership = 'Selected account does not belong to you or does not exist';
        return { isValid: false, errors, warnings };
      }

      // Get account details for balance validation
      const accountsResult = await AccountService.fetchUserAccounts(userId);
      if (!accountsResult.success) {
        errors.accountFetch = 'Unable to verify account details';
        return { isValid: false, errors, warnings };
      }

      const account = accountsResult.data?.find(acc => acc.id === accountId);
      if (!account) {
        errors.accountNotFound = 'Account not found';
        return { isValid: false, errors, warnings };
      }

      // Validate account status
      if (account.status !== 'active') {
        errors.accountInactive = 'Selected account is inactive';
        return { isValid: false, errors, warnings };
      }

      // Balance validation (strict for contributions, warning for other transactions)
      if (transactionType === 'contribution') {
        if (transactionAmount > account.balance) {
          errors.insufficientFunds = `Insufficient funds for goal contribution. Available: ₱${account.balance.toFixed(2)}, Required: ₱${transactionAmount.toFixed(2)}`;
        }
      } else if (transactionType === 'expense') {
        const resultingBalance = account.balance - transactionAmount;
        if (resultingBalance < 0) {
          warnings.negativeBalance = `This transaction will result in a negative balance (₱${resultingBalance.toFixed(2)})`;
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating account for transaction:', error);
      return {
        isValid: false,
        errors: { validation: 'Error validating account' },
        warnings
      };
    }
  }

  /**
   * Comprehensive validation for budget-first workflow
   */
  static async validateBudgetFirstWorkflow(
    userId: string,
    budgetData: BudgetFormData,
    transactionData: TransactionFormData
  ): Promise<{
    canProceed: boolean;
    accountSetup: AccountSetupValidation;
    budgetValidation: ValidationResult;
    transactionValidation: ValidationResult;
    consistencyValidation: ValidationResult;
    accountValidation?: ValidationResult;
    suggestions: TransactionSuggestion[];
  }> {
    // Validate account setup
    const accountSetup = await this.validateAccountSetup(userId);
    
    // Validate budget data
    const budgetErrors = ValidationEngine.validateBudgetData(budgetData);
    const budgetValidation: ValidationResult = {
      isValid: !ValidationEngine.hasValidationErrors(budgetErrors),
      errors: budgetErrors,
      warnings: {}
    };

    // Validate transaction data
    const transactionErrors = ValidationEngine.validateTransactionData(transactionData);
    const transactionValidation: ValidationResult = {
      isValid: !ValidationEngine.hasValidationErrors(transactionErrors),
      errors: transactionErrors,
      warnings: {}
    };

    // Validate budget-transaction consistency
    const consistencyValidation = this.validateBudgetTransactionConsistency(budgetData, transactionData);

    // Validate account for transaction (if account is selected)
    let accountValidation: ValidationResult | undefined;
    if (transactionData.account_id && transactionData.amount > 0) {
      accountValidation = await this.validateAccountForTransaction(
        transactionData.account_id,
        userId,
        transactionData.amount,
        transactionData.type
      );
    }

    // Generate suggestions
    const suggestions = this.generateTransactionSuggestions(budgetData);

    // Determine if user can proceed
    const canProceed = budgetValidation.isValid && 
                      transactionValidation.isValid && 
                      consistencyValidation.isValid &&
                      (!accountValidation || accountValidation.isValid) &&
                      accountSetup.hasAccounts;

    return {
      canProceed,
      accountSetup,
      budgetValidation,
      transactionValidation,
      consistencyValidation,
      accountValidation,
      suggestions
    };
  }

  /**
   * Trigger account setup for users who don't have accounts
   */
  static async triggerAccountSetup(userId: string): Promise<{
    success: boolean;
    error?: string;
    setupDetails?: any;
  }> {
    try {
      console.log(`Triggering account setup for user: ${userId}`);
      
      // Run user onboarding to ensure accounts are created
      const setupResult = await UserOnboardingService.ensureUserSetup(userId);
      
      if (!setupResult) {
        return {
          success: false,
          error: 'Failed to set up user accounts. Please try again or contact support.'
        };
      }

      // Verify accounts were created
      const accountSetup = await this.validateAccountSetup(userId);
      
      if (!accountSetup.hasAccounts) {
        return {
          success: false,
          error: 'Account setup completed but no accounts were found. Please contact support.'
        };
      }

      return {
        success: true,
        setupDetails: {
          accountsCreated: accountSetup.availableAccounts.length,
          defaultAccount: accountSetup.defaultAccount
        }
      };
    } catch (error) {
      console.error('Error triggering account setup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during account setup'
      };
    }
  }

  /**
   * Auto-correct transaction data based on budget for consistency
   */
  static autoCorrectTransactionData(
    budgetData: BudgetFormData,
    transactionData: TransactionFormData,
    defaultAccount?: Account
  ): TransactionFormData {
    const correctedData = { ...transactionData };

    // Auto-correct category to match budget
    if (budgetData.category_id && budgetData.category_id !== transactionData.category_id) {
      correctedData.category_id = budgetData.category_id;
      correctedData.category_name = budgetData.category_name;
    }

    // Auto-correct transaction type to expense for budget tracking
    if (transactionData.type !== 'expense' && transactionData.type !== 'contribution') {
      correctedData.type = 'expense';
    }

    // Auto-correct date to be within budget period
    if (budgetData.start_date) {
      try {
        const budgetStartDate = new Date(budgetData.start_date + '-01');
        const transactionDate = new Date(transactionData.date);
        
        if (transactionDate < budgetStartDate) {
          correctedData.date = budgetStartDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Error auto-correcting transaction date:', error);
      }
    }

    // Set default account if not selected
    if (!transactionData.account_id && defaultAccount) {
      correctedData.account_id = defaultAccount.id;
      correctedData.account_name = defaultAccount.account_name;
    }

    // Generate description if empty
    if (!transactionData.description.trim() && budgetData.budget_name) {
      correctedData.description = `${budgetData.budget_name} - Transaction`;
    }

    return correctedData;
  }
}