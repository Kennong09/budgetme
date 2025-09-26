import React, { ReactNode } from 'react';
import { ValidationErrors } from '../types/BudgetSetupTypes';

interface NavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onSubmit?: () => void;
  isValid?: boolean;
  isSubmitting?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  showSkip?: boolean;
}

interface BudgetStepCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: string;
  cardType?: 'selection' | 'form' | 'review' | 'analytics';
  navigation?: NavigationProps;
  validationErrors?: ValidationErrors;
  className?: string;
  showValidationSummary?: boolean;
}

const BudgetStepCard: React.FC<BudgetStepCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  cardType = 'form',
  navigation,
  validationErrors = {},
  className = '',
  showValidationSummary = false
}) => {
  // Card-specific styling based on type
  const getCardTypeStyles = () => {
    const baseStyles = 'card shadow mb-4 hover-lift';
    
    switch (cardType) {
      case 'selection':
        return `${baseStyles} border-left-primary`;
      case 'form':
        return `${baseStyles} border-left-info`;
      case 'review':
        return `${baseStyles} border-left-warning`;
      case 'analytics':
        return `${baseStyles} border-left-success`;
      default:
        return baseStyles;
    }
  };

  // Count validation errors
  const errorCount = Object.keys(validationErrors).filter(key => validationErrors[key]).length;

  // Get card header color based on type
  const getHeaderColor = () => {
    switch (cardType) {
      case 'selection': return 'text-primary';
      case 'form': return 'text-info';
      case 'review': return 'text-warning';
      case 'analytics': return 'text-success';
      default: return 'text-primary';
    }
  };

  return (
    <div className={`${getCardTypeStyles()} ${className}`}>
      {/* Card Header */}
      {(title || subtitle) && (
        <div className="card-header py-3 bg-transparent border-bottom">
          <div className="d-flex align-items-center">
            {icon && (
              <div 
                className={`budget-icon-circle ${getHeaderColor()} mr-3`}
                style={{
                  backgroundColor: 'rgba(78, 115, 223, 0.1)'
                }}
              >
                <i className={`${icon} ${getHeaderColor()}`}></i>
              </div>
            )}
            <div>
              {title && (
                <h6 
                  className="m-0 font-weight-bold budget-card-title"
                >
                  {title}
                </h6>
              )}
              {subtitle && (
                <small className="budget-help-text d-block mt-1">
                  {subtitle}
                </small>
              )}
            </div>
          </div>

          {/* Validation Summary */}
          {showValidationSummary && errorCount > 0 && (
            <div className="alert alert-danger mt-3 mb-0 animate__animated animate__shakeX">
              <div className="d-flex align-items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                <span>
                  Please fix {errorCount} validation error{errorCount > 1 ? 's' : ''} before continuing
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className="card-body" style={{ minHeight: '300px' }}>
        {children}
      </div>

      {/* Navigation Footer */}
      {navigation && (
        <div className="card-footer bg-transparent border-top-0 pt-0">
          <div className="d-flex justify-content-between align-items-center">
            {/* Left side - Previous/Skip buttons */}
            <div>
              {navigation.onPrevious && (
                <button
                  type="button"
                  onClick={navigation.onPrevious}
                  className="btn btn-outline-secondary btn-icon-split mr-2"
                  disabled={navigation.isSubmitting}
                >
                  <span className="icon text-gray-600">
                    <i className="fas fa-arrow-left"></i>
                  </span>
                  <span className="text">
                    {navigation.previousLabel || 'Previous'}
                  </span>
                </button>
              )}
              {navigation.showSkip && navigation.onSkip && (
                <button
                  type="button"
                  onClick={navigation.onSkip}
                  className="btn btn-link btn-sm text-muted"
                  disabled={navigation.isSubmitting}
                  style={{ textDecoration: 'underline' }}
                >
                  Skip for now
                </button>
              )}
            </div>

            {/* Right side - Next/Submit buttons */}
            <div>
              {navigation.onNext && (
                <button
                  type="button"
                  onClick={navigation.onNext}
                  disabled={navigation.isSubmitting || (navigation.isValid !== undefined && !navigation.isValid)}
                  className="btn btn-primary btn-icon-split"
                >
                  <span className="text">
                    {navigation.nextLabel || 'Continue'}
                  </span>
                  <span className="icon text-white-50">
                    <i className="fas fa-arrow-right"></i>
                  </span>
                </button>
              )}
              {navigation.onSubmit && (
                <button
                  type="button"
                  onClick={navigation.onSubmit}
                  disabled={navigation.isSubmitting || (navigation.isValid !== undefined && !navigation.isValid)}
                  className="btn btn-success btn-icon-split"
                >
                  <span className="icon text-white-50">
                    <i className={navigation.isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                  </span>
                  <span className="text">
                    {navigation.isSubmitting ? "Processing..." : (navigation.submitLabel || "Complete")}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetStepCard;