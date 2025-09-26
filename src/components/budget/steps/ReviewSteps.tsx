import React from 'react';
import { StepComponentProps, NavigationHandlers } from '../types/BudgetSetupTypes';

interface ReviewStepProps extends StepComponentProps {
  navigationHandlers: NavigationHandlers;
  onSubmit: () => void;
}

// Step 3B: Transaction Review (Transaction First Workflow)
export const TransactionReviewStep: React.FC<ReviewStepProps> = ({ 
  modalState, 
  updateBudgetData,
  navigateToStep,
  onSubmit
}) => {
  
  const handleCreateBudgetToggle = (createBudget: boolean) => {
    if (createBudget) {
      // Set budget defaults based on transaction
      updateBudgetData({
        budget_name: `${modalState.transactionData.category_name} Budget`,
        category_id: modalState.transactionData.category_id,
        category_name: modalState.transactionData.category_name,
        amount: modalState.transactionData.amount * 4, // Suggest 4x for monthly budget
        period: 'month',
        start_date: new Date().toISOString().substring(0, 7),
        alert_threshold: 0.8 // Set default alert threshold
      });
    } else {
      // Clear budget data
      updateBudgetData({
        budget_name: '',
        category_id: '',
        category_name: '',
        amount: 0,
        period: 'month',
        start_date: new Date().toISOString().substring(0, 7),
        alert_threshold: 0.8
      });
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-md-8">
          {/* Transaction Summary */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0"><i className="fas fa-receipt text-primary me-2"></i>Transaction Summary</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Type:</strong> 
                    <span className={`badge ms-2 ${
                      modalState.transactionData.type === 'income' ? 'badge-success' :
                      modalState.transactionData.type === 'expense' ? 'badge-danger' :
                      'badge-info'
                    }`}>
                      {modalState.transactionData.type.charAt(0).toUpperCase() + modalState.transactionData.type.slice(1)}
                    </span>
                  </p>
                  <p><strong>Amount:</strong> ₱{modalState.transactionData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  <p><strong>Date:</strong> {new Date(modalState.transactionData.date).toLocaleDateString('en-PH')}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Account:</strong> {modalState.transactionData.account_name}</p>
                  <p><strong>Category:</strong> {modalState.transactionData.category_name}</p>
                  {modalState.transactionData.goal_name && (
                    <p><strong>Goal:</strong> {modalState.transactionData.goal_name}</p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p><strong>Description:</strong></p>
                <p className="text-muted">{modalState.transactionData.description}</p>
              </div>
            </div>
          </div>

          {/* Optional Budget Creation - Only for Expense transactions */}
          {modalState.transactionData.type === 'expense' && (
            <div className="card bg-light">
              <div className="card-header">
                <h6 className="mb-0"><i className="fas fa-plus-circle text-success me-2"></i>Add Budget (Recommended)</h6>
              </div>
              <div className="card-body">
                <p className="mb-3">Create a budget to track future spending in the <strong>{modalState.transactionData.category_name}</strong> category.</p>
                
                <div className="form-check mb-3">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="createBudgetCheck"
                    checked={!!modalState.budgetData.budget_name}
                    onChange={(e) => handleCreateBudgetToggle(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="createBudgetCheck">
                    Yes, create a budget for this category
                  </label>
                </div>
                
                {modalState.budgetData.budget_name && (
                  <div className="mt-3">
                    <div className="row">
                      <div className="col-md-6">
                        <label className="form-label">Budget Amount</label>
                        <div className="input-group">
                          <span className="input-group-text">₱</span>
                          <input 
                            type="number" 
                            className="form-control"
                            value={modalState.budgetData.amount}
                            onChange={(e) => updateBudgetData({ amount: parseFloat(e.target.value) || 0 })}
                            min="0.01"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Period</label>
                        <select 
                          className="form-select"
                          value={modalState.budgetData.period}
                          onChange={(e) => {
                            const period = e.target.value;
                            updateBudgetData({ period: period });
                            // Recalculate suggested amount based on period
                            let multiplier = 4; // default for month
                            if (period === 'quarter') multiplier = 12; // 3 months * 4
                            if (period === 'year') multiplier = 48; // 12 months * 4
                            updateBudgetData({ amount: modalState.transactionData.amount * multiplier });
                          }}
                        >
                          <option value="month">Monthly</option>
                          <option value="quarter">Quarterly</option>
                          <option value="year">Yearly</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">
                        <strong>Auto Budget:</strong> {modalState.budgetData.budget_name}
                        <br/>
                        <em>Based on {modalState.budgetData.period === 'month' ? '4x' : modalState.budgetData.period === 'quarter' ? '12x' : '48x'} your transaction amount. You can adjust this amount above.</em>
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="col-md-4">
          {/* Account Impact */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0"><i className="fas fa-calculator text-info me-2"></i>Account Impact</h6>
            </div>
            <div className="card-body">
              <p><strong>Account:</strong> {modalState.transactionData.account_name}</p>
              <div className="mt-3">
                <small className="text-muted">
                  This transaction will be recorded immediately and update your account balance.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="d-flex justify-content-between pt-4 mt-4" style={{ borderTop: '1px solid #dee2e6' }}>
        <button
          type="button"
          onClick={() => navigateToStep('transaction_setup')}
          className="btn btn-outline-secondary btn-lg"
        >
          <i className="fas fa-arrow-left me-2"></i>Edit Transaction
        </button>
        <button
          type="button"
          onClick={() => navigateToStep('final_confirmation')}
          className="btn btn-success btn-lg"
        >
          Create Transaction <i className="fas fa-check ms-2"></i>
        </button>
      </div>
    </div>
  );
};

// Step 4A: Budget Review (Budget First Workflow)
export const BudgetReviewStep: React.FC<ReviewStepProps> = ({ 
  modalState, 
  navigateToStep,
  onSubmit
}) => {
  
  return (
    <div>
      <div className="row">
        <div className="col-md-6">
          {/* Budget Summary */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0"><i className="fas fa-chart-pie text-primary me-2"></i>Budget Summary</h5>
            </div>
            <div className="card-body">
              <p><strong>Name:</strong> {modalState.budgetData.budget_name}</p>
              <p><strong>Category:</strong> {modalState.budgetData.category_name}</p>
              <p><strong>Amount:</strong> ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p><strong>Period:</strong> {modalState.budgetData.period.charAt(0).toUpperCase() + modalState.budgetData.period.slice(1)}</p>
              <p><strong>Start Date:</strong> {new Date(modalState.budgetData.start_date + '-01').toLocaleDateString('en-PH')}</p>
              {modalState.budgetData.goal_name && (
                <p><strong>Linked Goal:</strong> {modalState.budgetData.goal_name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          {/* Transaction Summary (if any) */}
          {modalState.transactionData.amount > 0 && modalState.transactionData.description && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0"><i className="fas fa-receipt text-success me-2"></i>Initial Transaction</h5>
              </div>
              <div className="card-body">
                <p><strong>Amount:</strong> ₱{modalState.transactionData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p><strong>Account:</strong> {modalState.transactionData.account_name}</p>
                <p><strong>Date:</strong> {new Date(modalState.transactionData.date).toLocaleDateString('en-PH')}</p>
                <p><strong>Description:</strong></p>
                <p className="text-muted">{modalState.transactionData.description}</p>
                
                <div className="mt-3">
                  <div className="progress mb-2">
                    <div 
                      className="progress-bar bg-info" 
                      role="progressbar" 
                      style={{ width: `${Math.min((modalState.transactionData.amount / modalState.budgetData.amount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    Budget utilization: {((modalState.transactionData.amount / modalState.budgetData.amount) * 100).toFixed(1)}%
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* Budget Only Message */}
          {(!modalState.transactionData.amount || !modalState.transactionData.description) && (
            <div className="card bg-light">
              <div className="card-body text-center">
                <i className="fas fa-info-circle text-info fa-3x mb-3"></i>
                <h6>Budget Only</h6>
                <p className="text-muted">No initial transaction will be created. You can add transactions later.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="d-flex justify-content-between pt-4 mt-4" style={{ borderTop: '1px solid #dee2e6' }}>
        <div>
          <button
            type="button"
            onClick={() => navigateToStep('budget_config')}
            className="btn btn-outline-secondary btn-lg me-3"
          >
            <i className="fas fa-edit me-2"></i>Edit Budget
          </button>
          {(modalState.transactionData.amount > 0 && modalState.transactionData.description) && (
            <button
              type="button"
              onClick={() => navigateToStep('transaction_create')}
              className="btn btn-outline-primary btn-lg"
            >
              <i className="fas fa-edit me-2"></i>Edit Transaction
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigateToStep('final_confirmation')}
          className="btn btn-success btn-lg"
        >
          Create Budget <i className="fas fa-check ms-2"></i>
        </button>
      </div>
    </div>
  );
};

// Step 4A/4B: Final Confirmation
export const FinalConfirmationStep: React.FC<ReviewStepProps> = ({ 
  modalState, 
  navigateToStep,
  onSubmit
}) => {
  
  return (
    <div>
      <div className="text-center mb-4">
        <i className="fas fa-check-circle text-success fa-4x mb-3"></i>
        <h4 className="text-success">Ready to Create</h4>
        <p className="text-muted">
          {modalState.workflowChoice?.workflow_type === 'budget_first' 
            ? 'Your budget and transaction are ready to be created'
            : 'Your transaction is ready to be recorded'}
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Final Summary */}
          <div className="card">
            <div className="card-header text-center">
              <h5 className="mb-0">Final Summary</h5>
            </div>
            <div className="card-body">
              {modalState.workflowChoice?.workflow_type === 'budget_first' ? (
                <div>
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-primary"><i className="fas fa-chart-pie me-2"></i>Budget</h6>
                      <ul className="list-unstyled">
                        <li><strong>Name:</strong> {modalState.budgetData.budget_name}</li>
                        <li><strong>Amount:</strong> ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</li>
                        <li><strong>Category:</strong> {modalState.budgetData.category_name}</li>
                        <li><strong>Period:</strong> {modalState.budgetData.period}</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      {(modalState.transactionData.amount > 0 && modalState.transactionData.description) ? (
                        <div>
                          <h6 className="text-success"><i className="fas fa-receipt me-2"></i>Transaction</h6>
                          <ul className="list-unstyled">
                            <li><strong>Amount:</strong> ₱{modalState.transactionData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Account:</strong> {modalState.transactionData.account_name}</li>
                            <li><strong>Date:</strong> {new Date(modalState.transactionData.date).toLocaleDateString('en-PH')}</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="text-center text-muted">
                          <i className="fas fa-info-circle fa-2x mb-2"></i>
                          <p>Budget only - no transaction</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h6 className="text-success"><i className="fas fa-receipt me-2"></i>Transaction Details</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li><strong>Type:</strong> {modalState.transactionData.type.charAt(0).toUpperCase() + modalState.transactionData.type.slice(1)}</li>
                        <li><strong>Amount:</strong> ₱{modalState.transactionData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</li>
                        <li><strong>Date:</strong> {new Date(modalState.transactionData.date).toLocaleDateString('en-PH')}</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li><strong>Account:</strong> {modalState.transactionData.account_name}</li>
                        <li><strong>Category:</strong> {modalState.transactionData.category_name}</li>
                        {modalState.transactionData.goal_name && <li><strong>Goal:</strong> {modalState.transactionData.goal_name}</li>}
                      </ul>
                    </div>
                  </div>
                  {modalState.budgetData.budget_name && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <h6 className="text-primary mb-2"><i className="fas fa-plus-circle me-2"></i>Bonus: Budget Created</h6>
                      <p className="mb-0">
                        <strong>{modalState.budgetData.budget_name}</strong> - ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per {modalState.budgetData.period}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Options for Budget-First workflow */}
      {modalState.workflowChoice?.workflow_type === 'budget_first' && (
        <div className="text-center mt-4">
          <div className="btn-group" role="group">
            <button
              type="button"
              onClick={() => navigateToStep && navigateToStep('budget_config')}
              className="btn btn-outline-primary"
            >
              <i className="fas fa-edit me-2"></i>Edit Budget
            </button>
            {modalState.transactionData.amount > 0 && modalState.transactionData.description && (
              <button
                type="button"
                onClick={() => navigateToStep && navigateToStep('transaction_create')}
                className="btn btn-outline-secondary"
              >
                <i className="fas fa-edit me-2"></i>Edit Transaction
              </button>
            )}
          </div>
        </div>
      )}

      {/* Final Action Buttons */}
      <div className="text-center pt-4 mt-4" style={{ borderTop: '1px solid #dee2e6' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={modalState.isSubmitting}
          className="btn btn-success btn-lg px-5"
        >
          {modalState.isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Creating...
            </>
          ) : (
            <>
              <i className="fas fa-check me-2"></i>
              {modalState.workflowChoice?.workflow_type === 'budget_first' 
                ? 'Create Budget & Transaction' 
                : 'Create Transaction'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};