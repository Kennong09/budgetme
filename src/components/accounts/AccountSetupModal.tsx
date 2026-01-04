import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import WorkflowChoiceStep from './steps/WorkflowChoiceStep';
import AccountTypeChoiceStep from './steps/AccountTypeChoiceStep';
import AccountConfigStep from './steps/AccountConfigStep';
import CashInSetupStep from './steps/CashInSetupStep';
import ReviewConfirmationStep from './steps/ReviewConfirmationStep';
import { 
  AccountType, 
  ExperienceLevel, 
  ModalStep, 
  ModalState, 
  AccountFormData, 
  CashInFormData, 
  ValidationErrors,
  AccountTypeChoiceData,
  AccountSetupResult,
  AccountAuditRecord,
  CashInTransaction,
  AccountSetupError,
  AccountErrorState
} from './types/AccountSetupTypes';
import { ValidationEngine } from './utils/ValidationEngine';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { AccountService } from '../../services/database/accountService';
import { TransactionService } from '../../services/database/transactionService';

// Import new refactored components
import AccountModalHeader from './components/AccountModalHeader';
import AccountSidebar from './components/AccountSidebar';
import AccountMobileFooter from './components/AccountMobileFooter';
import AccountSetupErrorModal from './components/AccountSetupErrorModal';

// Storage keys for persistence
const STORAGE_KEYS = {
  MODAL_STATE: 'accountSetupModal_state',
  ACCOUNT_TYPE_CHOICE: 'accountSetupModal_accountTypeChoice',
  ACCOUNT_DATA: 'accountSetupModal_accountData',
  CASH_IN_DATA: 'accountSetupModal_cashInData',
  CURRENT_STEP: 'accountSetupModal_currentStep'
};

// Utility functions for localStorage persistence
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const clearAllStoredData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
};

interface Props {
  isOpen?: boolean;
  show?: boolean;  // Backward compatibility
  onClose: () => void;
  onSubmit?: (accountData: AccountFormData, cashInData?: CashInFormData) => Promise<void>;
  onAccountCreated?: (accountData: AccountFormData) => void;  // Backward compatibility
}

const AccountSetupModal: React.FC<Props> = ({ 
  isOpen, 
  show, 
  onClose, 
  onSubmit, 
  onAccountCreated 
}) => {
  // Handle backward compatibility
  const modalIsOpen = isOpen || show || false;
  
  // Add auth and toast hooks
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast, showInfoToast } = useToast();
  
  // Calculate progress percentage based on current step
  const calculateProgress = (step: ModalStep): number => {
    const progressMap: Record<ModalStep, number> = {
      'workflow_choice': 20,
      'account_type_choice': 40,
      'account_config': 60,
      'cash_in_setup': 80,
      'review_confirmation': 100
    };
    return progressMap[step] || 20;
  };
  
  // Default onSubmit handler for backward compatibility
  const handleSubmitWrapper = onSubmit || (async (accountData: AccountFormData, cashInData?: CashInFormData) => {
    if (onAccountCreated) {
      onAccountCreated(accountData);
    }
  });

  // Add state for existing user accounts
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [hasExistingAccounts, setHasExistingAccounts] = useState(false);
  const [selectedExistingAccount, setSelectedExistingAccount] = useState<string | null>(null);
  const [workflowMode, setWorkflowMode] = useState<'create_account' | 'cash_in_existing'>('create_account');
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Enhanced error handling state
  const [errorState, setErrorState] = useState<AccountErrorState>({
    hasError: false,
    error: null,
    showErrorModal: false
  });

  const [modalState, setModalState] = useState<ModalState>(() => {
    // Load persisted state on initialization
    const savedState = loadFromLocalStorage(STORAGE_KEYS.MODAL_STATE);
    const savedAccountTypeChoice = loadFromLocalStorage(STORAGE_KEYS.ACCOUNT_TYPE_CHOICE);
    const savedAccountData = loadFromLocalStorage(STORAGE_KEYS.ACCOUNT_DATA);
    const savedCashInData = loadFromLocalStorage(STORAGE_KEYS.CASH_IN_DATA);
    const savedCurrentStep = loadFromLocalStorage(STORAGE_KEYS.CURRENT_STEP);
    
    const defaultState: ModalState = {
      currentStep: 'workflow_choice', // Start with workflow choice for all users
      accountTypeChoice: null,
      accountData: {
        account_name: '',
        account_type: 'checking',
        initial_balance: 0,
        description: '',
        institution_name: '',
        color: '#4e73df',
        is_default: false
      },
      cashInData: {
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        source: ''
      },
      validationErrors: {},
      isSubmitting: false,
      allowAccountTypeChange: true,
      progressPercentage: 20
    };
    
    // If we have saved data, restore it
    if (savedState || savedAccountTypeChoice || savedAccountData || savedCashInData || savedCurrentStep) {
      return {
        ...defaultState,
        currentStep: savedCurrentStep || defaultState.currentStep,
        accountTypeChoice: savedAccountTypeChoice || defaultState.accountTypeChoice,
        accountData: savedAccountData ? { ...defaultState.accountData, ...savedAccountData } : defaultState.accountData,
        cashInData: savedCashInData ? { ...defaultState.cashInData, ...savedCashInData } : defaultState.cashInData,
        progressPercentage: savedCurrentStep ? calculateProgress(savedCurrentStep) : defaultState.progressPercentage
      };
    }
    
    return defaultState;
  });

  // State Management Functions with persistence
  const updateModalState = (updates: Partial<ModalState>) => {
    setModalState(prev => {
      const newState = { ...prev, ...updates };
      // Save to localStorage
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, newState);
      saveToLocalStorage(STORAGE_KEYS.CURRENT_STEP, newState.currentStep);
      if (newState.accountTypeChoice) {
        saveToLocalStorage(STORAGE_KEYS.ACCOUNT_TYPE_CHOICE, newState.accountTypeChoice);
      }
      return newState;
    });
  };

  const updateAccountData = (updates: Partial<AccountFormData>) => {
    setModalState(prev => {
      const newAccountData = { ...prev.accountData, ...updates };
      const newState = { ...prev, accountData: newAccountData };
      // Save account data to localStorage
      saveToLocalStorage(STORAGE_KEYS.ACCOUNT_DATA, newAccountData);
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, newState);
      return newState;
    });
  };

  const updateCashInData = (updates: Partial<CashInFormData>) => {
    setModalState(prev => {
      const newCashInData = { ...prev.cashInData, ...updates };
      const newState = { ...prev, cashInData: newCashInData };
      // Save cash-in data to localStorage
      saveToLocalStorage(STORAGE_KEYS.CASH_IN_DATA, newCashInData);
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, newState);
      return newState;
    });
  };

  const updateValidationErrors = (errors: Partial<ValidationErrors>) => {
    setModalState(prev => ({
      ...prev,
      validationErrors: { ...prev.validationErrors, ...errors }
    }));
  };

  // Navigation Functions
  const navigateToStep = (step: ModalStep) => {
    const progress = calculateProgress(step);
    updateModalState({ 
      currentStep: step,
      progressPercentage: progress
    });
  };

  const handleWorkflowChoice = (mode: 'create_account' | 'cash_in_existing') => {
    setWorkflowMode(mode);
    
    if (mode === 'create_account') {
      // Go to account type choice for new account creation
      navigateToStep('account_type_choice');
    } else if (mode === 'cash_in_existing') {
      // Go directly to cash-in setup for existing accounts
      navigateToStep('cash_in_setup');
    }
  };

  const handleExistingAccountSelect = (accountId: string) => {
    setSelectedExistingAccount(accountId);
  };

  const handleWorkflowContinue = () => {
    if (workflowMode === 'create_account') {
      navigateToStep('account_type_choice');
    } else if (workflowMode === 'cash_in_existing' && selectedExistingAccount) {
      navigateToStep('cash_in_setup');
    }
  };

  const handleAccountTypeChoice = (accountType: AccountType, experienceLevel: ExperienceLevel, reason?: string) => {
    const accountTypeChoice: AccountTypeChoiceData = { 
      account_type: accountType, 
      user_experience_level: experienceLevel,
      choice_reason: reason 
    };
    
    updateModalState({ 
      accountTypeChoice,
      allowAccountTypeChange: false
    });

    // Update account data with selected type
    updateAccountData({ account_type: accountType });

    // Navigate to account configuration
    navigateToStep('account_config');
  };

  // Memoize validation to prevent infinite re-renders
  const isAccountStepValid = useMemo(() => {
    const errors = ValidationEngine.validateAccountData(modalState.accountData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.accountData]);

  const isCashInStepValid = useMemo(() => {
    // Cash-in is optional, so validate only if user entered any data (amount OR description)
    const hasCashInData = modalState.cashInData.amount > 0 || modalState.cashInData.description.trim() !== '';
    if (!hasCashInData) return true; // No data entered, valid to skip
    const errors = ValidationEngine.validateCashInData(modalState.cashInData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.cashInData]);

  // Fetch user accounts when modal opens
  useEffect(() => {
    const fetchUserAccounts = async () => {
      if (!modalIsOpen || !user) return;
      
      try {
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        if (error) {
          console.error('Error fetching user accounts:', error);
          return;
        }

        setUserAccounts(accounts || []);
        setHasExistingAccounts(accounts && accounts.length > 0);
      } catch (error) {
        console.error('Error fetching user accounts:', error);
      }
    };

    fetchUserAccounts();
  }, [modalIsOpen, user]);

  // Auto-save effect - persist changes as user fills out forms
  useEffect(() => {
    if (modalIsOpen) {
      // Auto-save current state to localStorage whenever it changes
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, modalState);
      saveToLocalStorage(STORAGE_KEYS.CURRENT_STEP, modalState.currentStep);
      saveToLocalStorage(STORAGE_KEYS.ACCOUNT_DATA, modalState.accountData);
      saveToLocalStorage(STORAGE_KEYS.CASH_IN_DATA, modalState.cashInData);
      if (modalState.accountTypeChoice) {
        saveToLocalStorage(STORAGE_KEYS.ACCOUNT_TYPE_CHOICE, modalState.accountTypeChoice);
      }
    }
  }, [modalState, modalIsOpen]);

  // Optional: Clear data when user navigates away or refreshes page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear data when user navigates away or refreshes to avoid stale data
      clearAllStoredData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const resetModal = () => {
    const defaultState = {
      currentStep: 'workflow_choice' as ModalStep,
      accountTypeChoice: null,
      accountData: {
        account_name: '',
        account_type: 'checking' as AccountType,
        initial_balance: 0,
        description: '',
        institution_name: '',
        color: '#4e73df',
        is_default: false
      },
      cashInData: {
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        source: ''
      },
      validationErrors: {},
      isSubmitting: false,
      allowAccountTypeChange: true,
      progressPercentage: 20
    };
    
    setModalState(defaultState);
    
    // Reset workflow state
    setWorkflowMode('create_account');
    setSelectedExistingAccount(null);
    
    // Reset error state
    setErrorState({
      hasError: false,
      error: null,
      showErrorModal: false
    });
    
    // Clear persisted data
    clearAllStoredData();
  };

  const handleClose = () => {
    // Don't clear data on close - only on reset or successful completion
    onClose();
  };

  const handleSkipForLater = () => {
    // Show confirmation dialog first
    setShowSkipConfirmation(true);
  };

  const handleSkipConfirmed = async () => {
    if (!user) {
      console.error('User must be logged in to skip setup');
      return;
    }

    setShowSkipConfirmation(false);

    try {
      const { data, error } = await supabase.rpc('skip_account_setup_for_later', {
        user_uuid: user.id,
        skip_minutes: 25
      });

      if (error) {
        console.error('Error skipping account setup:', error);
        // Fallback to localStorage if database call fails
        const skipUntil = new Date(Date.now() + 25 * 60 * 1000).toISOString();
        localStorage.setItem('accountSetupSkipped', 'temporary');
        localStorage.setItem('accountSetupReminder', skipUntil);
        showInfoToast('Account setup skipped for 25 minutes (offline mode)');
      } else {
        console.log('Account setup skipped until:', data);
        // Clear localStorage fallback if it exists
        localStorage.removeItem('accountSetupSkipped');
        localStorage.removeItem('accountSetupReminder');
        showInfoToast('Account setup skipped for 25 minutes');
      }
    } catch (error) {
      console.error('Exception skipping account setup:', error);
      // Fallback to localStorage if database call fails
      const skipUntil = new Date(Date.now() + 25 * 60 * 1000).toISOString();
      localStorage.setItem('accountSetupSkipped', 'temporary');
      localStorage.setItem('accountSetupReminder', skipUntil);
      showInfoToast('Account setup skipped for 25 minutes (offline mode)');
    }

    // Close the modal after skipping
    handleClose();
  };

  const handleSkipCancelled = () => {
    setShowSkipConfirmation(false);
  };

  // Function to clear data specifically after successful completion
  const handleSuccessfulCompletion = async () => {
    // Mark account setup as completed in database
    if (user?.id) {
      try {
        const { error } = await supabase.rpc('mark_account_setup_completed', {
          user_uuid: user.id
        });
        
        if (error) {
          console.error('Error marking account setup as completed:', error);
          // Fallback to localStorage if database update fails
          localStorage.setItem('accountSetupCompleted', 'true');
          localStorage.setItem('accountSetupCompletedDate', new Date().toISOString());
        } else {
          console.log('Account setup completion marked in database successfully');
          // Clear localStorage fallback if it exists
          localStorage.removeItem('accountSetupCompleted');
          localStorage.removeItem('accountSetupCompletedDate');
        }
      } catch (error) {
        console.error('Exception marking account setup as completed:', error);
        // Fallback to localStorage if database call fails
        localStorage.setItem('accountSetupCompleted', 'true');
        localStorage.setItem('accountSetupCompletedDate', new Date().toISOString());
      }
    }
    
    // Clear all stored data after successful completion
    clearAllStoredData();
    
    // Reset modal state to default
    resetModal();
    
    console.log('Account setup completed successfully - flag set to prevent future prompts');
  };

  const handleSubmit = async () => {
    if (!user) {
      const error = ValidationEngine.createAccountSetupError(
        'permission',
        'You must be logged in to create accounts or cash in',
        'Please sign in to your account and try again'
      );
      showAccountSetupError(error);
      return;
    }

    updateModalState({ isSubmitting: true });
    
    try {
      if (workflowMode === 'create_account') {
        // Enhanced validation before creating account
        if (!validateAccountDataEnhanced(modalState.accountData)) {
          return; // Error already shown by validation function
        }
        
        // Validate cash-in data if user entered any values (amount OR description)
        const hasCashIn = modalState.cashInData.amount > 0 || modalState.cashInData.description.trim() !== '';
        if (hasCashIn && !validateCashInDataEnhanced(modalState.cashInData)) {
          return; // Error already shown by validation function
        }
        
        await createAccount();
        showSuccessToast("Account created successfully!");
      } else if (workflowMode === 'cash_in_existing') {
        // Enhanced validation for cash-in
        if (!validateCashInDataEnhanced(modalState.cashInData)) {
          return; // Error already shown by validation function
        }
        
        await createCashInToExistingAccount();
        showSuccessToast("Money cashed in successfully!");
      }
      
      // Clear stored data and reset state after successful completion
      await handleSuccessfulCompletion();
      
      // Close modal first
      handleClose();
      
      // Auto-refresh browser after successful completion to ensure all components
      // reflect the changes, and to reset any cached state
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Give time for success toast to be visible
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Create appropriate error based on error type
      let errorType: 'network' | 'system_error' | 'duplicate_account' = 'system_error';
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        errorType = 'network';
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        errorType = 'duplicate_account';
      }
      
      const accountError = ValidationEngine.createAccountSetupError(
        errorType,
        `Failed to ${workflowMode === 'create_account' ? 'create account' : 'cash in money'}: ${errorMessage}`,
        'Please try again or contact support if the problem persists'
      );
      
      showAccountSetupError(accountError);
    } finally {
      updateModalState({ isSubmitting: false });
    }
  };

  const createAccount = async () => {
    if (!user) {
      throw new Error('User authentication required');
    }

    // Validation is now handled in handleSubmit with enhanced error handling
    // Use OR to check if user entered any cash-in data
    const hasCashIn = modalState.cashInData.amount > 0 && modalState.cashInData.description.trim() !== '';

    // 3. Prepare account data
    const accountData = {
      user_id: user.id,
      account_name: ValidationEngine.sanitizeAccountName(modalState.accountData.account_name),
      account_type: modalState.accountData.account_type,
      balance: ValidationEngine.roundToCentavo(modalState.accountData.initial_balance),
      initial_balance: ValidationEngine.roundToCentavo(modalState.accountData.initial_balance),
      description: modalState.accountData.description?.trim() || undefined,
      institution_name: modalState.accountData.institution_name?.trim() || undefined,
      color: modalState.accountData.color || '#4e73df',
      is_default: modalState.accountData.is_default,
      currency: 'PHP',
      status: 'active' as const,
      created_at: new Date().toISOString()
    };

    // 4. Create account using AccountService
    const accountResult = await AccountService.createAccount(accountData);
    if (!accountResult.success) {
      throw new Error(`Failed to create account: ${accountResult.error}`);
    }

    console.log('Account created successfully:', accountResult.data);
    
    const createdAccountId = accountResult.data?.id;
    if (!createdAccountId) {
      throw new Error('Account created but ID not returned');
    }

    // 5. Create audit log for account creation
    await createAuditLog('account_created', 'Account created successfully', {
      account_id: createdAccountId,
      account_name: accountData.account_name,
      account_type: accountData.account_type,
      initial_balance: accountData.balance,
      initial_budget_plan: modalState.accountData.initial_budget_plan
    });

    // 6. Create cash-in transaction if provided
    if (hasCashIn) {
      await createCashInTransaction(createdAccountId);
    }

    return {
      success: true,
      account: accountResult.data
    };
  };

  const createCashInToExistingAccount = async () => {
    if (!user || !selectedExistingAccount) {
      throw new Error('User authentication and account selection required');
    }

    // Validate cash-in data
    if (modalState.cashInData.amount <= 0) {
      throw new Error('Cash-in amount must be greater than 0');
    }

    const cashInErrors = ValidationEngine.validateCashInData(modalState.cashInData);
    if (ValidationEngine.hasValidationErrors(cashInErrors)) {
      throw new Error('Cash-in validation failed: ' + Object.values(cashInErrors).join(', '));
    }

    // Prepare cash-in transaction data for existing account
    const transactionData: any = {
      user_id: user.id,
      account_id: selectedExistingAccount,
      type: 'cash_in',
      amount: ValidationEngine.roundToCentavo(modalState.cashInData.amount),
      date: modalState.cashInData.date,
      description: ValidationEngine.sanitizeAccountName(modalState.cashInData.description.trim()),
      source: modalState.cashInData.source?.trim() || null,
      category: modalState.cashInData.category?.trim() || null,
      created_at: new Date().toISOString()
    };

    console.log('Creating cash-in transaction for existing account:', transactionData);

    // Create transaction using TransactionService
    const transactionResult = await TransactionService.createTransaction(transactionData);
    if (!transactionResult.success) {
      throw new Error(`Failed to create cash-in transaction: ${transactionResult.error}`);
    }

    console.log('Cash-in transaction created successfully:', transactionResult.data);

    // Create audit log for cash-in to existing account
    const selectedAccount = userAccounts.find(acc => acc.id === selectedExistingAccount);
    await createAuditLog('account_cash_in', 'Money cashed in to existing account', {
      account_id: selectedExistingAccount,
      account_name: selectedAccount?.account_name,
      cash_in_amount: modalState.cashInData.amount,
      transaction_id: transactionResult.data?.id,
      is_existing_account: true
    });

    return {
      success: true,
      transaction: transactionResult.data
    };
  };

  const createCashInTransaction = async (accountId: string) => {
    if (!user) {
      throw new Error('User authentication required');
    }

    console.log('Creating cash-in transaction for account:', accountId);

    // Prepare cash-in transaction data
    const transactionData: any = {
      user_id: user.id,
      account_id: accountId,
      type: 'cash_in',
      amount: ValidationEngine.roundToCentavo(modalState.cashInData.amount),
      date: modalState.cashInData.date,
      description: ValidationEngine.sanitizeAccountName(modalState.cashInData.description.trim()),
      notes: modalState.cashInData.source?.trim() 
        ? `Source: ${modalState.cashInData.source.trim()}${modalState.cashInData.category ? ` | Category: ${modalState.cashInData.category.trim()}` : ''}`
        : modalState.cashInData.category?.trim() || null,
      created_at: new Date().toISOString()
    };

    console.log('Creating cash-in transaction with data:', transactionData);

    // Create transaction using TransactionService
    const transactionResult = await TransactionService.createTransaction(transactionData);
    if (!transactionResult.success) {
      throw new Error(`Failed to create cash-in transaction: ${transactionResult.error}`);
    }

    console.log('Cash-in transaction created successfully:', transactionResult.data);

    // Create audit log for cash-in
    await createAuditLog('account_cash_in', 'Initial cash-in transaction created', {
      account_id: accountId,
      amount: modalState.cashInData.amount,
      cash_in_details: modalState.cashInData,
      transaction_id: transactionResult.data?.id
    });

    return transactionResult.data;
  };

  const createAuditLog = async (
    activityType: 'account_created' | 'account_updated' | 'account_cash_in',
    description: string,
    metadata: any
  ) => {
    if (!user) return;

    try {
      // Get client IP and user agent
      const userAgent = navigator.userAgent;
      
      // Create audit log entry using system_activity_log table
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          activity_description: description,
          user_agent: userAgent,
          metadata: {
            ...metadata,
            account_setup_modal: true,
            experience_level: modalState.accountTypeChoice?.user_experience_level,
            choice_reason: modalState.accountTypeChoice?.choice_reason
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error as this shouldn't stop account creation
      } else {
        console.log('Audit log created successfully for:', activityType);
      }
    } catch (error) {
      console.error('Exception creating audit log:', error);
      // Don't throw error as this shouldn't stop account creation
    }
  };

  const handleTipClick = (tipId: string) => {
    // Handle tip clicks for contextual help
    console.log('Tip clicked:', tipId);
    // You can implement specific actions based on tipId
  };

  // Enhanced error handling utilities  
  const showAccountSetupError = (error: AccountSetupError) => {
    setErrorState({
      hasError: true,
      error,
      showErrorModal: true
    });
  };

  const clearAccountSetupError = () => {
    setErrorState({
      hasError: false,
      error: null,
      showErrorModal: false
    });
  };

  const handleErrorRetry = () => {
    clearAccountSetupError();
    // Could add specific retry logic here based on error type
  };

  // Enhanced validation for account data
  const validateAccountDataEnhanced = (accountData: AccountFormData) => {
    const existingAccountNames = userAccounts.map(acc => acc.account_name?.toLowerCase() || '');
    const validationResult = ValidationEngine.validateAccountDataWithDetails(
      accountData,
      existingAccountNames
    );

    if (!validationResult.isValid && validationResult.error) {
      console.log('Validation failed, showing error modal:', validationResult.error);
      showAccountSetupError(validationResult.error);
      return false;
    }
    
    clearAccountSetupError();
    return true;
  };

  // Enhanced validation for cash-in data
  const validateCashInDataEnhanced = (cashInData: CashInFormData) => {
    const validationResult = ValidationEngine.validateCashInDataWithDetails(cashInData);

    if (!validationResult.isValid && validationResult.error) {
      showAccountSetupError(validationResult.error);
      return false;
    }
    
    clearAccountSetupError();
    return true;
  };

  if (!modalIsOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 1060}}>
      <div className="w-[95vw] h-[90vh] mx-auto my-auto">
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200" style={{zIndex: 1065}}>
          
          <AccountModalHeader
            currentStep={modalState.currentStep}
            progressPercentage={modalState.progressPercentage}
            onClose={handleClose}
            onSkipForLater={handleSkipForLater}
            accountType={modalState.accountData.account_type}
            onShowMobileSidebar={() => setShowMobileSidebar(true)}
          />

          {modalState.currentStep === 'workflow_choice' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <WorkflowChoiceStep
                        userAccounts={userAccounts}
                        hasExistingAccounts={hasExistingAccounts}
                        workflowMode={workflowMode}
                        selectedExistingAccount={selectedExistingAccount}
                        onWorkflowChoice={handleWorkflowChoice}
                        onExistingAccountSelect={handleExistingAccountSelect}
                        onContinue={handleWorkflowContinue}
                      />
                    </div>
                  </div>
                  
                  {/* Sidebar */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <AccountSidebar
                        currentStep={modalState.currentStep}
                        accountType={modalState.accountData.account_type}
                        modalState={modalState}
                        onTipClick={handleTipClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer */}
              <AccountMobileFooter
                currentStep={modalState.currentStep}
                onNext={handleWorkflowContinue}
                isNextDisabled={workflowMode === 'cash_in_existing' && !selectedExistingAccount}
                showPrevious={false}
              />
            </>
          )}

          {modalState.currentStep === 'account_type_choice' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <AccountTypeChoiceStep
                        modalState={modalState}
                        onAccountTypeChoice={handleAccountTypeChoice}
                      />
                    </div>
                  </div>
                  
                  {/* Sidebar */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <AccountSidebar
                        currentStep={modalState.currentStep}
                        accountType={modalState.accountData.account_type}
                        modalState={modalState}
                        onTipClick={handleTipClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer */}
              <AccountMobileFooter
                currentStep={modalState.currentStep}
                onPrevious={() => navigateToStep('workflow_choice')}
                onNext={() => handleAccountTypeChoice(
                  modalState.accountData.account_type,
                  modalState.accountTypeChoice?.user_experience_level || 'beginner',
                  modalState.accountTypeChoice?.choice_reason
                )}
                isNextDisabled={!modalState.accountData.account_type}
              />
            </>
          )}

          {modalState.currentStep === 'account_config' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <AccountConfigStep
                        modalState={{
                          ...modalState,
                          validationErrors: {} // Clear inline errors to use error modal instead
                        }}
                        updateAccountData={updateAccountData}
                        updateValidationErrors={() => {}} // Disable inline validation
                        navigationHandlers={{
                          onPrevious: () => navigateToStep('account_type_choice'),
                          onNext: () => {
                            // Use enhanced validation instead of step validation
                            if (validateAccountDataEnhanced(modalState.accountData)) {
                              navigateToStep('cash_in_setup');
                            }
                          },
                          isValid: isAccountStepValid
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Tips and Summary Sidebar */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <AccountSidebar
                        currentStep={modalState.currentStep}
                        accountType={modalState.accountData.account_type}
                        modalState={modalState}
                        onTipClick={handleTipClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer */}
              <AccountMobileFooter
                currentStep={modalState.currentStep}
                onPrevious={() => navigateToStep('account_type_choice')}
                onNext={() => {
                  // Validate account data before proceeding to cash-in step
                  if (validateAccountDataEnhanced(modalState.accountData)) {
                    navigateToStep('cash_in_setup');
                  }
                }}
                isNextDisabled={modalState.isSubmitting}
              />
            </>
          )}

          {modalState.currentStep === 'cash_in_setup' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <CashInSetupStep
                        modalState={{
                          ...modalState,
                          validationErrors: {} // Clear inline errors to use error modal instead
                        }}
                        updateCashInData={updateCashInData}
                        updateValidationErrors={() => {}} // Disable inline validation
                        navigationHandlers={{
                          onPrevious: () => navigateToStep('account_config'),
                          onNext: () => {
                            // Use enhanced validation instead of step validation
                            // Use OR to validate if user entered any cash-in data
                            const hasCashIn = modalState.cashInData.amount > 0 || modalState.cashInData.description.trim() !== '';
                            if (hasCashIn && !validateCashInDataEnhanced(modalState.cashInData)) {
                              return; // Error modal shown by validation function
                            }
                            navigateToStep('review_confirmation');
                          },
                          isValid: isCashInStepValid
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <AccountSidebar
                        currentStep={modalState.currentStep}
                        accountType={modalState.accountData.account_type}
                        modalState={modalState}
                        onTipClick={handleTipClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer */}
              <AccountMobileFooter
                currentStep={modalState.currentStep}
                onPrevious={() => navigateToStep('account_config')}
                onNext={() => {
                  // Validate cash-in data before proceeding to review
                  // Use OR to validate if user entered any cash-in data
                  const hasCashIn = modalState.cashInData.amount > 0 || modalState.cashInData.description.trim() !== '';
                  if (hasCashIn && !validateCashInDataEnhanced(modalState.cashInData)) {
                    return; // Error modal shown by validation function
                  }
                  navigateToStep('review_confirmation');
                }}
                isNextDisabled={false}
              />
            </>
          )}

          {modalState.currentStep === 'review_confirmation' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <ReviewConfirmationStep
                        modalState={modalState}
                        navigationHandlers={{
                          onPrevious: () => navigateToStep('cash_in_setup')
                        }}
                        onSubmit={handleSubmit}
                      />
                    </div>
                  </div>
                  
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <AccountSidebar
                        currentStep={modalState.currentStep}
                        accountType={modalState.accountData.account_type}
                        modalState={modalState}
                        onTipClick={handleTipClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer */}
              <AccountMobileFooter
                currentStep={modalState.currentStep}
                onPrevious={() => navigateToStep('cash_in_setup')}
                onSubmit={handleSubmit}
                isSubmitting={modalState.isSubmitting}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Modal */}
      {showMobileSidebar && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden flex items-end justify-center animate-fadeIn" style={{ zIndex: 1070 }} onClick={() => setShowMobileSidebar(false)}>
          <div 
            className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[80vh] overflow-hidden transition-transform duration-300 ease-out" 
            style={{ 
              zIndex: 1075,
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-lightbulb text-blue-600 mr-2"></i>
                Tips & Help
              </h3>
              <button 
                type="button" 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                onClick={() => setShowMobileSidebar(false)}
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              <AccountSidebar
                currentStep={modalState.currentStep}
                accountType={modalState.accountData.account_type}
                modalState={modalState}
                onTipClick={handleTipClick}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Skip Confirmation Dialog */}
      {showSkipConfirmation && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 1070 }}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4" style={{ zIndex: 1075 }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-clock text-yellow-500 mr-2"></i>
                Skip Account Setup
              </h3>
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleSkipCancelled}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <i className="fas fa-clock text-yellow-500" style={{ fontSize: '3rem' }}></i>
                <h4 className="mt-3 mb-2 text-lg font-medium text-gray-900">Skip for Later?</h4>
                <p className="text-gray-600 mb-0">
                  Account setup will be postponed for 25 minutes.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-yellow-600 mr-2 mt-0.5"></i>
                  <div>
                    <div className="font-medium text-yellow-800 mb-1">Important:</div>
                    <div className="text-yellow-700 text-sm">
                      This setup modal will reappear in about 25 minutes if your account remains empty or not fully set up.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <i className="fas fa-lightbulb text-blue-600 mr-2 mt-0.5"></i>
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Tip:</div>
                    <div className="text-blue-700 text-sm">
                      Setting up your account now takes just a few minutes and helps you start tracking your finances immediately.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button 
                type="button" 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                onClick={handleSkipCancelled}
              >
                <i className="fas fa-arrow-left mr-1"></i>
                Continue Setup
              </button>
              <button 
                type="button" 
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                onClick={handleSkipConfirmed}
              >
                <i className="fas fa-clock mr-1"></i>
                Skip for 25 Minutes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
    
    {/* Enhanced Error Modal - Outside main modal for proper z-index */}
    {errorState.showErrorModal && createPortal(
      <AccountSetupErrorModal
        isOpen={errorState.showErrorModal}
        error={errorState.error}
        onClose={() => setErrorState(prev => ({ ...prev, showErrorModal: false }))}
        onRetry={handleErrorRetry}
      />,
      document.body
    )}
    </>
  );
};

export default AccountSetupModal;
