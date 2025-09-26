import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { useFamilyGoalPermissions } from '../../../hooks/useFamilyPermissions';
import PermissionErrorModal from '../../common/PermissionErrorModal';
import { UserOnboardingService } from '../../../services/userOnboardingService';
import { AccountService } from '../../../services/database/accountService';
import TransactionNotificationService from '../../../services/database/transactionNotificationService';
import BudgetSelector from '../../budget/BudgetSelector';
import { BudgetItem } from '../../../services/database/budgetService';
import { CentavoInput } from '../../common/CentavoInput';
import { formatCurrency, sanitizeBudgetName, roundToCentavo } from '../../../utils/currencyUtils';
import AccountSelector from '../../transactions/components/AccountSelector';
import CategorySelector from '../../transactions/components/CategorySelector';
import GoalSelector from '../../transactions/components/GoalSelector';
import type { Goal } from '../../transactions/components/GoalSelector';
import { Account as AccountType } from '../../settings/types';
import { Account } from '../../settings/types';
import ErrorBoundary from '../../common/ErrorBoundary';
import { StepComponentProps, NavigationHandlers } from '../types/BudgetSetupTypes';

// Import SB Admin CSS
import 'startbootstrap-sb-admin-2/css/sb-admin-2.min.css';

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface UserData {
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
}

interface TransactionFormData {
  type: 'income' | 'expense' | 'contribution';
  account_id: string;
  category_id: string;
  goal_id: string;
  budget_id: string;
  amount: number;
  date: string;
  description: string;
}

interface TransactionCreateStepProps extends StepComponentProps {
  navigationHandlers: NavigationHandlers;
  expenseCategories: Category[];
  incomeCategories: Category[];
  accounts: any[];
  goals: any[];
  categoriesLoading: boolean;
}

const TransactionCreateStep: FC<TransactionCreateStepProps> = ({ 
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const familyGoalPermissions = useFamilyGoalPermissions();
  
  const [userData, setUserData] = useState<UserData>({
    accounts: [],
    incomeCategories: [],
    expenseCategories: [],
    goals: []
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [setupInProgress, setSetupInProgress] = useState<boolean>(false);
  // Removed viewMode state as we're skipping the review step
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [hasGoals, setHasGoals] = useState<boolean | null>(null);
  const [permissionErrorModal, setPermissionErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    suggestedActions?: string[];
    userRole?: string;
  }>({ isOpen: false, title: '', message: '' });

  const [transaction, setTransaction] = useState<TransactionFormData>({
    type: 'expense',
    account_id: '',
    category_id: modalState.budgetData.category_id || '',
    goal_id: '',
    budget_id: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const handleAmountChange = (newAmount: number) => {
    // Validate amount is within safe range for DECIMAL(15,4)
    if (newAmount > 99999999999.99) {
      showErrorToast('Amount too large: maximum supported amount is ₱99,999,999,999.99');
      return;
    }
    
    setTransaction(prev => ({
      ...prev,
      amount: newAmount
    }));
    
    updateTransactionData({ amount: newAmount });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          return;
        }

        setLoading(true);
        
        // Prevent multiple simultaneous setup calls
        if (setupInProgress) {
          console.log('Setup already in progress, skipping...');
          return;
        }
        
        // Ensure user has default configuration setup
        console.log('Ensuring user setup for transaction form...');
        setSetupInProgress(true);
        const setupSuccess = await UserOnboardingService.ensureUserSetup(user.id);
        setSetupInProgress(false);
        
        if (!setupSuccess) {
          console.warn('User setup incomplete, but continuing with existing data');
        }
        
        // Fetch user's accounts using AccountService for consistent typing
        let accountsData: Account[] = [];
        const accountsResult = await AccountService.fetchUserAccounts(user.id);
        if (!accountsResult.success) {
          console.warn('Failed to fetch accounts with AccountService:', accountsResult.error);
          // Fallback to direct query with all required fields
          const { data, error: accountsError } = await supabase
            .from('accounts')
            .select('id, user_id, account_name, account_type, balance, status, is_default, currency, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('account_name');
          if (accountsError) throw accountsError;
          accountsData = data || [];
        } else {
          accountsData = accountsResult.data || [];
        }
        
        // Fetch income categories using service method first, fallback to direct query
        let incomeData: Category[] = [];
        try {
          incomeData = await UserOnboardingService.getUserDefaultIncomeCategories(user.id);
        } catch (error) {
          console.warn('Service method failed, falling back to direct query:', error);
          const { data, error: incomeError } = await supabase
            .from('income_categories')
            .select('id, category_name, icon')
            .eq('user_id', user.id)
            .order('category_name');
          if (incomeError) throw incomeError;
          incomeData = data || [];
        }
        
        // Fetch expense categories using service method first, fallback to direct query
        let expenseData: Category[] = [];
        try {
          expenseData = await UserOnboardingService.getUserDefaultExpenseCategories(user.id);
        } catch (error) {
          console.warn('Service method failed, falling back to direct query:', error);
          const { data, error: expenseError } = await supabase
            .from('expense_categories')
            .select('id, category_name, icon')
            .eq('user_id', user.id)
            .order('category_name');
          if (expenseError) throw expenseError;
          expenseData = data || [];
        }
        
        // Fetch goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('id, goal_name, target_amount, current_amount, target_date, priority, status, is_family_goal')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('goal_name');
          
        if (goalsError) throw goalsError;
        
        // Transform goals data to ensure required fields have defaults
        const transformedGoals = (goalsData || []).map(goal => ({
          ...goal,
          target_date: goal.target_date || new Date().toISOString().slice(0, 10),
          priority: goal.priority || 'medium',
          status: goal.status || 'in_progress',
          is_family_goal: goal.is_family_goal || false
        }));
        
        // Update state with fetched data
        setUserData({
          accounts: accountsData || [],
          incomeCategories: incomeData || [],
          expenseCategories: expenseData || [],
          goals: transformedGoals || []
        });
        
        // Set default account if available
        if (accountsData && accountsData.length > 0) {
          const defaultAccount = accountsData.find(account => account.is_default);
          const selectedAccountData = defaultAccount || accountsData[0];
          const selectedAccountId = selectedAccountData?.id || '';
          
          setSelectedAccount(selectedAccountData);
          setTransaction(prev => ({ 
            ...prev, 
            account_id: selectedAccountId
          }));
          
          updateTransactionData({
            account_id: selectedAccountId,
            account_name: selectedAccountData?.account_name || ''
          });
        }
        
        // Log the fetched data for debugging
        console.log('Fetched user data:', {
          accounts: accountsData?.length || 0,
          incomeCategories: incomeData?.length || 0,
          expenseCategories: expenseData?.length || 0,
          goals: goalsData?.length || 0
        });
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        showErrorToast('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  // Initialize with budget category
  useEffect(() => {
    if (modalState.budgetData.category_id && !transaction.category_id) {
      setTransaction(prev => ({
        ...prev,
        category_id: modalState.budgetData.category_id,
        type: 'expense'
      }));
      
      updateTransactionData({
        category_id: modalState.budgetData.category_id,
        category_name: modalState.budgetData.category_name,
        type: 'expense'
      });
      
      // Set selected category
      const category = userData.expenseCategories.find(cat => cat.id === modalState.budgetData.category_id);
      if (category) {
        setSelectedCategory(category);
      }
    }
  }, [modalState.budgetData.category_id, userData.expenseCategories]);

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    
    // Special handling for transaction type changes
    if (name === 'type') {
      const newType = value as 'income' | 'expense' | 'contribution';
      
      setTransaction((prev) => ({
        ...prev,
        type: newType,
        category_id: newType === 'expense' ? modalState.budgetData.category_id || '' : '',
        budget_id: '',
        goal_id: newType === 'contribution' ? prev.goal_id : '',
      }));
      
      updateTransactionData({
        type: newType,
        category_id: newType === 'expense' ? modalState.budgetData.category_id || '' : '',
        category_name: newType === 'expense' ? modalState.budgetData.category_name || '' : ''
      });
      
      setSelectedBudget(null);
      setSelectedCategory(null);
      setSelectedGoal(null);
      
      // Auto-set Contribution category for contribution type
      if (newType === 'contribution') {
        const contributionCategory = userData.expenseCategories.find(cat => 
          cat.category_name === 'Contribution'
        );
        
        if (contributionCategory) {
          setTimeout(() => {
            setSelectedCategory(contributionCategory);
            setTransaction(prev => ({
              ...prev,
              category_id: contributionCategory.id
            }));
            updateTransactionData({
              category_id: contributionCategory.id,
              category_name: contributionCategory.category_name
            });
          }, 50);
        }
      }
      
      return;
    }
    
    // Handle other field changes
    setTransaction((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    updateTransactionData({ [name]: value });
    
    // Update selected category when category_id changes via dropdown
    if (name === 'category_id') {
      const categories = transaction.type === 'income' ? userData.incomeCategories : userData.expenseCategories;
      const category = categories.find(cat => cat.id === value);
      setSelectedCategory(category || null);
      
      updateTransactionData({
        category_id: value,
        category_name: category?.category_name || ''
      });
      
      // Clear budget when category changes
      setTransaction((prev) => ({
        ...prev,
        budget_id: '',
      }));
      setSelectedBudget(null);
    }
    
    // Update selected goal when goal_id changes
    if (name === 'goal_id') {
      if (value) {
        const goal = userData.goals.find(g => g.id === value);
        setSelectedGoal(goal || null);
        updateTransactionData({
          goal_id: value,
          goal_name: goal?.goal_name || ''
        });
      } else {
        setSelectedGoal(null);
        updateTransactionData({
          goal_id: undefined,
          goal_name: undefined
        });
      }
    }
  }, [transaction.type, userData, modalState.budgetData, updateTransactionData]);

  const handleAccountSelect = (account: AccountType | null) => {
    setSelectedAccount(account);
    setTransaction(prev => ({
      ...prev,
      account_id: account?.id || ''
    }));
    updateTransactionData({
      account_id: account?.id || '',
      account_name: account?.account_name || ''
    });
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setTransaction(prev => ({
      ...prev,
      category_id: category?.id || ''
    }));
    updateTransactionData({
      category_id: category?.id || '',
      category_name: category?.category_name || ''
    });
    
    // Clear budget when category changes
    setSelectedBudget(null);
    setTransaction(prev => ({
      ...prev,
      budget_id: ''
    }));
  };

  const handleBudgetSelect = (budget: BudgetItem | null) => {
    setSelectedBudget(budget);
    setTransaction((prev) => ({
      ...prev,
      budget_id: budget?.id || '',
    }));
    // Don't update TransactionFormData since it doesn't have budget_id
  };

  const handleGoalSelect = (goal: Goal | null) => {
    console.log('Goal selected:', goal);
    setSelectedGoal(goal);
    
    // Auto-set "Contribution" category for contribution transactions
    if (transaction.type === 'contribution' && goal) {
      const contributionCategory = userData.expenseCategories.find(cat => 
        cat.category_name === 'Contribution'
      );
      
      if (contributionCategory) {
        setSelectedCategory(contributionCategory);
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || '',
          category_id: contributionCategory.id
        }));
        
        updateTransactionData({
          goal_id: goal.id || undefined,
          goal_name: goal.goal_name || undefined,
          category_id: contributionCategory.id,
          category_name: contributionCategory.category_name
        });
        
        // Clear any budget assignment since this is now a contribution
        setSelectedBudget(null);
        setTransaction(prev => ({
          ...prev,
          budget_id: ''
        }));
      } else {
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || '',
        }));
        updateTransactionData({
          goal_id: goal.id || undefined,
          goal_name: goal.goal_name || undefined
        });
      }
    }
    // Legacy logic: If a goal is selected and it's an expense transaction
    else if (goal && transaction.type === 'expense') {
      const contributionCategory = userData.expenseCategories.find(cat => 
        cat.category_name === 'Contribution'
      );
      
      if (contributionCategory) {
        setSelectedCategory(contributionCategory);
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || '',
          category_id: contributionCategory.id
        }));
        
        updateTransactionData({
          goal_id: goal.id || undefined,
          goal_name: goal.goal_name || undefined,
          category_id: contributionCategory.id,
          category_name: contributionCategory.category_name
        });
        
        // Clear any budget assignment
        setSelectedBudget(null);
        setTransaction(prev => ({
          ...prev,
          budget_id: ''
        }));
      } else {
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || '',
        }));
        updateTransactionData({
          goal_id: goal.id || undefined,
          goal_name: goal.goal_name || undefined
        });
      }
    } else {
      setTransaction((prev) => ({
        ...prev,
        goal_id: goal?.id || '',
      }));
      updateTransactionData({
        goal_id: goal?.id || undefined,
        goal_name: goal?.goal_name || undefined
      });
    }
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validation
    if (!transaction.amount || transaction.amount <= 0) {
      showErrorToast('Please enter a valid amount');
      return;
    }

    if (!transaction.date) {
      showErrorToast('Please select a date');
      return;
    }

    if (!transaction.account_id) {
      showErrorToast('Please select an account');
      return;
    }

    // Mandatory category validation for all transaction types
    if (!transaction.category_id) {
      showErrorToast('Please select a category');
      return;
    }
    
    // Additional validation to ensure the category matches the transaction type
    const isIncome = transaction.type === 'income';
    const isContribution = transaction.type === 'contribution';
    
    let categoryExists = false;
    if (isIncome) {
      categoryExists = userData.incomeCategories.some(cat => cat.id === transaction.category_id);
    } else if (isContribution) {
      categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
    } else {
      categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
    }
    
    if (!categoryExists) {
      const typeLabel = isIncome ? 'income' : (isContribution ? 'expense (for contributions)' : 'expense');
      showErrorToast(`Selected category does not match transaction type. Please select a ${typeLabel} category.`);
      return;
    }
    
    // Special validation for contribution type - require goal selection
    if (transaction.type === 'contribution' && !transaction.goal_id) {
      showErrorToast('Please select a goal for your contribution.');
      return;
    }

    // Additional validation for contribution amounts
    if (isContribution && selectedGoal && transaction.amount > 0) {
      const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
      if (transaction.amount > remainingAmount) {
        const proceed = window.confirm(
          `This contribution (₱${transaction.amount.toFixed(2)}) exceeds the goal's remaining amount (₱${remainingAmount.toFixed(2)}) by ₱${(transaction.amount - remainingAmount).toFixed(2)}. Do you want to proceed?`
        );
        if (!proceed) {
          return;
        }
      }
    }

    // Account balance validation only for contribution types
    if (transaction.type === 'contribution' && selectedAccount) {
      if (transaction.amount > selectedAccount.balance) {
        showErrorToast(`Insufficient funds for goal contribution in ${selectedAccount.account_name}. Available balance: ₱${selectedAccount.balance.toFixed(2)}`);
        return;
      }
    }

    // Budget validation for expense transactions
    if (transaction.type === 'expense' && selectedBudget) {
      const transactionAmount = transaction.amount;
      const newSpent = (selectedBudget.spent || 0) + transactionAmount;
      
      // Check if transaction would trigger threshold warning
      const newPercentage = (newSpent / selectedBudget.amount) * 100;
      const thresholdPercentage = (selectedBudget.alert_threshold || 0.8) * 100;
      
      if (newPercentage >= thresholdPercentage && newPercentage < 100) {
        const proceed = window.confirm(
          `This transaction would put the budget "${selectedBudget.budget_name}" at ${newPercentage.toFixed(1)}% utilization. Do you want to proceed?`
        );
        if (!proceed) {
          return;
        }
      }
    }

    // Instead of showing review mode, go directly to final confirmation
    navigateToStep('final_confirmation');
  };

  // Submit transaction (replica of AddTransaction submit logic)
  const handleSubmit = async () => {
    // For budget-first workflow, we don't create the transaction here
    // Instead, we navigate to final confirmation where both budget and transaction are created together
    navigateToStep('final_confirmation');
  };

  // Navigation handlers
  // Validation function to check if transaction form is complete
  const isTransactionFormComplete = () => {
    const basicRequirements = (
      transaction.amount > 0 &&
      transaction.description.trim() !== '' &&
      transaction.account_id !== '' &&
      transaction.category_id !== ''
    );
    
    // For contribution transactions, goal is also required
    if (transaction.type === 'contribution') {
      return basicRequirements && transaction.goal_id !== '';
    }
    
    return basicRequirements;
  };

  const handleNext = () => {
    if (isTransactionFormComplete()) {
      // Validate before going to final confirmation
      const e = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
      handleReview(e);
    } else {
      // Show validation error with specific missing fields
      const missingFields = [];
      if (transaction.amount <= 0) missingFields.push('Amount');
      if (transaction.description.trim() === '') missingFields.push('Description');
      if (transaction.account_id === '') missingFields.push('Account');
      if (transaction.category_id === '') missingFields.push('Category');
      if (transaction.type === 'contribution' && transaction.goal_id === '') missingFields.push('Goal');
      
      showErrorToast(`Please complete the following required fields: ${missingFields.join(', ')}.`);
    }
  };

  const handleBack = () => {
    navigateToStep('budget_config');
  };

  const handleSkipTransaction = () => {
    updateTransactionData({ 
      amount: 0, 
      description: '',
      account_id: '',
      account_name: '',
      goal_id: undefined,
      goal_name: undefined
    });
    navigateToStep('final_confirmation');
  };

  // Amount suggestions based on budget
  const generateAmountSuggestions = () => {
    const budgetAmount = modalState.budgetData.amount;
    return [
      { percent: 10, amount: budgetAmount * 0.1 },
      { percent: 25, amount: budgetAmount * 0.25 },
      { percent: 50, amount: budgetAmount * 0.5 },
      { percent: 100, amount: budgetAmount }
    ];
  };

  const suggestions = generateAmountSuggestions();

  // Tooltip functions
  const showTip = (tip: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX
    });
    setActiveTip(tip);
  };

  const hideTip = () => {
    setActiveTip(null);
    setTooltipPosition(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-muted">Loading transaction form...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        {/* Budget Context Alert */}
        <div className="alert alert-info mb-4">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Transaction for Budget:</strong> {modalState.budgetData.budget_name}
          <div className="mt-2">
            <small className="text-muted">
              <strong>Category:</strong> {modalState.budgetData.category_name} • 
              <strong>Amount:</strong> ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </small>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <form onSubmit={handleReview}>
              {/* Transaction Type Selection */}
              <div className="form-group mb-4">
                <label className="font-weight-bold text-gray-800">
                  Transaction Type <span className="text-danger">*</span>
                </label>
                <div className="row">
                  <div className="col-12">
                    <div 
                      className={`card ${transaction.type === 'expense' ? 'bg-danger text-white' : 'bg-light'} py-3 text-center shadow-sm`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleChange({ target: { name: 'type', value: 'expense' } } as any)}
                    >
                      <div className="card-body p-3">
                        <div className="row align-items-center">
                          <div className="col-md-2 text-center">
                            <i className="fas fa-minus-circle fa-3x mb-2"></i>
                          </div>
                          <div className="col-md-6 text-left">
                            <h4 className="mb-1 font-weight-bold">Expense</h4>
                            <p className="mb-0 small">
                              <i className="fas fa-link me-2"></i>
                              Matches budget category: {modalState.budgetData.category_name}
                            </p>
                            <p className="mb-0 small opacity-75">
                              <i className="fas fa-wallet me-2"></i>
                              Budget Amount: ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="col-md-4 text-right">
                            <span className="badge badge-light text-danger px-3 py-2">
                              <i className="fas fa-check-circle me-1"></i>
                              Auto-selected
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group mb-4">
                <label className="font-weight-bold mb-2">Amount *</label>
                <CentavoInput
                  value={transaction.amount}
                  onChange={handleAmountChange}
                  placeholder="Enter transaction amount"
                  className={`form-control-lg ${modalState.validationErrors?.transactionAmount ? 'is-invalid' : ''}`}
                />
                {modalState.validationErrors?.transactionAmount && (
                  <div className="invalid-feedback">{modalState.validationErrors.transactionAmount}</div>
                )}
                
                <div className="mt-2">
                  <small className="text-muted">Budget Amount: ₱{modalState.budgetData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</small>
                  {transaction.amount > modalState.budgetData.amount && (
                    <div className="text-warning small mt-1">
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      Transaction exceeds budget amount
                    </div>
                  )}
                </div>
                
                {/* Quick amount suggestions */}
                <div className="mt-3">
                  <label className="small text-muted">Quick amounts:</label>
                  <div className="btn-group-sm mt-1" role="group">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.percent}
                        type="button"
                        onClick={() => handleAmountChange(suggestion.amount)}
                        className="btn btn-outline-secondary btn-sm me-2"
                      >
                        {suggestion.percent}% (₱{suggestion.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  {/* Account Selector */}
                  <div className="form-group mb-4">
                    <AccountSelector
                      selectedAccountId={transaction.account_id}
                      onAccountSelect={handleAccountSelect}
                      showBalance={true}
                      className={modalState.validationErrors?.transactionAccount ? 'is-invalid' : ''}
                      label="Account *"
                    />
                    {modalState.validationErrors?.transactionAccount && (
                      <div className="invalid-feedback">{modalState.validationErrors.transactionAccount}</div>
                    )}
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
                      transaction.type !== 'contribution' ? (
                        <div>
                          <CategorySelector
                            selectedCategoryId={transaction.category_id}
                            onCategorySelect={handleCategorySelect}
                            transactionType={transaction.type}
                            incomeCategories={userData.incomeCategories}
                            expenseCategories={userData.expenseCategories}
                            className={modalState.validationErrors?.transactionCategory ? 'is-invalid' : ''}
                            label="Category *"
                            required
                          />
                          {transaction.type === 'expense' && modalState.budgetData.category_name && (
                            <small className="form-text text-success">
                              <i className="fas fa-link me-1"></i>
                              Linked to budget category: {modalState.budgetData.category_name}
                            </small>
                          )}
                        </div>
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
                    {modalState.validationErrors?.transactionCategory && (
                      <div className="invalid-feedback d-block">{modalState.validationErrors.transactionCategory}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  {/* Date Input */}
                  <div className="form-group mb-4">
                    <label className="font-weight-bold mb-2">Date *</label>
                    <input
                      type="date"
                      name="date"
                      className={`form-control form-control-lg ${modalState.validationErrors?.transactionDate ? 'is-invalid' : ''}`}
                      value={transaction.date}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {modalState.validationErrors?.transactionDate && (
                      <div className="invalid-feedback">{modalState.validationErrors.transactionDate}</div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  {/* Goal Selector */}
                  <div className="form-group mb-4">
                    {hasGoals === false ? (
                      <div>
                        <label className="font-weight-bold text-gray-800">
                          {transaction.type === 'contribution' ? 'Goal *' : 'Goal Assignment (Optional)'}
                        </label>
                        <div className="card border-dashed border-primary bg-light text-center py-4">
                          <div className="card-body">
                            <i className="fas fa-flag fa-3x text-primary mb-3"></i>
                            <h5 className="text-primary mb-2">No Goals Available</h5>
                            <p className="text-muted mb-3">
                              {transaction.type === 'contribution' 
                                ? 'You need to create a goal before making a contribution transaction.'
                                : 'Create your first financial goal to track your progress.'}
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary btn-lg"
                              onClick={() => navigate('/goals/create')}
                            >
                              <i className="fas fa-plus mr-2"></i>
                              Create Your First Goal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <GoalSelector
                        selectedGoal={selectedGoal}
                        onGoalSelect={handleGoalSelect}
                        className={`mb-4 ${modalState.validationErrors?.transactionGoal ? 'is-invalid' : ''}`}
                        required={transaction.type === 'contribution'}
                        label={transaction.type === 'contribution' ? 'Goal *' : 'Goal Assignment (Optional)'}
                        isContributionType={transaction.type === 'contribution'}
                        showValidationError={!!modalState.validationErrors?.transactionGoal}
                        onGoalsLoaded={setHasGoals}
                      />
                    )}
                    {modalState.validationErrors?.transactionGoal && (
                      <div className="invalid-feedback d-block">{modalState.validationErrors.transactionGoal}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-group mb-4">
                <label className="font-weight-bold mb-2">Description *</label>
                <textarea
                  name="description"
                  className={`form-control ${modalState.validationErrors?.transactionDescription ? 'is-invalid' : ''}`}
                  rows={3}
                  value={transaction.description}
                  onChange={handleChange}
                  placeholder="What was this transaction for?"
                />
                {modalState.validationErrors?.transactionDescription && (
                  <div className="invalid-feedback">{modalState.validationErrors.transactionDescription}</div>
                )}
                <small className="form-text text-muted">Provide details to help track your spending</small>
              </div>


            </form>
          </div>
        </div>

        {/* Tooltip */}
        {activeTip && tooltipPosition && (
          <div 
            className="position-absolute bg-dark text-white p-2 rounded shadow-sm small"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 1000,
              maxWidth: '200px'
            }}
          >
            {activeTip}
          </div>
        )}

        {/* Permission Error Modal */}
        <PermissionErrorModal
          isOpen={permissionErrorModal.isOpen}
          onClose={() => setPermissionErrorModal(prev => ({ ...prev, isOpen: false }))}
          errorTitle={permissionErrorModal.title}
          errorMessage={permissionErrorModal.message}
          suggestedActions={permissionErrorModal.suggestedActions}
          userRole={permissionErrorModal.userRole}
        />

        {/* Navigation */}
        <div className="d-flex justify-content-between pt-4 mt-4" style={{ borderTop: '1px solid #dee2e6' }}>
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-outline-secondary btn-lg"
          >
            <i className="fas fa-arrow-left me-2"></i>Back to Budget
          </button>
          <div>
            <button
              type="button"
              onClick={handleSkipTransaction}
              className="btn btn-outline-secondary btn-lg me-3"
            >
              <i className="fas fa-forward me-2"></i>
              Skip & Continue to Final Review
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || !isTransactionFormComplete()}
              className={`btn btn-lg ${
                isTransactionFormComplete() ? 'btn-primary' : 'btn-outline-primary'
              }`}
              title={!isTransactionFormComplete() ? 'Please complete all required fields' : ''}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Creating...
                </>
              ) : (
                <>
                  {isTransactionFormComplete() ? 'Continue to Final Review' : 'Complete Form to Continue'}
                  <i className="fas fa-arrow-right ms-2"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TransactionCreateStep;