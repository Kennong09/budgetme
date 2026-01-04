import React, { FC, memo, useMemo, useCallback } from 'react';
import { ModalStep, AccountType } from '../types/AccountSetupTypes';

interface Props {
  currentStep: ModalStep;
  progressPercentage: number;
  onClose: () => void;
  onSkipForLater: () => void;
  accountType?: AccountType;
  onShowMobileSidebar?: () => void;
}

const AccountModalHeader: FC<Props> = memo(({
  currentStep,
  progressPercentage,
  onClose,
  onSkipForLater,
  accountType,
  onShowMobileSidebar
}) => {
  const getStepTitle = useMemo(() => {
    switch (currentStep) {
      case 'account_type_choice':
        return 'Account Type Selection';
      case 'account_config':
        return 'Account Configuration';
      case 'cash_in_setup':
        return 'Initial Funding';
      case 'review_confirmation':
        return 'Review & Confirm';
      default:
        return 'Account Setup';
    }
  }, [currentStep]);

  const getStepDescription = useMemo(() => {
    switch (currentStep) {
      case 'account_type_choice':
        return 'Choose the type of account that best fits your needs';
      case 'account_config':
        return 'Configure your account details and preferences';
      case 'cash_in_setup':
        return 'Add initial funds and plan your budget allocation';
      case 'review_confirmation':
        return 'Review all details before creating your account';
      default:
        return 'Set up your new financial account';
    }
  }, [currentStep]);

  const getAccountTypeIcon = useCallback((type?: AccountType) => {
    if (!type) return 'fas fa-bank';
    switch (type) {
      case 'checking': return 'fas fa-university';
      case 'savings': return 'fas fa-piggy-bank';
      case 'credit': return 'fas fa-credit-card';
      case 'investment': return 'fas fa-chart-line';
      case 'cash': return 'fas fa-money-bill-wave';
      case 'other': return 'fas fa-wallet';
      default: return 'fas fa-bank';
    }
  }, []);

  return (
    <div className="flex flex-col bg-white border-b border-gray-200">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div 
          className="bg-blue-600 h-1 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Header Content */}
      <div className="flex items-center justify-between p-3 md:p-6">
        {/* Left Side - Title and Progress */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Icon */}
          <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className={`${getAccountTypeIcon(accountType)} text-sm md:text-xl text-blue-600`}></i>
          </div>
          
          {/* Title and Description */}
          <div className="flex items-center space-x-2">
            <div>
              <h1 className="text-base md:text-2xl font-bold text-gray-900 flex items-center space-x-1 md:space-x-2">
                <span>{getStepTitle}</span>
                {accountType && (
                  <span className="text-xs md:text-base font-normal text-blue-600 bg-blue-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                    {accountType.charAt(0).toUpperCase() + accountType.slice(1)}
                  </span>
                )}
              </h1>
              <p className="text-xs md:text-base text-gray-600 mt-0.5 md:mt-1 hidden sm:block">{getStepDescription}</p>
            </div>
            
            {/* Mobile Info Button */}
            {onShowMobileSidebar && (
              <button
                onClick={onShowMobileSidebar}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                aria-label="Show Tips and Help"
              >
                <i className="fas fa-info-circle text-sm"></i>
              </button>
            )}
          </div>
        </div>

        {/* Right Side - Progress, Skip and Close */}
        <div className="flex items-center space-x-1 md:space-x-4">
          {/* Progress Indicator */}
          <div className="text-right hidden sm:block">
            <div className="text-xs md:text-sm font-medium text-gray-900">
              {progressPercentage}%
            </div>
            <div className="text-xs text-gray-500 hidden md:block">
              Step {getCurrentStepNumber(currentStep)} of 4
            </div>
          </div>

          {/* Skip for Later Button */}
          <button
            onClick={onSkipForLater}
            className="px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center space-x-1 md:space-x-2"
            aria-label="Skip Account Setup for Later"
          >
            <i className="fas fa-clock text-xs"></i>
            <span className="hidden md:inline">Skip for Later</span>
            <span className="md:hidden">Skip</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close Account Setup"
          >
            <i className="fas fa-times text-base md:text-lg"></i>
          </button>
        </div>
      </div>

      {/* Step Navigation Breadcrumb */}
      <div className="px-3 md:px-6 pb-2 md:pb-4">
        <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
          {getStepBreadcrumbs(currentStep).map((step, index) => (
            <React.Fragment key={step.key}>
              {index > 0 && (
                <i className="fas fa-chevron-right text-xs text-gray-400"></i>
              )}
              <span
                className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                  step.active
                    ? 'bg-blue-100 text-blue-800'
                    : step.completed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step.completed && <i className="fas fa-check mr-0.5 md:mr-1 text-xs"></i>}
                {step.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
});

AccountModalHeader.displayName = 'AccountModalHeader';

// Helper function to get current step number
const getCurrentStepNumber = (currentStep: ModalStep): number => {
  const stepOrder: ModalStep[] = ['account_type_choice', 'account_config', 'cash_in_setup', 'review_confirmation'];
  return stepOrder.indexOf(currentStep) + 1;
};

// Helper function to get step breadcrumbs
const getStepBreadcrumbs = (currentStep: ModalStep) => {
  const steps = [
    { key: 'account_type_choice', label: 'Type', completed: false, active: false },
    { key: 'account_config', label: 'Details', completed: false, active: false },
    { key: 'cash_in_setup', label: 'Funding', completed: false, active: false },
    { key: 'review_confirmation', label: 'Review', completed: false, active: false }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStep);
  
  return steps.map((step, index) => ({
    ...step,
    completed: index < currentIndex,
    active: index === currentIndex
  }));
};

export default AccountModalHeader;
