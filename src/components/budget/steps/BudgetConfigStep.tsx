import React, { useMemo } from 'react';
import { BudgetAmountInput } from '../../common/CentavoInput';
import { BudgetPeriod, StepComponentProps, NavigationHandlers } from '../types/BudgetSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';

// Category interface
interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface BudgetConfigStepProps extends StepComponentProps {
  navigationHandlers: NavigationHandlers;
  expenseCategories: Category[];
  incomeCategories: Category[];
  categoriesLoading: boolean;
}

const BudgetConfigStep: React.FC<BudgetConfigStepProps> = ({ 
  modalState, 
  updateBudgetData, 
  updateValidationErrors,
  navigateToStep,
  navigationHandlers,
  expenseCategories,
  incomeCategories,
  categoriesLoading
}) => {
  
  // Memoize validation to prevent infinite re-renders
  const isStepValid = useMemo(() => {
    const errors = ValidationEngine.validateBudgetData(modalState.budgetData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.budgetData]);

  const validateStep = (): boolean => {
    const errors = ValidationEngine.validateBudgetData(modalState.budgetData);
    updateValidationErrors(errors);
    return !ValidationEngine.hasValidationErrors(errors);
  };

  const handleNext = () => {
    if (validateStep()) {
      navigateToStep('transaction_create');
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
            {/* Budget Name */}
            <div className="form-group">
              <label htmlFor="budget_name" className="font-weight-bold text-gray-800">
                Budget Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="budget_name"
                name="budget_name"
                value={modalState.budgetData.budget_name}
                onChange={(e) => updateBudgetData({ budget_name: e.target.value })}
                className={`form-control form-control-user ${modalState.validationErrors.budgetName ? 'is-invalid' : ''}`}
                placeholder="Enter budget name (e.g., Monthly Food Budget)"
                maxLength={100}
                pattern="[^%.*]+"
                title="Budget name cannot contain %, ., or * characters"
                required
              />
              {modalState.validationErrors.budgetName && (
                <div className="invalid-feedback">{modalState.validationErrors.budgetName}</div>
              )}
              <small className="form-text text-muted">
                Give your budget a descriptive name (avoid special characters like %, ., *)
              </small>
            </div>
            
            <div className="row">
              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor="category_id" className="font-weight-bold text-gray-800">
                    Category <span className="text-danger">*</span>
                  </label>
                  {categoriesLoading ? (
                    <div className="d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm mr-2" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <span className="text-muted">Loading categories...</span>
                    </div>
                  ) : (
                    <select
                      id="category_id"
                      name="category_id"
                      value={modalState.budgetData.category_id}
                      onChange={(e) => {
                        const selectedCategory = expenseCategories.find(cat => cat.id === e.target.value);
                        updateBudgetData({ 
                          category_id: e.target.value, 
                          category_name: selectedCategory?.category_name || '' 
                        });
                      }}
                      className={`form-control ${modalState.validationErrors.budgetCategory ? 'is-invalid' : ''}`}
                      required
                    >
                      <option value="">Select Category</option>
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {modalState.validationErrors.budgetCategory && (
                    <div className="invalid-feedback d-block">{modalState.validationErrors.budgetCategory}</div>
                  )}
                </div>
              </div>

              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor="period" className="font-weight-bold text-gray-800">
                    Period <span className="text-danger">*</span>
                  </label>
                  <select
                    id="period"
                    name="period"
                    value={modalState.budgetData.period}
                    onChange={(e) => updateBudgetData({ period: e.target.value as BudgetPeriod })}
                    className={`form-control ${modalState.validationErrors.budgetPeriod ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Yearly</option>
                  </select>
                  {modalState.validationErrors.budgetPeriod && (
                    <div className="invalid-feedback">{modalState.validationErrors.budgetPeriod}</div>
                  )}
                </div>
              </div>

              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor="startDate" className="font-weight-bold text-gray-800">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="month"
                    id="startDate"
                    name="startDate"
                    value={modalState.budgetData.start_date}
                    onChange={(e) => updateBudgetData({ start_date: e.target.value })}
                    className={`form-control form-control-user ${modalState.validationErrors.budgetStartDate ? 'is-invalid' : ''}`}
                    required
                  />
                  {modalState.validationErrors.budgetStartDate && (
                    <div className="invalid-feedback">{modalState.validationErrors.budgetStartDate}</div>
                  )}
                  <small className="form-text text-muted">
                    When does this budget start?
                  </small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mx-auto">
                <BudgetAmountInput
                  value={modalState.budgetData.amount}
                  onChange={(amount) => updateBudgetData({ amount })}
                  currency="PHP"
                  label="Amount"
                  placeholder="0.00"
                  required={true}
                  suggestedAmounts={[1000, 2500, 5000, 10000, 15000, 25000]}
                  className={modalState.validationErrors.budgetAmount ? 'is-invalid' : ''}
                />
                {modalState.validationErrors.budgetAmount && (
                  <div className="invalid-feedback d-block">{modalState.validationErrors.budgetAmount}</div>
                )}
              </div>
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

export default BudgetConfigStep;