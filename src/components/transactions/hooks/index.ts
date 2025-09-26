import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { EnhancedTransactionService } from '../../../services/database/enhancedTransactionService';
import { 
  Transaction, 
  UserData, 
  FilterState, 
  LineChartConfig, 
  PieChartConfig 
} from '../types';
import { 
  applyTransactionFilters, 
  prepareChartData, 
  createDefaultFilter,
  getTransactionTypeFromCategory
} from '../utils';

/**
 * Hook for managing transaction data and real-time subscriptions
 */
export const useTransactionData = () => {
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscriptionEstablished, setSubscriptionEstablished] = useState<boolean>(false);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user's accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, balance')
        .eq('user_id', user.id);
        
      if (accountsError) throw accountsError;
      
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
        .select('id, goal_name, current_amount, target_amount')
        .eq('user_id', user.id)
        .order('goal_name');
        
      if (goalsError) throw goalsError;
      
      // Fetch transactions using EnhancedTransactionService for proper category mapping
      const transactionResult = await EnhancedTransactionService.fetchTransactionsWithMapping(
        user.id,
        { limit: 1000 } // Get a reasonable limit
      );
      
      if (!transactionResult.success) {
        throw new Error(transactionResult.error || 'Failed to fetch transactions');
      }
      
      const transactionsData = transactionResult.data || [];
      
      // Update state with fetched data
      const userData = {
        accounts: accountsData || [],
        incomeCategories: incomeData || [],
        expenseCategories: expenseData || [],
        goals: goalsData || [],
        transactions: transactionsData || []
      };

      setUserData(userData);
      setTransactions(transactionsData || []);
      
      return userData;
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showErrorToast(error.message || 'Error loading your data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, showErrorToast]);

  // Set up real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (user && !subscriptionEstablished) {
      const transactionsSubscription = supabase
        .channel('public:transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchUserData();
          }
        )
        .subscribe();
        
      setSubscriptionEstablished(true);
      
      return () => {
        supabase.removeChannel(transactionsSubscription);
      };
    }
  }, [user, subscriptionEstablished, fetchUserData]);

  // Fetch data on component mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Set up real-time subscriptions after fetching initial data
  useEffect(() => {
    if (user && !loading && !subscriptionEstablished) {
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user, loading, subscriptionEstablished, setupRealtimeSubscription]);

  return {
    transactions,
    setTransactions,
    userData,
    setUserData,
    loading,
    refetchData: fetchUserData
  };
};

/**
 * Hook for managing filters and URL synchronization
 */
export const useTransactionFilters = (
  transactions: Transaction[],
  userData: UserData | null
) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  
  // Get URL parameters and create default filter
  const queryParams = new URLSearchParams(location.search);
  const [filter, setFilter] = useState<FilterState>(createDefaultFilter(queryParams));
  
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Apply filters with loading indicator
  const applyFilters = useCallback(() => {
    if (transactions.length === 0) return;
    
    setIsFiltering(true);
    
    setTimeout(() => {
      const result = applyTransactionFilters(transactions, filter, userData?.transactions[0]?.user_id);
      setFilteredTransactions(result);
      setIsFiltering(false);
    }, 300);
  }, [transactions, filter, userData]);

  // Update URL when filters change
  useEffect(() => {
    if (transactions.length === 0) return;
    
    const params = new URLSearchParams();
    
    // Only add parameters that are not default values
    if (filter.type !== "all") params.set("type", filter.type);
    if (filter.accountId !== "all") params.set("accountId", filter.accountId);
    if (filter.categoryId !== "all") params.set("categoryId", filter.categoryId);
    if (filter.month !== "all") params.set("month", filter.month);
    if (filter.year !== "all") params.set("year", filter.year);
    if (filter.search !== "") params.set("search", filter.search);
    if (filter.scope !== "all") params.set("scope", filter.scope);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    navigate(newUrl, { replace: true });
    
    applyFilters();
  }, [filter, transactions, navigate, applyFilters]);

  // Auto-detect transaction type from category
  useEffect(() => {
    if (filter.categoryId !== "all" && userData) {
      const transactionType = getTransactionTypeFromCategory(
        filter.categoryId, 
        userData,
        filter.type
      );
      
      if (transactionType !== "all" && transactionType !== filter.type) {
        setFilter(prev => ({ ...prev, type: transactionType }));
      }
    }
  }, [filter.categoryId, userData, filter.type]);

  const handleFilterChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    setIsFiltering(true);
    
    if (name === "type") {
      setFilter(prev => ({
        ...prev,
        type: value as "all" | "income" | "expense" | "contribution",
        categoryId: "all"
      }));
    } else if (name === "categoryId") {
      if (value === "all") {
        setFilter(prev => ({ ...prev, categoryId: value }));
      } else if (userData) {
        const transactionType = getTransactionTypeFromCategory(value, userData, filter.type as "income" | "expense" | "contribution" | "all");
        setFilter(prev => ({ 
          ...prev,
          categoryId: value,
          ...(transactionType !== "all" ? { type: transactionType } : {})
        }));
      } else {
        setFilter(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFilter(prev => ({ ...prev, [name]: value }));
    }
  }, [userData, filter.type]);

  const resetFilters = useCallback(() => {
    setIsFiltering(true);
    
    setFilter({
      type: "all",
      accountId: "all",
      categoryId: "all",
      month: "all",
      year: "all",
      search: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      sortBy: "date",
      sortOrder: "desc",
      scope: "all",
      goal_id: undefined
    });
    
    navigate('', { replace: true });
  }, [navigate]);

  return {
    filter,
    setFilter,
    filteredTransactions,
    isFiltering,
    handleFilterChange,
    resetFilters
  };
};

/**
 * Hook for managing chart data
 */
export const useChartData = (
  filteredTransactions: Transaction[],
  userData: UserData | null,
  filter: FilterState
) => {
  const [lineChartOptions, setLineChartOptions] = useState<LineChartConfig | null>(null);
  const [pieChartOptions, setPieChartOptions] = useState<PieChartConfig | null>(null);
  const lineChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);

  useEffect(() => {
    if (userData) {
      const { lineChartOptions, pieChartOptions } = prepareChartData(
        filteredTransactions, 
        userData, 
        filter
      );
      setLineChartOptions(lineChartOptions);
      setPieChartOptions(pieChartOptions);
    }
  }, [filteredTransactions, userData, filter]);

  const lineChartCallback = useCallback((chart: any) => {
    if (lineChartRef.current) {
      lineChartRef.current.chart = chart;
    }
  }, []);

  const pieChartCallback = useCallback((chart: any) => {
    if (pieChartRef.current) {
      pieChartRef.current.chart = chart;
    }
  }, []);

  return {
    lineChartOptions,
    pieChartOptions,
    lineChartRef,
    pieChartRef,
    lineChartCallback,
    pieChartCallback
  };
};

/**
 * Hook for managing tooltips
 */
export const useTooltips = () => {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const toggleTip = useCallback((tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  }, [activeTip]);

  return {
    activeTip,
    tooltipPosition,
    toggleTip
  };
};

/**
 * Hook for managing delete functionality
 */
export const useDeleteTransaction = () => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const openDeleteModal = useCallback((transactionId: string) => {
    setTransactionToDelete(transactionId);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  }, []);

  const handleDeleteTransaction = useCallback(async (
    transactions: Transaction[],
    setTransactions: (txs: Transaction[]) => void,
    filteredTransactions: Transaction[],
    setFilteredTransactions: (txs: Transaction[]) => void,
    userData: UserData | null,
    setUserData: (data: UserData) => void
  ) => {
    if (!user || !transactionToDelete) {
      showErrorToast("You must be logged in to delete transactions");
      return;
    }

    try {
      setIsDeleting(true);
      
      // Get transaction details
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionToDelete)
        .single();
      
      if (txError) throw txError;
      if (!txData) throw new Error("Transaction not found");
      
      // Verify user owns this transaction
      if (txData.user_id !== user.id) {
        throw new Error("You do not have permission to delete this transaction");
      }
      
      // Calculate balance adjustment
      const balanceChange = txData.type === 'income' ? -txData.amount : txData.amount;
      
      // Delete transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete);
        
      if (deleteError) throw deleteError;
      
      // Update account balance
      const { error: accountError } = await supabase.rpc('update_account_balance', {
        p_account_id: txData.account_id,
        p_amount_change: balanceChange
      });
      
      if (accountError) {
        // Fallback to direct update
        const { data: accountData, error: fetchError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', txData.account_id)
          .single();
          
        if (fetchError) throw fetchError;
        
        const newBalance = accountData.balance + balanceChange;
        
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', txData.account_id);
          
        if (updateError) throw updateError;
      }
      
      // Update goal progress if applicable
      if (txData.goal_id) {
        const goalAdjustment = -txData.amount;
        
        const { error: goalError } = await supabase.rpc('update_goal_progress', {
          p_goal_id: txData.goal_id,
          p_amount: goalAdjustment
        });
        
        if (goalError) {
          // Fallback to direct update
          const { data: goalData, error: fetchGoalError } = await supabase
            .from('goals')
            .select('current_amount, target_amount')
            .eq('id', txData.goal_id)
            .single();
            
          if (fetchGoalError) throw fetchGoalError;
            
          const newAmount = Math.max(0, goalData.current_amount + goalAdjustment);
          const status = newAmount >= goalData.target_amount ? 'completed' : 'in_progress';
            
          const { error: updateGoalError } = await supabase
            .from('goals')
            .update({ 
              current_amount: newAmount,
              status: status
            })
            .eq('id', txData.goal_id);
            
          if (updateGoalError) throw updateGoalError;
        }
      }
      
      // Optimistically update the UI
      const updatedTransactions = transactions.filter(tx => tx.id !== transactionToDelete);
      setTransactions(updatedTransactions);
      
      const updatedFilteredTransactions = filteredTransactions.filter(tx => tx.id !== transactionToDelete);
      setFilteredTransactions(updatedFilteredTransactions);
      
      if (userData) {
        const updatedUserData = {
          ...userData,
          transactions: userData.transactions.filter(tx => tx.id !== transactionToDelete)
        };
        
        // Update accounts balance
        if (txData.account_id) {
          const accountIndex = updatedUserData.accounts.findIndex(a => a.id === txData.account_id);
          if (accountIndex >= 0) {
            updatedUserData.accounts[accountIndex] = {
              ...updatedUserData.accounts[accountIndex],
              balance: updatedUserData.accounts[accountIndex].balance + balanceChange
            };
          }
        }
        
        // Update goal progress
        if (txData.goal_id) {
          const goalIndex = updatedUserData.goals.findIndex(g => g.id === txData.goal_id);
          if (goalIndex >= 0) {
            const newAmount = Math.max(0, updatedUserData.goals[goalIndex].current_amount - txData.amount);
            updatedUserData.goals[goalIndex] = {
              ...updatedUserData.goals[goalIndex],
              current_amount: newAmount
            };
          }
        }
        
        setUserData(updatedUserData);
      }
      
      showSuccessToast("Transaction deleted successfully!");
      closeDeleteModal();
      
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      showErrorToast(error.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  }, [user, transactionToDelete, showSuccessToast, showErrorToast, closeDeleteModal]);

  return {
    showDeleteModal,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteTransaction
  };
};