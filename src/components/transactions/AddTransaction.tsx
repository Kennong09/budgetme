import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { useFamilyGoalPermissions } from "../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../common/PermissionErrorModal";
import { UserOnboardingService } from "../../services/userOnboardingService";
import { AccountService } from "../../services/database/accountService";
import TransactionNotificationService from "../../services/database/transactionNotificationService";
import BudgetSelector from "../budget/BudgetSelector";
import { BudgetItem } from "../../services/database/budgetService";
import { CentavoInput } from "../common/CentavoInput";
import { formatCurrency, sanitizeBudgetName, roundToCentavo } from "../../utils/currencyUtils";
import AccountSelector from "./components/AccountSelector";
import CategorySelector from "./components/CategorySelector";
import GoalSelector from "./components/GoalSelector";
import type { Goal } from "./components/GoalSelector";
import { Account as AccountType } from "../settings/types";
import { Account } from "../settings/types";
import ErrorBoundary from "../common/ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

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
  type: "income" | "expense" | "contribution";
  account_id: string;
  category_id: string;
  goal_id: string;
  budget_id: string;
  amount: number; // Changed from string to number for centavo precision
  date: string;
  description: string;
}

const AddTransaction: FC<{}> = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [hasGoals, setHasGoals] = useState<boolean | null>(null); // null = loading, true/false = has/no goals
  const [permissionErrorModal, setPermissionErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    suggestedActions?: string[];
    userRole?: string;
  }>({ isOpen: false, title: '', message: '' });

  const [transaction, setTransaction] = useState<TransactionFormData>({
    type: "expense",
    account_id: "",
    category_id: "",
    goal_id: "",
    budget_id: "",
    amount: 0, // Changed from string to number for centavo precision
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const handleAmountChange = (newAmount: number) => {
    // Validate amount is within safe range for DECIMAL(15,4) - using centavo precision
    if (newAmount > 99999999999.99) {
      showErrorToast('Amount too large: maximum supported amount is ₱99,999,999,999.99');
      return;
    }
    
    setTransaction(prev => ({
      ...prev,
      amount: newAmount
    }));
  };

  useEffect(() => {
    
    const fetchUserData = async () => {
      try {
        if (!user) {
          showErrorToast("You must be logged in to add transactions");
          navigate("/auth/login");
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
        
        // Fetch goals (no service method needed for this)
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
        
        // Set default account if available - prioritize default account, fallback to first account
        if (accountsData && accountsData.length > 0) {
          // Try to find a default account first
          const defaultAccount = accountsData.find(account => account.is_default);
          const selectedAccountData = defaultAccount || accountsData[0];
          const selectedAccountId = selectedAccountData?.id || "";
          
          setSelectedAccount(selectedAccountData);
          setTransaction(prev => ({ 
            ...prev, 
            account_id: selectedAccountId
          }));
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
        showErrorToast("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id, navigate, showErrorToast]); // Removed location.search to prevent unnecessary re-renders

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    
    // Special handling for transaction type changes
    if (name === 'type') {
      const newType = value as "income" | "expense" | "contribution";
      
      // Update transaction state in a single setState call to prevent hook order issues
      setTransaction((prev) => ({
        ...prev,
        type: newType,
        category_id: '', // Clear category selection when changing transaction type
        budget_id: '', // Clear budget selection when changing transaction type
        goal_id: '', // Clear goal selection when changing transaction type
      }));
      
      // Clear related selections in separate setState calls after the main update
      setSelectedBudget(null);
      setSelectedCategory(null);
      setSelectedGoal(null);
      
      return; // Early return to prevent further processing
    }
    
    // Handle other field changes
    setTransaction((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Update selected category when category_id changes via dropdown
    if (name === 'category_id') {
      const categories = transaction.type === 'income' ? userData.incomeCategories : userData.expenseCategories;
      const category = categories.find(cat => cat.id === value);
      setSelectedCategory(category || null);
      
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
      } else {
        setSelectedGoal(null);
      }
    }
  }, [transaction.type, userData.incomeCategories, userData.expenseCategories, userData.goals]);

  const handleAccountSelect = (account: AccountType | null) => {
    setSelectedAccount(account);
    setTransaction(prev => ({
      ...prev,
      account_id: account?.id || ""
    }));
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setTransaction(prev => ({
      ...prev,
      category_id: category?.id || ""
    }));
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
  };

  const handleGoalSelect = (goal: Goal | null) => {
    console.log('Goal selected:', goal);
    setSelectedGoal(goal);
    
    // Auto-set "Contribution" category for contribution transactions
    if (transaction.type === 'contribution' && goal) {
      const contributionCategory = userData.expenseCategories.find(cat => 
        cat.category_name === 'Contribution'
      );
      
      console.log('Looking for Contribution category for contribution type:', contributionCategory);
      console.log('Available expense categories:', userData.expenseCategories.map(cat => cat.category_name));
      
      if (contributionCategory) {
        console.log('Auto-setting Contribution category for contribution type:', contributionCategory);
        setSelectedCategory(contributionCategory);
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
          category_id: contributionCategory.id
        }));
        
        // Clear any budget assignment since this is now a contribution
        setSelectedBudget(null);
        setTransaction(prev => ({
          ...prev,
          budget_id: ''
        }));
      } else {
        // If no Contribution category found, just set the goal without changing category
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
        }));
      }
    }
    // Legacy logic: If a goal is selected and it's an expense transaction, automatically set it to "Contribution" category
    else if (goal && transaction.type === 'expense') {
      const contributionCategory = userData.expenseCategories.find(cat => 
        cat.category_name === 'Contribution'
      );
      
      console.log('Looking for Contribution category:', contributionCategory);
      console.log('Available expense categories:', userData.expenseCategories.map(cat => cat.category_name));
      
      if (contributionCategory) {
        console.log('Auto-setting Contribution category:', contributionCategory);
        setSelectedCategory(contributionCategory);
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
          category_id: contributionCategory.id
        }));
        
        // Clear any budget assignment since this is now a contribution
        setSelectedBudget(null);
        setTransaction(prev => ({
          ...prev,
          budget_id: ''
        }));
      } else {
        console.log('No Contribution category found, just setting goal');
        // If no Contribution category found, just set the goal without changing category
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
        }));
      }
    } else {
      console.log('No goal selected or income transaction, just updating goal_id');
      // If no goal selected or income transaction, just update goal_id
      setTransaction((prev) => ({
        ...prev,
        goal_id: goal?.id || "",
      }));
    }
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validation
    if (!transaction.amount || transaction.amount <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }

    if (!transaction.date) {
      showErrorToast("Please select a date");
      return;
    }

    if (!transaction.account_id) {
      showErrorToast("Please select an account");
      return;
    }

    // Mandatory category validation for all transaction types
    if (!transaction.category_id) {
      showErrorToast("Please select a category");
      return;
    }
    
    // Additional validation to ensure the category matches the transaction type
    const isIncome = transaction.type === 'income';
    const isContribution = transaction.type === 'contribution';
    
    let categoryExists = false;
    if (isIncome) {
      categoryExists = userData.incomeCategories.some(cat => cat.id === transaction.category_id);
    } else if (isContribution) {
      // For contribution type, category should be from expense categories
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
      showErrorToast("Please select a goal for your contribution.");
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

    // Account balance validation only for contribution types (goal contributions)
    // Users should be able to transact even with 0 or negative balance except for goal contributions
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

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user) {
      showErrorToast("You must be logged in to add transactions");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine if we need to update account balance
      const amount = roundToCentavo(transaction.amount);
      const accountId = transaction.account_id;
      
      // Debug logging for amount processing
      console.log('Transaction amount processing:', {
        originalAmount: transaction.amount,
        roundedAmount: amount,
        amountType: typeof amount,
        isValid: !isNaN(amount) && isFinite(amount),
        maxSafeInteger: Number.MAX_SAFE_INTEGER,
        exceedsLimit: amount > 99999999999.99 // DECIMAL(15,4) practical max for centavos
      });
      
      // Validate amount is within safe range for DECIMAL(15,4)
      if (!isFinite(amount) || isNaN(amount)) {
        throw new Error('Invalid amount: must be a valid number');
      }
      
      if (amount > 99999999999.99) {
        throw new Error('Amount too large: maximum supported amount is ₱99,999,999,999.99');
      }
      
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      // Validate that the category matches the transaction type
      if (transaction.category_id && transaction.type) {
        const isIncome = transaction.type === 'income';
        const isContribution = transaction.type === 'contribution';
        
        let categoryExists = false;
        if (isIncome) {
          categoryExists = userData.incomeCategories.some(cat => cat.id === transaction.category_id);
        } else if (isContribution) {
          // For contribution type, category should be from expense categories
          categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
        } else {
          categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
        }
        
        if (!categoryExists) {
          const typeLabel = isIncome ? 'income' : (isContribution ? 'expense (for contributions)' : 'expense');
          throw new Error(`Selected category does not match transaction type. Please select a ${typeLabel} category.`);
        }
      }
      
      // Special validation for contribution type
      if (transaction.type === 'contribution' && !transaction.goal_id) {
        throw new Error('Please select a goal for your contribution.');
      }
      
      // Additional validation for contribution amounts
      if (transaction.type === 'contribution' && selectedGoal && transaction.amount > 0) {
        const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
        if (transaction.amount > remainingAmount) {
          console.warn(`Contribution exceeds goal remaining amount by ₱${(transaction.amount - remainingAmount).toFixed(2)}`);
          // Allow overcontribution but log it
        }
      }
      
      // Account balance validation only for contribution types (goal contributions)
      // Users should be able to transact even with 0 or negative balance except for goal contributions
      if (transaction.type === 'contribution' && selectedAccount) {
        if (transaction.amount > selectedAccount.balance) {
          throw new Error(`Insufficient funds for goal contribution in ${selectedAccount.account_name}. Available balance: ₱${selectedAccount.balance.toFixed(2)}`);
        }
      }
      
      // Start a transaction in Supabase using RPC (if available) or multiple queries
      
      // 1. Insert the transaction
      const transactionData: any = {
        user_id: user.id,
        account_id: accountId,
        goal_id: transaction.goal_id || null,
        type: transaction.type,
        amount: amount,
        date: transaction.date,
        description: sanitizeBudgetName(transaction.description), // Sanitize description to prevent format string errors
        created_at: new Date().toISOString()
      };
      
      // Debug logging for transaction data
      console.log('Transaction data being inserted:', {
        ...transactionData,
        amount: amount,
        amountType: typeof amount,
        amountString: amount.toString(),
        category_id_original: transaction.category_id,
        selected_category: selectedCategory
      });
      
      // Set the correct category field based on transaction type
      if (transaction.type === 'income') {
        transactionData.income_category_id = transaction.category_id || null;
      } else if (transaction.type === 'expense' || transaction.type === 'contribution') {
        transactionData.expense_category_id = transaction.category_id || null;
      }
      
      // TODO: Add budget tracking after resolving database format string issue
      // if (selectedBudget && transaction.type === 'expense') {
      //   transactionData.tags = [`budget_id_${selectedBudget.id}`, `category_id_${selectedBudget.category_id}`];
      // }
      
      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();

      if (transactionError) {
        console.error('Supabase transaction insert error:', {
          error: transactionError,
          code: transactionError.code,
          message: transactionError.message,
          details: transactionError.details,
          hint: transactionError.hint,
          transactionData
        });
        throw transactionError;
      }
      
      console.log('Transaction inserted successfully:', insertedTransaction);
      
      // 2. Update the account balance
      // For income, add to balance; for expenses and contributions, subtract from balance
      const balanceChange = transaction.type === 'income' ? amount : -amount;
      
      const { error: accountError } = await supabase.rpc('update_account_balance', { 
        p_account_id: accountId,
        p_amount_change: balanceChange
      });
      
      if (accountError) {
        // If RPC fails, fall back to direct update
        const { data: accountData, error: fetchError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', accountId)
          .single();
          
        if (fetchError) throw fetchError;
        
        const newBalance = accountData.balance + balanceChange;
        
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', accountId);
          
        if (updateError) throw updateError;
      }
      
      // 3. Update goal progress if applicable
      if (transaction.goal_id) {
        const { error: goalError } = await supabase.rpc('update_goal_progress', {
          p_goal_id: transaction.goal_id,
          p_amount: amount
        });
        
        if (goalError) {
          // If RPC fails, fall back to direct update
          const { data: goalData, error: fetchGoalError } = await supabase
            .from('goals')
            .select('current_amount, target_amount')
            .eq('id', transaction.goal_id)
            .single();
            
          if (fetchGoalError) throw fetchGoalError;
          
          const newAmount = goalData.current_amount + amount;
          const status = newAmount >= goalData.target_amount ? 'completed' : 'in_progress';
          
          const { error: updateGoalError } = await supabase
            .from('goals')
            .update({ 
              current_amount: newAmount,
              status: status
            })
            .eq('id', transaction.goal_id);
            
          if (updateGoalError) throw updateGoalError;
        }
      }

      // 4. Trigger transaction notifications
      if (insertedTransaction && insertedTransaction[0]) {
        try {
          const createdTransaction = insertedTransaction[0];
          
          // Prepare transaction data for notification service
          const transactionDataForNotification = {
            id: createdTransaction.id,
            user_id: createdTransaction.user_id,
            account_id: createdTransaction.account_id,
            category_id: transaction.type === 'income' ? createdTransaction.income_category_id : createdTransaction.expense_category_id,
            goal_id: createdTransaction.goal_id,
            amount: createdTransaction.amount,
            transaction_type: createdTransaction.type,
            description: createdTransaction.description || '',
            transaction_date: createdTransaction.date,
            currency: 'PHP',
            family_id: null,
            is_recurring: false,
            recurring_frequency: null
          };
          
          // Trigger notification processing
          await TransactionNotificationService.getInstance().handleTransactionCreated(transactionDataForNotification);
          
          console.log('Transaction notifications processed successfully');
        } catch (notificationError) {
          // Log notification error but don't fail the transaction
          console.warn('Failed to process transaction notifications:', notificationError);
        }
      }

      showSuccessToast("Transaction added successfully!");
      navigate('/transactions');
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      showErrorToast(error.message || "Failed to add transaction");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ top: rect.bottom + window.scrollY, left: rect.left + (rect.width / 2) + window.scrollX });
      }
    }
  };
  
  // Tooltip contents
  const tooltipContent = {
    'transaction-details': {
      title: 'Transaction Details',
      description: 'Enter the details of your transaction including the amount, date, category, and account. All fields marked with * are required.'
    },
    'transaction-tips': {
      title: 'Transaction Tips',
      description: 'Tips to help you categorize and track your spending effectively. Adding clear descriptions and choosing the right category helps with better financial analysis.'
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">
            {setupInProgress ? 'Setting up your account...' : 'Loading transaction form...'}
          </p>
          <small className="text-muted">
            {setupInProgress ? 'Creating default accounts and categories if needed' : 'Please wait'}
          </small>
        </div>
      </div>
    );
  }

  // Check if user has necessary data to create transactions
  const hasAccounts = userData.accounts.length > 0;
  const hasCategories = userData.incomeCategories.length > 0 || userData.expenseCategories.length > 0;
  
  if (!hasAccounts || !hasCategories) {
    return (
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Add Transaction</h1>
          <Link to="/transactions" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Transactions
          </Link>
        </div>
      
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow mb-4 border-left-warning">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-warning">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Account Setup Required
                </h6>
              </div>
              <div className="card-body">
                <div className="text-center py-4">
                  <i className="fas fa-cogs fa-3x text-warning mb-3"></i>
                  <h4 className="mb-3">Setting up your account...</h4>
                  <p className="text-muted mb-4">
                    {!hasAccounts && !hasCategories 
                      ? "We're creating your default accounts and categories. This usually takes a moment."
                      : !hasAccounts 
                      ? "We're setting up your default accounts."
                      : "We're setting up your default categories."
                    }
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn btn-warning btn-icon-split"
                  >
                    <span className="icon text-white-50">
                      <i className="fas fa-sync-alt"></i>
                    </span>
                    <span className="text">Refresh Page</span>
                  </button>
                  <div className="mt-3">
                    <small className="text-muted">
                      If this persists, please go to Settings to set up your accounts and categories manually.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    const selectedAccount = userData.accounts.find(
      account => account.id === transaction.account_id
    );
    
    const selectedCategory = transaction.type === "income" 
      ? userData.incomeCategories.find(category => category.id === transaction.category_id)
      : userData.expenseCategories.find(category => category.id === transaction.category_id);
      
    const selectedGoal = transaction.goal_id 
      ? userData.goals.find(goal => goal.id === transaction.goal_id)
      : null;
    
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Transaction</h1>
          <Link to="/transactions" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
          </Link>
        </div>

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4">
              <div className="card-header py-3 d-flex align-items-center">
                <span className={`badge mr-2 ${
                  transaction.type === 'income' ? 'badge-success' : 
                  transaction.type === 'contribution' ? 'badge-info' : 'badge-danger'
                }`}>
                  {transaction.type === 'income' ? 'Income' : 
                   transaction.type === 'contribution' ? 'Contribute' : 'Expense'}
                </span>
                <h6 className="m-0 font-weight-bold text-primary">Transaction Details</h6>
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                              Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrency(transaction.amount, 'PHP')}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-left-info shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                              Date
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-calendar fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-success shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                              Account
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {selectedAccount?.account_name}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-university fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-left-warning shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                              Category
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {selectedCategory?.category_name}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-tag fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedGoal && (
                  <div className="card bg-white shadow mb-4">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Associated Goal
                            {transaction.type === 'contribution' && (
                              <span className="badge badge-info ml-2">
                                <i className="fas fa-flag mr-1"></i> Contribution Target
                              </span>
                            )}
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-primary d-flex align-items-center">
                            {selectedGoal.goal_name}
                            {selectedGoal.is_family_goal ? (
                              <span className="badge badge-info ml-2">
                                <i className="fas fa-users mr-1"></i> Family
                              </span>
                            ) : (
                              <span className="badge badge-secondary ml-2">
                                <i className="fas fa-user mr-1"></i> Personal
                              </span>
                            )}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="d-flex justify-content-between text-sm mb-1">
                              <span>Goal Progress</span>
                              <span>{selectedGoal.target_amount > 0 ? ((selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar ${
                                  selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 90 
                                    ? 'bg-success' 
                                    : selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 75 
                                    ? 'bg-info' 
                                    : selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 50 
                                    ? 'bg-warning' 
                                    : 'bg-danger'
                                }`}
                                role="progressbar"
                                style={{ 
                                  width: `${selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}%` 
                                }}
                                aria-valuenow={selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            ₱{(selectedGoal.target_amount - selectedGoal.current_amount).toFixed(2)} remaining
                            {transaction.type === 'contribution' && transaction.amount > 0 && (
                              <span className="ml-2">
                                {transaction.amount > (selectedGoal.target_amount - selectedGoal.current_amount) ? (
                                  <span className="text-warning">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Exceeds goal by ₱{(transaction.amount - (selectedGoal.target_amount - selectedGoal.current_amount)).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-success">
                                    <i className="fas fa-check mr-1"></i>
                                    Will contribute ₱{transaction.amount.toFixed(2)}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-flag fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBudget && (
                  <div className="card bg-success text-white shadow mb-4">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                            Assigned Budget
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-white">
                            {selectedBudget.budget_name}
                          </div>
                          <div className="text-sm text-white-50">
                            ₱{((selectedBudget.amount - (selectedBudget.spent || 0)) - transaction.amount).toFixed(2)} remaining after transaction
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-wallet fa-2x text-white-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Description
                    </div>
                    <p className="mb-0">{transaction.description}</p>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <button onClick={() => setViewMode("form")} className="btn btn-light btn-icon-split mr-2">
                    <span className="icon text-gray-600">
                      <i className="fas fa-arrow-left"></i>
                    </span>
                    <span className="text">Back to Edit</span>
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="btn btn-success btn-icon-split"
                  >
                    <span className="icon text-white-50">
                      <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                    </span>
                    <span className="text">{isSubmitting ? "Saving..." : "Save Transaction"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Add Transaction</h1>
        <Link to="/transactions" className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Transactions
        </Link>
      </div>
      
      
      {/* Tooltip */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "12px 15px",
            borderRadius: "8px",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            maxWidth: "300px",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          {activeTip && (
            <>
              <div className="font-weight-bold mb-2">{tooltipContent[activeTip as keyof typeof tooltipContent].title}</div>
              <p className="mb-0">{tooltipContent[activeTip as keyof typeof tooltipContent].description}</p>
            </>
          )}
        </div>
      )}

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                Transaction Details
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('transaction-details', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleReview}>
                {/* Transaction Type */}
                <div className="form-group mb-4">
                  <label className="font-weight-bold text-gray-800">
                    Transaction Type <span className="text-danger">*</span>
                  </label>
                  <div className="row">
                    <div className="col-md-4 mb-3 mb-md-0">
                      <div 
                        className={`card ${transaction.type === 'income' ? 'bg-success text-white' : 'bg-light'} py-3 text-center shadow-sm`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          // Use a more controlled state update for transaction type change
                          setTransaction((prev) => ({
                            ...prev,
                            type: 'income',
                            category_id: '',
                            budget_id: '',
                            goal_id: ''
                          }));
                          setSelectedCategory(null);
                          setSelectedBudget(null);
                          setSelectedGoal(null);
                        }}
                      >
                        <div className="card-body p-3">
                          <i className="fas fa-plus-circle fa-2x mb-2"></i>
                          <h5 className="mb-0">Income</h5>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3 mb-md-0">
                      <div 
                        className={`card ${transaction.type === 'expense' ? 'bg-danger text-white' : 'bg-light'} py-3 text-center shadow-sm`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          // Use a more controlled state update for transaction type change
                          setTransaction((prev) => ({
                            ...prev,
                            type: 'expense',
                            category_id: '',
                            budget_id: '',
                            goal_id: ''
                          }));
                          setSelectedCategory(null);
                          setSelectedBudget(null);
                          setSelectedGoal(null);
                        }}
                      >
                        <div className="card-body p-3">
                          <i className="fas fa-minus-circle fa-2x mb-2"></i>
                          <h5 className="mb-0">Expense</h5>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div 
                        className={`card ${transaction.type === 'contribution' ? 'bg-info text-white' : 'bg-light'} py-3 text-center shadow-sm`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          // Use a more controlled state update for transaction type change
                          setTransaction((prev) => ({
                            ...prev,
                            type: 'contribution',
                            category_id: '',
                            budget_id: '',
                            goal_id: ''
                          }));
                          setSelectedCategory(null);
                          setSelectedBudget(null);
                          setSelectedGoal(null);
                          
                          // Auto-set Contribution category for contribution type
                          setTimeout(() => {
                            const contributionCategory = userData.expenseCategories.find(cat => 
                              cat.category_name === 'Contribution'
                            );
                            
                            if (contributionCategory) {
                              setSelectedCategory(contributionCategory);
                              setTransaction(prev => ({
                                ...prev,
                                category_id: contributionCategory.id
                              }));
                            }
                          }, 100);
                        }}
                      >
                        <div className="card-body p-3">
                          <i className="fas fa-flag fa-2x mb-2"></i>
                          <h5 className="mb-0">Contribute</h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <CentavoInput
                      value={transaction.amount}
                      onChange={handleAmountChange}
                      currency="PHP"
                      label="Amount"
                      placeholder="0.00"
                      required={true}
                      min={0.01}
                      max={99999999999.99}
                      className="mb-3"
                    />
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="date" className="font-weight-bold text-gray-800">
                        Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={transaction.date}
                        onChange={handleChange}
                        className="form-control form-control-user"
                        required
                      />
                      <small className="form-text text-muted">
                        When did this transaction occur?
                      </small>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <AccountSelector
                      selectedAccountId={transaction.account_id}
                      onAccountSelect={handleAccountSelect}
                      required={true}
                      label="Account"
                      showBalance={true}
                      showAccountType={true}
                      autoSelectDefault={true}
                      className="mb-3"
                    />
                  </div>

                  <div className="col-md-6">
                    {/* Hide category selector for contribution type as it's auto-set */}
                    {transaction.type !== 'contribution' ? (
                      <CategorySelector
                        selectedCategoryId={transaction.category_id}
                        onCategorySelect={handleCategorySelect}
                        transactionType={transaction.type}
                        incomeCategories={userData.incomeCategories}
                        expenseCategories={userData.expenseCategories}
                        required={true}
                        label="Category"
                        showIcons={true}
                      />
                    ) : (
                      <div className="form-group">
                        <label className="font-weight-bold text-gray-800">
                          Category <span className="text-danger">*</span>
                        </label>
                        <div className="form-control d-flex align-items-center bg-contribute text-white" style={{ border: '1px solid #17a2b8' }}>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-flag mr-2"></i>
                            <span className="font-weight-bold">Contribution</span>
                            <span className="badge badge-light text-contribute ml-2">
                              <i className="fas fa-magic mr-1"></i>Auto-selected
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Contribution Information Display - Below category field but outside form-group to prevent layout issues */}
                    {transaction.type === 'contribution' && (
                      <div className="card mt-3 border-left-contribute shadow-sm mb-4">
                        <div className="card-body py-3">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="d-flex align-items-center mb-2">
                                <div>
                                  <div className="font-weight-bold text-contribute">
                                    <i className="fas fa-flag mr-2"></i>
                                    Contribution Transaction
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Category: Contribution • Goal Contribution
                                  </div>
                                </div>
                              </div>
                              
                              {/* Goal Impact Preview */}
                              {selectedGoal && transaction.amount > 0 && (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                                      Goal Progress Impact
                                    </span>
                                    <span className="font-weight-bold text-contribute">
                                      +₱{transaction.amount.toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  <div className="mb-2">
                                    <div className="progress" style={{ height: '6px' }}>
                                      <div
                                        className="progress-bar bg-contribute"
                                        role="progressbar"
                                        style={{ 
                                          width: `${selectedGoal.target_amount > 0 
                                            ? Math.min(100, ((selectedGoal.current_amount + transaction.amount) / selectedGoal.target_amount) * 100) 
                                            : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                  
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-xs text-gray-600">
                                      {selectedGoal.target_amount > 0 
                                        ? (((selectedGoal.current_amount + transaction.amount) / selectedGoal.target_amount) * 100).toFixed(1)
                                        : 0}% of {selectedGoal.goal_name}
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      ₱{Math.max(0, selectedGoal.target_amount - selectedGoal.current_amount - transaction.amount).toFixed(2)} remaining
                                    </span>
                                  </div>
                                </>
                              )}
                              
                              {(!selectedGoal || transaction.amount <= 0) && (
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                                    Category & Goal
                                  </span>
                                  <span className="text-xs text-contribute font-weight-bold">
                                    Auto-assigned
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>



                {/* Budget Assignment - Only show for expense type */}
                {transaction.type === 'expense' && (
                  <BudgetSelector
                    selectedBudgetId={transaction.budget_id}
                    selectedCategoryId={transaction.category_id}
                    transactionAmount={transaction.amount || 0}
                    transactionType={transaction.type}
                    onBudgetSelect={handleBudgetSelect}
                    className="mb-4"
                  />
                )}

                {/* Goal Assignment - Always show but required for contribution type OR Goal Creation Button if no goals */}
                {hasGoals === false ? (
                  // Show goal creation button when no goals are available
                  <div className="mb-4">
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
                          onClick={() => {
                            // Check family goal creation permission before navigating
                            familyGoalPermissions.validateFamilyGoalCreation().then(validation => {
                              if (validation.canCreate) {
                                navigate('/goals/create');
                              } else {
                                setPermissionErrorModal({
                                  isOpen: true,
                                  title: validation.errorTitle || 'Permission Denied',
                                  message: validation.errorMessage || 'You cannot create family goals.',
                                  suggestedActions: validation.suggestedActions || ['Contact your family admin for assistance'],
                                  userRole: validation.userRole
                                });
                              }
                            });
                          }}
                        >
                          <i className="fas fa-plus mr-2"></i>
                          Create Your First Goal
                        </button>
                        {transaction.type === 'contribution' && (
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
                    selectedGoal={selectedGoal}
                    onGoalSelect={handleGoalSelect}
                    className={`mb-4 ${transaction.type === 'contribution' && !selectedGoal ? 'is-invalid' : ''}`}
                    required={transaction.type === 'contribution'}
                    label={transaction.type === 'contribution' ? 'Goal *' : 'Goal Assignment (Optional)'}
                    isContributionType={transaction.type === 'contribution'}
                    showValidationError={transaction.type === 'contribution' && !selectedGoal}
                    onGoalsLoaded={setHasGoals}
                    validateFamilyGoalAccess={true}
                  />
                )}

                {selectedGoal && (
                  <div className="card bg-white shadow mb-4">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Associated Goal
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-primary d-flex align-items-center">
                            {selectedGoal.goal_name}
                            {selectedGoal.is_family_goal ? (
                              <span className="badge badge-info ml-2">
                                <i className="fas fa-users mr-1"></i> Family
                              </span>
                            ) : (
                              <span className="badge badge-secondary ml-2">
                                <i className="fas fa-user mr-1"></i> Personal
                              </span>
                            )}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="d-flex justify-content-between text-sm mb-1">
                              <span>Goal Progress</span>
                              <span>{selectedGoal.target_amount > 0 ? ((selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar ${
                                  selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 90 
                                    ? 'bg-success' 
                                    : selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 75 
                                    ? 'bg-info' 
                                    : selectedGoal.target_amount > 0 && (selectedGoal.current_amount / selectedGoal.target_amount) * 100 >= 50 
                                    ? 'bg-warning' 
                                    : 'bg-danger'
                                }`}
                                role="progressbar"
                                style={{ 
                                  width: `${selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}%` 
                                }}
                                aria-valuenow={selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            ₱{(selectedGoal.target_amount - selectedGoal.current_amount).toFixed(2)} remaining
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-flag fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="description" className="font-weight-bold text-gray-800">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={transaction.description}
                    onChange={handleChange}
                    className="form-control"
                    rows={3}
                    placeholder="Enter a description for this transaction"
                    required
                  ></textarea>
                  <small className="form-text text-muted">
                    Briefly describe this transaction
                  </small>
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <button type="submit" className="btn btn-primary btn-icon-split">
                    <span className="icon text-white-50">
                      <i className="fas fa-arrow-right"></i>
                    </span>
                    <span className="text">Continue to Review</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Transaction Tips Card */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                Transaction Tips
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('transaction-tips', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)" }}>
                    <i className="fas fa-tag text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Categorize Properly</p>
                </div>
                <p className="text-sm text-muted ml-5">Accurate categories help track your spending</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)" }}>
                    <i className="fas fa-calendar-alt text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Add Promptly</p>
                </div>
                <p className="text-sm text-muted ml-5">Record transactions as soon as they happen</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                    <i className="fas fa-lightbulb text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Specific</p>
                </div>
                <p className="text-sm text-muted ml-5">Add detailed descriptions for future reference</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddTransactionWithErrorBoundary: FC<{}> = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="container-fluid">
          <div className="text-center my-5">
            <div className="alert alert-danger">
              <h5>Transaction Form Error</h5>
              <p>There was an error loading the transaction form. Please try refreshing the page.</p>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      }
    >
      <AddTransaction />
    </ErrorBoundary>
  );
};

export default AddTransactionWithErrorBoundary;
