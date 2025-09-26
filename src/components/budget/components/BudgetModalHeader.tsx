import React from 'react';
import { ModalStep, WorkflowType } from '../types/BudgetSetupTypes';
// Removed BudgetProgressBar import - progress integrated directly in header

interface BudgetModalHeaderProps {
  currentStep: ModalStep;
  progressPercentage: number;
  onClose: () => void;
  workflowType?: WorkflowType;
}

const BudgetModalHeader: React.FC<BudgetModalHeaderProps> = ({
  currentStep,
  progressPercentage,
  onClose,
  workflowType
}) => {
  // Dynamic title generation based on current step
  const getStepTitle = (): string => {
    const titleMap: Record<ModalStep, string> = {
      'workflow_choice': 'Choose Your Approach',
      'budget_config': 'Configure Budget',
      'transaction_setup': 'Transaction Details',
      'transaction_create': 'Add Initial Transaction',
      'transaction_review': 'Review & Create Budget',
      'final_confirmation': 'Final Confirmation'
    };
    return titleMap[currentStep] || 'Budget Setup';
  };

  // Step-specific iconography
  const getStepIcon = (): string => {
    const iconMap: Record<ModalStep, string> = {
      'workflow_choice': 'fas fa-route',
      'budget_config': 'fas fa-cogs',
      'transaction_setup': 'fas fa-edit',
      'transaction_create': 'fas fa-plus-circle',
      'transaction_review': 'fas fa-check-circle',
      'final_confirmation': 'fas fa-flag-checkered'
    };
    return iconMap[currentStep] || 'fas fa-wallet';
  };

  // Step indicators logic moved from BudgetProgressBar
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
      { step: 'transaction_create', label: '3', title: 'Add Transaction' },
      { step: 'final_confirmation', label: '4', title: 'Confirm' }
    ];

    return workflowType ? stepMappings[workflowType] : defaultSteps;
  };

  const stepIndicators = getStepIndicators();
  const currentStepIndex = stepIndicators.findIndex(indicator => indicator.step === currentStep);

  return (
    <div className="modal-header border-0 pb-0">
      <div className="d-sm-flex align-items-center justify-content-between w-100">
        <h5 className="modal-title d-flex align-items-center mb-0">
          <i className={`${getStepIcon()} text-primary mr-2`}></i>
          {getStepTitle()}
        </h5>
        
        {/* Center Section: Step Indicators with Integrated Progress Bar */}
        <div className="d-flex align-items-center justify-content-center">
          <div className="d-flex align-items-center position-relative" style={{ gap: '3rem', minWidth: '300px' }}>
            {stepIndicators.map((indicator, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isLast = index === stepIndicators.length - 1;

              return (
                <div key={indicator.step} className="d-flex flex-column align-items-center position-relative">
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      isCompleted ? 'bg-success text-white' :
                      isActive ? 'bg-primary text-white' :
                      'bg-light text-gray-500'
                    }`}
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {isCompleted ? (
                      <i className="fas fa-check"></i>
                    ) : (
                      indicator.label
                    )}
                  </div>
                  
                  {/* Progress line connecting to next step */}
                  {!isLast && (
                    <div
                      className="position-absolute"
                      style={{
                        top: '1.25rem',
                        left: '2.5rem',
                        width: '3rem',
                        height: '4px',
                        backgroundColor: '#e3e6f0',
                        zIndex: 1
                      }}
                    >
                      <div
                        className={`h-100 ${
                          isCompleted ? 'bg-success' :
                          isActive && progressPercentage > (index + 1) * (100 / stepIndicators.length) ? 'bg-primary' :
                          'bg-light'
                        }`}
                        style={{ 
                          width: isCompleted ? '100%' : 
                                 isActive ? `${Math.min(100, (progressPercentage - (index * (100 / stepIndicators.length))) / (100 / stepIndicators.length) * 100)}%` : 
                                 '0%'
                        }}
                      ></div>
                    </div>
                  )}
                  
                  <small 
                    className={`text-center ${
                      isActive ? 'text-primary font-weight-bold' :
                      isCompleted ? 'text-success' :
                      'text-muted'
                    }`}
                    style={{ 
                      fontSize: '0.75rem',
                      lineHeight: '1.2',
                      whiteSpace: 'nowrap',
                      maxWidth: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {indicator.title}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="btn btn-sm btn-secondary shadow-sm"
          type="button"
        >
          <i className="fas fa-times fa-sm mr-2"></i>
          Skip for now
        </button>
      </div>
      
      {/* Workflow Type Information Only - Show only on workflow_choice step */}
      {workflowType && currentStep === 'workflow_choice' && (
        <div className="mt-3 w-100 d-flex justify-content-center">
          <small className="text-primary font-weight-bold">
            {workflowType === 'budget_first' ? 'Budget-First Approach' : 'Transaction-First Approach'}
          </small>
        </div>
      )}
    </div>
  );
};

export default BudgetModalHeader;