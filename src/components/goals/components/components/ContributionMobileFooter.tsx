import React, { FC, memo } from 'react';
import { ModalStep } from '../types/ContributionTypes';

interface ContributionMobileFooterProps {
  currentStep: ModalStep;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isSubmitting?: boolean;
  showPrevious?: boolean;
  nextLabel?: string;
  eligibleGoalsCount?: number;
}

const ContributionMobileFooter: FC<ContributionMobileFooterProps> = memo(({
  currentStep,
  onPrevious,
  onNext,
  onSubmit,
  isNextDisabled = false,
  isSubmitting = false,
  showPrevious = true,
  nextLabel,
  eligibleGoalsCount = 0
}) => {
  const getNextButtonLabel = () => {
    if (nextLabel) return nextLabel;
    
    switch (currentStep) {
      case 'selection':
        return 'Select Goal';
      case 'contribution':
        return 'Review';
      case 'review':
        return isSubmitting ? 'Processing...' : 'Confirm';
      default:
        return 'Next';
    }
  };

  const handleContributionNext = () => {
    if (onNext) {
      onNext();
    }
  };

  // Don't render footer for selection step if no eligible goals
  if (currentStep === 'selection' && eligibleGoalsCount === 0) {
    return null;
  }

  // Show helpful text for selection step
  if (currentStep === 'selection') {
    return (
      <div className="md:hidden bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center">
          <small className="text-gray-600 flex items-center text-sm">
            <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
            Tap on any goal card above to start contributing
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg" style={{ zIndex: 1060 }}>
      <div className="flex items-center justify-between p-3 gap-2">
        {/* Previous Button */}
        {showPrevious && onPrevious && (currentStep === 'contribution' || currentStep === 'review') && (
          <button
            type="button"
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
            type="button"
            onClick={currentStep === 'review' ? onSubmit : handleContributionNext}
            disabled={isNextDisabled || isSubmitting}
            className={`flex items-center justify-center space-x-1 px-4 py-2.5 rounded-lg text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm ${
              currentStep === 'review' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-[#4e73df] hover:bg-[#2e59d9]'
            } ${showPrevious && onPrevious && (currentStep === 'contribution' || currentStep === 'review') ? 'flex-1' : 'flex-1'}`}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i>
                <span>{getNextButtonLabel()}</span>
              </>
            ) : (
              <>
                {currentStep === 'review' ? (
                  <i className="fas fa-check text-xs"></i>
                ) : null}
                <span>{getNextButtonLabel()}</span>
                {currentStep !== 'review' && (
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

ContributionMobileFooter.displayName = 'ContributionMobileFooter';

export default ContributionMobileFooter;
