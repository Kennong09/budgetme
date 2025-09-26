import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { PreTransactionValidationService } from '../../services/preTransactionValidationService';
import { UserOnboardingService } from '../../services/userOnboardingService';
import { BudgetFormData, TransactionFormData } from '../budget/types/BudgetSetupTypes';

interface BudgetFirstValidationState {
  // Account setup state
  accountSetup: {
    isValidating: boolean;
    hasAccounts: boolean;
    requiresSetup: boolean;
    isSettingUp: boolean;
    setupError?: string;
    availableAccounts: any[];
  };
  
  // Validation state
  validation: {
    isValidating: boolean;
    canProceed: boolean;
    budgetErrors: Record<string, string>;
    transactionErrors: Record<string, string>;
    consistencyErrors: Record<string, string>;
    warnings: Record<string, string>;
  };
  
  // Smart suggestions
  suggestions: {
    transactionSuggestions: any[];
    autoPopulated: boolean;
  };
}

interface UseBudgetFirstValidationOptions {
  autoValidate?: boolean;
  autoSetup?: boolean;
  enableSuggestions?: boolean;
}

/**
 * Custom hook for managing budget-first workflow validation,
 * account setup integration, and recovery strategies
 */
export const useBudgetFirstValidation = (
  budgetData: BudgetFormData,
  transactionData: TransactionFormData,
  options: UseBudgetFirstValidationOptions = {}
) => {
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast, showInfoToast } = useToast();
  
  const {
    autoValidate = true,
    autoSetup = false,
    enableSuggestions = true
  } = options;
  
  const [state, setState] = useState<BudgetFirstValidationState>({
    accountSetup: {
      isValidating: false,
      hasAccounts: false,
      requiresSetup: false,
      isSettingUp: false,
      availableAccounts: []
    },
    validation: {
      isValidating: false,
      canProceed: false,
      budgetErrors: {},
      transactionErrors: {},
      consistencyErrors: {},
      warnings: {}
    },
    suggestions: {
      transactionSuggestions: [],
      autoPopulated: false
    }
  });
  
  // Validate account setup
  const validateAccountSetup = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({
      ...prev,
      accountSetup: { ...prev.accountSetup, isValidating: true }
    }));
    
    try {
      const accountValidation = await PreTransactionValidationService.validateAccountSetup(user.id);
      
      setState(prev => ({
        ...prev,
        accountSetup: {
          ...prev.accountSetup,
          isValidating: false,
          hasAccounts: accountValidation.hasAccounts,
          requiresSetup: accountValidation.requiresSetup,
          availableAccounts: accountValidation.availableAccounts,
          setupError: undefined
        }
      }));
      
      // Auto-trigger setup if enabled and required
      if (autoSetup && accountValidation.requiresSetup) {
        await triggerAccountSetup();
      }
      
      return accountValidation;
    } catch (error) {
      console.error('Error validating account setup:', error);
      setState(prev => ({
        ...prev,
        accountSetup: {
          ...prev.accountSetup,
          isValidating: false,
          setupError: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      throw error;
    }
  }, [user, autoSetup]);
  
  // Trigger account setup
  const triggerAccountSetup = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({
      ...prev,
      accountSetup: { 
        ...prev.accountSetup, 
        isSettingUp: true, 
        setupError: undefined 
      }
    }));
    
    try {
      const setupResult = await PreTransactionValidationService.triggerAccountSetup(user.id);
      
      if (setupResult.success) {
        showSuccessToast(`Account setup completed! ${setupResult.setupDetails?.accountsCreated || 1} account(s) created.`);
        
        setState(prev => ({
          ...prev,
          accountSetup: {
            ...prev.accountSetup,
            isSettingUp: false,
            hasAccounts: true,
            requiresSetup: false
          }
        }));
        
        // Refresh account validation
        await validateAccountSetup();
        
        return { success: true };
      } else {
        throw new Error(setupResult.error || 'Account setup failed');
      }
      
    } catch (error) {
      console.error('Error setting up accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set up accounts';
      
      setState(prev => ({
        ...prev,
        accountSetup: {
          ...prev.accountSetup,
          isSettingUp: false,
          setupError: errorMessage
        }
      }));
      
      showErrorToast(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user, showErrorToast, showSuccessToast, validateAccountSetup]);
  
  // Comprehensive validation
  const validateBudgetFirstWorkflow = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({
      ...prev,
      validation: { ...prev.validation, isValidating: true }
    }));
    
    try {
      const validation = await PreTransactionValidationService.validateBudgetFirstWorkflow(
        user.id,
        budgetData,
        transactionData
      );
      
      setState(prev => ({
        ...prev,
        validation: {
          ...prev.validation,
          isValidating: false,
          canProceed: validation.canProceed,
          budgetErrors: validation.budgetValidation.errors,
          transactionErrors: validation.transactionValidation.errors,
          consistencyErrors: validation.consistencyValidation.errors,
          warnings: {
            ...validation.budgetValidation.warnings,
            ...validation.transactionValidation.warnings,
            ...validation.consistencyValidation.warnings,
            ...(validation.accountValidation?.warnings || {})
          }
        },
        suggestions: {
          ...prev.suggestions,
          transactionSuggestions: validation.suggestions
        }
      }));
      
      return validation;
    } catch (error) {
      console.error('Error validating budget-first workflow:', error);
      setState(prev => ({
        ...prev,
        validation: { ...prev.validation, isValidating: false }
      }));
      throw error;
    }
  }, [user, budgetData, transactionData]);
  
  // Auto-populate transaction data
  const autoPopulateTransactionData = useCallback(() => {
    if (!state.accountSetup.hasAccounts || state.accountSetup.availableAccounts.length === 0) {
      return null;
    }
    
    const defaultAccount = state.accountSetup.availableAccounts.find(acc => acc.is_default) || 
                          state.accountSetup.availableAccounts[0];
    
    const autoPopulated = PreTransactionValidationService.autoPopulateTransactionData(
      budgetData,
      defaultAccount
    );
    
    setState(prev => ({
      ...prev,
      suggestions: { ...prev.suggestions, autoPopulated: true }
    }));
    
    return autoPopulated;
  }, [state.accountSetup.hasAccounts, state.accountSetup.availableAccounts, budgetData]);
  
  // Generate smart suggestions
  const generateSuggestions = useCallback(() => {
    if (!enableSuggestions) return [];
    
    const suggestions = PreTransactionValidationService.generateTransactionSuggestions(budgetData);
    
    setState(prev => ({
      ...prev,
      suggestions: { ...prev.suggestions, transactionSuggestions: suggestions }
    }));
    
    return suggestions;
  }, [budgetData, enableSuggestions]);
  
  // Auto-correct transaction data for consistency
  const autoCorrectTransactionData = useCallback(() => {
    if (!state.accountSetup.hasAccounts) return null;
    
    const defaultAccount = state.accountSetup.availableAccounts.find(acc => acc.is_default) || 
                          state.accountSetup.availableAccounts[0];
    
    return PreTransactionValidationService.autoCorrectTransactionData(
      budgetData,
      transactionData,
      defaultAccount
    );
  }, [budgetData, transactionData, state.accountSetup.hasAccounts, state.accountSetup.availableAccounts]);
  
  // Recovery strategies
  const recoveryStrategies = {
    // Handle missing accounts
    handleMissingAccounts: async () => {
      if (state.accountSetup.requiresSetup) {
        showInfoToast('Setting up your first account...');
        return await triggerAccountSetup();
      }
      return { success: true };
    },
    
    // Handle validation errors
    handleValidationErrors: () => {
      const allErrors = {
        ...state.validation.budgetErrors,
        ...state.validation.transactionErrors,
        ...state.validation.consistencyErrors
      };
      
      const errorCount = Object.keys(allErrors).length;
      if (errorCount > 0) {
        showErrorToast(`Please fix ${errorCount} validation error(s) before proceeding.`);
        return false;
      }
      return true;
    },
    
    // Handle category mismatch
    handleCategoryMismatch: () => {
      if (state.validation.consistencyErrors.categoryMismatch) {
        const correctedData = autoCorrectTransactionData();
        if (correctedData) {
          showInfoToast('Transaction category has been auto-corrected to match budget category.');
          return correctedData;
        }
      }
      return null;
    }
  };
  
  // Auto-validation when data changes
  useEffect(() => {
    if (autoValidate && user) {
      validateAccountSetup();
    }
  }, [validateAccountSetup, autoValidate, user]);
  
  useEffect(() => {
    if (autoValidate && state.accountSetup.hasAccounts) {
      validateBudgetFirstWorkflow();
    }
  }, [validateBudgetFirstWorkflow, autoValidate, budgetData, transactionData, state.accountSetup.hasAccounts]);
  
  useEffect(() => {
    if (enableSuggestions && budgetData.amount > 0) {
      generateSuggestions();
    }
  }, [generateSuggestions, enableSuggestions, budgetData]);
  
  return {
    state,
    actions: {
      validateAccountSetup,
      triggerAccountSetup,
      validateBudgetFirstWorkflow,
      autoPopulateTransactionData,
      generateSuggestions,
      autoCorrectTransactionData
    },
    recoveryStrategies,
    
    // Convenience getters
    get hasValidationErrors() {
      const allErrors = {
        ...state.validation.budgetErrors,
        ...state.validation.transactionErrors,
        ...state.validation.consistencyErrors
      };
      return Object.keys(allErrors).length > 0;
    },
    
    get canProceedSafely() {
      return state.accountSetup.hasAccounts && 
             state.validation.canProceed && 
             !this.hasValidationErrors;
    },
    
    get needsAccountSetup() {
      return state.accountSetup.requiresSetup;
    },
    
    get isLoading() {
      return state.accountSetup.isValidating || 
             state.accountSetup.isSettingUp || 
             state.validation.isValidating;
    }
  };
};