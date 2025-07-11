import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface Goal {
  id: string;
  goal_name: string;
}

interface UserData {
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
}

interface Transaction {
  id: string;
  type: "income" | "expense";
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
  type: "income" | "expense";
  account_id: string;
  category_id: string;
  goal_id: string;
  amount: string;
  date: string;
  notes: string;
}

const EditTransaction: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
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

  const [transaction, setTransaction] = useState<TransactionFormData>({
    type: "expense",
    account_id: "",
    category_id: "",
    goal_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
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
        
        // Fetch transaction details
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
          
        if (transactionError) throw transactionError;
        
        if (!transactionData) {
          showErrorToast("Transaction not found");
          navigate("/transactions");
          return;
        }
        
        // Verify the user has permission to edit this transaction
        if (transactionData.user_id !== user.id) {
          showErrorToast("You don't have permission to edit this transaction");
          navigate('/transactions');
          return;
        }
        
        setOriginalTransaction(transactionData);

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
          .select('id, goal_name')
          .eq('user_id', user.id)
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
          amount: transactionData.amount.toString(),
          date: new Date(transactionData.date).toISOString().slice(0, 10),
          notes: transactionData.notes
        });
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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    
    // Special handling for transaction type changes
    if (name === 'type') {
      // When changing transaction type, reset the category selection
      setTransaction((prev) => ({
        ...prev,
        [name]: value as "income" | "expense",
        category_id: '', // Clear category selection when changing transaction type
      }));
    } else {
      setTransaction((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validation
    if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
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

    if (!transaction.category_id) {
      showErrorToast("Please select a category");
      return;
    }
    
    // Additional validation to ensure the category matches the transaction type
    const isIncome = transaction.type === 'income';
    const categoryExists = isIncome 
      ? userData.incomeCategories.some(cat => cat.id === transaction.category_id)
      : userData.expenseCategories.some(cat => cat.id === transaction.category_id);
    
    if (!categoryExists) {
      showErrorToast(`Selected category does not match transaction type. Please select a ${isIncome ? 'income' : 'expense'} category.`);
      return;
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
      const amount = parseFloat(transaction.amount);
      
      // Validate that the category matches the transaction type
      if (transaction.category_id && transaction.type) {
        const isIncome = transaction.type === 'income';
        const categoryExists = isIncome 
          ? userData.incomeCategories.some(cat => cat.id === transaction.category_id)
          : userData.expenseCategories.some(cat => cat.id === transaction.category_id);
        
        if (!categoryExists) {
          throw new Error(`Selected category does not match transaction type. Please select a ${isIncome ? 'income' : 'expense'} category.`);
        }
      }
      
      // Calculate the changes in account balance and goal progress
      const originalAmount = originalTransaction.amount;
      const originalType = originalTransaction.type;
      const originalAccountId = originalTransaction.account_id;
      const originalGoalId = originalTransaction.goal_id;
      
      // Calculate account balance adjustments
      let accountBalanceChange = 0;
      
      // Undo the effect of the original transaction on the account
      if (originalType === 'income') {
        accountBalanceChange -= originalAmount;
      } else {
        accountBalanceChange += originalAmount;
      }
      
      // Apply the effect of the updated transaction on the account
      if (transaction.type === 'income') {
        accountBalanceChange += amount;
      } else {
        accountBalanceChange -= amount;
      }
      
      // Update the transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          type: transaction.type,
          account_id: transaction.account_id,
          category_id: transaction.category_id || null,
          goal_id: transaction.goal_id || null,
          amount: amount,
          date: transaction.date,
          notes: transaction.notes
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Update account balance
      if (accountBalanceChange !== 0) {
        const { error: accountError } = await supabase.rpc('update_account_balance', { 
          p_account_id: transaction.account_id,
          p_amount_change: accountBalanceChange
        });
        
        if (accountError) {
          // If RPC fails, fall back to direct update
          const { data: accountData, error: fetchError } = await supabase
            .from('accounts')
            .select('balance')
            .eq('id', transaction.account_id)
            .single();
            
          if (fetchError) throw fetchError;
          
          const newBalance = accountData.balance + accountBalanceChange;
          
          const { error: updateError } = await supabase
            .from('accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.account_id);
            
          if (updateError) throw updateError;
        }
      }
      
      // Handle goal progress updates
      if (originalGoalId !== transaction.goal_id || amount !== originalAmount || transaction.type !== originalType) {
        // If the goal has changed or the amount has changed, update both goals
        
        // Remove from original goal if there was one
        if (originalGoalId) {
          const { error: originalGoalError } = await supabase.rpc('update_goal_progress', {
            p_goal_id: originalGoalId,
            p_amount: -originalAmount
          });
          
          if (originalGoalError) {
            // Fall back to direct update
            const { data: goalData, error: fetchGoalError } = await supabase
              .from('goals')
              .select('current_amount, target_amount')
              .eq('id', originalGoalId)
              .single();
              
            if (fetchGoalError) throw fetchGoalError;
              
            const newAmount = Math.max(0, goalData.current_amount - originalAmount);
            const status = newAmount >= goalData.target_amount ? 'completed' : 'in_progress';
              
            const { error: updateGoalError } = await supabase
              .from('goals')
              .update({ 
                current_amount: newAmount,
                status: status
              })
              .eq('id', originalGoalId);
              
            if (updateGoalError) throw updateGoalError;
          }
        }
        
        // Add to new goal if there is one
        if (transaction.goal_id) {
          const { error: newGoalError } = await supabase.rpc('update_goal_progress', {
            p_goal_id: transaction.goal_id,
            p_amount: amount
          });
          
          if (newGoalError) {
            // Fall back to direct update
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
                <span className={`badge mr-2 ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                  {transaction.type === 'income' ? 'Income' : 'Expense'}
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
                              ${parseFloat(transaction.amount).toFixed(2)}
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
                  <div className="card bg-primary text-white shadow mb-4">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                            Associated Goal
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-white">
                            {selectedGoal.goal_name}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-flag fa-2x text-white-50"></i>
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
                    <p className="mb-0">{transaction.notes}</p>
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
                    <div className="col-md-6 mb-3 mb-md-0">
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
                    <div className="col-md-6">
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
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="amount" className="font-weight-bold text-gray-800">
                        Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          id="amount"
                          name="amount"
                          value={transaction.amount}
                          onChange={handleChange}
                          className="form-control form-control-user"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <small className="form-text text-muted">
                        Enter the transaction amount
                      </small>
                    </div>
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
                    <div className="form-group">
                      <label htmlFor="account_id" className="font-weight-bold text-gray-800">
                        Account <span className="text-danger">*</span>
                      </label>
                      <select
                        id="account_id"
                        name="account_id"
                        value={transaction.account_id}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select Account</option>
                        {userData.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="category_id" className="font-weight-bold text-gray-800">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        id="category_id"
                        name="category_id"
                        value={transaction.category_id}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select Category</option>
                        {transaction.type === "income"
                          ? userData.incomeCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.category_name}
                              </option>
                            ))
                          : userData.expenseCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.category_name}
                              </option>
                            ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="goal_id" className="font-weight-bold text-gray-800">
                    Goal (Optional)
                  </label>
                  <select
                    id="goal_id"
                    name="goal_id"
                    value={transaction.goal_id}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="">No Goal</option>
                    {userData.goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.goal_name}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    Is this transaction related to one of your financial goals?
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="font-weight-bold text-gray-800">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={transaction.notes}
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
    </div>
  );
};

export default EditTransaction; 