import React from 'react';
import { WorkflowType, ExperienceLevel, StepComponentProps } from '../types/BudgetSetupTypes';

interface WorkflowChoiceStepProps extends StepComponentProps {
  onWorkflowChoice: (workflow: WorkflowType, experienceLevel: ExperienceLevel, reason?: string) => void;
}

const WorkflowChoiceStep: React.FC<WorkflowChoiceStepProps> = ({ 
  modalState, 
  onWorkflowChoice
}) => {
  const handleWorkflowSelection = (workflow: WorkflowType) => {
    onWorkflowChoice(workflow, 'intermediate', workflow === 'budget_first' ? 'structured_planning' : 'immediate_action');
  };

  return (
    <div>
      <div className="text-center mb-5">
        <h5 className="mb-3">How would you like to start?</h5>
        <p className="text-muted">
          Choose the approach that best fits your financial planning style
        </p>
      </div>

      <div className="row">
        {/* Budget First Option */}
        <div className="col-md-6 mb-4">
          <div 
            onClick={() => handleWorkflowSelection('budget_first')}
            className="card h-100 workflow-choice-card"
            style={{ 
              cursor: 'pointer', 
              border: '2px solid #dee2e6', 
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,123,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dee2e6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    backgroundColor: '#e3f2fd',
                    border: '3px solid #2196f3'
                  }}
                >
                  <i className="fas fa-clipboard-list fa-2x text-primary"></i>
                </div>
                <h5 className="card-title text-primary">Budget First</h5>
              </div>
              
              <p className="card-text text-center mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                Set up your spending framework first, then add transactions within that structure
              </p>
              
              <div className="mb-4">
                <h6 className="text-muted mb-2">Benefits:</h6>
                <ul className="list-unstyled small">
                  <li><i className="fas fa-check text-success me-2"></i> Structured financial planning</li>
                  <li><i className="fas fa-check text-success me-2"></i> Better spending control</li>
                  <li><i className="fas fa-check text-success me-2"></i> Proactive budgeting</li>
                </ul>
              </div>
              
              <div className="text-center">
                <span className="badge badge-primary px-3 py-2">Recommended for beginners</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction First Option */}
        <div className="col-md-6 mb-4">
          <div 
            onClick={() => handleWorkflowSelection('transaction_first')}
            className="card h-100 workflow-choice-card"
            style={{ 
              cursor: 'pointer', 
              border: '2px solid #dee2e6', 
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#28a745';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(40,167,69,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dee2e6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    backgroundColor: '#e8f5e8',
                    border: '3px solid #4caf50'
                  }}
                >
                  <i className="fas fa-bolt fa-2x text-success"></i>
                </div>
                <h5 className="card-title text-success">Transaction First</h5>
              </div>
              
              <p className="card-text text-center mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                Record your transaction now, then optionally create budgets to track spending
              </p>
              
              <div className="mb-4">
                <h6 className="text-muted mb-2">Benefits:</h6>
                <ul className="list-unstyled small">
                  <li><i className="fas fa-check text-success me-2"></i> Quick transaction recording</li>
                  <li><i className="fas fa-check text-success me-2"></i> Flexible approach</li>
                  <li><i className="fas fa-check text-success me-2"></i> Learn as you go</li>
                </ul>
              </div>
              
              <div className="text-center">
                <span className="badge badge-success px-3 py-2">Great for immediate needs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowChoiceStep;