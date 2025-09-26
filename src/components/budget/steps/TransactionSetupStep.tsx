import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CentavoInput from '../../common/CentavoInput';
import AccountSelector from '../../transactions/components/AccountSelector';
import CategorySelector from '../../transactions/components/CategorySelector';
import GoalSelector from '../../transactions/components/GoalSelector';
import { TransactionType, StepComponentProps, NavigationHandlers } from '../types/BudgetSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';

// Category interface
interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface TransactionSetupStepProps extends StepComponentProps {
  navigationHandlers: NavigationHandlers;
  expenseCategories: Category[];
  incomeCategories: Category[];
  accounts: any[];
  goals: any[];
  categoriesLoading: boolean;
}

const TransactionSetupStep: React.FC<TransactionSetupStepProps> = ({ 
  modalState, 
  updateTransactionData, 
  updateValidationErrors,
  navigateToStep,
  navigationHandlers,
  expenseCategories,
  incomeCategories,
  accounts,
  goals,
  categoriesLoading
}) => {
  
  // Navigation hook
  const navigate = useNavigate();
  
  // Track whether goals are available
  const [hasGoals, setHasGoals] = useState<boolean | null>(null); // null = loading, true/false = has/no goals
  
  // Memoize validation to prevent infinite re-renders
  const isStepValid = useMemo(() => {
    const errors = ValidationEngine.validateTransactionData(modalState.transactionData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.transactionData]);

  const validateStep = (): boolean => {
    const errors = ValidationEngine.validateTransactionData(modalState.transactionData);
    updateValidationErrors(errors);
    return !ValidationEngine.hasValidationErrors(errors);
  };

  const handleNext = () => {
    if (validateStep()) {
      navigateToStep('transaction_review');
    }
  };

  const handleBack = () => {
    navigateToStep('workflow_choice');
  };

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <form>
            {/* Transaction Type Selection */}
            <div className="form-group mb-4">
              <label className="font-weight-bold mb-3">Transaction Type *</label>
              <div className="row">
                {/* Income Type */}
                <div className="col-md-4">
                  <div 
                    onClick={() => {
                      updateTransactionData({ 
                        type: 'income',
                        category_id: '',
                        category_name: ''
                      });
                    }}
                    className={`card ${modalState.transactionData.type === 'income' ? 'bg-success text-white' : 'bg-light'} py-3 shadow-sm`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div className="card-body p-3 text-center">
                      <i className={`fas fa-plus-circle fa-3x mb-3 ${modalState.transactionData.type === 'income' ? '' : 'text-success'}`}></i>
                      <h5 className="mb-1 font-weight-bold">Income</h5>
                      <p className="mb-0 small">Money coming in</p>
                    </div>
                  </div>
                </div>

                {/* Expense Type */}
                <div className="col-md-4">
                  <div 
                    onClick={() => {
                      updateTransactionData({ 
                        type: 'expense',
                        category_id: '',
                        category_name: ''
                      });
                    }}
                    className={`card ${modalState.transactionData.type === 'expense' ? 'bg-danger text-white' : 'bg-light'} py-3 shadow-sm`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div className="card-body p-3 text-center">
                      <i className={`fas fa-minus-circle fa-3x mb-3 ${modalState.transactionData.type === 'expense' ? '' : 'text-danger'}`}></i>
                      <h5 className="mb-1 font-weight-bold">Expense</h5>
                      <p className="mb-0 small">Money going out</p>
                    </div>
                  </div>
                </div>

                {/* Contribution Type */}
                <div className="col-md-4">
                  <div 
                    onClick={() => {
                      updateTransactionData({ 
                        type: 'contribution',
                        category_id: '',
                        category_name: ''
                      });
                    }}
                    className={`card ${modalState.transactionData.type === 'contribution' ? 'bg-info text-white' : 'bg-light'} py-3 shadow-sm`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div className="card-body p-3 text-center">
                      <i className={`fas fa-flag fa-3x mb-3 ${modalState.transactionData.type === 'contribution' ? '' : 'text-info'}`}></i>
                      <h5 className="mb-1 font-weight-bold">Contribution</h5>
                      <p className="mb-0 small">Goal contribution</p>
                    </div>
                  </div>
                </div>
              </div>
              {modalState.validationErrors.transactionType && (
                <div className="text-danger small mt-2">{modalState.validationErrors.transactionType}</div>
              )}
            </div>

            {/* Transaction Amount */}
            <div className="form-group mb-4">
              <label className="font-weight-bold mb-2">Amount *</label>
              <CentavoInput
                value={modalState.transactionData.amount}
                onChange={(amount) => updateTransactionData({ amount })}
                placeholder="Enter transaction amount"
                className={`form-control-lg ${modalState.validationErrors.transactionAmount ? 'is-invalid' : ''}`}
              />
              {modalState.validationErrors.transactionAmount && (
                <div className="invalid-feedback">{modalState.validationErrors.transactionAmount}</div>
              )}
            </div>

            <div className="row">
              <div className="col-md-6">
                {/* Account Selector */}
                <div className="form-group mb-4">
                  <AccountSelector
                    selectedAccountId={modalState.transactionData.account_id}
                    onAccountSelect={(account) => {
                      updateTransactionData({ 
                        account_id: account?.id || '', 
                        account_name: account?.account_name || '' 
                      });
                    }}
                    showBalance={true}
                    className={modalState.validationErrors.transactionAccount ? 'is-invalid' : ''}
                    label="Account *"
                  />
                </div>
              </div>

              <div className="col-md-6">
                {/* Category Selector */}
                <div className="form-group mb-4">
                  {categoriesLoading ? (
                    <div className="d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm mr-2" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <span className="text-muted">Loading categories...</span>
                    </div>
                  ) : (
                    modalState.transactionData.type !== 'contribution' ? (
                      <CategorySelector
                        selectedCategoryId={modalState.transactionData.category_id}
                        onCategorySelect={(category) => {
                          updateTransactionData({ 
                            category_id: category?.id || '', 
                            category_name: category?.category_name || '' 
                          });
                        }}
                        transactionType={modalState.transactionData.type}
                        incomeCategories={incomeCategories}
                        expenseCategories={expenseCategories}
                        className={modalState.validationErrors.transactionCategory ? 'is-invalid' : ''}
                        label="Category *"
                        required
                      />
                    ) : (
                      <div>
                        <label className="font-weight-bold mb-2">Category *</label>
                        <div className="form-control d-flex align-items-center bg-info text-white" style={{ border: '1px solid #17a2b8' }}>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-flag mr-2"></i>
                            <span className="font-weight-bold">Contribution</span>
                            <span className="badge badge-light text-info ml-2">
                              <i className="fas fa-magic mr-1"></i>Auto-selected
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  {modalState.validationErrors.transactionCategory && (
                    <div className="invalid-feedback d-block">{modalState.validationErrors.transactionCategory}</div>
                  )}
                                  
                  {/* Contribution Information Display */}
                  {modalState.transactionData.type === 'contribution' && (
                    <div className="card mt-3 border-left-info shadow-sm mb-4">
                      <div className="card-body py-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="d-flex align-items-center mb-2">
                              <div>
                                <div className="font-weight-bold text-info">
                                  <i className="fas fa-flag mr-2"></i>
                                  Contribution Transaction
                                </div>
                                <div className="text-sm text-gray-600">
                                  Category: Contribution • Goal: Required for contributions
                                </div>
                              </div>
                            </div>
                                            
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                                Category & Goal
                              </span>
                              <span className="text-xs text-info font-weight-bold">
                                Auto-assigned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                {/* Transaction Date */}
                <div className="form-group mb-4">
                  <label className="font-weight-bold mb-2">Date *</label>
                  <input
                    type="date"
                    className={`form-control form-control-lg ${modalState.validationErrors.transactionDate ? 'is-invalid' : ''}`}
                    value={modalState.transactionData.date}
                    onChange={(e) => updateTransactionData({ date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {modalState.validationErrors.transactionDate && (
                    <div className="invalid-feedback">{modalState.validationErrors.transactionDate}</div>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                {/* Goal Selector - Required for Contributions OR Goal Creation Button if no goals */}
                <div className="form-group mb-4">
                  {hasGoals === false ? (
                    // Show goal creation button when no goals are available
                    <div>
                      <label className="font-weight-bold text-gray-800">
                        {modalState.transactionData.type === 'contribution' ? 'Goal *' : 'Goal Assignment (Optional)'}
                      </label>
                      <div className="card border-dashed border-primary bg-light text-center py-4">
                        <div className="card-body">
                          <i className="fas fa-flag fa-3x text-primary mb-3"></i>
                          <h5 className="text-primary mb-2">No Goals Available</h5>
                          <p className="text-muted mb-3">
                            {modalState.transactionData.type === 'contribution' 
                              ? 'You need to create a goal before making a contribution transaction.'
                              : 'Create your first financial goal to track your progress.'}
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            onClick={() => {
                              // Navigate to goals creation page
                              navigate('/goals/create');
                            }}
                          >
                            <i className="fas fa-plus mr-2"></i>
                            Create Your First Goal
                          </button>
                          {modalState.transactionData.type === 'contribution' && (
                            <div className="mt-3">
                              <small className="text-danger">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Goal creation is required for contribution transactions
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Show normal GoalSelector when goals are available or loading
                    <GoalSelector
                      selectedGoal={modalState.transactionData.goal_id ? {
                        id: modalState.transactionData.goal_id,
                        goal_name: modalState.transactionData.goal_name || '',
                        target_amount: 0,
                        current_amount: 0,
                        target_date: '',
                        priority: 'medium',
                        status: 'in_progress',
                        is_family_goal: false
                      } : null}
                      onGoalSelect={(goal) => {
                        updateTransactionData({ 
                          goal_id: goal?.id || undefined, 
                          goal_name: goal?.goal_name || undefined 
                        });
                        
                        // Auto-set "Contribution" category for contribution transactions when goal is selected
                        if (modalState.transactionData.type === 'contribution' && goal) {
                          const contributionCategory = expenseCategories.find(cat => 
                            cat.category_name === 'Contribution'
                          );
                          
                          if (contributionCategory) {
                            updateTransactionData({ 
                              category_id: contributionCategory.id,
                              category_name: contributionCategory.category_name
                            });
                          }
                        }
                        // Legacy logic: If a goal is selected and it's an expense transaction, automatically set it to "Contribution" category
                        else if (goal && modalState.transactionData.type === 'expense') {
                          const contributionCategory = expenseCategories.find(cat => 
                            cat.category_name === 'Contribution'
                          );
                          
                          if (contributionCategory) {
                            updateTransactionData({ 
                              category_id: contributionCategory.id,
                              category_name: contributionCategory.category_name
                            });
                          }
                        }
                      }}
                      className={`mb-4 ${modalState.validationErrors.transactionGoal ? 'is-invalid' : ''}`}
                      required={modalState.transactionData.type === 'contribution'}
                      label={modalState.transactionData.type === 'contribution' ? 'Goal *' : 'Goal Assignment (Optional)'}
                      isContributionType={modalState.transactionData.type === 'contribution'}
                      showValidationError={!!modalState.validationErrors.transactionGoal}
                      onGoalsLoaded={setHasGoals}
                    />
                  )}
                  {modalState.validationErrors.transactionGoal && (
                    <div className="invalid-feedback d-block">{modalState.validationErrors.transactionGoal}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Display selected goal info */}
            {modalState.transactionData.goal_id && modalState.transactionData.goal_name && (
              <div className="card bg-white shadow mb-4">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Associated Goal
                        {modalState.transactionData.type === 'contribution' && (
                          <span className="badge badge-info ml-2">
                            <i className="fas fa-flag mr-1"></i> Contribution Target
                          </span>
                        )}
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-primary d-flex align-items-center">
                        {modalState.transactionData.goal_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Goal will be updated when transaction is created
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-flag fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="form-group mb-4">
              <label className="font-weight-bold mb-2">Description *</label>
              <textarea
                className={`form-control ${modalState.validationErrors.transactionDescription ? 'is-invalid' : ''}`}
                rows={3}
                value={modalState.transactionData.description}
                onChange={(e) => updateTransactionData({ description: e.target.value })}
                placeholder="What was this transaction for?"
              />
              {modalState.validationErrors.transactionDescription && (
                <div className="invalid-feedback">{modalState.validationErrors.transactionDescription}</div>
              )}
              <small className="form-text text-muted">Provide details to help track your spending</small>
            </div>
          </form>
        </div>
      </div>

      {/* Navigation */}
      <div className="d-flex justify-content-between pt-4 mt-4" style={{ borderTop: '1px solid #dee2e6' }}>
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-outline-secondary btn-lg"
        >
          <i className="fas fa-arrow-left me-2"></i>Back to Workflow
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isStepValid}
          className="btn btn-primary btn-lg"
        >
          Continue <i className="fas fa-arrow-right ms-2"></i>
        </button>
      </div>
    </div>
  );
};

export default TransactionSetupStep;