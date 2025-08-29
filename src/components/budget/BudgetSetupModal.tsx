import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useCallback, memo, useRef } from "react";
import { formatCurrency } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import component styles
import "./BudgetSetupModal.css";

interface ExpenseCategory {
  id: string;
  category_name: string;
}

interface BudgetFormData {
  category_id: string;
  amount: string;
  period: string;
  startDate: string;
}

interface BudgetSetupModalProps {
  show: boolean;
  onClose: () => void;
  onSkip: () => void;
  onBudgetCreated: () => void;
}

const BudgetSetupModal: FC<BudgetSetupModalProps> = ({
  show,
  onClose,
  onSkip,
  onBudgetCreated
}) => {
  // Don't render if modal is not shown - must be before any hooks
  if (!show) {
    return null;
  }

  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const fetchingRef = useRef<boolean>(false); // Prevent duplicate API calls

  const [budget, setBudget] = useState<BudgetFormData>({
    category_id: "",
    amount: "",
    period: "month", // month, quarter, year
    startDate: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const [viewMode, setViewMode] = useState<"form" | "review">("form");

  useEffect(() => {
    // Reset state when modal is closed
    if (!show) {
      setViewMode("form");
      setActiveTip(null);
      setTooltipPosition(null);
      setError(null);
      fetchingRef.current = false; // Reset fetch guard
      setBudget({
        category_id: "",
        amount: "",
        period: "month",
        startDate: new Date().toISOString().slice(0, 7),
      });
      return;
    }

    // Only fetch if modal is shown and we don't already have categories and not currently fetching
    if (expenseCategories.length > 0 || fetchingRef.current) {
      setLoading(false);
      return;
    }

    // Fetch expense categories from Supabase
    const fetchCategories = async () => {
      if (fetchingRef.current) return; // Prevent duplicate calls
      
      try {
        fetchingRef.current = true; // Set fetch guard
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to create a budget");
          onClose();
          return;
        }
        
        // Fetch expense categories from the database
        const { data, error } = await supabase
          .from('expense_categories')
          .select('id, category_name')
          .eq('user_id', user.id)
          .order('category_name', { ascending: true });
          
        if (error) {
          throw new Error(error.message);
        }
        
        setExpenseCategories(data || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        showErrorToast(`Failed to load categories: ${(err as Error).message}`);
        setError((err as Error).message);
      } finally {
        setLoading(false);
        fetchingRef.current = false; // Reset fetch guard
      }
    };

    fetchCategories();
  }, [show, user?.id]); // Further simplified dependencies

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setBudget((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const getEndDate = useCallback((): string => {
    const [year, month] = budget.startDate.split("-").map(Number);

    if (budget.period === "month") {
      return new Date(year, month, 0).toISOString().slice(0, 10); // Last day of month
    } else if (budget.period === "quarter") {
      return new Date(year, month + 2, 0).toISOString().slice(0, 10); // Last day of quarter
    } else {
      return new Date(year, month + 11, 0).toISOString().slice(0, 10); // Last day of year
    }
  }, [budget.startDate, budget.period]);

  const handleReview = useCallback((e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validate
    if (!budget.category_id) {
      showErrorToast("Please select a category");
      return;
    }

    if (!budget.amount || parseFloat(budget.amount) <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }

    setViewMode("review");
  }, [budget.category_id, budget.amount, showErrorToast]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!user) {
      showErrorToast("Unable to create budget. Please log in.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get start and end dates based on period
      const startDate = new Date(budget.startDate + "-01")
        .toISOString()
        .slice(0, 10);
      const endDate = getEndDate();
      
      // Prepare budget data for insertion
      const budgetData = {
        category_id: budget.category_id,
        amount: parseFloat(budget.amount),
        period: budget.period,
        start_date: startDate,
        end_date: endDate,
        user_id: user.id,
        spent: 0, // Initial spent is zero
      };

      // Insert budget into Supabase
      const { data, error } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Success! Show toast and trigger callback
      showSuccessToast("Budget created successfully!");
      onBudgetCreated();
    } catch (err) {
      console.error("Error creating budget:", err);
      showErrorToast(`Failed to create budget: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, budget, getEndDate, showSuccessToast, showErrorToast, onBudgetCreated]);
  
  const toggleTip = useCallback((tipId: string, event?: React.MouseEvent) => {
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
  }, [activeTip]);
  
  // Tooltip contents
  const tooltipContent = {
    'budget-details': {
      title: 'Budget Details',
      description: 'Set up your budget by selecting a category, amount, and time period. This helps you track spending against your goals.'
    },
    'budget-tips': {
      title: 'Budgeting Tips',
      description: 'Follow proven budgeting strategies to manage your finances effectively and reach your financial goals.'
    }
  };

  const findCategory = (categoryId: string): ExpenseCategory | undefined => {
    return expenseCategories.find((c) => c.id.toString() === categoryId);
  };

  if (loading) {
    return (
      <div className="budget-setup-modal-overlay">
        <div className="budget-setup-modal-container">
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-3 text-gray-700">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    const selectedCategory = expenseCategories.find(
      category => category.id === budget.category_id
    );
    
    return (
      <div className="budget-setup-modal-overlay animate__animated animate__fadeIn">
        <div className="budget-setup-modal-container animate__animated animate__slideInUp">
          {/* Page Heading */}
          <div className="d-sm-flex align-items-center justify-content-between mb-4 p-4 pb-0">
            <h1 className="h3 mb-0 text-gray-800">Review Budget</h1>
            <button 
              onClick={onClose}
              className="btn btn-sm btn-secondary shadow-sm"
            >
              <i className="fas fa-times fa-sm mr-2"></i> Cancel
            </button>
          </div>

          <div className="row p-4">
            <div className="col-lg-8 mx-auto">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex align-items-center">
                  <span className="badge badge-primary mr-2">
                    Budget
                  </span>
                  <h6 className="m-0 font-weight-bold text-primary">Budget Details</h6>
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
                                {formatCurrency(parseFloat(budget.amount))}
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
                                Period
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800">
                                {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
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
                                Category
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800">
                                {selectedCategory?.category_name || 'N/A'}
                              </div>
                            </div>
                            <div className="col-auto">
                              <i className="fas fa-tag fa-2x text-gray-300"></i>
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
                                Start Date
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800">
                                {new Date(budget.startDate + "-01").toLocaleDateString()}
                              </div>
                            </div>
                            <div className="col-auto">
                              <i className="fas fa-calendar-day fa-2x text-gray-300"></i>
                            </div>
                          </div>
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
                      <span className="text">{isSubmitting ? "Creating..." : "Create Budget"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-setup-modal-overlay animate__animated animate__fadeIn">
      <div className="budget-setup-modal-container animate__animated animate__slideInUp">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4 p-4 pb-0">
          <h1 className="h3 mb-0 text-gray-800">Create Budget</h1>
          <button 
            onClick={onSkip}
            className="btn btn-sm btn-secondary shadow-sm"
          >
            <i className="fas fa-times fa-sm mr-2"></i> Skip for now
          </button>
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

        <div className="row p-4">
          {/* Budget Form */}
          <div className="col-lg-8">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  Budget Details
                  <i 
                    className="fas fa-info-circle ml-1 text-gray-400"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => toggleTip('budget-details', e)}
                  ></i>
                </h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleReview}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="category_id" className="font-weight-bold text-gray-800">
                          Category <span className="text-danger">*</span>
                        </label>
                        <select
                          id="category_id"
                          name="category_id"
                          value={budget.category_id}
                          onChange={handleChange}
                          className="form-control"
                          required
                        >
                          <option value="">Select Category</option>
                          {expenseCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

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
                            value={budget.amount}
                            onChange={handleChange}
                            className="form-control form-control-user"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            required
                          />
                        </div>
                        <small className="form-text text-muted">
                          Enter your budget amount
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="period" className="font-weight-bold text-gray-800">
                          Period <span className="text-danger">*</span>
                        </label>
                        <select
                          id="period"
                          name="period"
                          value={budget.period}
                          onChange={handleChange}
                          className="form-control"
                          required
                        >
                          <option value="month">Monthly</option>
                          <option value="quarter">Quarterly</option>
                          <option value="year">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="startDate" className="font-weight-bold text-gray-800">
                          Start Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="month"
                          id="startDate"
                          name="startDate"
                          value={budget.startDate}
                          onChange={handleChange}
                          className="form-control form-control-user"
                          required
                        />
                        <small className="form-text text-muted">
                          When does this budget start?
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary btn-user btn-block"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-arrow-right mr-2"></i>
                          Continue to Review
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Budget Tips */}
          <div className="col-lg-4">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  Budgeting Tips
                  <i 
                    className="fas fa-info-circle ml-1 text-gray-400"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => toggleTip('budget-tips', e)}
                  ></i>
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-circle bg-primary text-white mr-3">
                      <i className="fas fa-chart-pie"></i>
                    </div>
                    <div>
                      <div className="font-weight-bold text-gray-800">50/30/20 Rule</div>
                      <div className="text-muted small">Allocate 50% for needs, 30% for wants, and 20% for savings</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-circle bg-success text-white mr-3">
                      <i className="fas fa-bullseye"></i>
                    </div>
                    <div>
                      <div className="font-weight-bold text-gray-800">Zero-Based Budget</div>
                      <div className="text-muted small">Assign every dollar a purpose</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-circle bg-primary text-white mr-3">
                      <i className="fas fa-balance-scale"></i>
                    </div>
                    <div>
                      <div className="font-weight-bold text-gray-800">Be Realistic</div>
                      <div className="text-muted small">Set achievable budget goals based on your spending history</div>
                    </div>
                  </div>
                </div>

                <div className="mb-0">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-circle bg-warning text-white mr-3">
                      <i className="fas fa-sync-alt"></i>
                    </div>
                    <div>
                      <div className="font-weight-bold text-gray-800">Adjust As Needed</div>
                      <div className="text-muted small">Review and update your budget regularly</div>
                    </div>
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

export default memo(BudgetSetupModal);