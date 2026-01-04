import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import { useCurrency } from "../../utils/CurrencyContext";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { CentavoInput, ContributionInput } from "../common/CentavoInput";
import { formatCurrency as formatCurrencyNew, roundToCentavo } from "../../utils/currencyUtils";
import { TargetDateSelector, PrioritySelector, PriorityLevel } from "./components";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface GoalFormData {
  goal_name: string;
  target_amount: number; // Changed from string to number for centavo precision
  target_date: string;
  current_amount: number; // Changed from string to number for centavo precision
  priority: PriorityLevel;
  notes: string;
  share_with_family: boolean; // Whether to share the goal with family
}

const CreateGoal: FC = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Family status states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "member" | "viewer" | null>(null);

  const initialFormState: GoalFormData = {
    goal_name: "",
    target_amount: 0, // Changed to number
    target_date: "",
    current_amount: 0, // Changed to number
    priority: "medium",
    notes: "",
    share_with_family: false,
  };

  const [goal, setGoal] = useState<GoalFormData>(initialFormState);
  
  // Get URL parameters
  const queryParams = new URLSearchParams(window.location.search);
  const shareParam = queryParams.get('share');

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      showErrorToast("Please sign in to create a goal");
      navigate("/login");
    }
    
    // Check if share=family parameter is present and set share_with_family to true
    if (shareParam === 'family') {
      setGoal(prev => ({
        ...prev,
        share_with_family: true
      }));
    }
  }, [user, navigate, showErrorToast, shareParam]);
  
  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Checking family status for user:", user.id);
        
        // First try to query the family_members directly
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select(`
            id,
            family_id,
            role,
            status,
            families:family_id (
              id,
              family_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        console.log("Family member query result:", { memberData, memberError });
          
        if (!memberError && memberData && memberData.length > 0) {
          console.log("User is a family member:", memberData[0]);
          setIsFamilyMember(true);
          setUserFamilyId(memberData[0].family_id);
          setFamilyRole(memberData[0].role as "admin" | "member" | "viewer");
        } else {
          // Fallback: Since check_user_family RPC doesn't exist, set defaults
          console.log("No family_members record found and check_user_family RPC is not available");
          setIsFamilyMember(false);
          setUserFamilyId(null);
          setFamilyRole(null);
        }
      } catch (err) {
        console.error("Error checking family status:", err);
        setIsFamilyMember(false);
        setUserFamilyId(null);
        setFamilyRole(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkFamilyStatus();
  }, [user]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setGoal((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmountChange = (field: 'target_amount' | 'current_amount') => (
    value: number
  ): void => {
    setGoal((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!goal.goal_name) {
      showErrorToast("Please enter a goal name");
      return;
    }

    if (!goal.target_amount || goal.target_amount <= 0) {
      showErrorToast("Please enter a valid target amount");
      return;
    }

    if (!goal.target_date) {
      showErrorToast("Please select a target date");
      return;
    }

    const targetDate = new Date(goal.target_date);
    const today = new Date();

    if (targetDate <= today) {
      showErrorToast("Target date must be in the future");
      return;
    }

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!user || !user.id) {
        throw new Error("User not authenticated");
      }
      
      // Debug logs to check family sharing status
      console.log("Goal submission data:", {
        share_with_family: goal.share_with_family,
        isFamilyMember: isFamilyMember,
        userFamilyId: userFamilyId
      });

      // Prepare goal data for insertion
      const goalData: any = {
        goal_name: goal.goal_name,
        target_amount: roundToCentavo(goal.target_amount),
        current_amount: roundToCentavo(goal.current_amount) || 0,
        target_date: goal.target_date,
        priority: goal.priority,
        notes: goal.notes,
        user_id: user.id,
        status: "in_progress", // Default status for new goals
        currency: "PHP", // Default currency
      };
      
      // Add family ID if the goal is shared with family
      if (goal.share_with_family) {
        if (isFamilyMember && userFamilyId) {
          console.log("Adding family sharing data", { family_id: userFamilyId });
          goalData.family_id = userFamilyId;
          goalData.is_family_goal = true; // Use correct database column name
        } else {
          console.log("Failed to add family sharing - missing conditions:", { 
            isFamilyMember, 
            userFamilyId 
          });
          
          // If user is not in family or no family ID, we need to notify them
          throw new Error("Could not create family goal: You must be part of a family first.");
        }
      }

      console.log("Final goal data:", goalData);

      // Insert goal into Supabase
      const { data, error } = await supabase
        .from('goals')
        .insert(goalData)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      
      // Success! Show toast and redirect
      showSuccessToast(`Goal "${goal.goal_name}" ${goal.share_with_family ? 'shared with family' : 'created'} successfully!`);
      navigate("/goals");
      
    } catch (err) {
      console.error("Error creating goal:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to create goal: ${errorMessage}`);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const calculateRecommendation = (): number | null => {
    if (!goal.target_amount || !goal.target_date) return null;

    const targetAmount = goal.target_amount;
    const currentAmount = goal.current_amount || 0;
    const targetDate = new Date(goal.target_date);
    const today = new Date();

    // Calculate months between today and target date
    const monthsDiff =
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
      (targetDate.getMonth() - today.getMonth());

    if (monthsDiff <= 0) return targetAmount - currentAmount;

    // Calculate monthly contribution needed
    const remaining = targetAmount - currentAmount;
    return remaining / monthsDiff;
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    const monthlySavings = calculateRecommendation();

    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Mobile Review View */}
        <div className="block md:hidden">
          {/* Mobile Page Heading */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-gray-800">Review Goal</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("form")}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
                  aria-label="Back to edit"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-rose-500 text-sm"></i>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Goal Summary Card */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 mb-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">New Goal</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-bullseye text-white text-sm"></i>
              </div>
            </div>
            <div className="text-white text-lg font-bold mb-1 truncate">
              {goal.goal_name}
            </div>
            <div className="text-white/70 text-xs">
              Target: {formatCurrencyNew(goal.target_amount)}
            </div>
          </div>

          {/* Goal Type Badge */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${goal.share_with_family ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                <i className={`fas ${goal.share_with_family ? 'fa-users' : 'fa-user'} ${goal.share_with_family ? 'text-blue-500' : 'text-indigo-500'} text-sm`}></i>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">
                  {goal.share_with_family ? 'Family Shared Goal' : 'Personal Goal'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {goal.share_with_family ? 'Visible to family members' : 'Only visible to you'}
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-bullseye text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Target</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrencyNew(goal.target_amount)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                <i className="fas fa-piggy-bank text-emerald-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Current</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrencyNew(goal.current_amount || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                <i className="fas fa-calendar text-amber-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Target Date</p>
              <p className="text-xs font-bold text-gray-800">{formatDate(goal.target_date)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
                <i className="fas fa-flag text-rose-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Priority</p>
              <p className="text-xs font-bold text-gray-800 capitalize">{goal.priority}</p>
            </div>
          </div>

          {/* Monthly Savings Recommendation */}
          {monthlySavings && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 mb-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fas fa-chart-line text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-[10px] font-medium uppercase tracking-wide">Monthly Saving</p>
                  <p className="text-white text-lg font-bold">{formatCurrency(monthlySavings)}</p>
                  <p className="text-white/60 text-[10px]">To reach goal by {formatDate(goal.target_date)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {goal.notes && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3">
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mb-1">Notes</p>
              <p className="text-xs text-gray-700">{goal.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
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
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-check'} text-xs`}></i>
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </div>

        {/* Desktop Review View */}
        <div className="hidden md:block">
          {/* Page Heading */}
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800">Review Your Goal</h1>
            <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
              <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
            </Link>
          </div>

          {/* Display error if any */}
          {error && (
            <div className="alert alert-danger mb-4">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          <div className="row">
            <div className="col-lg-8 mx-auto">
              <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Goal Details</h6>
                </div>
                <div className="card-body">
                  <div className="row mb-4">
                    <div className="col-12 mb-4">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Goal Name
                      </div>
                      <h4 className="h4 mb-0 font-weight-bold text-gray-800">{goal.goal_name}</h4>
                    </div>
                  </div>

                  {/* Goal Type Indicator */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-left-info shadow h-100 py-2">
                        <div className="card-body">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                                Goal Type
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800 d-flex align-items-center">
                                {goal.share_with_family ? (
                                  <>
                                    <div className="mr-2">
                                      <i className="fas fa-users text-info"></i>
                                    </div>
                                    Family Shared Goal
                                    <span className="badge badge-info ml-2">Visible to family members</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="mr-2">
                                      <i className="fas fa-user text-primary"></i>
                                    </div>
                                    Personal Goal
                                    <span className="badge badge-primary ml-2">Only visible to you</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                              Target Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrencyNew(goal.target_amount)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-bullseye fa-2x text-gray-300"></i>
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
                              Current Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrencyNew(goal.current_amount || 0)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
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
                              Target Date
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatDate(goal.target_date)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-calendar fa-2x text-gray-300"></i>
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
                              Priority
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800 text-capitalize">
                              {goal.priority}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-flag fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {monthlySavings && (
                  <div className="card bg-success text-white shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                            Recommended Monthly Saving
                          </div>
                          <div className="h3 mb-0 font-weight-bold text-white">
                            {formatCurrency(monthlySavings)}
                          </div>
                          <div className="text-white-50 small mt-2">
                            To reach your goal by {formatDate(goal.target_date)}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-chart-line fa-3x text-white-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {goal.notes && (
                  <div className="card bg-light mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
                    <div className="card-body">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Notes
                      </div>
                      <p className="mb-0">{goal.notes}</p>
                    </div>
                  </div>
                )}

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
                    <span className="text">{isSubmitting ? "Creating..." : "Create Goal"}</span>
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
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Mobile Form View */}
      <div className="block md:hidden">
        {/* Mobile Page Heading */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Create Goal</h1>
            <Link
              to="/goals"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
              aria-label="Back to goals"
            >
              <i className="fas fa-arrow-left text-xs"></i>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-rose-500 text-sm"></i>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-500">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* ===== MOBILE FORM VIEW ===== */}
        <form onSubmit={handleReview}>
          {/* Mobile Goal Name Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-bullseye text-indigo-500 text-[10px]"></i>
                Goal Name
                <span className="text-red-500">*</span>
              </h6>
            </div>
            <div className="p-3">
              <input
                type="text"
                name="goal_name"
                value={goal.goal_name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                placeholder="e.g., Vacation, Emergency Fund"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1.5">Give your goal a clear, specific name</p>
            </div>
          </div>

          {/* Mobile Amount Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-peso-sign text-indigo-500 text-[10px]"></i>
                Amounts
              </h6>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Target Amount <span className="text-red-500">*</span>
                </label>
                <CentavoInput
                  value={goal.target_amount}
                  onChange={handleAmountChange('target_amount')}
                  currency="PHP"
                  label=""
                  placeholder="0.00"
                  required={true}
                  min={0.01}
                  className="mb-0"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Current Amount (Optional)
                </label>
                <CentavoInput
                  value={goal.current_amount}
                  onChange={handleAmountChange('current_amount')}
                  currency="PHP"
                  label=""
                  placeholder="0.00"
                  required={false}
                  min={0}
                  className="mb-0"
                />
                <p className="text-[10px] text-gray-400 mt-1">Money you've already saved</p>
              </div>
            </div>
          </div>

          {/* Mobile Date & Priority Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-calendar-alt text-indigo-500 text-[10px]"></i>
                Timeline & Priority
              </h6>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Target Date <span className="text-red-500">*</span>
                </label>
                <TargetDateSelector
                  selectedDate={goal.target_date}
                  onDateSelect={(date) => setGoal({...goal, target_date: date})}
                  required={true}
                  label=""
                  className="mb-0"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1 block">
                  Priority <span className="text-red-500">*</span>
                </label>
                <PrioritySelector
                  selectedPriority={goal.priority}
                  onPrioritySelect={(priority) => setGoal({...goal, priority})}
                  required={true}
                  showDescription={false}
                  label=""
                  className="mb-0"
                />
              </div>
            </div>
          </div>

          {/* Mobile Notes Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-sticky-note text-indigo-500 text-[10px]"></i>
                Notes
                <span className="text-gray-400 text-[9px] font-normal">(Optional)</span>
              </h6>
            </div>
            <div className="p-3">
              <textarea
                name="notes"
                value={goal.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all resize-none"
                placeholder="Add any details about your goal"
              ></textarea>
            </div>
          </div>

          {/* Mobile Family Sharing Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-users text-indigo-500 text-[10px]"></i>
                Family Sharing
              </h6>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500">Checking family status...</span>
                </div>
              ) : isFamilyMember ? (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <i className="fas fa-users text-blue-500 text-xs"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800">Family Member</p>
                      <p className="text-[10px] text-blue-600">Role: {familyRole ? familyRole.charAt(0).toUpperCase() + familyRole.slice(1) : 'N/A'}</p>
                    </div>
                  </div>
                  <label className={`flex items-center gap-2 ${familyRole === 'viewer' ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={goal.share_with_family}
                      disabled={familyRole === 'viewer'}
                      onChange={(e) => setGoal({...goal, share_with_family: e.target.checked})}
                      className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">Share this goal with family</span>
                  </label>
                  {familyRole === 'viewer' && (
                    <p className="text-[10px] text-amber-600 mt-1.5">
                      <i className="fas fa-info-circle mr-1"></i>
                      Viewers cannot share goals
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-users text-gray-400 text-xs"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600">Not in a family</p>
                    <p className="text-[10px] text-gray-500">Join or create a family to share goals</p>
                  </div>
                  <Link to="/family/create" className="text-[10px] text-indigo-500 font-medium">
                    Create →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Goal Preview Card */}
          {goal.goal_name && goal.target_amount > 0 && goal.target_date && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-3">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <i className="fas fa-bullseye text-white text-sm"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-700">Goal Preview</p>
                    <p className="text-[10px] text-indigo-500">{goal.goal_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-[9px] text-gray-500 uppercase font-medium">Target</p>
                    <p className="text-xs font-bold text-gray-800">{formatCurrencyNew(goal.target_amount)}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-[9px] text-gray-500 uppercase font-medium">Current</p>
                    <p className="text-xs font-bold text-gray-800">{formatCurrencyNew(goal.current_amount || 0)}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-[9px] text-gray-500 uppercase font-medium">Priority</p>
                    <p className="text-xs font-bold text-gray-800 capitalize">{goal.priority}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <i className="fas fa-arrow-right text-xs"></i>
            Continue to Review
          </button>
        </form>

        {/* Mobile Tips Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-3 mb-4">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-lightbulb text-amber-500 text-[10px]"></i>
              Goal Setting Tips
            </h6>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-bullseye text-blue-500 text-[10px]"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Be Specific</p>
                <p className="text-[10px] text-gray-500">Define exactly what you're saving for</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-calendar-check text-emerald-500 text-[10px]"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Set Realistic Dates</p>
                <p className="text-[10px] text-gray-500">Choose achievable deadlines for your goals</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-chart-line text-amber-500 text-[10px]"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Track Progress</p>
                <p className="text-[10px] text-gray-500">Regular contributions lead to success</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Form View */}
      <div className="hidden md:block">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Create New Goal</h1>
          <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goals
          </Link>
        </div>

        {/* Display error if any */}
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
                <h6 className="m-0 font-weight-bold text-primary">Goal Information</h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleReview}>
                  <div className="form-group">
                    <label htmlFor="goal_name" className="font-weight-bold text-gray-800">
                      Goal Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="goal_name"
                      name="goal_name"
                      value={goal.goal_name}
                      onChange={handleChange}
                      className="form-control form-control-user"
                      placeholder="e.g., Vacation, Emergency Fund, New Car"
                      required
                  />
                  <small className="form-text text-muted">
                    Give your goal a clear, specific name
                  </small>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <CentavoInput
                      value={goal.target_amount}
                      onChange={handleAmountChange('target_amount')}
                      currency="PHP"
                      label="Target Amount"
                      placeholder="0.00"
                      required={true}
                      min={0.01}
                      className="mb-3"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <CentavoInput
                      value={goal.current_amount}
                      onChange={handleAmountChange('current_amount')}
                      currency="PHP"
                      label="Current Amount (Optional)"
                      placeholder="0.00"
                      required={false}
                      min={0}
                      className="mb-3"
                    />
                    <small className="form-text text-muted">
                      Money you've already saved towards this goal
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <TargetDateSelector
                      selectedDate={goal.target_date}
                      onDateSelect={(date) => setGoal({...goal, target_date: date})}
                      required={true}
                      label="Target Date"
                    />
                  </div>

                  <div className="col-md-6">
                    <PrioritySelector
                      selectedPriority={goal.priority}
                      onPrioritySelect={(priority) => setGoal({...goal, priority})}
                      required={true}
                      showDescription={true}
                      label="Priority"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Additional Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    rows={3}
                    value={goal.notes}
                    onChange={handleChange}
                  ></textarea>
                  <small className="text-muted">
                    Add any details or reminders about your goal
                  </small>
                </div>

                {/* Share with family option - only show if user is part of a family */}
                {loading ? (
                  <div className="form-group">
                    <div className="card border-left-info shadow p-3 mb-3">
                      <h5 className="font-weight-bold text-info mb-3">
                        <i className="fas fa-users mr-2"></i>
                        Family Goal Sharing
                      </h5>
                      <div className="d-flex align-items-center">
                        <div className="spinner-border spinner-border-sm text-info mr-2" role="status">
                          <span className="sr-only">Loading...</span>
                        </div>
                        <span>Checking your family status...</span>
                      </div>
                    </div>
                  </div>
                ) : isFamilyMember ? (
                  <div className="form-group">
                    <div className="card border-left-info shadow p-3 mb-3">
                      <div className="mb-3">
                        <h5 className="font-weight-bold text-info mb-0">
                          <i className="fas fa-users mr-2"></i>
                          Family Goal Sharing
                        </h5>
                        {/* Role Permissions Info */}
                        <div className="alert alert-light mt-2 mb-0 py-2">
                          <small className="text-muted">
                            <i className="fas fa-info-circle mr-1"></i>
                            <strong>Your family role: {familyRole ? familyRole.charAt(0).toUpperCase() + familyRole.slice(1) : 'N/A'}</strong>
                            {familyRole === 'viewer' && (
                              <span className="text-warning ml-2">
                                • Viewers can only view goals but cannot contribute to them or link goals to family
                              </span>
                            )}
                            {familyRole === 'member' && (
                              <span className="text-success ml-2">
                                • Members can contribute to goals and link goals to family
                              </span>
                            )}
                            {familyRole === 'admin' && (
                              <span className="text-primary ml-2">
                                • Admins have full permissions including goal management and family administration
                              </span>
                            )}
                          </small>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-8">
                          <div className="d-flex align-items-center mb-3">
                            <input
                              type="checkbox"
                              className="mr-2"
                              id="shareWithFamily"
                              name="share_with_family"
                              checked={goal.share_with_family}
                              disabled={familyRole === 'viewer'}
                              onChange={(e) => 
                                setGoal({...goal, share_with_family: e.target.checked})
                              }
                            />
                            <label className={`font-weight-bold text-nowrap mb-0 ${familyRole === 'viewer' ? 'text-muted' : ''}`} htmlFor="shareWithFamily">
                              Share this goal with my family {familyRole === 'viewer' && '(Not available for viewers)'}
                            </label>
                          </div>
                          <small className="form-text text-muted d-block">
                            <i className="fas fa-info-circle mr-1"></i>
                            {familyRole === 'viewer' 
                              ? 'Viewers can only view family goals but cannot create or share new goals with the family.' 
                              : 'When shared, this goal will appear in your family dashboard and family members can view and contribute to it.'}
                          </small>
                          <small className="form-text text-muted d-block mt-1">
                            <i className="fas fa-lock mr-1"></i>
                            If not shared, this will be a personal goal only visible to you.
                          </small>
                          {goal.share_with_family && (
                            <div className="alert alert-info mt-2 py-2 mb-0">
                              <i className="fas fa-users mr-1"></i>
                              This goal will be visible to all family members.
                              <div className="small mt-1">
                                <strong>Family ID:</strong> {userFamilyId ?? "Unknown"}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="col-md-4">
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <div className="card border-left-secondary shadow p-3 mb-3">
                      <h5 className="font-weight-bold text-secondary mb-3">
                        <i className="fas fa-users mr-2"></i>
                        Family Goal Sharing
                      </h5>
                      <div className="alert alert-light mb-0">
                        <i className="fas fa-info-circle mr-2"></i>
                        You need to be part of a family to share goals. 
                        <div className="mt-2">
                          <Link to="/family/create" className="btn btn-sm btn-info">
                            <i className="fas fa-plus mr-1"></i> Create a Family
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

        {/* Goal Tips Card */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Goal Setting Tips</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-bullseye text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Specific</p>
                </div>
                <p className="text-sm ml-5 mb-0">Clearly define what you want to achieve</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-balance-scale text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Realistic</p>
                </div>
                <p className="text-sm ml-5 mb-0">Set achievable targets based on your income</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-clock text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Set Deadlines</p>
                </div>
                <p className="text-sm ml-5 mb-0">Time-bound goals keep you motivated</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(54, 185, 204, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-tasks text-info"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Break it Down</p>
                </div>
                <p className="text-sm ml-5 mb-0">Large goals are easier as monthly targets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CreateGoal;
