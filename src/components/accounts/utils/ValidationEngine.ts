import { AccountFormData, CashInFormData, ValidationErrors, AccountSetupError, AccountType } from '../types/AccountSetupTypes';

/**
 * Validation Engine for Account Setup Modal
 * Provides comprehensive validation for account creation and cash-in operations
 */
export class ValidationEngine {
  
  /**
   * Validate account form data
   */
  static validateAccountData(accountData: AccountFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    // Account name validation
    if (!accountData.account_name?.trim()) {
      errors.account_name = 'Account name is required';
    } else if (accountData.account_name.trim().length < 2) {
      errors.account_name = 'Account name must be at least 2 characters long';
    } else if (accountData.account_name.trim().length > 50) {
      errors.account_name = 'Account name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z0-9\s\-_'.()]+$/.test(accountData.account_name.trim())) {
      errors.account_name = 'Account name contains invalid characters';
    }

    // Account type validation
    if (!accountData.account_type) {
      errors.account_type = 'Please select an account type';
    }

    // Initial balance validation
    if (accountData.initial_balance === null || accountData.initial_balance === undefined) {
      errors.initial_balance = 'Initial balance is required';
    } else if (isNaN(accountData.initial_balance)) {
      errors.initial_balance = 'Please enter a valid amount';
    } else {
      // Credit account specific validation
      if (accountData.account_type === 'credit' && accountData.initial_balance > 0) {
        errors.initial_balance = 'Credit card balance should be zero or negative (representing debt)';
      }
      
      // General balance limits
      if (accountData.initial_balance < -999999999.99) {
        errors.initial_balance = 'Balance cannot be less than -₱999,999,999.99';
      } else if (accountData.initial_balance > 999999999.99) {
        errors.initial_balance = 'Balance cannot exceed ₱999,999,999.99';
      }
    }

    // Institution name validation (optional)
    if (accountData.institution_name && accountData.institution_name.length > 100) {
      errors.institution_name = 'Institution name cannot exceed 100 characters';
    }

    // Description validation (optional)
    if (accountData.description && accountData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    return errors;
  }

  /**
   * Validate cash-in form data
   */
  static validateCashInData(cashInData: CashInFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    // Amount validation
    if (cashInData.amount === null || cashInData.amount === undefined) {
      errors.cash_in_amount = 'Cash-in amount is required';
    } else if (isNaN(cashInData.amount)) {
      errors.cash_in_amount = 'Please enter a valid amount';
    } else if (cashInData.amount <= 0) {
      errors.cash_in_amount = 'Cash-in amount must be greater than zero';
    } else if (cashInData.amount < 0.01) {
      errors.cash_in_amount = 'Minimum cash-in amount is ₱0.01';
    } else if (cashInData.amount > 999999999.99) {
      errors.cash_in_amount = 'Cash-in amount cannot exceed ₱999,999,999.99';
    }

    // Description validation
    if (!cashInData.description?.trim()) {
      errors.cash_in_description = 'Description is required for cash-in transactions';
    } else if (cashInData.description.trim().length < 3) {
      errors.cash_in_description = 'Description must be at least 3 characters long';
    } else if (cashInData.description.trim().length > 200) {
      errors.cash_in_description = 'Description cannot exceed 200 characters';
    }

    // Date validation
    if (!cashInData.date) {
      errors.cash_in_date = 'Date is required';
    } else {
      const selectedDate = new Date(cashInData.date);
      const today = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days in future

      if (selectedDate > futureLimit) {
        errors.cash_in_date = 'Date cannot be more than 7 days in the future';
      }

      const pastLimit = new Date();
      pastLimit.setFullYear(today.getFullYear() - 10); // Allow up to 10 years in past

      if (selectedDate < pastLimit) {
        errors.cash_in_date = 'Date cannot be more than 10 years in the past';
      }
    }

    // Source validation (optional)
    if (cashInData.source && cashInData.source.length > 100) {
      errors.cash_in_source = 'Source cannot exceed 100 characters';
    }

    // Budget allocation validation (optional)
    if (cashInData.budget_allocation && cashInData.budget_allocation.length > 0) {
      let totalAllocated = 0;
      for (const allocation of cashInData.budget_allocation) {
        if (!allocation.category_name?.trim()) {
          errors.budget_allocation = 'All budget categories must have names';
          break;
        }
        if (!allocation.allocated_amount || allocation.allocated_amount <= 0) {
          errors.budget_allocation = 'All budget allocations must have positive amounts';
          break;
        }
        totalAllocated += allocation.allocated_amount;
      }

      if (totalAllocated > cashInData.amount) {
        errors.budget_allocation = 'Total budget allocation cannot exceed cash-in amount';
      }
    }

    return errors;
  }

  /**
   * Check if validation errors object has any errors
   */
  static hasValidationErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).some(key => errors[key] !== undefined && errors[key] !== '');
  }

  /**
   * Get account type specific validation rules
   */
  static getAccountTypeRules(accountType: AccountType): {
    balanceRules: string;
    description: string;
    recommendations: string[];
  } {
    switch (accountType) {
      case 'checking':
        return {
          balanceRules: 'Can have positive, negative, or zero balance',
          description: 'For daily transactions and bill payments',
          recommendations: [
            'Maintain enough balance for monthly expenses',
            'Consider setting up automatic bill payments',
            'Monitor for overdraft fees'
          ]
        };

      case 'savings':
        return {
          balanceRules: 'Should typically have positive balance',
          description: 'For saving money and earning interest',
          recommendations: [
            'Set aside emergency funds (3-6 months expenses)',
            'Look for high-yield savings options',
            'Set specific savings goals'
          ]
        };

      case 'credit':
        return {
          balanceRules: 'Balance should be zero or negative (representing debt)',
          description: 'For credit purchases and building credit history',
          recommendations: [
            'Pay full balance monthly to avoid interest',
            'Keep utilization below 30%',
            'Never exceed credit limit'
          ]
        };

      case 'investment':
        return {
          balanceRules: 'Can have positive balance and fluctuating value',
          description: 'For stocks, bonds, and other investments',
          recommendations: [
            'Diversify your investment portfolio',
            'Consider long-term investment strategy',
            'Regular monitoring and rebalancing'
          ]
        };

      case 'cash':
        return {
          balanceRules: 'Should have positive balance',
          description: 'For cash on hand and petty expenses',
          recommendations: [
            'Keep reasonable amount for emergencies',
            'Track cash expenses carefully',
            'Consider digital payment alternatives'
          ]
        };

      case 'other':
        return {
          balanceRules: 'Balance rules depend on account purpose',
          description: 'For specialized accounts not covered by other types',
          recommendations: [
            'Clearly define the account purpose',
            'Set appropriate tracking and monitoring',
            'Regular review of account performance'
          ]
        };

      default:
        return {
          balanceRules: 'Please select a valid account type',
          description: '',
          recommendations: []
        };
    }
  }

  /**
   * Sanitize account name - remove dangerous characters and trim
   */
  static sanitizeAccountName(name: string): string {
    return name
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 50); // Limit length
  }

  /**
   * Round amount to centavo (2 decimal places)
   */
  static roundToCentavo(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  /**
   * Creates specific error for account setup operations
   */
  static createAccountSetupError(
    errorType: 'validation' | 'network' | 'permission' | 'bank_connection' | 'duplicate_account' | 'system_error',
    message: string,
    details?: string,
    fieldErrors?: Record<string, string>
  ): AccountSetupError {
    switch (errorType) {
      case 'validation':
        return {
          type: 'validation',
          title: 'Account Setup - Validation Error',
          message,
          details,
          fieldErrors,
          suggestedActions: [
            'Check that all required fields are filled correctly',
            'Ensure account name is unique and follows naming rules',
            'Verify amount formats and limits'
          ],
          isRetryable: true
        };
      
      case 'duplicate_account':
        return {
          type: 'duplicate_account',
          title: 'Account Setup - Duplicate Account',
          message,
          details,
          suggestedActions: [
            'Choose a different account name',
            'Check if you already have this account',
            'Consider updating existing account instead'
          ],
          isRetryable: true
        };
      
      case 'bank_connection':
        return {
          type: 'bank_connection',
          title: 'Account Setup - Bank Connection Error',
          message,
          details,
          suggestedActions: [
            'Check your internet connection',
            'Verify bank institution details',
            'Try again later or contact bank support'
          ],
          isRetryable: true
        };
      
      case 'permission':
        return {
          type: 'permission',
          title: 'Account Setup - Permission Denied',
          message,
          details,
          suggestedActions: [
            'Check your account permissions',
            'Contact system administrator',
            'Verify your user role allows account creation'
          ],
          isRetryable: false
        };
      
      case 'network':
        return {
          type: 'network',
          title: 'Account Setup - Connection Error',
          message,
          details,
          suggestedActions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Refresh the page if the problem persists'
          ],
          isRetryable: true
        };
      
      case 'system_error':
      default:
        return {
          type: 'system_error',
          title: 'Account Setup - System Error',
          message,
          details,
          suggestedActions: [
            'Try refreshing the page',
            'Clear browser cache and try again',
            'Contact support if the problem persists'
          ],
          isRetryable: true
        };
    }
  }

  /**
   * Enhanced validation with detailed error creation for account data
   */
  static validateAccountDataWithDetails(
    accountData: AccountFormData,
    existingAccounts: string[] = []
  ): { isValid: boolean; error?: AccountSetupError } {
    const errors = this.validateAccountData(accountData);
    
    // Check for duplicate account names
    if (accountData.account_name && existingAccounts.includes(accountData.account_name.trim())) {
      return {
        isValid: false,
        error: this.createAccountSetupError(
          'duplicate_account',
          'An account with this name already exists',
          `Account name "${accountData.account_name}" is already in use`,
          { account_name: 'This account name is already taken' }
        )
      };
    }

    if (this.hasValidationErrors(errors)) {
      const firstError = Object.values(errors).find(error => error !== undefined);
      // Filter out undefined values for fieldErrors
      const fieldErrors: Record<string, string> = {};
      Object.entries(errors).forEach(([key, value]) => {
        if (value !== undefined) {
          fieldErrors[key] = value;
        }
      });
      
      return {
        isValid: false,
        error: this.createAccountSetupError(
          'validation',
          firstError || 'Please correct the form errors',
          'Please review all fields and correct any errors',
          fieldErrors
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Enhanced validation with detailed error creation for cash-in data
   */
  static validateCashInDataWithDetails(
    cashInData: CashInFormData
  ): { isValid: boolean; error?: AccountSetupError } {
    const errors = this.validateCashInData(cashInData);

    if (this.hasValidationErrors(errors)) {
      const firstError = Object.values(errors).find(error => error !== undefined);
      // Filter out undefined values for fieldErrors
      const fieldErrors: Record<string, string> = {};
      Object.entries(errors).forEach(([key, value]) => {
        if (value !== undefined) {
          fieldErrors[key] = value;
        }
      });
      
      return {
        isValid: false,
        error: this.createAccountSetupError(
          'validation',
          firstError || 'Please correct the cash-in form errors',
          'Please review all cash-in fields and correct any errors',
          fieldErrors
        )
      };
    }

    return { isValid: true };
  }
}
