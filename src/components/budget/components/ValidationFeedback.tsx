import React from 'react';
import { ValidationErrors } from '../types/BudgetSetupTypes';

interface ValidationFeedbackProps {
  validationErrors: ValidationErrors;
  showSummary?: boolean;
  showFieldErrors?: boolean;
  className?: string;
}

interface ValidationSummaryProps {
  errors: string[];
  warnings?: string[];
  suggestions?: string[];
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  warnings = [],
  suggestions = []
}) => {
  const totalIssues = errors.length + warnings.length;

  if (totalIssues === 0) {
    return (
      <div className="alert alert-success budget-fade-in">
        <div className="d-flex align-items-center">
          <i className="fas fa-check-circle mr-2 text-success"></i>
          <span>All fields are valid and ready to proceed!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-summary">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="alert alert-danger animate__animated animate__shakeX mb-3">
          <div className="d-flex align-items-start">
            <i className="fas fa-exclamation-triangle mr-2 mt-1"></i>
            <div className="flex-grow-1">
              <strong>
                {errors.length} validation error{errors.length > 1 ? 's' : ''} found:
              </strong>
              <ul className="mb-0 mt-2 pl-3">
                {errors.map((error, index) => (
                  <li key={index} className="budget-validation-error">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="alert alert-warning budget-fade-in mb-3">
          <div className="d-flex align-items-start">
            <i className="fas fa-exclamation-circle mr-2 mt-1"></i>
            <div className="flex-grow-1">
              <strong>Recommendations:</strong>
              <ul className="mb-0 mt-2 pl-3">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-warning">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="alert alert-info budget-fade-in">
          <div className="d-flex align-items-start">
            <i className="fas fa-lightbulb mr-2 mt-1"></i>
            <div className="flex-grow-1">
              <strong>Helpful Tips:</strong>
              <ul className="mb-0 mt-2 pl-3">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-info">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FieldValidationIndicatorProps {
  fieldName: string;
  error?: string;
  isValid?: boolean;
  showIcon?: boolean;
  className?: string;
}

const FieldValidationIndicator: React.FC<FieldValidationIndicatorProps> = ({
  fieldName,
  error,
  isValid,
  showIcon = true,
  className = ''
}) => {
  if (!error && isValid === undefined) return null;

  const hasError = !!error;
  const isFieldValid = !hasError && isValid;

  return (
    <div className={`field-validation ${className}`}>
      {hasError && (
        <div className="budget-validation-error d-flex align-items-center animate__animated animate__shakeX">
          {showIcon && <i className="fas fa-exclamation-circle mr-1"></i>}
          <span>{error}</span>
        </div>
      )}
      {isFieldValid && (
        <div className="budget-validation-success d-flex align-items-center budget-fade-in">
          {showIcon && <i className="fas fa-check-circle mr-1"></i>}
          <span>Valid</span>
        </div>
      )}
    </div>
  );
};

const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  validationErrors,
  showSummary = true,
  showFieldErrors = true,
  className = ''
}) => {
  // Extract error messages from validation errors object
  const errorMessages = Object.entries(validationErrors)
    .filter(([_, error]) => error)
    .map(([field, error]) => `${field}: ${error}`);

  // Generate suggestions based on common validation patterns
  const generateSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    if (validationErrors.budgetAmount) {
      suggestions.push('Set a realistic budget amount based on your spending history');
    }
    
    if (validationErrors.budgetName) {
      suggestions.push('Use descriptive names like "Monthly Groceries" or "Entertainment Budget"');
    }
    
    if (validationErrors.transactionAmount) {
      suggestions.push('Transaction amounts should be positive values');
    }
    
    if (validationErrors.budgetCategory && validationErrors.transactionCategory) {
      suggestions.push('Keep budget and transaction categories consistent for better tracking');
    }

    return suggestions;
  };

  // Generate warnings based on field combinations
  const generateWarnings = (): string[] => {
    const warnings: string[] = [];
    
    // Check for potential issues that aren't errors but could be improved
    if (!validationErrors.budgetName && !validationErrors.budgetAmount) {
      // All budget fields valid, but check for best practices
      // This would require additional context from the actual form values
    }

    return warnings;
  };

  const suggestions = generateSuggestions();
  const warnings = generateWarnings();

  return (
    <div className={`validation-feedback ${className}`}>
      {showSummary && (
        <ValidationSummary 
          errors={errorMessages}
          warnings={warnings}
          suggestions={suggestions}
        />
      )}
      
      {showFieldErrors && (
        <div className="field-validations">
          {Object.entries(validationErrors).map(([fieldName, error]) => (
            <FieldValidationIndicator
              key={fieldName}
              fieldName={fieldName}
              error={error || undefined}
              isValid={!error}
              className="mb-2"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidationFeedback;
export { ValidationSummary, FieldValidationIndicator };