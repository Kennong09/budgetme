import React, { useState, useEffect, FC, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { TransactionAuditService } from "../../services/database/transactionAuditService";
import { EnhancedTransactionService } from "../../services/database/enhancedTransactionService";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import "animate.css";
import "./transactions.css";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense" | "contribution";
  category_id?: string;
  account_id: string;
  goal_id?: string;
  created_at: string;
  user_id: string;
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface Goal {
  id: string;
  goal_name: string;
  current_amount: number;
  target_amount: number;
}

interface RouteParams {
  id: string;
}

const TransactionDetails: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [relatedTransactions, setRelatedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [subscriptionEstablished, setSubscriptionEstablished] = useState<boolean>(false);
  
  // Data for categories and accounts
  const [categories, setCategories] = useState<{
    income: Category[],
    expense: Category[]
  }>({
    income: [],
    expense: []
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // Tooltip state
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Chart refs
  const categoryChartRef = useRef<any>(null);
  const impactChartRef = useRef<any>(null);
  
  // Chart configs
  const [categoryChartOptions, setCategoryChartOptions] = useState<any>(null);
  const [impactChartOptions, setImpactChartOptions] = useState<any>(null);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Mobile UI state for tabbed charts
  const [mobileActiveChart, setMobileActiveChart] = useState<'breakdown' | 'impact'>('breakdown');

  // Function to fetch transaction details
  const fetchTransactionData = async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch transaction details using EnhancedTransactionService for proper category mapping
      const transactionResult = await EnhancedTransactionService.fetchTransactionForEdit(id, user.id);
      
      if (!transactionResult.success) {
        throw new Error(transactionResult.error || 'Failed to fetch transaction');
      }
      
      const transactionData = transactionResult.data;
      
      if (!transactionData) {
        setLoading(false);
        return;
      }

      setTransaction(transactionData);
      
      // Fetch account information
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      
      if (accountError) throw accountError;
      setAccounts(accountData || []);

      // Fetch income categories
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_categories')
        .select('*')
        .eq('user_id', user.id);
      
      if (incomeError) throw incomeError;

      // Fetch expense categories
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id);
      
      if (expenseError) throw expenseError;

      // Set categories
      setCategories({
        income: incomeData || [],
        expense: expenseData || []
      });

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
      
      if (goalsError) throw goalsError;
      setGoals(goalsData || []);
      
      // Find related transactions (same category or account) using enhanced service
      if (transactionData.category_id) {
        const relatedResult = await EnhancedTransactionService.fetchTransactionsWithMapping(
          user.id,
          {
            type: transactionData.type,
            category_id: transactionData.category_id,
            limit: 5
          }
        );
        
        if (relatedResult.success) {
          // Filter out the current transaction from related results
          const relatedData = (relatedResult.data || []).filter(tx => tx.id !== id);
          setRelatedTransactions(relatedData);
        }
      }
      
      // Create chart configurations with the fetched data
      createChartConfigs(
        transactionData, 
        { 
          accounts: accountData || [],
          incomeCategories: incomeData || [],
          expenseCategories: expenseData || []
        }
      );

      setHighchartsLoaded(true);
    } catch (error: any) {
      console.error('Error fetching transaction data:', error);
      showErrorToast(error.message || "Failed to load transaction data");
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    if (!user || !id || subscriptionEstablished) return;

    // Subscribe to this specific transaction
    const subscription = supabase
      .channel(`transaction-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `id=eq.${id}`
      }, (payload) => {
        
        
        // If transaction was deleted, navigate back to transactions list
        if (payload.eventType === 'DELETE') {
          showSuccessToast('This transaction has been deleted');
          navigate('/transactions');
          return;
        }
        
        // Otherwise refresh data
        fetchTransactionData();
      })
      .subscribe();

    setSubscriptionEstablished(true);

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  };

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchTransactionData();
    } else {
      navigate('/auth/login');
    }
  }, [id, user]);

  // Set up real-time subscriptions after fetching initial data
  useEffect(() => {
    if (user && !loading && !subscriptionEstablished) {
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user, loading, subscriptionEstablished]);

  const createChartConfigs = (transaction: Transaction, data: {
    accounts: Account[],
    incomeCategories: Category[],
    expenseCategories: Category[]
  }) => {
    // Get category information
    const category = transaction.category_id
      ? data.incomeCategories.find((c: Category) => c.id === transaction.category_id) || 
        data.expenseCategories.find((c: Category) => c.id === transaction.category_id)
      : null;
    
    // Create category spending chart (pie chart)
    const categoryName = transaction.type === 'contribution' 
      ? (transaction.goal_id ? 'Goal Contribution' : 'Contribution')
      : (category ? category.category_name : 'Uncategorized');
    
    // For now, we'll use related transactions for category transactions
    const categoryTransactions = relatedTransactions.concat(transaction);
    
    // Calculate total spent in category
    const totalInCategory = categoryTransactions.reduce(
      (sum, tx) => sum + tx.amount, 0
    );
    
    // Calculate percentage of this transaction compared to category total
    const transactionPercentage = (transaction.amount / totalInCategory) * 100;
    
    // Category chart config
    setCategoryChartOptions({
      chart: {
        type: 'pie',
        height: 250,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> (${point.y:.2f})',
      },
      accessibility: {
        point: {
          valueSuffix: '%'
        }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              fontWeight: 'normal'
            },
            connectorWidth: 0,
            distance: 15
          },
          showInLegend: false,
          size: '85%'
        }
      },
      legend: {
        enabled: false
      },
      series: [{
        name: `${transaction.type === 'income' ? 'Income' : 'Spending'} in ${categoryName}`,
        colorByPoint: true,
        data: [
          {
            name: 'This Transaction',
            y: transaction.amount,
            sliced: true,
            selected: true
          },
          {
            name: 'Other Transactions',
            y: totalInCategory - transaction.amount
          }
        ]
      }],
      credits: {
        enabled: false
      }
    });
    
    // Impact visualization - compare this transaction to average transaction in same category
    const sameCategoryTransactions = relatedTransactions;
    
    // Calculate average transaction amount in this category
    const avgAmount = sameCategoryTransactions.length > 0
      ? sameCategoryTransactions.reduce((sum, tx) => sum + tx.amount, 0) / sameCategoryTransactions.length
      : 0;
    
    // Get the highest amount in this category
    const maxAmount = sameCategoryTransactions.length > 0
      ? Math.max(...sameCategoryTransactions.map(tx => tx.amount))
      : transaction.amount;
    
    // Impact chart config (column chart comparing this transaction to avg/max)
    setImpactChartOptions({
      chart: {
        type: 'column',
        height: 250,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      xAxis: {
        categories: ['This Transaction', 'Category Average', 'Category Highest'],
        crosshair: true
      },
      yAxis: {
        min: 0,
        title: {
          text: null
        },
        labels: {
          format: '${value}'
        },
        gridLineColor: '#eaecf4',
        gridLineDashStyle: 'dash'
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>${point.y:.2f}</b></td></tr>',
        footerFormat: '</table>',
        shared: true,
        useHTML: true
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          colorByPoint: true,
          colors: [
            transaction.type === 'income' ? '#1cc88a' : '#e74a3b',
            '#4e73df',
            '#f6c23e'
          ]
        }
      },
      series: [{
        name: 'Amount',
        showInLegend: false,
        data: [
          {
            y: transaction.amount,
            color: transaction.type === 'income' ? '#1cc88a' : '#e74a3b'
          }, 
          {
            y: avgAmount,
            color: '#4e73df'
          }, 
          {
            y: maxAmount,
            color: '#f6c23e'
          }
        ]
      }],
      credits: {
        enabled: false
      }
    });
  };

  // Open delete modal
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };
  
  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!transaction || !user) return;
    
    try {
      setIsDeleting(true);
      
      // When deleting a transaction, we need to:
      // 1. Get transaction details (account, type, amount, goal)
      // 2. Log audit activity before deletion
      // 3. Delete the transaction
      // 4. Update account balance
      // 5. Update goal progress if applicable
      
      // Capture transaction data for audit log before deletion
      const auditData = TransactionAuditService.extractTransactionAuditData(
        transaction,
        accounts?.find(acc => acc.id === transaction.account_id),
        categories.income?.find(cat => cat.id === transaction.category_id) ||
        categories.expense?.find(cat => cat.id === transaction.category_id),
        goals?.find(goal => goal.id === transaction.goal_id)
      );
      
      // Calculate balance adjustment
      // If it was income, subtract from balance; if expense, add to balance
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      
      // Delete transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
        
      if (deleteError) throw deleteError;
      
      // Log transaction deletion to audit history (async, don't block on failure)
      TransactionAuditService.logTransactionDeleted(
        user.id,
        auditData,
        'User deleted transaction',
        navigator.userAgent
      ).catch(error => {
        console.error('Failed to log transaction deletion to audit:', error);
        // Don't show error to user as this shouldn't interrupt their flow
      });
      
      // Show success message and navigate immediately
      showSuccessToast("Transaction deleted successfully!");
      closeDeleteModal();
      navigate('/transactions');
      
      // Continue with account and goal updates asynchronously
      // These updates are important but don't need to block navigation
      updateRelatedData(
        transaction.account_id, 
        balanceChange, 
        transaction.amount,
        transaction.goal_id
      );
        
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      showErrorToast(error.message || "Failed to delete transaction");
      setIsDeleting(false);
      closeDeleteModal();
    }
  };
  
  // Helper function to update account balance and goal progress after deletion
  const updateRelatedData = async (
    accountId: string, 
    balanceChange: number,
    transactionAmount: number,
    goalId?: string
  ): Promise<void> => {
    try {
      // Update account balance
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
      
      // If transaction was associated with a goal, update goal progress
      if (goalId) {
        // For goals, reverse the effect of the transaction (subtract if it was a contribution)
        const goalAdjustment = -transactionAmount;
        
        const { error: goalError } = await supabase.rpc('update_goal_progress', {
          p_goal_id: goalId,
          p_amount: goalAdjustment
        });
        
        if (goalError) {
          // If RPC fails, fall back to direct update
          const { data: goalData, error: fetchGoalError } = await supabase
            .from('goals')
            .select('current_amount, target_amount')
            .eq('id', goalId)
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
            .eq('id', goalId);
              
          if (updateGoalError) throw updateGoalError;
        }
      }
    } catch (error) {
      console.error('Error updating related data after transaction deletion:', error);
      // We don't show this error to the user since they've already navigated away
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Tooltip toggle function
  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        // Get the position of the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate position accounting for scroll
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading transaction details...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container-fluid">
        {/* Mobile Not Found State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Transaction not found</h2>
            <p className="text-sm text-gray-500 mb-4">The transaction you're looking for does not exist or has been deleted.</p>
            <Link 
              to="/transactions" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Back to Transactions
            </Link>
          </div>
        </div>

        {/* Desktop Not Found State */}
        <div className="text-center my-5 animate__animated animate__fadeIn hidden md:block">
          <div className="error-icon mb-4">
            <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Transaction not found</h1>
          <p className="mb-4">The transaction you're looking for does not exist or has been deleted.</p>
          <Link to="/transactions" className="btn btn-primary">
            <i className="fas fa-arrow-left mr-2"></i> Back to Transactions
          </Link>
        </div>
      </div>
    );
  }

  // Get category and account information from state
  const category = transaction.category_id
    ? categories[transaction.type === 'income' ? 'income' : 'expense'].find(c => c.id === transaction.category_id)
    : null;
    
  // Special handling for contribution transactions to ensure proper category display
  const displayCategory = transaction.type === 'contribution' 
    ? (transaction.goal_id ? 'Goal Contribution' : 'Contribution')
    : (category ? category.category_name : 'Uncategorized');
  const account = accounts.find(a => a.id === transaction.account_id);

  // Get goal information if applicable
  const goal = transaction.goal_id 
    ? goals.find(g => g.id === transaction.goal_id)
    : null;

  // Determine color scheme based on transaction type
  const colorClass = transaction.type === "income" ? "success" : "danger";
  const iconClass = transaction.type === "income" ? "arrow-up" : "arrow-down";
  const bgColorStyle = transaction.type === "income" 
    ? "rgba(28, 200, 138, 0.1)" 
    : "rgba(231, 74, 59, 0.1)";
  const iconColor = transaction.type === "income" ? "#1cc88a" : "#e74a3b";

  return (
    <div className="container-fluid">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Transaction Details</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openDeleteModal}
              className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Delete transaction"
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
            <Link
              to={`/transactions/${id}/edit`}
              className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Edit transaction"
            >
              <i className="fas fa-edit text-xs"></i>
            </Link>
            <Link
              to="/transactions"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
              aria-label="Back to transactions"
            >
              <i className="fas fa-arrow-left text-xs"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Transaction Summary Card */}
      <div className="block md:hidden mb-4">
        <div className={`bg-gradient-to-br ${
          transaction.type === 'income' ? 'from-emerald-500 via-teal-500 to-cyan-500' :
          transaction.type === 'contribution' ? 'from-blue-500 via-indigo-500 to-purple-500' :
          'from-rose-500 via-red-500 to-orange-500'
        } rounded-2xl p-4 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              transaction.type === 'income' ? 'bg-white/20 text-white' :
              transaction.type === 'contribution' ? 'bg-white/20 text-white' :
              'bg-white/20 text-white'
            }`}>
              {transaction.type === 'income' ? 'Income' : transaction.type === 'contribution' ? 'Contribution' : 'Expense'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className={`fas fa-${transaction.type === 'income' ? 'arrow-up' : transaction.type === 'contribution' ? 'flag' : 'arrow-down'} text-white text-sm`}></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {formatCurrency(transaction.amount)}
          </div>
          <div className="text-white/70 text-xs">
            {formatDate(transaction.date)}
          </div>
        </div>

        {/* Mobile Details Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-wallet text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Account</p>
            <p className="text-[11px] font-bold text-gray-800 truncate">{account?.account_name || 'Unknown'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-tag text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Category</p>
            <p className="text-[11px] font-bold text-gray-800 truncate">{displayCategory}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center mb-2">
              <i className="fas fa-calendar text-indigo-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Date</p>
            <p className="text-[11px] font-bold text-gray-800 truncate">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Mobile Description Card */}
        {transaction.description && transaction.description.trim() && (
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mt-2">
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mb-1">Description</p>
            <p className="text-xs text-gray-700">{transaction.description}</p>
          </div>
        )}

        {/* Mobile Goal Card */}
        {goal && (
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-bullseye text-emerald-500 text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Related Goal</p>
                <p className="text-xs font-bold text-gray-800 truncate">{goal.goal_name}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">
                {((goal.current_amount / goal.target_amount) * 100).toFixed(1)}% complete
              </p>
              <Link
                to={`/goals/${transaction.goal_id}`}
                className="text-[10px] text-indigo-500 font-medium"
              >
                View Goal →
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Charts - Tabbed interface like Dashboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
          {/* Tab header */}
          <div className="flex bg-slate-50">
            <button
              onClick={() => setMobileActiveChart('breakdown')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveChart === 'breakdown'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-pie mr-2 text-xs"></i>
              Breakdown
              {mobileActiveChart === 'breakdown' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveChart('impact')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveChart === 'impact'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-bar mr-2 text-xs"></i>
              Impact
              {mobileActiveChart === 'impact' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          </div>

          {/* Chart content */}
          <div className="p-4">
            {mobileActiveChart === 'breakdown' ? (
              highchartsLoaded && categoryChartOptions ? (
                <div className="animate__animated animate__fadeIn">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={{
                      ...categoryChartOptions,
                      chart: {
                        ...categoryChartOptions.chart,
                        height: 250,
                      },
                      plotOptions: {
                        ...categoryChartOptions.plotOptions,
                        pie: {
                          ...categoryChartOptions.plotOptions?.pie,
                          dataLabels: { enabled: false },
                          showInLegend: true,
                          size: '70%',
                          innerSize: '50%',
                          center: ['50%', '40%'],
                        },
                      },
                      legend: {
                        enabled: true,
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        itemStyle: { 
                          fontSize: '11px',
                          fontWeight: 'normal',
                          color: '#374151',
                        },
                        symbolRadius: 2,
                        symbolHeight: 10,
                        symbolWidth: 10,
                        itemMarginTop: 8,
                        itemMarginBottom: 4,
                        padding: 0,
                      },
                      title: { text: null },
                    }}
                    ref={categoryChartRef}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-pie text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-sm text-gray-500">No category data available</p>
                </div>
              )
            ) : (
              highchartsLoaded && impactChartOptions ? (
                <div className="animate__animated animate__fadeIn">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={{
                      ...impactChartOptions,
                      chart: {
                        ...impactChartOptions.chart,
                        height: 250,
                      },
                      xAxis: {
                        ...impactChartOptions.xAxis,
                        labels: {
                          ...impactChartOptions.xAxis?.labels,
                          style: { fontSize: '10px', color: '#6b7280' },
                        },
                      },
                      yAxis: {
                        ...impactChartOptions.yAxis,
                        labels: {
                          ...impactChartOptions.yAxis?.labels,
                          style: { fontSize: '10px', color: '#6b7280' },
                        },
                      },
                    }}
                    ref={impactChartRef}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-sm text-gray-500">No impact data available</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile Related Transactions */}
        {relatedTransactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-3 mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-list text-indigo-500 text-[10px]"></i>
                Related Transactions
                <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {relatedTransactions.length}
                </span>
              </h6>
            </div>
            <div className="divide-y divide-gray-100">
              {relatedTransactions.slice(0, 3).map((tx) => (
                <Link
                  key={tx.id}
                  to={`/transactions/${tx.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}>
                      <i className={`fas fa-${tx.type === 'income' ? 'arrow-up' : 'arrow-down'} text-xs ${
                        tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                      }`}></i>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-800">{formatCurrency(tx.amount)}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-gray-400 text-[10px]"></i>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Transaction Info */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-4">
          <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mb-1">Transaction ID</p>
          <p className="text-[10px] text-gray-600 font-mono truncate">{transaction.id}</p>
        </div>
      </div>

      {/* Desktop Page Heading */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-4 animate__animated animate__fadeInDown">
        <h1 className="h3 mb-0 text-gray-800">Transaction Details</h1>
        <div className="d-flex">
          <button onClick={openDeleteModal} className="btn btn-primary btn-sm shadow-sm mr-2" style={{ backgroundColor: "#e74a3b", borderColor: "#e74a3b" }}>
            <i className="fas fa-trash fa-sm mr-2"></i> Delete Transaction
          </button>
          <Link to={`/transactions/${id}/edit`} className="btn btn-primary btn-sm mr-2 shadow-sm">
            <i className="fas fa-edit fa-sm" style={{ marginLeft: '0.125rem', marginRight: '0.5rem' }}></i> Edit Transaction
          </Link>
          <Link to="/transactions" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Transactions
          </Link>
        </div>
      </div>

      {/* Desktop Transaction Overview Row */}
      <div className="row d-none d-md-flex">
        {/* Transaction Amount Card */}
        <div className="col-xl-4 col-md-6 col-6 mb-3 mb-md-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className={`card border-left-${colorClass} shadow h-100 py-2`}>
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className={`text-xs font-weight-bold text-${colorClass} text-uppercase mb-1 d-flex align-items-center`} style={{ fontSize: '0.6rem' }}>
                    <span className="d-none d-md-inline">{transaction.type === "income" ? "Income" : transaction.type === "contribution" ? "Contribution" : "Expense"} Amount</span>
                    <span className="d-inline d-md-none">Amt</span>
                    <div className="ml-2 position-relative d-none d-md-block">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('amountInfo', e)}
                        aria-label="Amount information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
                <div className="col-auto d-none d-md-block">
                  <i className={`fas fa-${iconClass} fa-2x text-gray-300`}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Card */}
        <div className="col-xl-4 col-md-6 col-6 mb-3 mb-md-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center" style={{ fontSize: '0.6rem' }}>
                    <span className="d-none d-md-inline">Category</span>
                    <span className="d-inline d-md-none">Cat</span>
                    <div className="ml-2 position-relative d-none d-md-block">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('categoryInfo', e)}
                        aria-label="Category information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                    {category || transaction.type === 'contribution' ? (
                      <span className="d-none d-md-inline">{displayCategory}</span>
                    ) : (
                      <span className="text-warning">
                        <i className="fas fa-exclamation-triangle mr-1 d-none d-md-inline"></i>
                        <span className="d-none d-md-inline">Uncategorized</span>
                        <span className="d-inline d-md-none">Uncat.</span>
                      </span>
                    )}
                    <span className="d-inline d-md-none">{displayCategory.length > 12 ? displayCategory.substring(0, 12) + '...' : displayCategory}</span>
                  </div>
                </div>
                <div className="col-auto d-none d-md-block">
                  <i className="fas fa-tag fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Card */}
        <div className="col-xl-4 col-md-6 col-12 mb-3 mb-md-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body p-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center" style={{ fontSize: '0.6rem' }}>
                    <span className="d-none d-md-inline">Account</span>
                    <span className="d-inline d-md-none">Acct</span>
                    <div className="ml-2 position-relative d-none d-md-block">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('accountInfo', e)}
                        aria-label="Account information"
                      ></i>
                    </div>
                  </div>
                  <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                    <span className="d-none d-md-inline">{account ? account.account_name : "Unknown Account"}</span>
                    <span className="d-inline d-md-none">{account ? (account.account_name.length > 15 ? account.account_name.substring(0, 15) + '...' : account.account_name) : "Unknown"}</span>
                    {account && (
                      <Link 
                        to={`/accounts/${account.id}`} 
                        className="btn btn-sm btn-outline-primary ml-2 d-none d-md-inline-block" 
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                      >
                        <i className="fas fa-external-link-alt" style={{ fontSize: '0.6rem' }}></i>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="col-auto d-none d-md-block">
                  <i className="fas fa-wallet fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row d-none d-md-flex">
        {/* Transaction Details Card */}
        <div className="col-lg-8 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card shadow">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                <span className="d-none d-md-inline">Transaction Details</span>
                <span className="d-inline d-md-none">Details</span>
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('transactionDetails', e)}
                    aria-label="Transaction details information"
                  ></i>
                </div>
              </h6>
              <div className={`badge ${transaction.type === 'contribution' ? 'badge-info' : `badge-${colorClass}`}`} style={{ fontSize: '0.6rem' }}>{transaction.type}</div>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="mb-2">
                  <h4 className="small font-weight-bold" style={{ fontSize: '0.7rem' }}>Description</h4>
                  <div className="p-3 bg-light rounded">
                    {transaction.description && transaction.description.trim() ? (
                      <p className="mb-0 text-gray-700" style={{ fontSize: '0.75rem' }}>{transaction.description}</p>
                    ) : (
                      <p className="mb-0 text-muted font-italic" style={{ fontSize: '0.7rem' }}>No description provided</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6">
                  <h4 className="small font-weight-bold" style={{ fontSize: '0.7rem' }}>Transaction Date</h4>
                  <div className="d-flex align-items-center">
                    <div className="p-2 rounded mr-2" style={{ backgroundColor: "rgba(78, 115, 223, 0.15)" }}>
                      <i className="fas fa-calendar text-primary" style={{ fontSize: '0.75rem' }}></i>
                    </div>
                    <span className="text-gray-800" style={{ fontSize: '0.75rem' }}>{formatDate(transaction.date)}</span>
                  </div>
                </div>
                {transaction.created_at && (
                  <div className="col-md-6">
                    <h4 className="small font-weight-bold" style={{ fontSize: '0.7rem' }}>Created At</h4>
                    <div className="d-flex align-items-center">
                      <div className="p-2 rounded mr-2" style={{ backgroundColor: "rgba(246, 194, 62, 0.15)" }}>
                        <i className="fas fa-clock text-warning" style={{ fontSize: '0.75rem' }}></i>
                      </div>
                      <span className="text-gray-800" style={{ fontSize: '0.75rem' }}>{formatDate(transaction.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Goal Section */}
              {goal && (
                <div className="mb-4">
                  <h4 className="small font-weight-bold" style={{ fontSize: '0.7rem' }}>Related Goal</h4>
                  <div className="d-flex align-items-center">
                    <div className="p-2 rounded mr-2" style={{ backgroundColor: "rgba(28, 200, 138, 0.15)" }}>
                      <i className="fas fa-bullseye text-success" style={{ fontSize: '0.75rem' }}></i>
                    </div>
                    <div>
                      <span className="text-gray-800" style={{ fontSize: '0.75rem' }}>
                        This transaction contributes to <strong>{goal.goal_name}</strong>
                      </span>
                      <div className="small text-gray-600 mt-1" style={{ fontSize: '0.65rem' }}>
                        Progress: {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)} 
                        ({((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%)
                      </div>
                      <div className="mt-2">
                        <Link
                          to={`/goals/${transaction.goal_id}`}
                          className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
                        >
                          <i className="fas fa-eye mr-1" style={{ fontSize: '0.6rem' }}></i>
                          <span className="d-none d-md-inline">View Goal Details</span>
                          <span className="d-inline d-md-none">View Goal</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Impact Visualization */}
              <div className="mt-4 impact-analysis-section">
                <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                  <span className="d-none d-md-inline">Transaction Impact Analysis</span>
                  <span className="d-inline d-md-none">Impact</span>
                  <div className="ml-2 position-relative d-none d-md-block">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('impactAnalysis', e)}
                      aria-label="Impact analysis information"
                    ></i>
                  </div>
                </h6>
                <p className="small text-gray-600 mb-3 d-none d-md-block" style={{ fontSize: '0.65rem' }}>
                  How this {transaction.type === 'income' ? 'income' : transaction.type === 'contribution' ? 'contribution' : 'expense'} compares to other transactions in the same category
                </p>
                {highchartsLoaded && impactChartOptions && (
                  <div className="chart-area">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={impactChartOptions}
                      ref={impactChartRef}
                    />
                  </div>
                )}

              </div>

              {/* Related Transactions Section */}
              {relatedTransactions.length > 0 && (
                <div className="mt-4">
                  <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center">
                    <span className="d-none d-md-inline">Related Transactions</span>
                    <span className="d-inline d-md-none">Related</span>
                    <div className="ml-2 position-relative d-none d-md-block">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('relatedTransactions', e)}
                        aria-label="Related transactions information"
                      ></i>
                    </div>
                  </h6>
                  <div className="table-responsive related-transactions-table">
                    <table className="table table-bordered table-hover" id="dataTable" width="100%" cellSpacing="0">
                      <thead className="bg-light">
                        <tr>
                          <th className="d-none d-md-table-cell">Date</th>
                          <th>Amount</th>
                          <th className="d-none d-lg-table-cell">Description</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="d-none d-md-table-cell">{formatDate(tx.date)}</td>
                            <td className={tx.type === 'income' ? 'text-success' : 'text-danger'}>
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="d-none d-lg-table-cell">
                              {tx.description && tx.description.trim() ? (
                                tx.description
                              ) : (
                                <span className="text-muted font-italic">No description</span>
                              )}
                            </td>
                            <td>
                              <Link 
                                to={`/transactions/${tx.id}`} 
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
                              >
                                <i className="fas fa-eye fa-sm" style={{ fontSize: '0.65rem' }}></i>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Analysis Card */}
        <div className="col-lg-4 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
          {/* Category Distribution Chart */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Category Breakdown
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('categoryBreakdown', e)}
                    aria-label="Category breakdown information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {highchartsLoaded && categoryChartOptions ? (
                <div className="chart-pie">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={categoryChartOptions}
                    ref={categoryChartRef}
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                  </div>
                  <p className="text-gray-600 mb-0">No category data available</p>
                </div>
              )}

            </div>
          </div>

          {/* Transaction ID Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Transaction Info
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('transactionInfo', e)}
                    aria-label="Transaction info information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <div className="p-3 bg-light rounded mb-3">
                <div className="small text-gray-500">Transaction ID</div>
                <div className="font-weight-bold">{transaction.id}</div>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <div className={`bg-${colorClass} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                  <i className={`fas fa-${iconClass} text-${colorClass}`}></i>
                </div>
                <div>
                  <div className="small text-gray-500">Transaction Type</div>
                  <div className={`font-weight-bold ${transaction.type === 'contribution' ? 'text-info' : `text-${colorClass}`}`}>
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </div>
                </div>
              </div>
              
              <Link 
                to={`/transactions/${id}/edit`} 
                className="btn btn-primary btn-block"
                style={{ fontSize: '0.65rem', padding: '0.25rem 0.4rem' }}
              >
                <i className="fas fa-edit mr-1" style={{ fontSize: '0.65rem' }}></i>
                <span className="d-none d-md-inline">Edit Transaction</span>
                <span className="d-inline d-md-none">Edit</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global tooltip that appears based on activeTip state */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            position: 'absolute',
            zIndex: 1000,
            maxWidth: '300px',
            padding: '15px',
            background: 'white',
            borderRadius: '5px',
            boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)',
            transform: 'translateX(-50%)'
          }}
        >
          {activeTip === 'amountInfo' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Transaction Amount</div>
              <p className="tip-description mb-0">
                The monetary value of this {transaction.type}. For expenses, this represents money spent. For income, this represents money received.
              </p>
            </>
          )}
          {activeTip === 'categoryInfo' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Transaction Category</div>
              <p className="tip-description mb-0">
                Categories help organize your transactions for better budgeting and reporting. They allow you to track spending patterns across specific areas.
              </p>
            </>
          )}
          {activeTip === 'accountInfo' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Account Information</div>
              <p className="tip-description mb-0">
                The financial account associated with this transaction. This could be a checking account, credit card, savings account, or any other account you've set up.
              </p>
            </>
          )}
          {activeTip === 'impactAnalysis' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Transaction Impact Analysis</div>
              <p className="tip-description mb-0">
                This chart compares your transaction to the average and highest amounts in the same category. It helps you understand how this transaction fits into your overall spending or income pattern for this category.
              </p>
            </>
          )}
          {activeTip === 'categoryBreakdown' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Category Breakdown</div>
              <p className="tip-description mb-0">
                This visualization shows how this transaction compares to all other transactions in the same category. The highlighted slice represents this specific transaction, while the remaining slice shows all other transactions combined.
              </p>
            </>
          )}
          {activeTip === 'transactionInfo' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Transaction Information</div>
              <p className="tip-description mb-0">
                Technical details about this transaction including its unique ID and type. This information is useful for reference purposes and tracking the transaction in your financial records.
              </p>
            </>
          )}
          {activeTip === 'relatedTransactions' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Related Transactions</div>
              <p className="tip-description mb-0">
                Other transactions that share the same category as this one. Viewing related transactions helps identify patterns in your spending or income for this particular category.
              </p>
            </>
          )}
          {activeTip === 'transactionDetails' && (
            <>
              <div className="tip-title font-weight-bold mb-2">Transaction Details</div>
              <p className="tip-description mb-0">
                This section provides comprehensive information about this transaction, including description, dates, and related goal information. You can see when the transaction was created and its purpose.
              </p>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-dialog modal-dialog-centered" style={{
            maxWidth: '450px',
            margin: '1.75rem',
            position: 'relative',
            width: 'auto',
            pointerEvents: 'none',
            zIndex: 1060
          }}>
            <div className="modal-content" style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fff',
              borderRadius: '0.5rem',
              pointerEvents: 'auto',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
            }}>
              <div className="modal-header border-0 pt-4 px-4 pb-0">
                <h3 className="modal-title w-100 text-center" style={{ color: '#4e73df', fontWeight: 600 }}>Confirm Deletion</h3>
                <button 
                  type="button" 
                  className="close" 
                  onClick={closeDeleteModal} 
                  style={{ 
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#999',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer' 
                  }}
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body text-center p-4">
                <div className="mb-4">
                  <div className="warning-icon" style={{
                    backgroundColor: '#FFEFD5',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#FFA500' }}></i>
                  </div>
                </div>
                <p style={{ fontSize: '1rem', color: '#555' }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 pb-4 pt-0 justify-content-center">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: 'transparent',
                    color: '#4e73df',
                    border: '1px solid #4e73df',
                    borderRadius: '30px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    marginRight: '1rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#e74a3b',
                    borderColor: '#e74a3b',
                    borderRadius: '30px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#d52a1a';
                    e.currentTarget.style.borderColor = '#d52a1a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#e74a3b';
                    e.currentTarget.style.borderColor = '#e74a3b';
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetails;
