import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { useFamilyGoalPermissions } from "../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../common/PermissionErrorModal";
import { UserOnboardingService } from "../../services/userOnboardingService";
import { AccountService } from "../../services/database/accountService";
import BudgetSelector from "../budget/BudgetSelector";
import { BudgetItem } from "../../services/database/budgetService";
import { CentavoInput } from "../common/CentavoInput";
import { formatCurrency, sanitizeBudgetName, roundToCentavo } from "../../utils/currencyUtils";
import AccountSelector from "./components/AccountSelector";
import CategorySelector from "./components/CategorySelector";
import GoalSelector from "./components/GoalSelector";
import { TransactionAuditService } from "../../services/database/transactionAuditService";
import type { Goal } from "./components/GoalSelector";
import { Account as AccountType } from "../settings/types";
import { Account } from "../settings/types";
import ErrorBoundary from "../common/ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Transaction CSS
import "./transactions.css";

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
    console.log('🏷️ AddTransaction: Category selected', {
      category,
      transactionType: transaction.type,
      previousCategoryId: transaction.category_id,
      newCategoryId: category?.id || ""
    });
    
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
    
    console.log('🔄 AddTransaction: After category selection, transaction state will be:', {
      type: transaction.type,
      category_id: category?.id || "",
      budget_id: "",
      previousBudgetCleared: true
    });
  };

  const handleBudgetSelect = (budget: BudgetItem | null) => {
    console.log('💰 AddTransaction: Budget selected', {
      budgetId: budget?.id,
      budgetName: budget?.budget_name,
      categoryId: budget?.category_id,
      categoryName: budget?.category_name
    });
    
    setSelectedBudget(budget);
    setTransaction((prev) => ({
      ...prev,
      budget_id: budget?.id || '',
    }));
    
    // Note: Category auto-selection is handled by handleCategoryAutoSelect 
    // which is called by BudgetSelector component after this function
  };
  
  const handleCategoryAutoSelect = useCallback((categoryId: string, categoryName?: string) => {
    console.log('🎁 AddTransaction: Auto-selecting category from budget', {
      categoryId,
      categoryName,
      currentCategoryId: transaction.category_id,
      forceSelection: true,
      usingNameFallback: !categoryId && !!categoryName
    });
    
    // Force auto-select category when budget is selected (remove the condition check)
    const categories = transaction.type === 'income' ? userData.incomeCategories : userData.expenseCategories;
    
    // Try to find by ID first, then fall back to name matching
    let category: Category | undefined;
    if (categoryId) {
      category = categories.find(cat => cat.id === categoryId);
    } else if (categoryName) {
      // Fallback: match by category name
      category = categories.find(cat => cat.category_name === categoryName);
    }
    
    if (category) {
      console.log('✨ AddTransaction: Force auto-selecting category from budget', {
        categoryId: category.id,
        categoryName: category.category_name,
        previousCategoryId: transaction.category_id,
        replacingExisting: !!transaction.category_id,
        matchedBy: categoryId ? 'ID' : 'Name'
      });
      
      // Use setTimeout to ensure state updates happen in the next tick
      // This gives React time to process the budget selection first
      const selectedCat = category;
      setTimeout(() => {
        setSelectedCategory(selectedCat || null);
        if (selectedCat) {
        setTransaction(prev => ({
          ...prev,
            category_id: selectedCat.id
        }));
        }
      }, 0);
    } else {
      console.warn('⚠️ AddTransaction: Category not found for auto-selection', { 
        categoryId,
        categoryName,
        searchMethod: categoryId ? 'ID' : 'Name',
        availableCategories: categories.map(cat => ({ id: cat.id, name: cat.category_name }))
      });
    }
  }, [transaction.type, transaction.category_id, userData.incomeCategories, userData.expenseCategories]);

  const handleGoalSelect = (goal: Goal | null) => {
    setSelectedGoal(goal);
    
    // Auto-set "Contribution" category for contribution transactions or expense transactions with goals
    if (goal && (transaction.type === 'contribution' || transaction.type === 'expense')) {
      // Try to find existing contribution category
      let contributionCategory = userData.expenseCategories.find(cat => 
        cat.category_name.toLowerCase() === 'contribution'
      );
      
      // If no exact match, try to find other common goal-related category names
      if (!contributionCategory) {
        contributionCategory = userData.expenseCategories.find(cat => 
          cat.category_name.toLowerCase().includes('goal') ||
          cat.category_name.toLowerCase().includes('saving') ||
          cat.category_name.toLowerCase().includes('investment')
        );
      }
      
      if (contributionCategory) {
        setSelectedCategory(contributionCategory);
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
          category_id: contributionCategory?.id || ""
        }));
        
        // Clear any budget assignment since this is now a contribution
        setSelectedBudget(null);
        setTransaction(prev => ({
          ...prev,
          budget_id: ''
        }));
      } else {
        // If no suitable category found, just set the goal without requiring a specific category
        // For contribution transactions, we'll allow them to proceed without a category
        setTransaction((prev) => ({
          ...prev,
          goal_id: goal.id || "",
          category_id: transaction.type === 'contribution' ? '' : prev.category_id // Clear category for contribution type
        }));
        
        // Clear category selection for contribution type
        if (transaction.type === 'contribution') {
          setSelectedCategory(null);
        }
      }
    } else {
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

    // Category validation - mandatory for income and expense, optional for contribution
    if (!transaction.category_id && transaction.type !== 'contribution') {
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
      // For contribution type, category is optional but if provided should be from expense categories
      if (transaction.category_id) {
        categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
      } else {
        categoryExists = true; // Allow no category for contribution type
      }
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
          // For contribution type, category is optional but if provided should be from expense categories
          if (transaction.category_id) {
            categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
          } else {
            categoryExists = true; // Allow no category for contribution type
          }
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
      
      // NOTE: Account balance is automatically updated by the database trigger 'trigger_update_account_balance'
      // No manual update needed here to avoid duplicate updates
      
      // 2. Update goal progress if applicable
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

      // Log transaction creation to audit history (async, don't block on failure)
      try {
        if (insertedTransaction && insertedTransaction[0]) {
          const auditData = TransactionAuditService.extractTransactionAuditData(
            insertedTransaction[0],
            selectedAccount,
            selectedCategory,
            selectedGoal
          );
          
          // Log audit activity (don't await to avoid blocking user flow)
          TransactionAuditService.logTransactionCreated(
            user.id,
            auditData,
            navigator.userAgent
          ).catch(error => {
            console.error('Failed to log transaction creation to audit:', error);
            // Don't show error to user as this shouldn't interrupt their flow
          });
        }
      } catch (auditError) {
        console.error('Error preparing transaction audit log:', auditError);
        // Don't show error to user as this shouldn't interrupt their flow
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
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">
              {setupInProgress ? 'Setting up your account...' : 'Loading transaction form...'}
            </p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 hidden md:block">
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
          <Link 
            to="/transactions" 
            className="inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
          >
            <i className="fas fa-arrow-left text-xs mr-1"></i> Back to Transactions
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
                    className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-2.5 bg-[#f6c23e] hover:bg-[#dda20a] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors"
                  >
                    <i className="fas fa-sync-alt text-xs mr-2"></i>
                    Refresh Page
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
        {/* Mobile Page Heading - Floating action buttons */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Review Transaction</h1>
            <Link
              to="/transactions"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
              aria-label="Cancel"
            >
              <i className="fas fa-times text-xs"></i>
            </Link>
          </div>
        </div>

        {/* Desktop Page Heading */}
        <div className="d-none d-md-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Transaction</h1>
          <Link 
            to="/transactions" 
            className="inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
          >
            <i className="fas fa-arrow-left text-xs mr-1"></i> Cancel
          </Link>
        </div>

        {/* Mobile Review Summary Card */}
        <div className="block md:hidden mb-4">
          <div className={`bg-gradient-to-br ${
            transaction.type === 'income' ? 'from-emerald-500 via-teal-500 to-cyan-500' :
            transaction.type === 'contribution' ? 'from-blue-500 via-indigo-500 to-purple-500' :
            'from-rose-500 via-red-500 to-orange-500'
          } rounded-2xl p-4 shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">
                {transaction.type === 'income' ? 'Income' : transaction.type === 'contribution' ? 'Contribution' : 'Expense'}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className={`fas fa-${transaction.type === 'income' ? 'plus' : transaction.type === 'contribution' ? 'flag' : 'minus'} text-white text-sm`}></i>
              </div>
            </div>
            <div className="text-white text-2xl font-bold mb-1">
              {formatCurrency(transaction.amount)}
            </div>
            <div className="text-white/70 text-xs">
              {new Date(transaction.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Mobile Details Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-university text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Account</p>
              <p className="text-xs font-bold text-gray-800 truncate">{selectedAccount?.account_name || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                <i className="fas fa-tag text-amber-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Category</p>
              <p className="text-xs font-bold text-gray-800 truncate">{selectedCategory?.category_name || 'N/A'}</p>
            </div>
          </div>

          {/* Mobile Goal Card */}
          {selectedGoal && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <i className="fas fa-flag text-indigo-500 text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Goal</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{selectedGoal.goal_name}</p>
                </div>
                {selectedGoal.is_family_goal && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-semibold">Family</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500">
                {selectedGoal.target_amount > 0 ? ((selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(1) : 0}% complete
              </p>
            </div>
          )}

          {/* Mobile Budget Card */}
          {selectedBudget && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <i className="fas fa-wallet text-emerald-500 text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Budget</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{selectedBudget.budget_name}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9 ? 'bg-rose-500' :
                    ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500">
                {(((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount * 100).toFixed(1)}% after this transaction
              </p>
            </div>
          )}

          {/* Mobile Description */}
          {transaction.description && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mt-2">
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mb-1">Description</p>
              <p className="text-xs text-gray-700">{transaction.description}</p>
            </div>
          )}

          {/* Mobile Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setViewMode("form")} 
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Edit
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={`flex-1 py-3 ${
                transaction.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' :
                transaction.type === 'contribution' ? 'bg-indigo-500 hover:bg-indigo-600' :
                'bg-rose-500 hover:bg-rose-600'
              } text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              <i className={`${isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"} text-xs`}></i>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Desktop Review Section */}
        <div className="row d-none d-md-flex">
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
                              {formatCurrency(transaction.amount)}
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
                  <div className="card bg-white border-left-primary shadow mb-4">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Assigned Budget
                            <span className="badge badge-primary ml-2">
                              <i className="fas fa-wallet mr-1"></i> Budget Tracking
                            </span>
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800 d-flex align-items-center">
                            {selectedBudget.budget_name}
                            {selectedBudget.category_name && (
                              <span className="badge badge-secondary ml-2">
                                <i className="fas fa-tag mr-1"></i> {selectedBudget.category_name}
                              </span>
                            )}
                          </div>
                          
                          {/* Enhanced Budget Progress Bar */}
                          <div className="mt-3 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-sm font-weight-medium text-gray-700">Budget Utilization (After Transaction)</span>
                              <span className={`font-weight-bold text-sm ${
                                ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9
                                  ? 'text-danger'
                                  : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8
                                  ? 'text-warning'
                                  : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.6
                                  ? 'text-info'
                                  : 'text-success'
                              }`}>
                                {(((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="position-relative">
                              <div 
                                className="progress" 
                                style={{ 
                                  height: '12px', 
                                  borderRadius: '6px',
                                  backgroundColor: '#f1f3f4',
                                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                                }}
                              >
                                {/* Current spending */}
                                <div
                                  className="progress-bar bg-secondary"
                                  style={{ 
                                    width: `${Math.min(100, (selectedBudget.spent || 0) / selectedBudget.amount * 100)}%`,
                                    borderRadius: '6px 0 0 6px'
                                  }}
                                ></div>
                                {/* Transaction impact */}
                                <div
                                  className={`progress-bar ${
                                    ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9
                                      ? 'bg-danger'
                                      : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8
                                      ? 'bg-warning'
                                      : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.6
                                      ? 'bg-info'
                                      : 'bg-success'
                                  }`}
                                  role="progressbar"
                                  style={{ 
                                    width: `${Math.min(100, (transaction.amount / selectedBudget.amount * 100))}%`,
                                    borderRadius: '0 6px 6px 0',
                                    transition: 'width 0.6s ease-in-out, background-color 0.3s ease',
                                    background: ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9
                                      ? 'linear-gradient(45deg, #dc3545, #c82333)'
                                      : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8
                                      ? 'linear-gradient(45deg, #ffc107, #e0a800)'
                                      : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.6
                                      ? 'linear-gradient(45deg, #17a2b8, #138496)'
                                      : 'linear-gradient(45deg, #28a745, #218838)',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                  }}
                                  aria-valuenow={Math.min(100, ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount * 100)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`Budget utilization after transaction: ${(((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount * 100).toFixed(1)}% of ${selectedBudget.budget_name}`}
                                >
                                  {/* Animated stripes for warning/critical states */}
                                  {((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8 && (
                                    <div 
                                      className="progress-bar-striped progress-bar-animated" 
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: '100%',
                                        width: '100%',
                                        background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                                        backgroundSize: '1rem 1rem',
                                        animation: 'progress-bar-stripes 1s linear infinite'
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                              {/* Usage indicator markers */}
                              <div className="position-absolute d-flex justify-content-between w-100" style={{ top: '-2px', fontSize: '10px' }}>
                                <div className="text-muted" style={{ marginLeft: '60%' }}>60%</div>
                                <div className="text-muted" style={{ marginRight: '20%' }}>80%</div>
                              </div>
                            </div>
                            {/* Status indicator */}
                            <div className="mt-2 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center">
                                <i className={`fas fa-circle mr-2 ${
                                  ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9
                                    ? 'text-danger'
                                    : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8
                                    ? 'text-warning'
                                    : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.6
                                    ? 'text-info'
                                    : 'text-success'
                                }`} style={{ fontSize: '8px' }}></i>
                                <span className="text-xs text-muted">
                                  {((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.9
                                    ? 'Critical: Near budget limit'
                                    : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.8
                                    ? 'Warning: Approaching budget limit'
                                    : ((selectedBudget.spent || 0) + transaction.amount) / selectedBudget.amount >= 0.6
                                    ? 'Moderate: Good progress'
                                    : 'Healthy: Well within budget'
                                  }
                                </span>
                              </div>
                              <span className="text-xs font-weight-bold text-primary">
                                +₱{transaction.amount.toFixed(2)} this transaction
                              </span>
                            </div>
                          </div>
                          
                          <div className="row text-sm mt-3">
                            <div className="col-4 text-center">
                              <div className="font-weight-bold text-gray-800">₱{selectedBudget.amount.toFixed(2)}</div>
                              <div className="text-muted">Total Budget</div>
                            </div>
                            <div className="col-4 text-center">
                              <div className="font-weight-bold text-gray-600">₱{(selectedBudget.spent || 0).toFixed(2)}</div>
                              <div className="text-muted">Current Spent</div>
                            </div>
                            <div className="col-4 text-center">
                              <div className={`font-weight-bold ${
                                (selectedBudget.amount - (selectedBudget.spent || 0) - transaction.amount) < 0 
                                  ? 'text-danger' 
                                  : 'text-success'
                              }`}>
                                ₱{((selectedBudget.amount - (selectedBudget.spent || 0)) - transaction.amount).toFixed(2)}
                              </div>
                              <div className="text-muted">After Transaction</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-wallet fa-2x text-gray-300"></i>
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
                  <button 
                    onClick={() => setViewMode("form")} 
                    className="inline-flex items-center justify-center px-3 py-2 md:px-4 md:py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs md:text-sm font-medium rounded shadow-sm transition-colors mr-2"
                  >
                    <i className="fas fa-arrow-left text-xs mr-1"></i>
                    <span className="d-none d-md-inline">Back to Edit</span>
                    <span className="d-inline d-md-none">Back</span>
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center px-3 py-2 md:px-4 md:py-2 bg-[#1cc88a] hover:bg-[#17a673] text-white text-xs md:text-sm font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className={`${isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"} text-xs mr-1`}></i>
                    {isSubmitting ? "Saving..." : "Save Transaction"}
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
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Add Transaction</h1>
          <Link
            to="/transactions"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
            aria-label="Back to transactions"
          >
            <i className="fas fa-arrow-left text-xs"></i>
          </Link>
        </div>
      </div>

      {/* ===== MOBILE FORM VIEW ===== */}
      <div className="block md:hidden mb-4">
        <form onSubmit={handleReview}>
          {/* Mobile Transaction Type Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-exchange-alt text-indigo-500 text-[10px]"></i>
                Transaction Type
                <span className="text-red-500">*</span>
              </h6>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransaction((prev) => ({...prev, type: 'income', category_id: '', budget_id: '', goal_id: ''}));
                    setSelectedCategory(null);
                    setSelectedBudget(null);
                    setSelectedGoal(null);
                  }}
                  className={`py-3 rounded-xl text-center transition-all active:scale-95 ${
                    transaction.type === 'income' 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-plus-circle text-lg mb-1 block"></i>
                  <span className="text-[10px] font-semibold">Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransaction((prev) => ({...prev, type: 'expense', category_id: '', budget_id: '', goal_id: ''}));
                    setSelectedCategory(null);
                    setSelectedBudget(null);
                    setSelectedGoal(null);
                  }}
                  className={`py-3 rounded-xl text-center transition-all active:scale-95 ${
                    transaction.type === 'expense' 
                      ? 'bg-rose-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-minus-circle text-lg mb-1 block"></i>
                  <span className="text-[10px] font-semibold">Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransaction((prev) => ({...prev, type: 'contribution', category_id: '', budget_id: '', goal_id: ''}));
                    setSelectedCategory(null);
                    setSelectedBudget(null);
                    setSelectedGoal(null);
                    setTimeout(() => {
                      const contributionCategory = userData.expenseCategories.find(cat => cat.category_name === 'Contribution');
                      if (contributionCategory) {
                        setSelectedCategory(contributionCategory);
                        setTransaction(prev => ({...prev, category_id: contributionCategory.id}));
                      }
                    }, 100);
                  }}
                  className={`py-3 rounded-xl text-center transition-all active:scale-95 ${
                    transaction.type === 'contribution' 
                      ? 'bg-blue-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-flag text-lg mb-1 block"></i>
                  <span className="text-[10px] font-semibold">Contribute</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Amount & Date Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-peso-sign text-indigo-500 text-[10px]"></i>
                Amount & Date
              </h6>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Amount <span className="text-red-500">*</span>
                </label>
                <CentavoInput
                  value={transaction.amount}
                  onChange={handleAmountChange}
                  currency="PHP"
                  placeholder="0.00"
                  required={true}
                  min={0.01}
                  max={99999999999.99}
                  className="mobile-amount-input"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={transaction.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Mobile Account & Category Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-university text-indigo-500 text-[10px]"></i>
                Account & Category
              </h6>
            </div>
            <div className="p-3 space-y-3">
              <AccountSelector
                selectedAccountId={transaction.account_id}
                onAccountSelect={handleAccountSelect}
                required={true}
                label="Account"
                showBalance={true}
                showAccountType={true}
                autoSelectDefault={true}
                className="mobile-selector"
              />
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
                  className="mobile-selector"
                />
              ) : (
                <div>
                  <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg">
                    <i className="fas fa-flag text-sm"></i>
                    <span className="text-sm font-semibold">Contribution</span>
                    <span className="ml-auto px-2 py-0.5 bg-white/20 rounded text-[9px] font-medium">Auto</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Contribution Info Card */}
          {transaction.type === 'contribution' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 overflow-hidden mb-3">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <i className="fas fa-flag text-white text-sm"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700">Contribution Transaction</p>
                    <p className="text-[10px] text-blue-500">Category auto-assigned to goal</p>
                  </div>
                </div>
                {selectedGoal && transaction.amount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-[10px] text-gray-600 mb-1">
                      <span className="font-semibold uppercase tracking-wide">Goal Progress Impact</span>
                      <span className="font-bold text-blue-600">+₱{transaction.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5 mb-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${selectedGoal.target_amount > 0 ? Math.min(100, ((selectedGoal.current_amount + transaction.amount) / selectedGoal.target_amount) * 100) : 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>{selectedGoal.target_amount > 0 ? (((selectedGoal.current_amount + transaction.amount) / selectedGoal.target_amount) * 100).toFixed(1) : 0}% of {selectedGoal.goal_name}</span>
                      <span>₱{Math.max(0, selectedGoal.target_amount - selectedGoal.current_amount - transaction.amount).toFixed(2)} remaining</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Mobile Budget Selector (Expense only) */}
          {transaction.type === 'expense' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                  <i className="fas fa-wallet text-indigo-500 text-[10px]"></i>
                  Budget Assignment
                  <span className="text-[9px] text-gray-400 font-normal">(Optional)</span>
                </h6>
              </div>
              <div className="p-3">
                <BudgetSelector
                  selectedBudgetId={transaction.budget_id}
                  selectedCategoryId={transaction.category_id}
                  transactionAmount={transaction.amount || 0}
                  transactionType={transaction.type}
                  onBudgetSelect={handleBudgetSelect}
                  onCategoryAutoSelect={handleCategoryAutoSelect}
                  className="mobile-budget-selector"
                />
              </div>
            </div>
          )}

          {/* Mobile Goal Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-flag text-indigo-500 text-[10px]"></i>
                {transaction.type === 'contribution' ? 'Goal' : 'Goal Assignment'}
                {transaction.type === 'contribution' && <span className="text-red-500">*</span>}
                {transaction.type !== 'contribution' && <span className="text-[9px] text-gray-400 font-normal">(Optional)</span>}
              </h6>
            </div>
            <div className="p-3">
              {hasGoals === false ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                    <i className="fas fa-flag text-indigo-500 text-lg"></i>
                  </div>
                  <p className="text-xs font-medium text-gray-600 mb-2">No Goals Available</p>
                  <p className="text-[10px] text-gray-400 mb-3">
                    {transaction.type === 'contribution' 
                      ? 'Create a goal to make contributions.'
                      : 'Create goals to track your progress.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/goals/create')}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Create Goal
                  </button>
                </div>
              ) : (
                <GoalSelector
                  selectedGoal={selectedGoal}
                  onGoalSelect={handleGoalSelect}
                  className="mobile-goal-selector"
                  required={transaction.type === 'contribution'}
                  label=""
                  isContributionType={transaction.type === 'contribution'}
                  showValidationError={transaction.type === 'contribution' && !selectedGoal}
                  onGoalsLoaded={setHasGoals}
                  validateFamilyGoalAccess={true}
                />
              )}
            </div>
          </div>

          {/* Mobile Selected Goal Preview */}
          {selectedGoal && transaction.type !== 'contribution' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <i className="fas fa-flag text-indigo-500 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{selectedGoal.goal_name}</p>
                    <p className="text-[10px] text-gray-500">
                      {selectedGoal.is_family_goal ? 'Family Goal' : 'Personal Goal'}
                    </p>
                  </div>
                  {selectedGoal.is_family_goal && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-semibold">Family</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${selectedGoal.target_amount > 0 ? Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100) : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{selectedGoal.target_amount > 0 ? ((selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(1) : 0}% complete</span>
                  <span>₱{(selectedGoal.target_amount - selectedGoal.current_amount).toFixed(2)} remaining</span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Description Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-pen text-indigo-500 text-[10px]"></i>
                Description
                <span className="text-red-500">*</span>
              </h6>
            </div>
            <div className="p-3">
              <textarea
                name="description"
                value={transaction.description}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none"
                rows={3}
                placeholder="Enter a description for this transaction"
                required
              ></textarea>
            </div>
          </div>

          {/* Mobile Submit Button */}
          <button 
            type="submit"
            className={`w-full py-3.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
              transaction.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' :
              transaction.type === 'contribution' ? 'bg-blue-500 hover:bg-blue-600' :
              'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            <i className="fas fa-arrow-right text-xs"></i>
            Continue to Review
          </button>
        </form>
      </div>
      {/* ===== END MOBILE FORM VIEW ===== */}

      {/* Desktop Page Heading */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-2 mb-md-4 flex-wrap">
        <h1 className="h5 h-md-3 mb-1 mb-md-0 text-gray-800" style={{ fontSize: '0.95rem' }}>
          <span className="d-none d-md-inline">Add Transaction</span>
          <span className="d-inline d-md-none">Add</span>
        </h1>
        <Link 
          to="/transactions" 
          className="inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
        >
          <i className="fas fa-arrow-left text-xs mr-1"></i>
          <span className="d-none d-md-inline">Back to Transactions</span>
          <span className="d-inline d-md-none">Back</span>
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

      {/* Desktop Form View */}
      <div className="row d-none d-md-flex">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-4 transaction-form">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <span className="d-none d-md-inline">Transaction Details</span>
                <span className="d-inline d-md-none">Details</span>
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
                        <div className="card-body transaction-type-card">
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
                        <div className="card-body transaction-type-card">
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
                        <div className="card-body transaction-type-card">
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
                  <>                    
                    {console.log('📄 AddTransaction: Rendering BudgetSelector with props:', {
                      selectedBudgetId: transaction.budget_id,
                      selectedCategoryId: transaction.category_id,
                      transactionAmount: transaction.amount || 0,
                      transactionType: transaction.type,
                      selectedCategory: selectedCategory
                    })}
                    <BudgetSelector
                      selectedBudgetId={transaction.budget_id}
                      selectedCategoryId={transaction.category_id}
                      transactionAmount={transaction.amount || 0}
                      transactionType={transaction.type}
                      onBudgetSelect={handleBudgetSelect}
                      onCategoryAutoSelect={handleCategoryAutoSelect}
                      className="mb-4"
                    />
                  </>
                )}

                {/* Goal Assignment - Always show but required for contribution type OR Goal Creation Button if no goals */}
                {hasGoals === false ? (
                  // Show goal creation section when no goals are available
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
                          className="inline-flex items-center justify-center px-4 py-2.5 md:px-6 md:py-3 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors"
                          onClick={() => navigate('/goals/create')}
                        >
                          <i className="fas fa-plus text-xs mr-2"></i>
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
                  <button 
                    type="submit" 
                    className="inline-flex items-center justify-center px-3 py-2 md:px-4 md:py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
                  >
                    <i className="fas fa-arrow-right text-xs mr-1"></i>
                    <span className="d-none d-md-inline">Continue to Review</span>
                    <span className="d-inline d-md-none">Review</span>
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
                className="inline-flex items-center justify-center px-4 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-medium rounded shadow-sm transition-colors"
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
