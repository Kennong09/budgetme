import React from 'react';

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Props {
  errors: Record<string, string>;
  warnings: Record<string, string>;
  onErrorAction?: (field: string, action: string) => void;
  showSuggestions?: boolean;
  className?: string;
}

/**
 * Enhanced Error Handling and User Feedback Component
 * Provides clear, actionable feedback for budget setup validation errors
 */
const BudgetValidationFeedback: React.FC<Props> = ({
  errors,
  warnings,
  onErrorAction,
  showSuggestions = true,
  className = ''
}) => {
  const validationErrors: ValidationError[] = [];
  
  // Process errors
  Object.entries(errors).forEach(([field, message]) => {
    const suggestion = generateSuggestion(field, message);
    const action = generateAction(field, message, onErrorAction);
    
    validationErrors.push({
      field,
      message,
      type: 'error',
      suggestion,
      action
    });
  });
  
  // Process warnings
  Object.entries(warnings).forEach(([field, message]) => {
    const suggestion = generateSuggestion(field, message);
    
    validationErrors.push({
      field,
      message,
      type: 'warning',
      suggestion
    });
  });
  
  if (validationErrors.length === 0) {
    return null;
  }
  
  const errorCount = validationErrors.filter(v => v.type === 'error').length;
  const warningCount = validationErrors.filter(v => v.type === 'warning').length;
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          Validation Summary
        </div>
        <div className="text-xs text-gray-500">
          {errorCount > 0 && (
            <span className="text-red-600">{errorCount} error(s)</span>
          )}
          {errorCount > 0 && warningCount > 0 && <span className="mx-1">•</span>}
          {warningCount > 0 && (
            <span className="text-yellow-600">{warningCount} warning(s)</span>
          )}
        </div>
      </div>
      
      {/* Validation Messages */}
      <div className="space-y-2">
        {validationErrors.map((error, index) => (
          <ValidationMessage
            key={`${error.field}-${index}`}
            error={error}
            showSuggestions={showSuggestions}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Validation Message Component
 */
const ValidationMessage: React.FC<{
  error: ValidationError;
  showSuggestions: boolean;
}> = ({ error, showSuggestions }) => {
  const getIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  const getColorClasses = (type: ValidationError['type']) => {
    switch (type) {
      case 'error':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-800',
          button: 'bg-red-100 hover:bg-red-200 text-red-700'
        };
      case 'warning':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
        };
      default:
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
        };
    }
  };
  
  const colors = getColorClasses(error.type);
  
  return (
    <div className={`border rounded-md p-3 ${colors.border} ${colors.bg}`}>
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(error.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${colors.text}`}>
            {formatFieldName(error.field)}
          </div>
          <div className={`text-sm mt-1 ${colors.text}`}>
            {error.message}
          </div>
          
          {/* Suggestion */}
          {showSuggestions && error.suggestion && (
            <div className="text-xs text-gray-600 mt-2 italic">
              💡 {error.suggestion}
            </div>
          )}
          
          {/* Action Button */}
          {error.action && (
            <div className="mt-2">
              <button
                onClick={error.action.onClick}
                className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                {error.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Generate user-friendly suggestions for validation errors
 */
function generateSuggestion(field: string, message: string): string | undefined {
  const suggestions: Record<string, string> = {
    budgetName: 'Choose a descriptive name that helps you identify this budget easily.',
    budgetAmount: 'Enter a realistic amount based on your financial goals and capacity.',
    budgetCategory: 'Select a category that best represents what this budget will track.',
    budgetStartDate: 'Choose a date from this month or next month to begin tracking.',
    transactionAmount: 'Enter the actual amount you spent or plan to spend.',
    transactionAccount: 'Select the account where this transaction will be recorded.',
    transactionCategory: 'Choose a category that matches your budget for better tracking.',
    transactionDescription: 'Add a brief description to help you remember this transaction.',
    categoryMismatch: 'For budget-first workflow, keeping categories consistent helps with accurate tracking.',
    accountSetup: 'Setting up accounts is quick and helps you track your finances properly.',
    insufficientFunds: 'Consider choosing a different account or adjusting the amount.',
    dateOutOfRange: 'Choose a date within your budget period for accurate tracking.'
  };
  
  return suggestions[field];
}

/**
 * Generate actionable buttons for validation errors
 */
function generateAction(
  field: string, 
  message: string, 
  onErrorAction?: (field: string, action: string) => void
): ValidationError['action'] | undefined {
  if (!onErrorAction) return undefined;
  
  const actions: Record<string, { label: string; action: string }> = {
    accountSetup: { label: 'Set Up Account', action: 'setup_account' },
    categoryMismatch: { label: 'Auto-Correct', action: 'auto_correct_category' },
    budgetStartDate: { label: 'Use Current Month', action: 'use_current_month' },
    transactionDate: { label: 'Use Budget Start Date', action: 'use_budget_start_date' }
  };
  
  const actionConfig = actions[field];
  if (!actionConfig) return undefined;
  
  return {
    label: actionConfig.label,
    onClick: () => onErrorAction(field, actionConfig.action)
  };
}

/**
 * Convert field names to user-friendly labels
 */
function formatFieldName(field: string): string {
  const fieldLabels: Record<string, string> = {
    budgetName: 'Budget Name',
    budgetAmount: 'Budget Amount',
    budgetCategory: 'Budget Category',
    budgetStartDate: 'Start Date',
    budgetPeriod: 'Budget Period',
    transactionAmount: 'Transaction Amount',
    transactionAccount: 'Account',
    transactionCategory: 'Category',
    transactionDescription: 'Description',
    transactionDate: 'Transaction Date',
    transactionType: 'Transaction Type',
    categoryMismatch: 'Category Consistency',
    accountSetup: 'Account Setup',
    insufficientFunds: 'Account Balance',
    dateOutOfRange: 'Date Range'
  };
  
  return fieldLabels[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

export default BudgetValidationFeedback;