import React, { useState, useEffect, FC, FormEvent, ChangeEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
} from "../../utils/helpers";
import { Goal as GoalType, Transaction, Account, GoalContributionResult } from "../../types";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface RouteParams {
  id: string;
}

const GoalContribution: FC = () => {
  const { id } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contribution, setContribution] = useState({
    amount: "",
    account_id: "",
    notes: `Contribution to goal`,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to make contributions");
          navigate("/login");
          return;
        }
        
        // Fetch goal details from Supabase
        let goalData: any = null;
        let goalError: any = null;
        
        try {
          // First try from goal_details view
          const result = await supabase
            .from('goal_details')
            .select('*')
            .eq('id', id)
            .single();
            
          goalData = result.data;
          goalError = result.error;
        } catch (err) {
          // Fall back to direct goals table
          console.log("Error with goal_details view, falling back to goals table");
          const result = await supabase
            .from('goals')
            .select('*')
            .eq('id', id)
            .single();
            
          goalData = result.data;
          goalError = result.error;
        }
        
        // If we have an error and no data, handle accordingly
        if (goalError && !goalData) {
          throw new Error(`Error fetching goal: ${goalError.message}`);
        }
        
        if (!goalData) {
          // Goal not found
          setLoading(false);
          return;
        }
        
        setGoal(goalData as unknown as GoalType);
        
        // Update notes with goal name
        setContribution(prev => ({
          ...prev,
          notes: goalData && goalData.goal_name ? `Contribution to ${goalData.goal_name}` : `Contribution to goal`,
        }));
        
        // Fetch user accounts from Supabase
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id);
          
        if (accountsError) {
          throw new Error(`Error fetching accounts: ${accountsError.message}`);
        }
        
        setAccounts(accountsData || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        showErrorToast(`Failed to load data: ${errorMessage}`);
        setError(errorMessage);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, user, navigate, showErrorToast]);
  
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setContribution(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    
    // Form validation
    if (!contribution.amount || parseFloat(contribution.amount) <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    
    if (!contribution.account_id) {
      setError("Please select an account");
      return;
    }
    
    // Check account balance
    const contributionAmount = parseFloat(contribution.amount);
    const selectedAccount = accounts.find(acc => acc.id.toString() === contribution.account_id);
    
    if (!selectedAccount) {
      setError("Selected account not found");
      return;
    }
    
    if (selectedAccount.balance < contributionAmount) {
      setError(`Insufficient funds in ${selectedAccount.account_name}. Available balance: ${formatCurrency(selectedAccount.balance)}`);
      return;
    }
    
    setViewMode("review");
    window.scrollTo(0, 0);
  };
  
  const handleSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      
      if (!user) {
        showErrorToast("You must be signed in to make contributions");
        setIsSubmitting(false);
        setViewMode("form");
        return;
      }
      
      if (!goal) {
        showErrorToast("Goal information is missing");
        setIsSubmitting(false);
        setViewMode("form");
        return;
      }
      
      const contributionAmount = parseFloat(contribution.amount);
      const selectedAccount = accounts.find(acc => acc.id.toString() === contribution.account_id);
      
      if (!selectedAccount) {
        showErrorToast("Selected account not found");
        setIsSubmitting(false);
        setViewMode("form");
        return;
      }
      
      // Check if account has sufficient funds
      if (selectedAccount.balance < contributionAmount) {
        showErrorToast("Insufficient funds in the selected account");
        setIsSubmitting(false);
        setViewMode("form");
        return;
      }
      
      // Start a Supabase transaction using RPC
      const { data: result, error: rpcError } = await supabase.rpc('contribute_to_goal', {
        p_goal_id: id,
        p_amount: contributionAmount,
        p_account_id: contribution.account_id,
        p_notes: contribution.notes,
        p_user_id: user.id
      });
      
      // If RPC fails or is not available, perform the operations manually
      if (rpcError) {
        console.warn("RPC failed, falling back to manual transaction:", rpcError.message);
        
        // Begin manual transaction process
        
        // 1. Create a new transaction record
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
            amount: contributionAmount,
            notes: contribution.notes,
            type: 'expense', // Expense from account perspective
            account_id: contribution.account_id,
            goal_id: id,
            user_id: user.id
          }])
          .select()
          .single();
          
        if (transactionError) {
          throw new Error(`Error creating transaction: ${transactionError.message}`);
        }
        
        // 2. Update account balance
        const newBalance = selectedAccount.balance - contributionAmount;
        const { error: accountError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', contribution.account_id);
          
        if (accountError) {
          throw new Error(`Error updating account balance: ${accountError.message}`);
        }
        
        // 3. Update goal progress
        const newAmount = goal.current_amount + contributionAmount;
        const goalStatus = newAmount >= goal.target_amount ? 'completed' : 'in_progress';
        
        const { error: goalError } = await supabase
          .from('goals')
          .update({ 
            current_amount: newAmount,
            status: goalStatus
          })
          .eq('id', id);
          
        if (goalError) {
          throw new Error(`Error updating goal progress: ${goalError.message}`);
        }
      }
      
      // Show success message
      showSuccessToast("Contribution made successfully!");
      
      // Redirect to goal details page after a short delay
      setTimeout(() => {
        navigate(`/goals/${id}`);
      }, 1000);
    } catch (err) {
      console.error("Error making contribution:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to make contribution: ${errorMessage}`);
      setError(errorMessage);
      setIsSubmitting(false);
      setViewMode("form");
    }
  };
  
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h4 className="text-gray-800 mt-3 mb-2">Loading goal details...</h4>
          <p className="text-gray-600">Please wait while we retrieve your goal information</p>
          <div className="progress mt-4" style={{ height: "10px", maxWidth: "300px", margin: "0 auto" }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 animate__animated animate__fadeIn">
          <div className="error-icon mb-4">
            <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Goal not found</h1>
          <p className="mb-4 text-gray-600">The goal you're looking for does not exist or has been deleted.</p>
          <div className="mb-4">
            <p className="text-gray-600">You can try one of the following:</p>
            <div className="d-flex flex-column flex-md-row justify-content-center mt-3">
              <Link to="/goals" className="btn btn-primary mb-2 mb-md-0 mr-md-3">
                <i className="fas fa-arrow-left mr-2"></i> View All Goals
              </Link>
              <Link to="/goals/create" className="btn btn-success">
                <i className="fas fa-plus-circle mr-2"></i> Create New Goal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const remainingAmount = goal.target_amount - goal.current_amount;
  const remainingDays = getRemainingDays(goal.target_date);
  
  if (viewMode === "review") {
    const selectedAccount = accounts.find(
      account => account.id.toString() === contribution.account_id
    );
    
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Contribution</h1>
          <div className="d-flex align-items-center">
            <span className="text-xs text-success mr-3">
              <i className="fas fa-sync text-xs mr-1"></i> Real-time updates enabled
            </span>
            <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
              <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
            </Link>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4">
              <div className="card-header py-3 d-flex align-items-center">
                <h6 className="m-0 font-weight-bold text-primary">Goal Contribution Details</h6>
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                              Contribution Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              ₱{parseFloat(contribution.amount).toFixed(2)}
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
                    <div className="card border-left-success shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                              From Account
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
                </div>
                
                <div className="card border-left-info shadow h-100 py-2 mb-4">
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                          Contributing To Goal
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {goal.goal_name} ({formatPercentage(progressPercentage)} complete)
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-flag fa-2x text-gray-300"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {contribution.notes && (
                  <div className="card bg-light mb-4">
                    <div className="card-body">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Notes
                      </div>
                      <p className="mb-0">{contribution.notes}</p>
                    </div>
                  </div>
                )}
                
                <div className="card border-left-warning shadow h-100 py-2 mb-4">
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                          New Goal Progress After Contribution
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(goal.current_amount + parseFloat(contribution.amount))} / {formatCurrency(goal.target_amount)}
                          {' '} ({formatPercentage(((goal.current_amount + parseFloat(contribution.amount)) / goal.target_amount) * 100)})
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                      </div>
                    </div>
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
                    <span className="text">{isSubmitting ? "Processing..." : "Confirm Contribution"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Make a Contribution</h1>
        <div className="d-flex align-items-center">
          <span className="text-xs text-success mr-3">
            <i className="fas fa-sync text-xs mr-1"></i> Real-time updates enabled
          </span>
          <Link to={`/goals/${id}`} className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goal Details
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Contribution Details</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleReview}>
                {error && (
                  <div className="alert alert-danger animate__animated animate__shakeX" role="alert">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                  </div>
                )}
                
                {/* Goal Card */}
                <div className="form-group mb-4">
                  <label className="font-weight-bold text-gray-800">
                    Contributing To Goal
                  </label>
                  <div className="card bg-light py-3 shadow-sm">
                    <div className="card-body p-3">
                      <div className="row align-items-center">
                        <div className="col-auto">
                          <i className="fas fa-flag fa-2x text-primary"></i>
                        </div>
                        <div className="col">
                          <h5 className="mb-0 font-weight-bold">{goal.goal_name}</h5>
                          <div className="text-xs text-gray-600 mt-1">
                            Current Progress: {formatPercentage(progressPercentage)} • 
                            {' '}{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                          </div>
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
                          value={contribution.amount}
                          onChange={handleChange}
                          className="form-control form-control-user"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <small className="form-text text-muted">
                        Enter the amount you want to contribute towards this goal
                      </small>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="account_id" className="font-weight-bold text-gray-800">
                        From Account <span className="text-danger">*</span>
                      </label>
                      <select
                        id="account_id"
                        name="account_id"
                        value={contribution.account_id}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id.toString()}>
                            {account.account_name} ({formatCurrency(account.balance)})
                          </option>
                        ))}
                      </select>
                      <small className="form-text text-muted">
                        Select the account to withdraw funds from
                      </small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="font-weight-bold text-gray-800">
                    Description
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={contribution.notes}
                    onChange={handleChange}
                    className="form-control"
                    rows={3}
                    placeholder="Add any notes about this contribution"
                  ></textarea>
                  <small className="form-text text-muted">
                    Briefly describe this contribution (optional)
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

        {/* Contribution Tips Card */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Goal Tips</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)" }}>
                    <i className="fas fa-piggy-bank text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Regular Contributions</p>
                </div>
                <p className="text-sm text-muted ml-5">Small regular contributions add up quickly</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)" }}>
                    <i className="fas fa-calendar-check text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Set Up Auto-Savings</p>
                </div>
                <p className="text-sm text-muted ml-5">Automate transfers to meet goal deadlines</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                    <i className="fas fa-bolt text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Bonus Contributions</p>
                </div>
                <p className="text-sm text-muted ml-5">Add windfalls or bonuses to accelerate progress</p>
              </div>
            </div>
          </div>
          
          {/* Mini Goal Summary Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Goal Summary</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Current Progress</div>
                <div className="mb-2">
                  <div className="progress">
                    <div
                      className={`progress-bar bg-${
                        progressPercentage >= 75 ? "success" : 
                        progressPercentage >= 40 ? "warning" : 
                        "danger"
                      }`}
                      role="progressbar"
                      style={{
                        width: `${progressPercentage > 100 ? 100 : progressPercentage}%`,
                      }}
                      aria-valuenow={progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-gray-500">
                      {formatCurrency(goal.current_amount)}
                    </small>
                    <small className="text-gray-500">
                      {formatCurrency(goal.target_amount)}
                    </small>
                  </div>
                </div>
                
                <div className="d-flex justify-content-between mt-3">
                  <div>
                    <div className="text-xs font-weight-bold text-gray-500">Remaining</div>
                    <div className="font-weight-bold">{formatCurrency(remainingAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-weight-bold text-gray-500">Target Date</div>
                    <div className="font-weight-bold">{formatDate(goal.target_date)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalContribution; 