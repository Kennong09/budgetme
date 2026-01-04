import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { formatCurrency, getMonthDates } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { BudgetFormData } from "./types";
import { BudgetAmountInput } from "../common/CentavoInput";
import { formatCurrency as formatCurrencyNew, sanitizeBudgetName, roundToCentavo } from "../../utils/currencyUtils";
import BudgetErrorBoundary from "../common/BudgetErrorBoundary";
import CategorySelector from "../transactions/components/CategorySelector";
import PeriodSelector from "./components/PeriodSelector";
import DateSelector from "./components/DateSelector";

// Reference to admin budget modals for consistency
// This component provides user-facing budget editing similar to:
// - src/components/admin/budget/EditBudgetModal.tsx (admin interface)
// - src/components/admin/budget/DeleteBudgetModal.tsx (admin interface)
// Admins can also edit/delete budgets via the admin dashboard using these modals

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface ExpenseCategory {
  id: string;
  category_name: string;
}

interface Budget {
  id: string;
  budget_name: string;
  category_id: string;
  amount: number;
  period: "month" | "quarter" | "year";
  start_date: string;
  end_date: string;
  user_id: string;
}

const EditBudget: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [originalBudget, setOriginalBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  const [budget, setBudget] = useState<BudgetFormData>({
    budget_name: "",
    category_id: "",
    amount: 0, // Changed to number for centavo precision
    period: "month",
    startDate: new Date().toISOString().slice(0, 7),
  });

  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          budget_name: budgetData.budget_name || '',
          category_id: budgetData.category_id, // Keep as string, no conversion needed
          amount: budgetData.amount || 0, // Convert to number
          period: budgetData.period,
          startDate: new Date(budgetData.start_date).toISOString().slice(0, 10), // Use full date format YYYY-MM-DD
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

  // Update selectedCategory when expenseCategories or budget.category_id changes
  useEffect(() => {
    if (budget.category_id && expenseCategories.length > 0) {
      const category = expenseCategories.find(cat => cat.id === budget.category_id);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [budget.category_id, expenseCategories]);

  const handleAmountChange = (newAmount: number) => {
    setBudget(prev => ({
      ...prev,
      amount: newAmount
    }));
  };

  const handleCategorySelect = (category: ExpenseCategory | null) => {
    setSelectedCategory(category);
    setBudget(prev => ({
      ...prev,
      category_id: category?.id || '',
      category_name: category?.category_name || ''
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

  const handlePeriodSelect = (period: string) => {
    setBudget((prev) => ({
      ...prev,
      period: period as "day" | "week" | "month" | "quarter" | "year",
    }));
  };

  const handleDateSelect = (date: string) => {
    setBudget((prev) => ({
      ...prev,
      startDate: date,
    }));
  };

  const getEndDate = (): string => {
    const startDate = new Date(budget.startDate);

    if (budget.period === "day") {
      // For daily budgets, end date is same as start date
      return budget.startDate;
    } else if (budget.period === "week") {
      // For weekly budgets, end date is 6 days after start date
      const weekEnd = new Date(startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return weekEnd.toISOString().slice(0, 10);
    } else if (budget.period === "month") {
      // Last day of the month
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      return new Date(year, month + 1, 0).toISOString().slice(0, 10);
    } else if (budget.period === "quarter") {
      // Last day of the quarter (3 months)
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      return new Date(year, month + 3, 0).toISOString().slice(0, 10);
    } else if (budget.period === "year") {
      // Last day of the year (12 months)
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      return new Date(year, month + 12, 0).toISOString().slice(0, 10);
    }
    
    // Default fallback
    return budget.startDate;
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
    if (!user || !originalBudget) {
      showErrorToast("Unable to update budget. Missing data.");
      return;
    }

    setIsSubmitting(true);

    try {
      const startDate = budget.startDate; // Already in YYYY-MM-DD format
      const endDate = getEndDate();
      
      if (!id) {
        throw new Error("No budget ID provided");
      }
      
      const budgetData = {
        budget_name: sanitizeBudgetName(budget.budget_name.trim()), // Sanitize for format string safety
        category_id: budget.category_id,
        amount: roundToCentavo(budget.amount), // Ensure centavo precision
        period: budget.period,
        start_date: startDate,
        end_date: endDate,
        alert_threshold: 0.8, // Maintain alert threshold
        updated_at: new Date().toISOString() // Track update time
      };

      const { data, error } = await supabase
        .from('budgets')
        .update(budgetData)
        .eq('id', id)
        .eq('user_id', user.id)
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
        throw new Error('Budget update failed - no data returned');
      }
      
      
      showSuccessToast("Budget updated successfully!");
      navigate(`/budgets/${id}`);
    } catch (err) {
      console.error("Error updating budget:", err);
      showErrorToast(`Failed to update budget: ${(err as Error).message}`);
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
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading budget data...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading budget data...</p>
        </div>
      </div>
    );
  }

  // Show error if data failed to load
  if (error) {
    return (
      <div className="container-fluid">
        {/* Mobile Error State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <i className="fas fa-exclamation-circle text-rose-500 text-2xl"></i>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Loading Error</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
            >
              <i className="fas fa-refresh text-xs"></i>
              Retry
            </button>
          </div>
        </div>

        {/* Desktop Error State */}
        <div className="text-center my-5 hidden md:block">
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

  if (viewMode === "review") {
    const selectedCategory = expenseCategories.find(
      category => category.id === budget.category_id
    );
    
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Mobile Page Heading */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Review Changes</h1>
            <Link
              to={`/budgets/${id}`}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
              aria-label="Cancel"
            >
              <i className="fas fa-times text-xs"></i>
            </Link>
          </div>
        </div>

        {/* Mobile Review Card */}
        <div className="block md:hidden mb-4">
          <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-4 shadow-lg mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                Edit Budget
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-edit text-white text-sm"></i>
              </div>
            </div>
            <div className="text-white text-2xl font-bold mb-1">
              {formatCurrencyNew(budget.amount)}
            </div>
            <div className="text-white/70 text-xs">
              {budget.budget_name || 'Unnamed Budget'}
            </div>
          </div>

          {/* Mobile Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                <i className="fas fa-tag text-amber-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Category</p>
              <p className="text-xs font-bold text-gray-800 truncate">{selectedCategory?.category_name || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                <i className="fas fa-calendar text-emerald-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Period</p>
              <p className="text-xs font-bold text-gray-800 truncate">
                {budget.period === 'day' && 'Daily'}
                {budget.period === 'week' && 'Weekly'}
                {budget.period === 'month' && 'Monthly'}
                {budget.period === 'quarter' && 'Quarterly'}
                {budget.period === 'year' && 'Yearly'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-calendar-day text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Start Date</p>
              <p className="text-xs font-bold text-gray-800 truncate">{new Date(budget.startDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                <i className="fas fa-calendar-check text-gray-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">End Date</p>
              <p className="text-xs font-bold text-gray-800 truncate">{new Date(getEndDate()).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode("form")} 
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Back
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-check text-xs"></i>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Page Heading */}
        <div className="d-none d-md-flex align-items-center justify-content-between mb-2 mb-md-4 flex-wrap">
          <h1 className="h5 h-md-3 mb-1 mb-md-0 text-gray-800" style={{ fontSize: '1.1rem' }}>Review Budget Changes</h1>
          <Link to={`/budgets/${id}`} className="btn btn-sm btn-secondary shadow-sm d-flex align-items-center" style={{ padding: '0.25rem 0.5rem' }}>
            <i className="fas fa-arrow-left fa-sm" style={{ fontSize: '0.7rem' }}></i>
            <span className="d-none d-md-inline ml-2">Cancel</span>
          </Link>
        </div>

        <div className="row d-none d-md-flex">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-3 mb-md-4">
              <div className="card-header py-2 d-flex align-items-center">
                <span className="badge badge-primary mr-2">
                  Budget
                </span>
                <h6 className="m-0 font-weight-bold text-primary" style={{ fontSize: '0.875rem' }}>Budget Details</h6>
              </div>
              <div className="card-body p-3">
                <div className="row mb-4">
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-info shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              Budget Name
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {budget.budget_name || 'N/A'}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            <i className="fas fa-file-alt fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              Amount
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {formatCurrencyNew(budget.amount)}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-success shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-success text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              Period
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {budget.period === 'day' && 'Daily'}
                              {budget.period === 'week' && 'Weekly'}
                              {budget.period === 'month' && 'Monthly'}
                              {budget.period === 'quarter' && 'Quarterly'}
                              {budget.period === 'year' && 'Yearly'}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            {budget.period === 'day' && <i className="fas fa-calendar-day fa-2x text-gray-300"></i>}
                            {budget.period === 'week' && <i className="fas fa-calendar-week fa-2x text-gray-300"></i>}
                            {budget.period === 'month' && <i className="fas fa-calendar fa-2x text-gray-300"></i>}
                            {budget.period === 'quarter' && <i className="fas fa-calendar-alt fa-2x text-gray-300"></i>}
                            {budget.period === 'year' && <i className="fas fa-calendar-check fa-2x text-gray-300"></i>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-warning shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-warning text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              Category
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {selectedCategory?.category_name || 'N/A'}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            <i className="fas fa-tag fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-info shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              Start Date
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {new Date(budget.startDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            <i className="fas fa-calendar-day fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <div className="card border-left-secondary shadow h-100 py-2">
                      <div className="card-body p-3">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-secondary text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                              End Date
                            </div>
                            <div className="h5 h6-mobile mb-0 font-weight-bold text-gray-800">
                              {new Date(getEndDate()).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="col-auto d-none d-md-block">
                            <i className="fas fa-calendar-check fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column flex-md-row justify-content-center align-items-stretch gap-2 mt-4">
                  <button 
                    onClick={() => setViewMode("form")} 
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <i className="fas fa-arrow-left fa-sm mr-2" style={{ fontSize: '0.7rem' }}></i>
                    <span>Back to Edit</span>
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <i className={`${isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"} fa-sm text-white-50 mr-2`} style={{ fontSize: '0.7rem' }}></i>
                    <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
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
      {/* Mobile Page Heading */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Edit Budget</h1>
          <Link
            to={`/budgets/${id}`}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
            aria-label="Back to budget"
          >
            <i className="fas fa-arrow-left text-xs"></i>
          </Link>
        </div>
      </div>

      {/* Mobile Form Card */}
      <div className="block md:hidden mb-4">
        <form onSubmit={handleReview}>
          {/* Mobile Budget Name Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-wallet text-indigo-500 text-[10px]"></i>
                Budget Name
                <span className="text-red-500">*</span>
              </h6>
            </div>
            <div className="p-3">
              <input
                type="text"
                name="budget_name"
                value={budget.budget_name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                placeholder="e.g., Monthly Food Budget"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1.5">Give your budget a descriptive name</p>
            </div>
          </div>

          {/* Mobile Category Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-tag text-indigo-500 text-[10px]"></i>
                Category
                <span className="text-red-500">*</span>
              </h6>
            </div>
            <div className="p-3">
              <CategorySelector
                selectedCategoryId={budget.category_id}
                onCategorySelect={handleCategorySelect}
                transactionType="expense"
                incomeCategories={[]}
                expenseCategories={expenseCategories}
                required={true}
                label=""
                className="mobile-selector"
              />
            </div>
          </div>

          {/* Mobile Period & Date Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-calendar-alt text-indigo-500 text-[10px]"></i>
                Period & Start Date
              </h6>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Period <span className="text-red-500">*</span>
                </label>
                <PeriodSelector
                  selectedPeriod={budget.period}
                  onPeriodSelect={handlePeriodSelect}
                  required={true}
                  label="Period"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <DateSelector
                  selectedDate={budget.startDate}
                  onDateSelect={handleDateSelect}
                  required={true}
                  label="Start Date"
                />
              </div>
            </div>
          </div>

          {/* Mobile Amount Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-peso-sign text-indigo-500 text-[10px]"></i>
                Amount
              </h6>
            </div>
            <div className="p-3">
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

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <i className="fas fa-arrow-right text-xs"></i>
            Continue to Review
          </button>
        </form>
      </div>

      {/* Mobile Tips Card */}
      <div className="block md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-3">
        <div className="px-4 py-3 border-b border-gray-100">
          <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-lightbulb text-amber-500 text-[10px]"></i>
            Quick Tips
          </h6>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-chart-pie text-blue-500 text-[10px]"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">50/30/20 Rule</p>
              <p className="text-[10px] text-gray-500">50% needs, 30% wants, 20% savings</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-bullseye text-emerald-500 text-[10px]"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Zero-Based Budget</p>
              <p className="text-[10px] text-gray-500">Assign every peso a purpose</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-balance-scale text-amber-500 text-[10px]"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Be Realistic</p>
              <p className="text-[10px] text-gray-500">Base budget on actual spending patterns</p>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END MOBILE FORM VIEW ===== */}

      {/* Desktop Page Heading */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-2 mb-md-4 flex-wrap">
        <h1 className="h5 h-md-3 mb-1 mb-md-0 text-gray-800" style={{ fontSize: '1.1rem' }}>Edit Budget</h1>
        <Link to={`/budgets/${id}`} className="btn btn-sm btn-secondary shadow-sm d-flex align-items-center" style={{ padding: '0.25rem 0.5rem' }}>
          <i className="fas fa-arrow-left fa-sm" style={{ fontSize: '0.7rem' }}></i>
          <span className="d-none d-md-inline ml-2">Back to Budget</span>
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

      <div className="row d-none d-md-flex">
        {/* Budget Form */}
        <div className="col-lg-8">
          <div className="card shadow mb-3 mb-md-4">
            <div className="card-header py-2">
              <h6 className="m-0 font-weight-bold text-primary">
                Budget Details
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('budget-details', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body p-3">
              <form onSubmit={handleReview}>
                <div className="row">
                  <div className="col-12 mb-3 mb-md-4">
                    <div className="form-group">
                      <label htmlFor="budget_name" className="font-weight-bold text-gray-800" style={{ fontSize: '0.875rem' }}>
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
                        style={{ fontSize: '0.875rem' }}
                      />
                      <small className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                        Give your budget a descriptive name (avoid special characters like %, ., *)
                      </small>
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-12 mb-3">
                    <CategorySelector
                      selectedCategoryId={budget.category_id}
                      onCategorySelect={handleCategorySelect}
                      transactionType="expense"
                      incomeCategories={[]}
                      expenseCategories={expenseCategories}
                      required={true}
                      label="Category"
                    />
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <PeriodSelector
                      selectedPeriod={budget.period}
                      onPeriodSelect={handlePeriodSelect}
                      required={true}
                      label="Period"
                    />
                  </div>

                  <div className="col-12 col-md-6 mb-3 mb-md-4">
                    <DateSelector
                      selectedDate={budget.startDate}
                      onDateSelect={handleDateSelect}
                      required={true}
                      label="Start Date"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 col-md-6 mx-auto">
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
          <div className="card shadow mb-3 mb-md-4">
            <div className="card-header py-2">
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

export default function EditBudgetWithErrorBoundary() {
  return (
    <BudgetErrorBoundary>
      <EditBudget />
    </BudgetErrorBoundary>
  );
} 