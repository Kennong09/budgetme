import React, { FC, memo, useCallback } from 'react';
import { CashInFormData, ModalState, ValidationErrors, NavigationHandlers } from '../types/AccountSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';

interface Props {
  modalState: ModalState;
  updateCashInData: (updates: Partial<CashInFormData>) => void;
  updateValidationErrors: (errors: Partial<ValidationErrors>) => void;
  navigationHandlers: NavigationHandlers;
}

const CashInSetupStep: FC<Props> = memo(({
  modalState,
  updateCashInData,
  updateValidationErrors,
  navigationHandlers
}) => {
  const [localErrors, setLocalErrors] = React.useState<ValidationErrors>({});
  const [skipCashIn, setSkipCashIn] = React.useState(false);
  const [showBudgetPlanning, setShowBudgetPlanning] = React.useState(false);

  const handleInputChange = useCallback((field: keyof CashInFormData, value: any) => {
    updateCashInData({ [field]: value });

    // Clear validation error for this field
    if (localErrors[`cash_in_${field}` as string]) {
      const newErrors = { ...localErrors };
      delete newErrors[`cash_in_${field}` as string];
      setLocalErrors(newErrors);
      updateValidationErrors({ [`cash_in_${field}` as string]: undefined });
    }

    // Real-time validation for amount
    if (field === 'amount' && value !== null && value !== undefined) {
      const errors = ValidationEngine.validateCashInData({ 
        ...modalState.cashInData, 
        [field]: value 
      });
      if (errors.cash_in_amount) {
        setLocalErrors(prev => ({ ...prev, cash_in_amount: errors.cash_in_amount }));
        updateValidationErrors({ cash_in_amount: errors.cash_in_amount });
      }
    }
  }, [modalState.cashInData, localErrors, updateCashInData, updateValidationErrors]);

  const handleNext = useCallback(() => {
    if (skipCashIn) {
      // Skip cash-in, proceed to confirmation
      navigationHandlers.onNext?.();
      return;
    }

    // Check if user has entered any cash-in data (either amount OR description)
    const hasCashInData = modalState.cashInData.amount > 0 || modalState.cashInData.description.trim() !== '';
    
    if (!hasCashInData) {
      // No cash-in data entered, treat as skip and proceed without validation
      navigationHandlers.onNext?.();
      return;
    }

    // Validate cash-in data only if user started entering values
    const errors = ValidationEngine.validateCashInData(modalState.cashInData);
    if (!ValidationEngine.hasValidationErrors(errors)) {
      navigationHandlers.onNext?.();
    } else {
      setLocalErrors(errors);
      updateValidationErrors(errors);
    }
  }, [skipCashIn, modalState.cashInData, navigationHandlers, updateValidationErrors]);

  const addBudgetAllocation = () => {
    const currentAllocations = modalState.cashInData.budget_allocation || [];
    updateCashInData({
      budget_allocation: [
        ...currentAllocations,
        {
          category_name: '',
          allocated_amount: 0,
          notes: ''
        }
      ]
    });
  };

  const removeBudgetAllocation = (index: number) => {
    const currentAllocations = modalState.cashInData.budget_allocation || [];
    const newAllocations = currentAllocations.filter((_, i) => i !== index);
    updateCashInData({ budget_allocation: newAllocations });
  };

  const updateBudgetAllocation = (index: number, field: string, value: any) => {
    const currentAllocations = modalState.cashInData.budget_allocation || [];
    const newAllocations = [...currentAllocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    updateCashInData({ budget_allocation: newAllocations });
  };

  const commonSources = [
    'Salary/Wages',
    'Freelance Income',
    'Investment Returns',
    'Gift/Bonus',
    'Transfer from Another Account',
    'Cash Deposit',
    'Refund',
    'Other Income'
  ];

  const totalAllocated = (modalState.cashInData.budget_allocation || [])
    .reduce((sum, allocation) => sum + (allocation.allocated_amount || 0), 0);

  const remainingAmount = modalState.cashInData.amount - totalAllocated;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Add Initial Funds (Optional)
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          You can add initial funds to your account now, or skip this step and add money later.
        </p>
      </div>

      {/* Skip Cash-In Option */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="skip_cash_in"
              checked={skipCashIn}
              onChange={(e) => setSkipCashIn(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="skip_cash_in" className="ml-2 block text-sm text-gray-900">
              Skip for now - I'll add funds later
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            You can always add funds to your account after it's created
          </p>
        </div>
      </div>

      {!skipCashIn && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Cash-In Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Add *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">₱</span>
              <input
                type="number"
                step="0.01"
                value={modalState.cashInData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  (localErrors.cash_in_amount || modalState.validationErrors.cash_in_amount) 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
              />
            </div>
            {(localErrors.cash_in_amount || modalState.validationErrors.cash_in_amount) && (
              <p className="text-red-600 text-sm mt-1">
                {localErrors.cash_in_amount || modalState.validationErrors.cash_in_amount}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={modalState.cashInData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g., Initial deposit, Salary transfer, Gift money"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                (localErrors.cash_in_description || modalState.validationErrors.cash_in_description) 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              maxLength={200}
            />
            {(localErrors.cash_in_description || modalState.validationErrors.cash_in_description) && (
              <p className="text-red-600 text-sm mt-1">
                {localErrors.cash_in_description || modalState.validationErrors.cash_in_description}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={modalState.cashInData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source (Optional)
            </label>
            <div className="space-y-2">
              <select
                value={modalState.cashInData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a source...</option>
                {commonSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <input
                type="text"
                value={modalState.cashInData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="Or enter custom source"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
          </div>

          {/* Budget Planning Toggle */}
          {modalState.cashInData.amount > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Budget Planning</h4>
                  <p className="text-sm text-blue-700">
                    Plan how you want to allocate this money across different spending categories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBudgetPlanning(!showBudgetPlanning)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  {showBudgetPlanning ? 'Hide' : 'Show'} Planning
                </button>
              </div>
            </div>
          )}

          {/* Budget Allocation Planning */}
          {showBudgetPlanning && modalState.cashInData.amount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Budget Allocation</h4>
                <button
                  type="button"
                  onClick={addBudgetAllocation}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-3 md:py-2 rounded text-xs md:text-sm flex items-center space-x-1"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {modalState.cashInData.budget_allocation?.map((allocation, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-800">Category #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeBudgetAllocation(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={allocation.category_name}
                        onChange={(e) => updateBudgetAllocation(index, 'category_name', e.target.value)}
                        placeholder="e.g., Food, Transportation, Entertainment"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allocated Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-500 text-sm">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          value={allocation.allocated_amount || ''}
                          onChange={(e) => updateBudgetAllocation(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={allocation.notes || ''}
                      onChange={(e) => updateBudgetAllocation(index, 'notes', e.target.value)}
                      placeholder="Additional notes about this allocation"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}

              {/* Allocation Summary */}
              {(modalState.cashInData.budget_allocation?.length || 0) > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Cash-In Amount:</span>
                      <span className="font-medium">₱{modalState.cashInData.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Allocated:</span>
                      <span className="font-medium">₱{totalAllocated.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between font-medium ${remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Remaining:</span>
                      <span>₱{remainingAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {remainingAmount < 0 && (
                    <p className="text-red-600 text-xs mt-2">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      Over-allocated by ₱{Math.abs(remainingAmount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons - Desktop only (mobile uses fixed footer) */}
      <div className="hidden md:flex justify-between pt-6">
        <button
          onClick={navigationHandlers.onPrevious}
          className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center space-x-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white px-6 py-3 rounded-lg transition-colors duration-200"
        >
          <span>Review & Create</span>
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
});

CashInSetupStep.displayName = 'CashInSetupStep';

export default CashInSetupStep;
