// ValidationEngine utility for BudgetSetup components following the comprehensive plan
import { BudgetFormData, TransactionFormData, ValidationErrors } from '../types/BudgetSetupTypes';

export class ValidationEngine {
  /**
   * Validate budget data according to plan specifications
   */
  static validateBudgetData(budgetData: BudgetFormData): ValidationErrors {
    const errors: ValidationErrors = {};
    
    // Budget name validation
    if (!budgetData.budget_name.trim()) {
      errors.budgetName = 'Budget name is required';
    } else if (budgetData.budget_name.includes('%') || budgetData.budget_name.includes('{')) {
      errors.budgetName = 'Budget name cannot contain format characters';
    }

    // Amount validation (₱0.01 - ₱99,999,999,999.99)
    if (budgetData.amount <= 0) {
      errors.budgetAmount = 'Budget amount must be greater than ₱0.01';
    } else if (budgetData.amount > 99999999999.99) {
      errors.budgetAmount = 'Budget amount cannot exceed ₱99,999,999,999.99';
    }

    // Category validation
    if (!budgetData.category_id) {
      errors.budgetCategory = 'Category is required';
    }

    // Period validation
    if (!budgetData.period) {
      errors.budgetPeriod = 'Budget period is required';
    }

    // Start date validation
    if (!budgetData.start_date || !budgetData.start_date.trim()) {
      errors.budgetStartDate = 'Start date is required';
    } else {
      // Handle both "YYYY-MM" and text formats like "September 2025"
      let startDate: Date;
      if (budgetData.start_date.includes('-')) {
        // Format: "2025-09"
        startDate = new Date(budgetData.start_date + '-01');
      } else {
        // Try to parse text format like "September 2025"
        startDate = new Date(budgetData.start_date + ' 01');
      }
      
      // Only validate if we have a valid date
      if (!isNaN(startDate.getTime())) {
        const currentDate = new Date();
        currentDate.setDate(1); // First day of current month
        if (startDate < currentDate) {
          errors.budgetStartDate = 'Start date cannot be in the past';
        }
      } else {
        // If start_date is provided but invalid format
        errors.budgetStartDate = 'Please select a valid start date';
      }
    }

    // Alert threshold validation (0.1 to 1.0)
    if (budgetData.alert_threshold < 0.1 || budgetData.alert_threshold > 1.0) {
      errors.budgetAmount = 'Alert threshold must be between 10% and 100%';
    }

    return errors;
  }

  /**
   * Validate transaction data according to plan specifications
   */
  static validateTransactionData(transactionData: TransactionFormData): ValidationErrors {
    const errors: ValidationErrors = {};
    
    // Transaction type validation
    if (!transactionData.type) {
      errors.transactionType = 'Transaction type is required';
    }

    // Amount validation (₱0.01 - ₱99,999,999,999.99)
    if (transactionData.amount <= 0) {
      errors.transactionAmount = 'Transaction amount must be greater than ₱0.01';
    } else if (transactionData.amount > 99999999999.99) {
      errors.transactionAmount = 'Transaction amount cannot exceed ₱99,999,999,999.99';
    }

    // Account validation
    if (!transactionData.account_id) {
      errors.transactionAccount = 'Account is required';
    }

    // Category validation - special handling for contribution type
    if (transactionData.type === 'contribution') {
      // For contribution type, category is auto-selected, so allow it to be empty temporarily
      // The UI will auto-select the "Contribution" category
      // But we require a goal for contribution transactions
      if (!transactionData.goal_id) {
        errors.transactionGoal = 'Goal is required for contribution transactions';
      }
    } else if (!transactionData.category_id) {
      errors.transactionCategory = 'Category is required';
    }

    // Date validation (cannot be in future)
    const transactionDate = new Date(transactionData.date);
    const currentDate = new Date();
    if (transactionDate > currentDate) {
      errors.transactionDate = 'Transaction date cannot be in the future';
    }

    // Description validation
    if (!transactionData.description.trim()) {
      errors.transactionDescription = 'Description is required';
    }

    return errors;
  }

  /**
   * Cross-validate budget and transaction data for budget-first workflow
   */
  static crossValidateData(budgetData: BudgetFormData, transactionData: TransactionFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    // If transaction amount is provided, validate against budget
    if (transactionData.amount > 0 && budgetData.amount > 0) {
      // Warning if transaction exceeds budget (not an error, just a warning)
      if (transactionData.amount > budgetData.amount) {
        // This is handled in the UI as a warning, not a validation error
      }

      // Ensure transaction category matches budget category for budget-first workflow
      if (budgetData.category_id && transactionData.category_id && 
          budgetData.category_id !== transactionData.category_id) {
        errors.transactionCategory = 'Transaction category must match budget category';
      }

      // Ensure transaction date is within budget period
      if (budgetData.start_date && transactionData.date) {
        const budgetStartDate = new Date(budgetData.start_date + '-01');
        const transactionDate = new Date(transactionData.date);
        
        // Calculate budget end date based on period
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
          errors.transactionDate = `Transaction date must be within budget period (${budgetStartDate.toLocaleDateString()} - ${budgetEndDate.toLocaleDateString()})`;
        }
      }
    }

    return errors;
  }

  /**
   * Generate comprehensive validation results for all data
   */
  static generateValidationErrors(
    budgetData: BudgetFormData, 
    transactionData: TransactionFormData,
    validateBudget: boolean = true,
    validateTransaction: boolean = true,
    crossValidate: boolean = false
  ): ValidationErrors {
    let allErrors: ValidationErrors = {};

    if (validateBudget) {
      const budgetErrors = this.validateBudgetData(budgetData);
      allErrors = { ...allErrors, ...budgetErrors };
    }

    if (validateTransaction) {
      const transactionErrors = this.validateTransactionData(transactionData);
      allErrors = { ...allErrors, ...transactionErrors };
    }

    if (crossValidate) {
      const crossErrors = this.crossValidateData(budgetData, transactionData);
      allErrors = { ...allErrors, ...crossErrors };
    }

    return allErrors;
  }

  /**
   * Check if validation has any errors
   */
  static hasValidationErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).length > 0;
  }

  /**
   * Get validation summary message
   */
  static getValidationSummary(errors: ValidationErrors): string {
    const errorCount = Object.keys(errors).length;
    if (errorCount === 0) {
      return 'All fields are valid';
    } else if (errorCount === 1) {
      return '1 field requires attention';
    } else {
      return `${errorCount} fields require attention`;
    }
  }

  /**
   * Enhanced validation for budget-first workflow with account validation
   */
  static validateBudgetFirstWorkflow(
    budgetData: BudgetFormData,
    transactionData: TransactionFormData,
    availableAccounts?: any[]
  ): ValidationErrors {
    let allErrors: ValidationErrors = {};

    // Validate budget data
    const budgetErrors = this.validateBudgetData(budgetData);
    allErrors = { ...allErrors, ...budgetErrors };

    // Validate transaction data if provided
    if (transactionData.amount > 0 || transactionData.description.trim()) {
      const transactionErrors = this.validateTransactionData(transactionData);
      allErrors = { ...allErrors, ...transactionErrors };

      // Cross-validate budget and transaction consistency
      const crossErrors = this.crossValidateData(budgetData, transactionData);
      allErrors = { ...allErrors, ...crossErrors };
    }

    // Validate account availability
    if (availableAccounts && availableAccounts.length === 0) {
      allErrors.accountSetup = 'No accounts available. Please set up an account first.';
    } else if (transactionData.account_id && availableAccounts) {
      const accountExists = availableAccounts.some(acc => acc.id === transactionData.account_id);
      if (!accountExists) {
        allErrors.transactionAccount = 'Selected account is not available';
      }
    }

    return allErrors;
  }

  /**
   * Enhanced validation for transaction-first workflow
   */
  static validateTransactionFirstWorkflow(
    transactionData: TransactionFormData,
    budgetData?: BudgetFormData,
    availableAccounts?: any[]
  ): ValidationErrors {
    let allErrors: ValidationErrors = {};

    // Validate transaction data
    const transactionErrors = this.validateTransactionData(transactionData);
    allErrors = { ...allErrors, ...transactionErrors };

    // Validate budget data if auto-generation is enabled
    if (budgetData && budgetData.budget_name.trim()) {
      const budgetErrors = this.validateBudgetData(budgetData);
      allErrors = { ...allErrors, ...budgetErrors };
    }

    // Validate account availability
    if (availableAccounts && availableAccounts.length === 0) {
      allErrors.accountSetup = 'No accounts available. Please set up an account first.';
    } else if (transactionData.account_id && availableAccounts) {
      const accountExists = availableAccounts.some(acc => acc.id === transactionData.account_id);
      if (!accountExists) {
        allErrors.transactionAccount = 'Selected account is not available';
      }
    }

    return allErrors;
  }

  /**
   * Validate account balance for transaction
   */
  static validateAccountBalance(
    selectedAccount: any,
    transactionAmount: number,
    transactionType: string
  ): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!selectedAccount) {
      errors.transactionAccount = 'Please select an account';
      return errors;
    }

    // Strict validation for contribution transactions
    if (transactionType === 'contribution') {
      if (transactionAmount > selectedAccount.balance) {
        errors.transactionAmount = `Insufficient funds for goal contribution. Available: ₱${selectedAccount.balance.toFixed(2)}, Required: ₱${transactionAmount.toFixed(2)}`;
      }
    }
    // Warning for regular expenses that would cause negative balance
    else if (transactionType === 'expense') {
      const resultingBalance = selectedAccount.balance - transactionAmount;
      if (resultingBalance < 0) {
        // This is handled as a warning in the UI, not a validation error
        console.log(`Warning: Transaction will result in negative balance: ₱${resultingBalance.toFixed(2)}`);
      }
    }

    return errors;
  }

  /**
   * Generate smart validation messages with suggestions
   */
  static generateValidationMessage(fieldName: string, value: any, context?: any): string {
    switch (fieldName) {
      case 'budgetAmount':
        if (value <= 0) {
          return 'Budget amount must be greater than ₱0.01';
        } else if (value > 99999999999.99) {
          return 'Budget amount cannot exceed ₱99,999,999,999.99';
        }
        break;
      
      case 'transactionAmount':
        if (value <= 0) {
          return 'Transaction amount must be greater than ₱0.01';
        } else if (context?.budgetAmount && value > context.budgetAmount) {
          return `Transaction amount (₱${value.toFixed(2)}) exceeds budget amount (₱${context.budgetAmount.toFixed(2)}). Consider adjusting the amount.`;
        }
        break;
      
      case 'categoryMismatch':
        return 'For budget-first workflow, transaction category should match the budget category to ensure proper tracking.';
      
      case 'accountSetup':
        return 'You need to set up at least one account before creating transactions. Would you like to create an account now?';
      
      default:
        return 'Please check this field and try again.';
    }
    
    return 'Please check this field and try again.';
  }
}