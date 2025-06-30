import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { formatCurrency, getMonthDates } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface BudgetFormData {
  category_id: string;
  amount: string;
  period: "month" | "quarter" | "year";
  startDate: string;
}

interface ExpenseCategory {
  id: number;
  category_name: string;
}

const EditBudget: FC = () => {
  const { id } = useParams<{ id: string }>(); // Get budget ID from URL params
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [budget, setBudget] = useState<BudgetFormData>({
    category_id: "",
    amount: "",
    period: "month",
    startDate: new Date().toISOString().slice(0, 7),
  });

  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [originalBudget, setOriginalBudget] = useState<any>(null);

  useEffect(() => {
    // Fetch budget data and expense categories
    const fetchBudgetData = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to edit a budget");
          navigate("/login");
          return;
        }
        
        if (!id) {
          showErrorToast("No budget ID provided");
          navigate("/budgets");
          return;
        }
        
        // Fetch budget data to edit
        const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (budgetError) {
          throw new Error(`Error fetching budget: ${budgetError.message}`);
        }
        
        if (!budgetData) {
          throw new Error("Budget not found");
        }
        
        setOriginalBudget(budgetData);
        
        // Populate form with existing budget data
        setBudget({
          category_id: budgetData.category_id.toString(),
          amount: budgetData.amount.toString(),
          period: budgetData.period,
          startDate: new Date(budgetData.start_date).toISOString().slice(0, 7),
        });
        
        // Fetch expense categories
        const { data: categories, error: categoriesError } = await supabase
          .from('expense_categories')
          .select('id, category_name')
          .eq('user_id', user.id)
          .order('category_name', { ascending: true });
          
        if (categoriesError) {
          throw new Error(`Error fetching categories: ${categoriesError.message}`);
        }
        
        setExpenseCategories(categories || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        showErrorToast(`Failed to load budget data: ${(err as Error).message}`);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [user, navigate, showErrorToast, id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setBudget((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    if (!budget.category_id) {
      showErrorToast("Please select a category");
      return;
    }

    if (!budget.amount || parseFloat(budget.amount) <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      // Get start and end dates based on period
      const startDate = new Date(budget.startDate + "-01")
        .toISOString()
        .slice(0, 10);
      const endDate = getEndDate();
      
      setIsSubmitting(true);

      if (!user || !user.id) {
        throw new Error("User not authenticated");
      }
      
      if (!id) {
        throw new Error("No budget ID provided");
      }
      
      // Prepare budget data for update
      const budgetData = {
        category_id: budget.category_id,
        amount: parseFloat(budget.amount),
        period: budget.period,
        start_date: startDate,
        end_date: endDate,
      };

      // Update budget in Supabase
      const { data, error } = await supabase
        .from('budgets')
        .update(budgetData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Success! Show toast and redirect
      showSuccessToast("Budget updated successfully!");
      navigate(`/budgets/${id}`);
    } catch (err) {
      console.error("Error updating budget:", err);
      showErrorToast(`Failed to update budget: ${(err as Error).message}`);
      setError((err as Error).message);
      setIsSubmitting(false);
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
          <p className="mt-3 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    const category = findCategory(budget.category_id);

    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Budget Updates</h1>
          <Link to={`/budgets/${id}`} className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
          </Link>
        </div>

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
              <div className="card-header py-3">
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
                              Category
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {category ? category.category_name : "Unknown Category"}
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
                    <div className="card border-left-success shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                              Budget Amount
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
                </div>
                
                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-info shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                              Period
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800 text-capitalize">
                              {budget.period}ly
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-calendar-alt fa-2x text-gray-300"></i>
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
                              {budget.startDate}
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
                
                <div className="card bg-primary text-white shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                          Budget Period Coverage
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-white">
                          From {new Date(budget.startDate + "-01").toLocaleDateString()} to {new Date(getEndDate()).toLocaleDateString()}
                        </div>
                        <div className="text-white-50 small mt-2">
                          {budget.period === "month" ? "Monthly" : budget.period === "quarter" ? "Quarterly" : "Yearly"} budget allocation
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-chart-pie fa-2x text-white-50"></i>
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
                    <span className="text">{isSubmitting ? "Updating..." : "Update Budget"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Edit Budget</h1>
        <Link to={`/budgets/${id}`} className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Budget
        </Link>
      </div>
      
      {/* Error message if applicable */}
      {error && (
        <div className="alert alert-danger mb-4">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error}
          <button 
            onClick={() => setError(null)} 
            className="close" 
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}
      
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Budget Information</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleReview}>
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
                      <option key={category.id} value={category.id.toString()}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    Select the spending category for this budget
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="amount" className="font-weight-bold text-gray-800">
                    Budget Amount <span className="text-danger">*</span>
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
                    How much do you want to allocate for this category?
                  </small>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="period" className="font-weight-bold text-gray-800">
                        Budget Period <span className="text-danger">*</span>
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
                      <small className="form-text text-muted">
                        How often do you want to reset this budget?
                      </small>
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
                        className="form-control"
                        required
                      />
                      <small className="form-text text-muted">
                        When should this budget begin?
                      </small>
                    </div>
                  </div>
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

        {/* Budget Tips Card */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Budgeting Tips</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-piggy-bank text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">50/30/20 Rule</p>
                </div>
                <p className="text-sm ml-5 mb-0">Allocate 50% for needs, 30% for wants, and 20% for savings</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-chart-pie text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Zero-Based Budget</p>
                </div>
                <p className="text-sm ml-5 mb-0">Assign every dollar a purpose</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-balance-scale text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Realistic</p>
                </div>
                <p className="text-sm ml-5 mb-0">Set achievable budget goals based on your spending history</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(54, 185, 204, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-arrows-alt-h text-info"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Adjust As Needed</p>
                </div>
                <p className="text-sm ml-5 mb-0">Review and update your budget regularly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBudget; 