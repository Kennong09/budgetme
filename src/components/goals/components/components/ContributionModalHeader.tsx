import React from 'react';
import { ModalStep } from '../types/ContributionTypes';

interface ContributionModalHeaderProps {
  currentStep: ModalStep;
  onClose: () => void;
  onShowMobileSidebar?: () => void;
}

const ContributionModalHeader: React.FC<ContributionModalHeaderProps> = ({
  currentStep,
  onClose,
  onShowMobileSidebar
}) => {
  const getStepTitle = () => {
    switch (currentStep) {
      case 'selection':
        return 'Select Goal to Contribute';
      case 'contribution':
        return 'Make Your Contribution';
      case 'review':
        return 'Review Your Contribution';
      default:
        return 'Goal Contribution';
    }
  };

  const getCloseButtonText = () => {
    return currentStep === 'selection' ? 'Skip for now' : 'Cancel';
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'selection': return 1;
      case 'contribution': return 2;
      case 'review': return 3;
      default: return 1;
    }
  };

  const progressPercentage = (getStepNumber() / 3) * 100;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <i className="fas fa-bullseye text-blue-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{getStepTitle()}</h2>
              <p className="text-sm text-gray-500">Step {getStepNumber()} of 3</p>
            </div>
            
            {/* Mobile Info Button */}
            {onShowMobileSidebar && (
              <button
                onClick={onShowMobileSidebar}
                className="md:hidden ml-2 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                type="button"
                title="Goal Information"
              >
                <i className="fas fa-info-circle text-gray-600"></i>
              </button>
            )}
          </div>
          <button 
            onClick={onClose}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            type="button"
          >
            <i className="fas fa-times text-sm mr-2"></i>
            {getCloseButtonText()}
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1">
        <div 
          className="bg-blue-600 h-1 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default ContributionModalHeader;
