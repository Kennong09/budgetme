import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { useFamilyGoalPermissions } from "../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../common/PermissionErrorModal";
import { EnhancedTransactionService } from "../../services/database/enhancedTransactionService";
import { AccountService } from "../../services/database/accountService";
import TransactionNotificationService from "../../services/database/transactionNotificationService";
import TransactionErrorBoundary from "../common/TransactionErrorBoundary";
import BudgetSelector from "../budget/BudgetSelector";
import { BudgetItem } from "../../services/database/budgetService";
import { CentavoInput } from "../common/CentavoInput";
import { formatCurrency as formatCurrencyUtils, sanitizeBudgetName, roundToCentavo } from "../../utils/currencyUtils";
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

interface Transaction {
  id: string;
  type: "income" | "expense" | "contribution";
  account_id: string;
  category_id: string;
  goal_id?: string;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
  user_id: string;
}

interface TransactionFormData {
  type: "income" | "expense" | "contribution";
  account_id: string;
  category_id: string;
  goal_id: string;
  budget_id: string;
  amount: number;
  date: string;
  description: string;
}

const EditTransaction: FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
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
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) {
          showErrorToast("You must be logged in to edit transactions");
          navigate("/auth/login");
          return;
        }

        if (!id) {
          showErrorToast("Transaction ID is missing");
          navigate("/transactions");
          return;
        }

        setLoading(true);
        
        // Use enhanced transaction service with schema-aware category mapping
        const transactionResult = await EnhancedTransactionService.fetchTransactionForEdit(id, user.id);
        
        if (!transactionResult.success) {
          throw new Error(transactionResult.error || 'Failed to fetch transaction');
        }
        
        const transactionData = transactionResult.data;
        setOriginalTransaction(transactionData);

        // Fetch user's accounts using AccountService for consistent typing
        const accountsResult = await AccountService.fetchUserAccounts(user.id);
        if (!accountsResult.success) {
          throw new Error(accountsResult.error || 'Failed to fetch accounts');
        }
        const accountsData = accountsResult.data || [];
        
        // Fetch income categories
        const { data: incomeData, error: incomeError } = await supabase
          .from('income_categories')
          .select('id, category_name, icon')
          .eq('user_id', user.id)
          .order('category_name');
          
        if (incomeError) throw incomeError;
        
        // Fetch expense categories
        const { data: expenseData, error: expenseError } = await supabase
          .from('expense_categories')
          .select('id, category_name, icon')
          .eq('user_id', user.id)
          .order('category_name');
          
        if (expenseError) throw expenseError;
        
        // Fetch goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('id, goal_name, target_amount, current_amount, target_date, priority, status, is_family_goal')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('goal_name');
          
        if (goalsError) throw goalsError;
        
        // Update state with fetched data
        setUserData({
          accounts: accountsData || [],
          incomeCategories: incomeData || [],
          expenseCategories: expenseData || [],
          goals: goalsData || []
        });
        
        // Set form data from transaction
        setTransaction({
          type: transactionData.type,
          account_id: transactionData.account_id,
          category_id: transactionData.category_id || "",
          goal_id: transactionData.goal_id || "",
          budget_id: "", // Will be populated if transaction has budget tags
          amount: transactionData.amount,
          date: new Date(transactionData.date).toISOString().slice(0, 10),
          description: transactionData.description || ""
        });
        
        // Set selected goal if goal_id exists
        if (transactionData.goal_id && goalsData) {
          const goal = goalsData.find(g => g.id === transactionData.goal_id);
          setSelectedGoal(goal || null);
        }
        
        // Set selected account with proper type safety
        if (transactionData.account_id && accountsData) {
          const account = accountsData.find(acc => acc.id === transactionData.account_id);
          setSelectedAccount(account || null);
        }
        
        // Set selected category based on transaction data
        if (transactionData.category_id) {
          const categories = transactionData.type === 'income' ? incomeData : expenseData;
          const category = categories?.find(cat => cat.id === transactionData.category_id);
          setSelectedCategory(category || null);
        }
        
        // TODO: Load budget assignment from transaction tags if available
        // This would require parsing transaction.tags for budget_id information
      } catch (error: any) {
        console.error('Error fetching data:', error);
        showErrorToast(error.message || "Failed to load transaction data");
        navigate('/transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate, showErrorToast]);

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
      // Automatically set category when budget is selected
      category_id: budget?.category_id || prev.category_id,
    }));
  };

  const handleGoalSelect = async (goal: Goal | null) => {
    // If family goal and this involves family goal access, check permissions
    if (goal?.is_family_goal) {
      // Check if user can access family goals for modifications
      if (transaction.type === 'contribution') {
        const contributionValidation = await familyGoalPermissions.validateGoalContribution();
        if (!contributionValidation.canContribute) {
          setPermissionErrorModal({
            isOpen: true,
            title: contributionValidation.errorTitle || 'Contribution Access Denied',
            message: contributionValidation.errorMessage || 'You cannot contribute to family goals.',
            suggestedActions: contributionValidation.suggestedActions || ['Contact your family admin for assistance'],
            userRole: contributionValidation.userRole
          });
          return;
        }
      }
      
      // Check general family goal access
      const accessResult = await familyGoalPermissions.checkCanAccessGoal(goal.id);
      if (!accessResult.hasPermission) {
        setPermissionErrorModal({
          isOpen: true,
          title: 'Access Denied',
          message: accessResult.errorMessage || 'You do not have permission to access this family goal.',
          suggestedActions: accessResult.restrictions || ['Contact your family admin for assistance'],
          userRole: accessResult.userRole
        });
        return;
      }
    }
    
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
      
      if (contributionCategory) {
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
    } else {
      // If no goal selected or income transaction, just update goal_id
      setTransaction((prev) => ({
        ...prev,
        goal_id: goal?.id || "",
      }));
    }
  };

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

    // For contribution type, category should be auto-set but still validate if manually changed
    if (!transaction.category_id && transaction.type === 'contribution') {
      // Auto-set Contribution category for contribution type
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
    }
    
    // Additional validation to ensure the category matches the transaction type
    const isIncome = transaction.type === 'income';
    const isContribution = transaction.type === 'contribution';
    
    let categoryExists = false;
    if (isIncome) {
      categoryExists = userData.incomeCategories.some(cat => cat.id === transaction.category_id);
    } else if (isContribution) {
      // For contribution type, we expect a goal to be selected, category is optional
      if (transaction.category_id) {
        categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
      } else {
        categoryExists = true; // Allow no category for contribution type if goal is selected
      }
    } else {
      categoryExists = userData.expenseCategories.some(cat => cat.id === transaction.category_id);
    }
    
    if (!categoryExists && transaction.category_id) {
      const typeLabel = isIncome ? 'income' : (isContribution ? 'expense (for contributions)' : 'expense');
      showErrorToast(`Selected category does not match transaction type. Please select a ${typeLabel} category.`);
      return;
    }
    
    // Special validation for contribution type - require goal selection
    if (isContribution && !transaction.goal_id) {
      showErrorToast("Please select a goal for your contribution.");
      return;
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
    if (!user || !originalTransaction) {
      showErrorToast("Unable to update transaction. Missing data.");
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = roundToCentavo(transaction.amount);
      
      // Use enhanced transaction service with schema-aware category mapping
      const updateResult = await EnhancedTransactionService.updateTransactionWithMapping(
        id!,
        user.id,
        {
          type: transaction.type,
          amount: amount,
          date: transaction.date,
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          goal_id: transaction.goal_id || undefined,
          notes: sanitizeBudgetName(transaction.description)
        }
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update transaction');
      }

      // Trigger transaction notifications for the updated transaction
      if (updateResult.data) {
        try {
          // Prepare transaction data for notification service
          const transactionDataForNotification = {
            id: updateResult.data.id,
            user_id: updateResult.data.user_id,
            account_id: updateResult.data.account_id,
            category_id: transaction.type === 'income' ? updateResult.data.income_category_id : updateResult.data.expense_category_id,
            goal_id: updateResult.data.goal_id,
            amount: updateResult.data.amount,
            transaction_type: updateResult.data.type,
            description: updateResult.data.description || '',
            transaction_date: updateResult.data.date,
            currency: 'PHP',
            family_id: null,
            is_recurring: false,
            recurring_frequency: null
          };
          
          // Trigger notification processing for large transactions and categorization
          await TransactionNotificationService.getInstance().handleTransactionCreated(transactionDataForNotification);
          
          console.log('Transaction update notifications processed successfully');
        } catch (notificationError) {
          // Log notification error but don't fail the transaction update
          console.warn('Failed to process transaction update notifications:', notificationError);
        }
      }

      showSuccessToast("Transaction updated successfully!");
      navigate(`/transactions/${id}`);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      showErrorToast(error.message || "Failed to update transaction");
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
      description: 'Modify the details of your transaction including the amount, date, category, and account. All fields marked with * are required.'
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
          <p className="mt-3 text-gray-700">Loading transaction data...</p>
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
          <h1 className="h3 mb-0 text-gray-800">Review Transaction Changes</h1>
          <Link to={`/transactions/${id}`} className="btn btn-sm btn-secondary shadow-sm">
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
                              {formatCurrencyUtils(transaction.amount, 'PHP')}
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
                    <span className="text">{isSubmitting ? "Saving..." : "Save Changes"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Edit Transaction</h1>
        <Link to={`/transactions/${id}`} className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Details
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
                        onClick={() => setTransaction((prev) => ({...prev, type: 'income', category_id: ''}))}
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
                        onClick={() => setTransaction((prev) => ({...prev, type: 'expense', category_id: ''}))}
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
                          setTransaction((prev) => ({...prev, type: 'contribution', category_id: ''}));
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
                      autoSelectDefault={false}
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
                        className="mb-3"
                      />
                    ) : (
                      <div className="form-group mb-3">
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



                {/* Budget Assignment */}
                <BudgetSelector
                  selectedBudgetId={transaction.budget_id}
                  selectedCategoryId={transaction.category_id}
                  transactionAmount={transaction.amount || 0}
                  transactionType={transaction.type}
                  onBudgetSelect={handleBudgetSelect}
                  className="mb-4"
                />

                {/* Goal Assignment */}
                <GoalSelector
                  selectedGoal={selectedGoal}
                  onGoalSelect={handleGoalSelect}
                  className="mb-4"
                  validateFamilyGoalAccess={true}
                />

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
                  <p className="font-weight-bold mb-0">Verify the Date</p>
                </div>
                <p className="text-sm text-muted ml-5">Ensure the transaction date is accurate</p>
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
          
          {originalTransaction && (
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  Original Transaction Details
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <p className="text-xs font-weight-bold text-gray-600 text-uppercase mb-1">Type</p>
                  <p className={`font-weight-bold ${originalTransaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {originalTransaction.type === 'income' ? 'Income' : 'Expense'}
                  </p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs font-weight-bold text-gray-600 text-uppercase mb-1">Amount</p>
                  <p className="font-weight-bold">${originalTransaction.amount.toFixed(2)}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs font-weight-bold text-gray-600 text-uppercase mb-1">Date</p>
                  <p className="font-weight-bold">{new Date(originalTransaction.date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Permission Error Modal */}
      <PermissionErrorModal
        isOpen={permissionErrorModal.isOpen}
        onClose={() => setPermissionErrorModal({ isOpen: false, title: '', message: '' })}
        errorTitle={permissionErrorModal.title}
        errorMessage={permissionErrorModal.message}
        suggestedActions={permissionErrorModal.suggestedActions}
        userRole={permissionErrorModal.userRole}
      />
    </div>
  );
};

export default function EditTransactionWithErrorBoundary() {
  return (
    <TransactionErrorBoundary>
      <EditTransaction />
    </TransactionErrorBoundary>
  );
} 