import React, { FC, memo, useCallback } from 'react';
import { AccountFormData, ModalState, ValidationErrors, NavigationHandlers, AccountType } from '../types/AccountSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';
import { ACCOUNT_COLORS } from '../../settings/types';

interface Props {
  modalState: ModalState;
  updateAccountData: (updates: Partial<AccountFormData>) => void;
  updateValidationErrors: (errors: Partial<ValidationErrors>) => void;
  navigationHandlers: NavigationHandlers;
}

const AccountConfigStep: FC<Props> = memo(({
  modalState,
  updateAccountData,
  updateValidationErrors,
  navigationHandlers
}) => {
  const [localErrors, setLocalErrors] = React.useState<ValidationErrors>({});

  const accountTypeRules = ValidationEngine.getAccountTypeRules(modalState.accountData.account_type);

  const handleInputChange = useCallback((field: keyof AccountFormData, value: any) => {
    // Update the data
    updateAccountData({ [field]: value });

    // Clear the error for this field if it exists
    if (localErrors[field as string]) {
      const newErrors = { ...localErrors };
      delete newErrors[field as string];
      setLocalErrors(newErrors);
      updateValidationErrors({ [field as string]: undefined });
    }

    // Real-time validation for specific fields
    if (field === 'account_name' && value) {
      const nameError = ValidationEngine.validateAccountData({ 
        ...modalState.accountData, 
        [field]: value 
      }).account_name;
      if (nameError) {
        setLocalErrors(prev => ({ ...prev, account_name: nameError }));
        updateValidationErrors({ account_name: nameError });
      }
    }

    if (field === 'initial_balance' && value !== null && value !== undefined) {
      const balanceError = ValidationEngine.validateAccountData({ 
        ...modalState.accountData, 
        [field]: value 
      }).initial_balance;
      if (balanceError) {
        setLocalErrors(prev => ({ ...prev, initial_balance: balanceError }));
        updateValidationErrors({ initial_balance: balanceError });
      }
    }
  }, [modalState.accountData, localErrors, updateAccountData, updateValidationErrors]);

  const handleNext = useCallback(() => {
    const errors = ValidationEngine.validateAccountData(modalState.accountData);
    if (!ValidationEngine.hasValidationErrors(errors)) {
      navigationHandlers.onNext?.();
    } else {
      setLocalErrors(errors);
      updateValidationErrors(errors);
    }
  }, [modalState.accountData, navigationHandlers, updateValidationErrors]);

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'checking': return 'fas fa-university';
      case 'savings': return 'fas fa-piggy-bank';
      case 'credit': return 'fas fa-credit-card';
      case 'investment': return 'fas fa-chart-line';
      case 'cash': return 'fas fa-money-bill-wave';
      case 'other': return 'fas fa-wallet';
      default: return 'fas fa-bank';
    }
  };

  const formatAccountTypeTitle = (type: AccountType) => {
    switch (type) {
      case 'checking': return 'Checking Account';
      case 'savings': return 'Savings Account';
      case 'credit': return 'Credit Card';
      case 'investment': return 'Investment Account';
      case 'cash': return 'Cash Wallet';
      case 'other': return 'Other Account';
      default: return 'Account';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <i className={`${getAccountTypeIcon(modalState.accountData.account_type)} text-2xl text-blue-600`}></i>
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-bold text-gray-900">
              Configure Your {formatAccountTypeTitle(modalState.accountData.account_type)}
            </h2>
            <p className="text-gray-600">Set up the basic details for your new account</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Name *
          </label>
          <input
            type="text"
            value={modalState.accountData.account_name}
            onChange={(e) => handleInputChange('account_name', e.target.value)}
            placeholder={`My ${formatAccountTypeTitle(modalState.accountData.account_type)}`}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              (localErrors.account_name || modalState.validationErrors.account_name) 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
            }`}
            maxLength={50}
          />
          {(localErrors.account_name || modalState.validationErrors.account_name) && (
            <p className="text-red-600 text-sm mt-1">
              {localErrors.account_name || modalState.validationErrors.account_name}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Choose a descriptive name to easily identify this account
          </p>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Balance *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">₱</span>
            <input
              type="number"
              step="0.01"
              value={modalState.accountData.initial_balance || ''}
              onChange={(e) => handleInputChange('initial_balance', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                (localErrors.initial_balance || modalState.validationErrors.initial_balance) 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
          </div>
          {(localErrors.initial_balance || modalState.validationErrors.initial_balance) && (
            <p className="text-red-600 text-sm mt-1">
              {localErrors.initial_balance || modalState.validationErrors.initial_balance}
            </p>
          )}
          
          {/* Account Type Specific Balance Rules */}
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div>
                <p className="text-sm font-medium text-blue-900">Balance Guidelines:</p>
                <p className="text-sm text-blue-700">{accountTypeRules.balanceRules}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Institution Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Institution Name (Optional)
          </label>
          <input
            type="text"
            value={modalState.accountData.institution_name || ''}
            onChange={(e) => handleInputChange('institution_name', e.target.value)}
            placeholder="e.g., BPI, Metrobank, Chase Bank"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            The bank or financial institution where this account is held
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={modalState.accountData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional notes about this account's purpose or details..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional notes about the account's purpose or special details
          </p>
        </div>

        {/* Account Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Color
          </label>
          <div className="flex flex-wrap gap-3">
            {ACCOUNT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleInputChange('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                  modalState.accountData.color === color
                    ? 'border-gray-800 scale-110 shadow-lg'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={`Select ${color}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Choose a color to help visually identify this account
          </p>
        </div>

        {/* Set as Default */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_default"
            checked={modalState.accountData.is_default}
            onChange={(e) => handleInputChange('is_default', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
            Set as default account
          </label>
        </div>

        {/* Account Type Recommendations */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="fas fa-lightbulb text-green-600 mt-0.5"></i>
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Recommendations for {formatAccountTypeTitle(modalState.accountData.account_type)}:
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                {accountTypeRules.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <i className="fas fa-check text-green-600 text-xs mt-1"></i>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

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
          <span>Continue</span>
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
});

AccountConfigStep.displayName = 'AccountConfigStep';

export default AccountConfigStep;
