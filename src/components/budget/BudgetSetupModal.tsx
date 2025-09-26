import React, { useState, useEffect, useMemo } from 'react';
import WorkflowChoiceStep from './steps/WorkflowChoiceStep';
import BudgetConfigStep from './steps/BudgetConfigStep';
import TransactionSetupStep from './steps/TransactionSetupStep';
import TransactionCreateStep from './steps/TransactionCreateStep';
import { TransactionReviewStep, BudgetReviewStep, FinalConfirmationStep } from './steps/ReviewSteps';
import { 
  WorkflowType, 
  ExperienceLevel, 
  ModalStep, 
  ModalState, 
  BudgetFormData, 
  TransactionFormData, 
  ValidationErrors,
  WorkflowChoiceData 
} from './types/BudgetSetupTypes';
import { ValidationEngine } from './utils/ValidationEngine';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { BudgetService } from '../../services/database/budgetService';
import { TransactionService } from '../../services/database/transactionService';
import { AccountService } from '../../services/database/accountService';
import { UserOnboardingService } from '../../services/userOnboardingService';
import { PreTransactionValidationService } from '../../services/preTransactionValidationService';
import { sanitizeBudgetName, roundToCentavo } from '../../utils/currencyUtils';

// Import new refactored components
import BudgetModalHeader from './components/BudgetModalHeader';
import BudgetSidebar from './components/BudgetSidebar';
// Removed BudgetTooltip import - using inline tooltip
import BudgetStepCard from './components/BudgetStepCard';

// Storage keys for persistence
const STORAGE_KEYS = {
  MODAL_STATE: 'budgetSetupModal_state',
  WORKFLOW_CHOICE: 'budgetSetupModal_workflowChoice',
  BUDGET_DATA: 'budgetSetupModal_budgetData',
  TRANSACTION_DATA: 'budgetSetupModal_transactionData',
  CURRENT_STEP: 'budgetSetupModal_currentStep'
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

// Helper function to get next month in YYYY-MM format using local time
const getNextMonthString = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};



// Removed CSS import - using only Tailwind classes

// Category interface
interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

// Define tooltip state interface
interface TooltipState {
  isVisible: boolean;
  position: { top: number; left: number } | null;
  title: string;
  description: string;
  category?: 'workflow' | 'form' | 'process' | 'analytics';
}

interface Props {
  isOpen?: boolean;
  show?: boolean;  // Backward compatibility
  onClose: () => void;
  onSubmit?: (budgetData: BudgetFormData, transactionData?: TransactionFormData) => Promise<void>;
  onSkip?: () => void;  // Backward compatibility
  onBudgetCreated?: (budgetData: BudgetFormData) => void;  // Backward compatibility
}

const BudgetSetupModal: React.FC<Props> = ({ 
  isOpen, 
  show, 
  onClose, 
  onSubmit, 
  onSkip, 
  onBudgetCreated 
}) => {
  // Handle backward compatibility
  const modalIsOpen = isOpen || show || false;
  
  // Add auth and toast hooks
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();
  
  // Calculate progress percentage based on current step - moved here to be available during initialization
  const calculateProgress = (step: ModalStep, workflow?: WorkflowType): number => {
    const progressMap: Record<ModalStep, number> = {
      'workflow_choice': 25,
      'budget_config': workflow === 'budget_first' ? 50 : 25,
      'transaction_setup': workflow === 'transaction_first' ? 50 : 25,
      'transaction_create': 75,
      'transaction_review': 75,
      'final_confirmation': 100
    };
    return progressMap[step] || 25;
  };
  
  // Category state
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  
  // Account setup state for enhanced validation
  const [accountSetupState, setAccountSetupState] = useState<{
    isValidating: boolean;
    hasAccounts: boolean;
    requiresSetup: boolean;
    isSettingUp: boolean;
    setupError?: string;
  }>({
    isValidating: false,
    hasAccounts: false,
    requiresSetup: false,
    isSettingUp: false
  });
  
  // Transaction suggestions state
  const [transactionSuggestions, setTransactionSuggestions] = useState<any[]>([]);
  
  // Tooltip state for interactive help system
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    isVisible: false,
    position: null,
    title: '',
    description: '',
    category: 'process'
  });
  
  // Default onSubmit handler for backward compatibility
  const handleSubmitWrapper = onSubmit || (async (budgetData: BudgetFormData, transactionData?: TransactionFormData) => {
    if (onBudgetCreated) {
      onBudgetCreated(budgetData);
    }
  });

  const [modalState, setModalState] = useState<ModalState>(() => {
    // Load persisted state on initialization
    const savedState = loadFromLocalStorage(STORAGE_KEYS.MODAL_STATE);
    const savedWorkflowChoice = loadFromLocalStorage(STORAGE_KEYS.WORKFLOW_CHOICE);
    const savedBudgetData = loadFromLocalStorage(STORAGE_KEYS.BUDGET_DATA);
    const savedTransactionData = loadFromLocalStorage(STORAGE_KEYS.TRANSACTION_DATA);
    const savedCurrentStep = loadFromLocalStorage(STORAGE_KEYS.CURRENT_STEP);
    
    const defaultState: ModalState = {
      currentStep: 'workflow_choice',
      workflowChoice: null,
      budgetData: {
        budget_name: '',
        category_id: '',
        category_name: '',
        amount: 0,
        period: 'month',
        start_date: getNextMonthString(),
        alert_threshold: 0.8
      },
      transactionData: {
        type: 'expense',
        amount: 0,
        account_id: '',
        account_name: '',
        category_id: '',
        category_name: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      },
      validationErrors: {},
      isSubmitting: false,
      allowWorkflowChange: true,
      progressPercentage: 25
    };
    
    // If we have saved data, restore it
    if (savedState || savedWorkflowChoice || savedBudgetData || savedTransactionData || savedCurrentStep) {
      // Ensure start_date is always next month unless explicitly set by user
      const restoredBudgetData = {
        ...defaultState.budgetData,
        ...savedBudgetData,
        start_date: getNextMonthString()  // Always use next month
      };
      
      return {
        ...defaultState,
        currentStep: savedCurrentStep || defaultState.currentStep,
        workflowChoice: savedWorkflowChoice || defaultState.workflowChoice,
        budgetData: restoredBudgetData,
        transactionData: savedTransactionData ? { ...defaultState.transactionData, ...savedTransactionData } : defaultState.transactionData,
        progressPercentage: savedCurrentStep ? calculateProgress(savedCurrentStep, savedWorkflowChoice?.workflow_type) : defaultState.progressPercentage
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
      if (newState.workflowChoice) {
        saveToLocalStorage(STORAGE_KEYS.WORKFLOW_CHOICE, newState.workflowChoice);
      }
      return newState;
    });
  };

  const updateBudgetData = (updates: Partial<BudgetFormData>) => {
    setModalState(prev => {
      const newBudgetData = { ...prev.budgetData, ...updates };
      const newState = { ...prev, budgetData: newBudgetData };
      // Save budget data to localStorage
      saveToLocalStorage(STORAGE_KEYS.BUDGET_DATA, newBudgetData);
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, newState);
      return newState;
    });
  };

  const updateTransactionData = (updates: Partial<TransactionFormData>) => {
    setModalState(prev => {
      const newTransactionData = { ...prev.transactionData, ...updates };
      const newState = { ...prev, transactionData: newTransactionData };
      // Save transaction data to localStorage
      saveToLocalStorage(STORAGE_KEYS.TRANSACTION_DATA, newTransactionData);
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
    const progress = calculateProgress(step, modalState.workflowChoice?.workflow_type);
    updateModalState({ 
      currentStep: step,
      progressPercentage: progress
    });
  };

  const handleWorkflowChoice = (workflow: WorkflowType, experienceLevel: ExperienceLevel, reason?: string) => {
    const workflowChoice: WorkflowChoiceData = { 
      workflow_type: workflow, 
      user_experience_level: experienceLevel,
      choice_reason: reason 
    };
    
    updateModalState({ 
      workflowChoice,
      allowWorkflowChange: false
    });

    // Apply smart defaults based on workflow choice
    if (workflow === 'budget_first') {
      navigateToStep('budget_config');
      // Set transaction type to expense to match budget
      updateTransactionData({ type: 'expense' });
    } else {
      navigateToStep('transaction_setup');
    }
  };

  // Memoize validation to prevent infinite re-renders
  const isBudgetStepValid = useMemo(() => {
    const errors = ValidationEngine.validateBudgetData(modalState.budgetData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.budgetData]);

  const isTransactionStepValid = useMemo(() => {
    const errors = ValidationEngine.validateTransactionData(modalState.transactionData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [modalState.transactionData]);

  // Auto-save effect - persist changes as user fills out forms
  useEffect(() => {
    if (modalIsOpen) {
      // Auto-save current state to localStorage whenever it changes
      saveToLocalStorage(STORAGE_KEYS.MODAL_STATE, modalState);
      saveToLocalStorage(STORAGE_KEYS.CURRENT_STEP, modalState.currentStep);
      saveToLocalStorage(STORAGE_KEYS.BUDGET_DATA, modalState.budgetData);
      saveToLocalStorage(STORAGE_KEYS.TRANSACTION_DATA, modalState.transactionData);
      if (modalState.workflowChoice) {
        saveToLocalStorage(STORAGE_KEYS.WORKFLOW_CHOICE, modalState.workflowChoice);
      }
    }
  }, [modalState, modalIsOpen]);

  // Cleanup effect - clear data when component unmounts or on successful completion
  useEffect(() => {
    return () => {
      // Only clear stored data if modal was closed without explicit completion
      // The handleSuccessfulCompletion will clear data for successful scenarios
    };
  }, []);

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

  // Fetch categories when modal opens and user is available
  useEffect(() => {
    const fetchUserData = async () => {
      // Early return guards following CreateBudget pattern
      if (!modalIsOpen || !user) return;
      
      // Skip if data is already loaded to prevent redundant fetches
      if (expenseCategories.length > 0 && incomeCategories.length > 0 && accounts.length > 0) return;
      
      try {
        setCategoriesLoading(true);
        
        // Validate user session before API calls
        if (!user) {
          throw new Error('User authentication required');
        }
        
        // Fetch expense categories with proper error handling
        const { data: expenseData, error: expenseError } = await supabase
          .from('expense_categories')
          .select('id, category_name, icon')
          .eq('user_id', user.id)
          .order('category_name', { ascending: true });
          
        if (expenseError) {
          throw new Error(`Error fetching expense categories: ${expenseError.message}`);
        }
        
        // Fetch income categories with proper error handling
        const { data: incomeData, error: incomeError } = await supabase
          .from('income_categories')
          .select('id, category_name, icon')
          .eq('user_id', user.id)
          .order('category_name', { ascending: true });
          
        if (incomeError) {
          throw new Error(`Error fetching income categories: ${incomeError.message}`);
        }

        // Fetch user accounts using AccountService
        const accountsResult = await AccountService.fetchUserAccounts(user.id);
        if (!accountsResult.success) {
          // Try fallback direct query
          const { data: accountsData, error: accountsError } = await supabase
            .from('accounts')
            .select('id, account_name, account_type, balance, status, is_default, currency')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('account_name');
          
          if (accountsError) {
            throw new Error(`Error fetching accounts: ${accountsError.message}`);
          }
          setAccounts(accountsData || []);
        } else {
          setAccounts(accountsResult.data || []);
        }

        // Fetch goals for contribution transactions
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('id, goal_name, target_amount, current_amount, target_date, priority, status, is_family_goal')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('goal_name');
          
        if (goalsError) {
          console.warn('Error fetching goals:', goalsError);
          setGoals([]);
        } else {
          setGoals(goalsData || []);
        }
        
        // Update state with fetched data
        setExpenseCategories(expenseData || []);
        setIncomeCategories(incomeData || []);
      } catch (err) {
        console.error('Error fetching user data:', err);
        showErrorToast(`Failed to load user data: ${(err as Error).message}`);
        // Provide fallback empty arrays to allow modal to function
        setExpenseCategories([]);
        setIncomeCategories([]);
        setAccounts([]);
        setGoals([]);
      } finally {
        // Always reset loading state in finally block
        setCategoriesLoading(false);
      }
    };
    
    fetchUserData();
  }, [modalIsOpen, user, showErrorToast]);

  // Ensure start_date is always next month when modal opens
  useEffect(() => {
    if (modalIsOpen) {
      // Update the start_date to next month
      updateBudgetData({ start_date: getNextMonthString() });
    }
  }, [modalIsOpen]);

  // Enhanced Validation Functions following the plan
  const validateBudgetStep = (): boolean => {
    const errors = ValidationEngine.validateBudgetData(modalState.budgetData);
    updateValidationErrors(errors);
    return !ValidationEngine.hasValidationErrors(errors);
  };

  const validateTransactionStep = (): boolean => {
    const errors = ValidationEngine.validateTransactionData(modalState.transactionData);
    updateValidationErrors(errors);
    return !ValidationEngine.hasValidationErrors(errors);
  };

  const resetModal = () => {
    const defaultState = {
      currentStep: 'workflow_choice' as ModalStep,
      workflowChoice: null,
      budgetData: {
        budget_name: '',
        category_id: '',
        category_name: '',
        amount: 0,
        period: 'month' as const,
        start_date: getNextMonthString(),
        alert_threshold: 0.8
      },
      transactionData: {
        type: 'expense' as const,
        amount: 0,
        account_id: '',
        account_name: '',
        category_id: '',
        category_name: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      },
      validationErrors: {},
      isSubmitting: false,
      allowWorkflowChange: true,
      progressPercentage: 25
    };
    
    setModalState(defaultState);
    
    // Clear persisted data
    clearAllStoredData();
    
    // Reset category states to prevent stale data
    setExpenseCategories([]);
    setIncomeCategories([]);
    setAccounts([]);
    setGoals([]);
    setCategoriesLoading(false);
  };

  const handleClose = () => {
    // Don't clear data on close - only on reset or successful completion
    onClose();
  };

  // Function to clear data specifically after successful completion
  const handleSuccessfulCompletion = () => {
    // Clear all stored data after successful completion
    clearAllStoredData();
    
    // Reset modal state to default
    resetModal();
    
    console.log('Data persistence cleared after successful completion');
  };

  const handleSubmit = async () => {
    if (!user) {
      showErrorToast("You must be logged in to create budgets and transactions");
      return;
    }

    updateModalState({ isSubmitting: true });
    
    try {
      // Validate both budget and transaction data based on workflow
      const workflowType = modalState.workflowChoice?.workflow_type;
      
      if (workflowType === 'budget_first') {
        // Budget-First Workflow: Create budget, then optional transaction
        await handleBudgetFirstWorkflow();
      } else if (workflowType === 'transaction_first') {
        // Transaction-First Workflow: Create transaction, then optional budget generation
        await handleTransactionFirstWorkflow();
      } else {
        throw new Error('Invalid workflow type');
      }
      
      showSuccessToast("Setup completed successfully!");
      
      // Clear stored data and reset state after successful completion
      handleSuccessfulCompletion();
      
      // Close modal first
      handleClose();
      
      // Auto-refresh browser after successful completion to ensure all components
      // reflect the newly created budgets and transactions, and to reset any cached state
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Give time for success toast to be visible
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      showErrorToast(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      updateModalState({ isSubmitting: false });
    }
  };

  const handleBudgetFirstWorkflow = async () => {
    if (!user) {
      throw new Error('User authentication required');
    }

    // 1. Validate and create budget
    const budgetErrors = ValidationEngine.validateBudgetData(modalState.budgetData);
    if (ValidationEngine.hasValidationErrors(budgetErrors)) {
      throw new Error('Budget validation failed: ' + Object.values(budgetErrors).join(', '));
    }

    // Validate category exists in user's categories
    const categoryExists = expenseCategories.some(cat => cat.id === modalState.budgetData.category_id);
    if (!categoryExists) {
      throw new Error('Selected category is not valid or does not belong to you');
    }

    // Check for duplicate budget names (optional warning)
    const existingBudgets = await BudgetService.getInstance().getBudgets(user.id);
    if (existingBudgets.source !== 'error') {
      const duplicateName = existingBudgets.data.find(
        budget => budget.budget_name.toLowerCase() === modalState.budgetData.budget_name.trim().toLowerCase()
      );
      if (duplicateName) {
        console.warn('Budget name already exists, but proceeding with creation');
      }
    }

    // Prepare budget data
    const budgetData = {
      budget_name: sanitizeBudgetName(modalState.budgetData.budget_name.trim()),
      category_id: modalState.budgetData.category_id,
      amount: roundToCentavo(modalState.budgetData.amount),
      period: modalState.budgetData.period,
      start_date: modalState.budgetData.start_date.includes('-') 
        ? modalState.budgetData.start_date + '-01' 
        : new Date(modalState.budgetData.start_date + ' 01').toISOString().slice(0, 10),
      end_date: calculateEndDate(modalState.budgetData.start_date, modalState.budgetData.period),
      alert_threshold: modalState.budgetData.alert_threshold || 0.8,
      spent: 0,
      currency: 'PHP',
      alert_enabled: true,
      status: 'active'
    };

    // Validate budget amount is reasonable
    if (budgetData.amount < 0.01) {
      throw new Error('Budget amount must be at least ₱0.01');
    }

    if (budgetData.amount > 99999999999.99) {
      throw new Error('Budget amount cannot exceed ₱99,999,999,999.99');
    }

    // Create budget using BudgetService
    const budgetResult = await BudgetService.getInstance().createBudget(budgetData, user.id);
    if (!budgetResult.success) {
      throw new Error(`Failed to create budget: ${budgetResult.error}`);
    }

    console.log('Budget created successfully:', budgetResult.data);

    // 2. Create transaction if amount is provided and valid
    if (modalState.transactionData.amount > 0) {
      const transactionErrors = ValidationEngine.validateTransactionData(modalState.transactionData);
      if (!ValidationEngine.hasValidationErrors(transactionErrors)) {
        await createTransaction();
      } else {
        console.warn('Transaction data validation failed, skipping transaction creation:', transactionErrors);
      }
    }

  };

  const handleTransactionFirstWorkflow = async () => {
    if (!user) {
      throw new Error('User authentication required');
    }

    // 1. Validate and create transaction
    const transactionErrors = ValidationEngine.validateTransactionData(modalState.transactionData);
    if (ValidationEngine.hasValidationErrors(transactionErrors)) {
      throw new Error('Transaction validation failed: ' + Object.values(transactionErrors).join(', '));
    }

    // Validate category exists based on transaction type
    if (modalState.transactionData.category_id) {
      const isIncome = modalState.transactionData.type === 'income';
      const categories = isIncome ? incomeCategories : expenseCategories;
      const categoryExists = categories.some(cat => cat.id === modalState.transactionData.category_id);
      
      if (!categoryExists) {
        const typeLabel = isIncome ? 'income' : 'expense';
        throw new Error(`Selected ${typeLabel} category is not valid or does not belong to you`);
      }
    }

    // Validate account exists
    if (!accounts.some(acc => acc.id === modalState.transactionData.account_id)) {
      throw new Error('Selected account is not valid or does not belong to you');
    }

    // Create transaction
    await createTransaction();

    // 2. Automatically create budget if user opted for it in TransactionReviewStep
    if (modalState.budgetData.budget_name.trim() && modalState.budgetData.amount > 0) {
      const budgetErrors = ValidationEngine.validateBudgetData(modalState.budgetData);
      if (!ValidationEngine.hasValidationErrors(budgetErrors)) {
        // Create auto budget based on transaction
        await createAutoBudget();
      } else {
        console.warn('Budget data validation failed, skipping budget creation:', budgetErrors);
      }
    }
  };

  const createAutoBudget = async () => {
    if (!user) {
      throw new Error('User authentication required');
    }

    // Validate category exists in user's categories
    const categoryExists = expenseCategories.some(cat => cat.id === modalState.budgetData.category_id);
    if (!categoryExists) {
      throw new Error('Selected category is not valid or does not belong to you');
    }

    // Check for duplicate budget names (optional warning)
    const existingBudgets = await BudgetService.getInstance().getBudgets(user.id);
    if (existingBudgets.source !== 'error') {
      const duplicateName = existingBudgets.data.find(
        budget => budget.budget_name.toLowerCase() === modalState.budgetData.budget_name.trim().toLowerCase()
      );
      if (duplicateName) {
        // Auto-append number to make name unique for auto-created budgets
        let counter = 1;
        let newName = modalState.budgetData.budget_name.trim();
        while (existingBudgets.data.find(budget => budget.budget_name.toLowerCase() === newName.toLowerCase())) {
          newName = `${modalState.budgetData.budget_name.trim()} (${counter})`;
          counter++;
        }
        // Update the budget name in the state to use the unique name
        const uniqueBudgetData = {
          ...modalState.budgetData,
          budget_name: newName
        };
        console.log(`Budget name made unique: ${newName}`);
        
        // Use the unique name for budget creation
        const budgetData = {
          budget_name: sanitizeBudgetName(newName),
          category_id: uniqueBudgetData.category_id,
          amount: roundToCentavo(uniqueBudgetData.amount),
          period: uniqueBudgetData.period,
          start_date: uniqueBudgetData.start_date.includes('-') 
            ? uniqueBudgetData.start_date + '-01' 
            : new Date(uniqueBudgetData.start_date + ' 01').toISOString().slice(0, 10),
          end_date: calculateEndDate(uniqueBudgetData.start_date, uniqueBudgetData.period),
          alert_threshold: uniqueBudgetData.alert_threshold || 0.8,
          spent: 0,
          currency: 'PHP',
          alert_enabled: true,
          status: 'active'
        };

        // Validate budget amount is reasonable
        if (budgetData.amount < 0.01) {
          throw new Error('Budget amount must be at least ₱0.01');
        }

        if (budgetData.amount > 99999999999.99) {
          throw new Error('Budget amount cannot exceed ₱99,999,999,999.99');
        }

        // Create budget using BudgetService
        const budgetResult = await BudgetService.getInstance().createBudget(budgetData, user.id);
        if (!budgetResult.success) {
          throw new Error(`Failed to create auto budget: ${budgetResult.error}`);
        }

        console.log('Auto budget created successfully:', budgetResult.data);
        return;
      }
    }

    // Prepare budget data (no duplicate name found)
    const budgetData = {
      budget_name: sanitizeBudgetName(modalState.budgetData.budget_name.trim()),
      category_id: modalState.budgetData.category_id,
      amount: roundToCentavo(modalState.budgetData.amount),
      period: modalState.budgetData.period,
      start_date: modalState.budgetData.start_date.includes('-') 
        ? modalState.budgetData.start_date + '-01' 
        : new Date(modalState.budgetData.start_date + ' 01').toISOString().slice(0, 10),
      end_date: calculateEndDate(modalState.budgetData.start_date, modalState.budgetData.period),
      alert_threshold: modalState.budgetData.alert_threshold || 0.8,
      spent: 0,
      currency: 'PHP',
      alert_enabled: true,
      status: 'active'
    };

    // Validate budget amount is reasonable
    if (budgetData.amount < 0.01) {
      throw new Error('Budget amount must be at least ₱0.01');
    }

    if (budgetData.amount > 99999999999.99) {
      throw new Error('Budget amount cannot exceed ₱99,999,999,999.99');
    }

    // Create budget using BudgetService
    const budgetResult = await BudgetService.getInstance().createBudget(budgetData, user.id);
    if (!budgetResult.success) {
      throw new Error(`Failed to create auto budget: ${budgetResult.error}`);
    }

    console.log('Auto budget created successfully:', budgetResult.data);
  };

  const createTransaction = async () => {
    if (!user) {
      throw new Error('User authentication required');
    }

    // Validate account ownership
    const isValidAccount = await AccountService.validateAccountOwnership(
      modalState.transactionData.account_id, 
      user.id
    );
    if (!isValidAccount) {
      throw new Error('Invalid account selected');
    }

    // Get account details for balance validation (only for contributions)
    const selectedAccount = accounts.find(acc => acc.id === modalState.transactionData.account_id);
    if (!selectedAccount) {
      throw new Error('Selected account not found');
    }

    // Validate sufficient funds for contribution transactions only
    // Users should be able to transact even with 0 or negative balance except for goal contributions
    const amount = roundToCentavo(modalState.transactionData.amount);
    if (modalState.transactionData.type === 'contribution' && amount > selectedAccount.balance) {
      throw new Error(
        `Insufficient funds for goal contribution in ${selectedAccount.account_name}. ` +
        `Available balance: ₱${selectedAccount.balance.toFixed(2)}, ` +
        `Required: ₱${amount.toFixed(2)}`
      );
    }

    // Validate goal reference if provided
    if (modalState.transactionData.goal_id) {
      const selectedGoal = goals.find(goal => goal.id === modalState.transactionData.goal_id);
      if (!selectedGoal) {
        throw new Error('Selected goal not found');
      }

      // Check if contribution exceeds goal remaining amount (warning, not error)
      if (modalState.transactionData.type === 'contribution') {
        const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
        if (amount > remainingAmount) {
          console.warn(
            `Contribution (₱${amount.toFixed(2)}) exceeds goal remaining amount (₱${remainingAmount.toFixed(2)}) ` +
            `by ₱${(amount - remainingAmount).toFixed(2)}`
          );
        }
      }
    }

    // Prepare transaction data
    const transactionData: any = {
      user_id: user.id,
      account_id: modalState.transactionData.account_id,
      type: modalState.transactionData.type,
      amount: amount,
      date: modalState.transactionData.date,
      description: sanitizeBudgetName(modalState.transactionData.description.trim()),
      goal_id: modalState.transactionData.goal_id || null,
      created_at: new Date().toISOString()
    };

    // Set the correct category field based on transaction type
    if (modalState.transactionData.type === 'income') {
      transactionData.income_category_id = modalState.transactionData.category_id || null;
    } else {
      transactionData.expense_category_id = modalState.transactionData.category_id || null;
    }

    console.log('Creating transaction with data:', transactionData);

    // Create transaction using TransactionService
    const transactionResult = await TransactionService.createTransaction(transactionData);
    if (!transactionResult.success) {
      throw new Error(`Failed to create transaction: ${transactionResult.error}`);
    }

    console.log('Transaction created successfully:', transactionResult.data);

    // Update account balance
    await updateAccountBalance(
      modalState.transactionData.account_id,
      modalState.transactionData.type === 'income' 
        ? amount 
        : -amount,
      modalState.transactionData.type === 'contribution'
    );

    // Update goal progress if applicable
    if (modalState.transactionData.goal_id && (modalState.transactionData.type === 'contribution' || modalState.transactionData.type === 'income')) {
      await updateGoalProgress(
        modalState.transactionData.goal_id,
        amount
      );
    }
  };

  const updateAccountBalance = async (accountId: string, balanceChange: number, isContribution: boolean = false) => {
    if (!user) {
      throw new Error('User authentication required');
    }

    try {
      console.log(`Updating account balance: accountId=${accountId}, change=${balanceChange}, isContribution=${isContribution}`);
      
      // Try using RPC function first
      const { error: rpcError } = await supabase.rpc('update_account_balance', {
        p_account_id: accountId,
        p_amount_change: balanceChange
      });

      if (rpcError) {
        // Fallback to direct update
        console.warn('RPC failed, using direct account balance update:', rpcError);
        
        const { data: accountData, error: fetchError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', accountId)
          .eq('user_id', user.id) // Ensure user owns the account
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch account balance: ${fetchError.message}`);
        }

        if (!accountData) {
          throw new Error('Account not found or access denied');
        }

        const newBalance = accountData.balance + balanceChange;

        // Only validate negative balance for contribution transactions
        // Users should be able to transact even with 0 or negative balance except for goal contributions
        if (newBalance < 0 && isContribution) {
          const selectedAccount = accounts.find(acc => acc.id === accountId);
          throw new Error(
            `Insufficient funds for goal contribution. Transaction would result in negative balance ` +
            `(₱${newBalance.toFixed(2)}) for account ${selectedAccount?.account_name || 'Unknown'}`
          );
        }

        const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(`Failed to update account balance: ${updateError.message}`);
        }
      }

      console.log('Account balance updated successfully');
    } catch (error) {
      console.error('Failed to update account balance:', error);
      throw error instanceof Error ? error : new Error('Failed to update account balance');
    }
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    if (!user) {
      throw new Error('User authentication required');
    }

    try {
      console.log(`Updating goal progress: goalId=${goalId}, amount=${amount}`);
      
      // Try using RPC function first
      const { error: rpcError } = await supabase.rpc('update_goal_progress', {
        p_goal_id: goalId,
        p_amount: amount
      });

      if (rpcError) {
        // Fallback to direct update
        console.warn('RPC failed, using direct goal progress update:', rpcError);
        
        const { data: goalData, error: fetchGoalError } = await supabase
          .from('goals')
          .select('current_amount, target_amount')
          .eq('id', goalId)
          .eq('user_id', user.id) // Ensure user owns the goal
          .single();

        if (fetchGoalError) {
          throw new Error(`Failed to fetch goal data: ${fetchGoalError.message}`);
        }

        if (!goalData) {
          throw new Error('Goal not found or access denied');
        }

        const newAmount = goalData.current_amount + amount;
        const status = newAmount >= goalData.target_amount ? 'completed' : 'in_progress';

        // Validate new amount is not negative
        if (newAmount < 0) {
          throw new Error('Goal progress cannot be negative');
        }

        const { error: updateGoalError } = await supabase
          .from('goals')
          .update({
            current_amount: newAmount,
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', goalId)
          .eq('user_id', user.id);

        if (updateGoalError) {
          throw new Error(`Failed to update goal progress: ${updateGoalError.message}`);
        }

        if (status === 'completed') {
          console.log('Goal completed!', { goalId, newAmount, targetAmount: goalData.target_amount });
        }
      }

      console.log('Goal progress updated successfully');
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw error instanceof Error ? error : new Error('Failed to update goal progress');
    }
  };

  const calculateEndDate = (startDate: string, period: string): string => {
    let baseDate: Date;
    
    if (startDate.includes('-')) {
      // Format: "2025-09"
      baseDate = new Date(startDate + '-01');
    } else {
      // Try to parse text format like "September 2025"
      baseDate = new Date(startDate + ' 01');
    }

    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid start date format');
    }

    switch (period) {
      case 'month':
        baseDate.setMonth(baseDate.getMonth() + 1);
        baseDate.setDate(0); // Last day of previous month
        break;
      case 'quarter':
        baseDate.setMonth(baseDate.getMonth() + 3);
        baseDate.setDate(0); // Last day of previous month
        break;
      case 'year':
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        baseDate.setDate(0); // Last day of previous month
        break;
      default:
        throw new Error('Invalid period type');
    }

    return baseDate.toISOString().slice(0, 10);
  };
  
  // Tooltip management functions
  const showTooltip = (event: React.MouseEvent, title: string, description: string, category: 'workflow' | 'form' | 'process' | 'analytics' = 'process') => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipState({
      isVisible: true,
      position: {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + rect.width / 2
      },
      title,
      description,
      category
    });
  };
  
  const hideTooltip = () => {
    setTooltipState(prev => ({ ...prev, isVisible: false }));
  };
  
  const handleTipClick = (tipId: string) => {
    // Handle tip clicks for contextual help
    console.log('Tip clicked:', tipId);
    // You can implement specific actions based on tipId
  };

  if (!modalIsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="w-[95vw] h-[90vh] mx-auto my-auto">
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200">
          {/* Tooltip */}
          {tooltipState.isVisible && tooltipState.position && (
            <div 
              className="absolute z-50 bg-white p-3 rounded-lg shadow-lg max-w-xs border border-gray-100" 
              style={{ 
                top: `${tooltipState.position.top}px`, 
                left: `${tooltipState.position.left}px`,
                transform: "translateX(-50%)"
              }}
            >
              <div className="font-semibold mb-2 text-blue-600">{tooltipState.title}</div>
              <p className="mb-0 text-sm text-gray-600">{tooltipState.description}</p>
            </div>
          )}

          <BudgetModalHeader
            currentStep={modalState.currentStep}
            progressPercentage={modalState.progressPercentage}
            onClose={handleClose}
            workflowType={modalState.workflowChoice?.workflow_type}
          />

          {modalState.currentStep === 'workflow_choice' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <WorkflowChoiceStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      onWorkflowChoice={handleWorkflowChoice}
                    />
                  </div>
                </div>
                
                {/* Sidebar */}
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState.currentStep === 'budget_config' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetConfigStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      navigationHandlers={{
                        onPrevious: () => navigateToStep('workflow_choice'),
                        onNext: () => navigateToStep('transaction_create'),
                        isValid: isBudgetStepValid
                      }}
                      expenseCategories={expenseCategories}
                      incomeCategories={incomeCategories}
                      categoriesLoading={categoriesLoading}
                    />
                  </div>
                </div>
                
                {/* Tips and Summary Sidebar */}
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState.currentStep === 'transaction_setup' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <TransactionSetupStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      navigationHandlers={{
                        onPrevious: () => navigateToStep('workflow_choice'),
                        onNext: () => navigateToStep('transaction_review'),
                        isValid: isTransactionStepValid
                      }}
                      expenseCategories={expenseCategories}
                      incomeCategories={incomeCategories}
                      accounts={accounts}
                      goals={goals}
                      categoriesLoading={categoriesLoading}
                    />
                  </div>
                </div>
                
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState.currentStep === 'transaction_create' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <TransactionCreateStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      navigationHandlers={{
                        onPrevious: () => navigateToStep('budget_config'),
                        onNext: () => navigateToStep('final_confirmation')
                      }}
                      expenseCategories={expenseCategories}
                      incomeCategories={incomeCategories}
                      accounts={accounts}
                      goals={goals}
                      categoriesLoading={categoriesLoading}
                    />
                  </div>
                </div>
                
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState.currentStep === 'transaction_review' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <TransactionReviewStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      navigationHandlers={{
                        onPrevious: () => navigateToStep('transaction_setup'),
                        onNext: () => navigateToStep('final_confirmation')
                      }}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
                
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalState.currentStep === 'final_confirmation' && (
            <div className="flex-1 flex min-h-0">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <FinalConfirmationStep
                      modalState={modalState}
                      updateModalState={updateModalState}
                      updateBudgetData={updateBudgetData}
                      updateTransactionData={updateTransactionData}
                      updateValidationErrors={updateValidationErrors}
                      navigateToStep={navigateToStep}
                      navigationHandlers={{}}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
                
                <div className="w-1/3 bg-gray-50 border-l border-gray-200 flex flex-col">
                  <div className="p-8 flex-1 overflow-y-auto">
                    <BudgetSidebar
                      currentStep={modalState.currentStep}
                      workflowType={modalState.workflowChoice?.workflow_type}
                      modalState={modalState}
                      onTipClick={handleTipClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetSetupModal;