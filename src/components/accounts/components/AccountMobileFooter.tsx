import React, { FC, memo } from 'react';
import { ModalStep } from '../types/AccountSetupTypes';

interface Props {
  currentStep: ModalStep;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isNextDisabled?: boolean;
  nextLabel?: string;
  showPrevious?: boolean;
}

const AccountMobileFooter: FC<Props> = memo(({
  currentStep,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  isNextDisabled = false,
  nextLabel,
  showPrevious = true
}) => {
  const getNextButtonLabel = () => {
    if (nextLabel) return nextLabel;
    
    switch (currentStep) {
      case 'workflow_choice':
        return 'Continue';
      case 'account_type_choice':
        return 'Continue';
      case 'account_config':
        return 'Next';
      case 'cash_in_setup':
        return 'Review';
      case 'review_confirmation':
        return isSubmitting ? 'Creating...' : 'Create';
      default:
        return 'Next';
    }
  };

  const handleNextClick = () => {
    if (currentStep === 'review_confirmation' && onSubmit) {
      onSubmit();
    } else if (onNext) {
      onNext();
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-center justify-between p-3 gap-2">
        {/* Previous Button */}
        {showPrevious && onPrevious && currentStep !== 'workflow_choice' && (
          <button
            onClick={onPrevious}
            disabled={isSubmitting}
            className="flex items-center justify-center space-x-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex-1"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            <span>Back</span>
          </button>
        )}

        {/* Next/Submit Button */}
        {(onNext || onSubmit) && (
          <button
            onClick={handleNextClick}
            disabled={isNextDisabled || isSubmitting}
            className={`flex items-center justify-center space-x-1 px-4 py-2.5 rounded-lg text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm ${
              currentStep === 'review_confirmation' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-[#4e73df] hover:bg-[#2e59d9]'
            } ${showPrevious && onPrevious && currentStep !== 'workflow_choice' ? 'flex-1' : 'flex-1'}`}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i>
                <span>{getNextButtonLabel()}</span>
              </>
            ) : (
              <>
                {currentStep === 'review_confirmation' ? (
                  <i className="fas fa-check text-xs"></i>
                ) : null}
                <span>{getNextButtonLabel()}</span>
                {currentStep !== 'review_confirmation' && (
                  <i className="fas fa-arrow-right text-xs"></i>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

AccountMobileFooter.displayName = 'AccountMobileFooter';

export default AccountMobileFooter;
