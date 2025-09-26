import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { PreTransactionValidationService } from '../../../services/preTransactionValidationService';
import { BudgetFormData, TransactionFormData } from '../types/BudgetSetupTypes';

interface Props {
  budgetData: BudgetFormData;
  transactionData: TransactionFormData;
  onTransactionDataUpdate: (updates: Partial<TransactionFormData>) => void;
  onValidationUpdate: (errors: Record<string, string>, warnings: Record<string, string>) => void;
  isVisible: boolean;
}

interface AccountSetupState {
  isValidating: boolean;
  hasAccounts: boolean;
  requiresSetup: boolean;
  isSettingUp: boolean;
  setupError?: string;
  setupComplete: boolean;
}

/**
 * Smart Transaction Helper Component
 * Handles account setup validation, smart defaults, and transaction suggestions
 * for budget-first workflows
 */
const SmartTransactionHelper: React.FC<Props> = ({
  budgetData,
  transactionData,
  onTransactionDataUpdate,
  onValidationUpdate,
  isVisible
}) => {
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast, showInfoToast } = useToast();
  
  const [accountSetupState, setAccountSetupState] = useState<AccountSetupState>({
    isValidating: false,
    hasAccounts: false,
    requiresSetup: false,
    isSettingUp: false,
    setupComplete: false
  });
  
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  
  // Validate account setup when component becomes visible
  useEffect(() => {
    if (isVisible && user && !accountSetupState.isValidating) {
      validateAccountSetup();
    }
  }, [isVisible, user]);
  
  // Auto-populate transaction data when budget data is complete
  useEffect(() => {
    if (budgetData.category_id && budgetData.amount > 0 && accountSetupState.hasAccounts) {
      autoPopulateTransactionData();
    }
  }, [budgetData, accountSetupState.hasAccounts]);
  
  const validateAccountSetup = async () => {
    if (!user) return;
    
    setAccountSetupState(prev => ({ ...prev, isValidating: true }));
    
    try {
      const accountValidation = await PreTransactionValidationService.validateAccountSetup(user.id);
      
      setAccountSetupState(prev => ({
        ...prev,
        isValidating: false,
        hasAccounts: accountValidation.hasAccounts,
        requiresSetup: accountValidation.requiresSetup,
        setupError: undefined
      }));
      
      setAvailableAccounts(accountValidation.availableAccounts);
      
      // If no accounts, show setup notification
      if (accountValidation.requiresSetup) {
        showInfoToast('You need to set up an account first. Click "Set Up Account" to continue.');
      }
      
    } catch (error) {
      console.error('Error validating account setup:', error);
      setAccountSetupState(prev => ({
        ...prev,
        isValidating: false,
        setupError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };
  
  const triggerAccountSetup = async () => {
    if (!user) return;
    
    setAccountSetupState(prev => ({ ...prev, isSettingUp: true, setupError: undefined }));
    
    try {
      const setupResult = await PreTransactionValidationService.triggerAccountSetup(user.id);
      
      if (setupResult.success) {
        showSuccessToast(`Account setup completed! ${setupResult.setupDetails?.accountsCreated || 1} account(s) created.`);
        
        setAccountSetupState(prev => ({
          ...prev,
          isSettingUp: false,
          hasAccounts: true,
          requiresSetup: false,
          setupComplete: true
        }));
        
        // Refresh account validation
        await validateAccountSetup();
        
      } else {
        throw new Error(setupResult.error || 'Account setup failed');
      }
      
    } catch (error) {
      console.error('Error setting up accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set up accounts';
      
      setAccountSetupState(prev => ({
        ...prev,
        isSettingUp: false,
        setupError: errorMessage
      }));
      
      showErrorToast(errorMessage);
    }
  };
  
  const autoPopulateTransactionData = () => {
    if (!accountSetupState.hasAccounts || availableAccounts.length === 0) return;
    
    const defaultAccount = availableAccounts.find(acc => acc.is_default) || availableAccounts[0];
    
    const autoPopulated = PreTransactionValidationService.autoPopulateTransactionData(
      budgetData,
      defaultAccount
    );
    
    // Only update if current transaction data is mostly empty
    const shouldAutoPopulate = 
      !transactionData.category_id || 
      !transactionData.account_id || 
      transactionData.amount === 0;
    
    if (shouldAutoPopulate) {
      onTransactionDataUpdate(autoPopulated);
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-800">Smart Transaction Helper</h3>
        <div className="text-xs text-blue-600">
          Budget-First Workflow
        </div>
      </div>
      
      {/* Account Setup Section */}
      {accountSetupState.requiresSetup && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">Account Setup Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You need to set up at least one account before creating transactions.
              </p>
              <div className="mt-2">
                <button
                  onClick={triggerAccountSetup}
                  disabled={accountSetupState.isSettingUp}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  {accountSetupState.isSettingUp ? 'Setting up...' : 'Set Up Account'}
                </button>
              </div>
              {accountSetupState.setupError && (
                <p className="text-sm text-red-600 mt-2">{accountSetupState.setupError}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Setup Complete Success */}
      {accountSetupState.setupComplete && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-green-800">✓ Account setup completed!</span>
          </div>
        </div>
      )}
      
      {/* Account Status */}
      {accountSetupState.hasAccounts && (
        <div className="text-xs text-blue-600">
          ✓ {availableAccounts.length} account(s) available
          {availableAccounts.find(acc => acc.is_default) && (
            <span className="ml-2">• Default: {availableAccounts.find(acc => acc.is_default)?.account_name}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartTransactionHelper;