import React from 'react';
import { ModalStep, WorkflowType } from '../types/BudgetSetupTypes';

interface BudgetProgressBarProps {
  currentStep: ModalStep;
  progressPercentage: number;
  workflowType?: WorkflowType;
  hideStepIndicators?: boolean;
}

const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  currentStep,
  progressPercentage,
  workflowType,
  hideStepIndicators = false
}) => {

  // Progress step indicators
  const getStepIndicators = () => {
    const stepMappings = {
      'budget_first': [
        { step: 'workflow_choice', label: '1', title: 'Choose Approach' },
        { step: 'budget_config', label: '2', title: 'Configure Budget' },
        { step: 'transaction_create', label: '3', title: 'Add Transaction' },
        { step: 'final_confirmation', label: '4', title: 'Confirm' }
      ],
      'transaction_first': [
        { step: 'workflow_choice', label: '1', title: 'Choose Approach' },
        { step: 'transaction_setup', label: '2', title: 'Setup Transaction' },
        { step: 'transaction_review', label: '3', title: 'Review' },
        { step: 'final_confirmation', label: '4', title: 'Confirm' }
      ]
    };

    const defaultSteps = [
      { step: 'workflow_choice', label: '1', title: 'Choose Approach' },
      { step: 'budget_config', label: '2', title: 'Configuration' },
      { step: 'final_confirmation', label: '3', title: 'Confirm' }
    ];

    return workflowType ? stepMappings[workflowType] : defaultSteps;
  };

  const stepIndicators = getStepIndicators();
  const currentStepIndex = stepIndicators.findIndex(indicator => indicator.step === currentStep);

  return (
    <div className="w-100">
      {/* Progress Bar */}
      <div className="progress mb-3" style={{ height: '8px', backgroundColor: '#e3e6f0' }}>
        <div
          className={`progress-bar ${
            progressPercentage <= 25 ? 'bg-primary' :
            progressPercentage <= 50 ? 'bg-primary' :
            progressPercentage <= 75 ? 'bg-warning' :
            'bg-success'
          }`}
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>

      {/* Step Indicators - Only show if not hidden */}
      {!hideStepIndicators && (
        <div className="d-flex justify-content-between align-items-center">
          {stepIndicators.map((indicator, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={indicator.step} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
                <div 
                  className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${
                    isCompleted ? 'bg-success text-white' :
                    isActive ? 'bg-primary text-white' :
                    'bg-light text-gray-500'
                  }`}
                  style={{ 
                    width: '2rem', 
                    height: '2rem', 
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  {isCompleted ? (
                    <i className="fas fa-check"></i>
                  ) : (
                    indicator.label
                  )}
                </div>
                <small 
                  className={`text-center ${
                    isActive ? 'text-primary font-weight-bold' :
                    isCompleted ? 'text-success' :
                    'text-muted'
                  }`}
                  style={{ 
                    fontSize: '0.75rem',
                    lineHeight: '1.2',
                    maxWidth: '80px'
                  }}
                >
                  {indicator.title}
                </small>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Percentage Display */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">
          Progress: {progressPercentage}% complete
        </small>
        {workflowType && (
          <small className="text-primary font-weight-bold">
            {workflowType === 'budget_first' ? 'Budget-First Approach' : 'Transaction-First Approach'}
          </small>
        )}
      </div>
    </div>
  );
};

export default BudgetProgressBar;