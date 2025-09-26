import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { formatCurrency, getMonthDates } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { BudgetFormData } from "./types";
import { BudgetAmountInput } from "../common/CentavoInput";
import { formatCurrency as formatCurrencyNew, sanitizeBudgetName, roundToCentavo } from "../../utils/currencyUtils";
import { BudgetNotificationService } from "../../services/database/budgetNotificationService";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface ExpenseCategory {
  id: string;
  category_name: string;
}

// Helper function to get next month in YYYY-MM format using local time
const getNextMonthString = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const CreateBudget: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const [budget, setBudget] = useState<BudgetFormData>({
    budget_name: "",
    category_id: "",
    amount: 0, // Changed to number for centavo precision
    period: "month", // month, quarter, year
    startDate: getNextMonthString(), // YYYY-MM
  });

  const [viewMode, setViewMode] = useState<"form" | "review">("form");

  useEffect(() => {
    // Fetch expense categories from Supabase
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to create a budget");
          navigate("/login");
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
      }
    };

    fetchCategories();
  }, [user, navigate, showErrorToast]);

  const handleAmountChange = (newAmount: number) => {
    setBudget(prev => ({
      ...prev,
      amount: newAmount
    }));
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Handle category selection specifically
    if (name === 'category_id') {
      const selectedCategory = expenseCategories.find(cat => cat.id === value);
      setBudget((prev) => ({
        ...prev,
        category_id: value,
        // Update category_name for consistency
        category_name: selectedCategory?.category_name || ''
      }));
    } else {
      setBudget((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const getEndDate = (): string => {
    const [year, month] = budget.startDate.split("-").map(Number);

    if (budget.period === "month") {
      return new Date(year, month, 0).toISOString().slice(0, 10); // Last day of month
    } else if (budget.period === "quarter") {
      return new Date(year, month + 2, 0).toISOString().slice(0, 10); // Last day of quarter
    } else {
      return new Date(year, month + 11, 0).toISOString().slice(0, 10); // Last day of year
    }
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validate
    if (!budget.budget_name.trim()) {
      showErrorToast("Please enter a budget name");
      return;
    }

    // Validate budget name for format string safety
    const sanitizedName = sanitizeBudgetName(budget.budget_name);
    if (sanitizedName !== budget.budget_name.trim()) {
      const proceed = window.confirm(
        `Budget name contains special characters that will be cleaned up. Original: "${budget.budget_name.trim()}" will become "${sanitizedName}". Continue?`
      );
      if (!proceed) {
        return;
      }
      setBudget(prev => ({ ...prev, budget_name: sanitizedName }));
    }

    if (!budget.category_id) {
      showErrorToast("Please select a category");
      return;
    }

    // Validate category exists in loaded categories
    const selectedCategory = expenseCategories.find(cat => cat.id === budget.category_id);
    if (!selectedCategory) {
      showErrorToast("Selected category is invalid. Please select a valid category.");
      return;
    }

    if (!budget.amount || budget.amount <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
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
        budget_name: sanitizeBudgetName(budget.budget_name.trim()), // Sanitize for format string safety
        category_id: budget.category_id,
        amount: roundToCentavo(budget.amount), // Ensure centavo precision
        period: budget.period,
        start_date: startDate,
        end_date: endDate,
        user_id: user.id,
        spent: 0, // Initial spent is zero
        currency: 'PHP', // Default currency
        alert_enabled: true, // Enable alerts by default
        alert_threshold: 0.8, // 80% threshold
        status: 'active' // Ensure budget is active
      };

      // Insert budget into Supabase
      const { data, error } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();
        
      if (error) {
        // Handle specific database errors
        if (error.code === '23503') {
          throw new Error('Invalid category selected. Please choose a valid category.');
        } else if (error.code === '23505') {
          throw new Error('A budget with this name already exists. Please choose a different name.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }
      
      if (!data) {
        throw new Error('Budget creation failed - no data returned');
      }
      
      // Trigger budget creation notifications
      if (data) {
        try {
          await BudgetNotificationService.getInstance().checkBudgetThresholds(data.id);
        } catch (notificationError) {
          // Log notification error but don't fail the budget creation
        }
      }
      
      // Success! Show toast and redirect
      showSuccessToast("Budget created successfully!");
      navigate("/budgets");
    } catch (err) {
      console.error("Error creating budget:", err);
      showErrorToast(`Failed to create budget: ${(err as Error).message}`);
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
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading categories...</p>
        </div>
      </div>
    );
  }

  // Show error if categories failed to load
  if (error) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Loading Error</h4>
            <p>{error}</p>
            <hr />
            <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
              <i className="fas fa-refresh mr-2"></i>Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show warning if no categories available
  if (expenseCategories.length === 0) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="alert alert-warning" role="alert">
            <h4 className="alert-heading">No Categories Found</h4>
            <p>You need to create expense categories before you can create budgets.</p>
            <hr />
            <Link to="/categories" className="btn btn-warning">
              <i className="fas fa-plus mr-2"></i>Create Categories
            </Link>
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
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Budget</h1>
          <Link to="/budgets" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
          </Link>
        </div>

        <div className="row">
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
                              Budget Name
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {budget.budget_name || 'N/A'}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-file-alt fa-2x text-gray-300"></i>
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
                              Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrencyNew(budget.amount, 'PHP')}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-info shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
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
                  <div className="col-md-6">
                    <div className="card border-left-secondary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                              End Date
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {new Date(getEndDate()).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-calendar-check fa-2x text-gray-300"></i>
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
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Create Budget</h1>
        <Link to="/budgets" className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Budgets
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
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="budget_name" className="font-weight-bold text-gray-800">
                        Budget Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="budget_name"
                        name="budget_name"
                        value={budget.budget_name}
                        onChange={handleChange}
                        className="form-control form-control-user"
                        placeholder="Enter budget name (e.g., Monthly Food Budget)"
                        maxLength={100}
                        pattern="[^%.*]+"
                        title="Budget name cannot contain %, ., or * characters"
                        required
                      />
                      <small className="form-text text-muted">
                        Give your budget a descriptive name (avoid special characters like %, ., *)
                      </small>
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-4">
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

                  <div className="col-md-4">
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

                  <div className="col-md-4">
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

                <div className="row">
                  <div className="col-md-6 mx-auto">
                    <BudgetAmountInput
                      value={budget.amount}
                      onChange={handleAmountChange}
                      currency="PHP"
                      label="Amount"
                      placeholder="0.00"
                      required={true}
                      suggestedAmounts={[1000, 2500, 5000, 10000, 15000, 25000]}
                    />
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
  );
};

export default CreateBudget;
