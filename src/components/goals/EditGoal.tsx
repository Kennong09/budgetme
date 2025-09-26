import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import { useCurrency } from "../../utils/CurrencyContext";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { goalsDataService } from "./services/goalsDataService";
import GoalErrorBoundary from "../common/GoalErrorBoundary";
import { GoalNotificationService } from "../../services/database/goalNotificationService";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface GoalFormData {
  goal_name: string;
  target_amount: string;
  target_date: string;
  current_amount: string;
  priority: "low" | "medium" | "high";
  notes: string;
  status?: "not_started" | "in_progress" | "completed" | "cancelled";
  share_with_family?: boolean;
  is_family_goal?: boolean;
  family_id?: string;
}

interface RouteParams {
  id: string;
}

const EditGoal: FC = () => {
  const { id } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [originalGoal, setOriginalGoal] = useState<any>(null);
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);

  const initialFormState: GoalFormData = {
    goal_name: "",
    target_amount: "",
    target_date: "",
    current_amount: "0",
    priority: "medium",
    notes: "",
    status: "in_progress",
    share_with_family: false,
  };

  const [goal, setGoal] = useState<GoalFormData>(initialFormState);

  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
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
          
        if (!memberError && memberData && memberData.length > 0) {
          setIsFamilyMember(true);
          setUserFamilyId(memberData[0].family_id);
          setFamilyRole(memberData[0].role as "admin" | "viewer");
        } else {
          // Fallback to the function
          const { data: familyStatus, error: statusError } = await supabase.rpc(
            'check_user_family',
            { p_user_id: user.id }
          );
          
          if (!statusError && familyStatus && 
              ((Array.isArray(familyStatus) && familyStatus.length > 0 && familyStatus[0].is_member) || 
              (familyStatus.is_member))) {
            // Extract the family ID from the response based on format
            const familyId = Array.isArray(familyStatus) 
              ? familyStatus[0].family_id 
              : familyStatus.family_id;
              
            setIsFamilyMember(true);
            setUserFamilyId(familyId);
            
            // Fetch role
            const { data: roleData, error: roleError } = await supabase
              .from('family_members')
              .select('role')
              .eq('user_id', user.id)
              .eq('family_id', familyId)
              .single();
              
            if (!roleError && roleData) {
              setFamilyRole(roleData.role as "admin" | "viewer");
            }
          } else {
            setIsFamilyMember(false);
            setUserFamilyId(null);
            setFamilyRole(null);
          }
        }
      } catch (err) {
        console.error("Error checking family status:", err);
        setIsFamilyMember(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkFamilyStatus();
  }, [user]);

  // Fetch the goal data on component mount
  useEffect(() => {
    const fetchGoal = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to edit goals");
          navigate("/login");
          return;
        }

        // Use enhanced data service with automatic fallback
        const result = await goalsDataService.fetchGoalById(id, user.id);
        
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        if (!result.data) {
          showErrorToast("Goal not found");
          navigate("/goals");
          return;
        }

        const goalData = result.data;

        // Save the original goal data
        setOriginalGoal(goalData);
        
        // Set form data
        setGoal({
          goal_name: goalData.goal_name || "",
          target_amount: goalData.target_amount?.toString() || "",
          target_date: goalData.target_date || "",
          current_amount: goalData.current_amount?.toString() || "0",
          priority: goalData.priority || "medium",
          notes: goalData.notes || "",
          status: goalData.status || "in_progress",
          is_family_goal: !!goalData.family_id,
          family_id: goalData.family_id || undefined,
          share_with_family: !!goalData.family_id
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading goal:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        showErrorToast(`Failed to load goal: ${errorMessage}`);
        setError(errorMessage);
        setLoading(false);
        navigate("/goals");
      }
    };

    fetchGoal();
  }, [id, user, navigate, showErrorToast]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setGoal((prev) => ({
      ...prev,
      [name]: value,
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

    if (!goal.target_amount || parseFloat(goal.target_amount) <= 0) {
      showErrorToast("Please enter a valid target amount");
      return;
    }

    if (!goal.target_date) {
      showErrorToast("Please select a target date");
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

      // Prepare goal data for update
      const goalData: any = {
        goal_name: goal.goal_name,
        target_amount: parseFloat(goal.target_amount),
        current_amount: parseFloat(goal.current_amount) || 0,
        target_date: goal.target_date,
        priority: goal.priority,
        notes: goal.notes,
        status: goal.status
      };

      // Handle sharing status changes
      if (isFamilyMember && userFamilyId) {
        if (goal.share_with_family && !goal.is_family_goal) {
          // Goal is now being shared
          goalData.family_id = userFamilyId;
        } else if (!goal.share_with_family && goal.is_family_goal) {
          // Goal is no longer being shared
          goalData.family_id = null;
        }
      }

      // Determine if we need to update status based on completion
      if (parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)) {
        goalData.status = "completed";
      } else if (goalData.status === "completed" && parseFloat(goal.current_amount) < parseFloat(goal.target_amount)) {
        goalData.status = "in_progress";
      }

      // Update goal in Supabase
      const { data, error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Trigger goal update notifications
      if (data) {
        try {
          await GoalNotificationService.getInstance().checkGoalMilestones(id);
          console.log('Goal update notifications processed successfully');
        } catch (notificationError) {
          // Log notification error but don't fail the goal update
          console.warn('Failed to process goal update notifications:', notificationError);
        }
      }
      
      // Success! Show toast and redirect
      showSuccessToast("Goal updated successfully!");
      navigate(`/goals/${id}`);
      
    } catch (err) {
      console.error("Error updating goal:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to update goal: ${errorMessage}`);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const calculateRecommendation = (): number | null => {
    if (!goal.target_amount || !goal.target_date) return null;

    const targetAmount = parseFloat(goal.target_amount);
    const currentAmount = parseFloat(goal.current_amount) || 0;
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
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading goal data...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    const monthlySavings = calculateRecommendation();

    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Your Changes</h1>
          <Link to={`/goals/${id}`} className="btn btn-sm btn-secondary shadow-sm">
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
                              {formatCurrency(parseFloat(goal.target_amount))}
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
                              {formatCurrency(parseFloat(goal.current_amount) || 0)}
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
                    <span className="text">{isSubmitting ? "Updating..." : "Update Goal"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Edit Goal</h1>
        <Link to={`/goals/${id}`} className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goal Details
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
                    <div className="form-group">
                      <label htmlFor="target_amount" className="font-weight-bold text-gray-800">
                        Target Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          id="target_amount"
                          name="target_amount"
                          value={goal.target_amount}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="current_amount" className="font-weight-bold text-gray-800">
                        Current Amount
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          id="current_amount"
                          name="current_amount"
                          value={goal.current_amount}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <small className="form-text text-muted">
                        Money you've already saved towards this goal
                      </small>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="target_date" className="font-weight-bold text-gray-800">
                        Target Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="target_date"
                        name="target_date"
                        value={goal.target_date}
                        onChange={handleChange}
                        className="form-control"
                        required
                      />
                      <small className="form-text text-muted">
                        When do you want to achieve this goal?
                      </small>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="priority" className="font-weight-bold text-gray-800">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={goal.priority}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <small className="form-text text-muted">
                        How important is this goal to you?
                      </small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="status" className="font-weight-bold text-gray-800">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={goal.status}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <small className="form-text text-muted">
                    Current status of your goal
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="font-weight-bold text-gray-800">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={goal.notes}
                    onChange={handleChange}
                    className="form-control"
                    rows={4}
                    placeholder="Add any additional details or motivation for your goal"
                  ></textarea>
                </div>

                {/* Add sharing option */}
                {isFamilyMember && (
                  <div className="form-group">
                    <div className="card border-left-info shadow p-3 mb-3">
                      <div className="mb-3">
                        <h5 className="font-weight-bold text-info mb-0">
                          <i className="fas fa-users mr-2"></i>
                          Family Goal Sharing
                        </h5>
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
                              onChange={(e) => 
                                setGoal({...goal, share_with_family: e.target.checked})
                              }
                            />
                            <label className="font-weight-bold text-nowrap mb-0" htmlFor="shareWithFamily">
                              Share this goal with my family
                            </label>
                          </div>
                          <small className="form-text text-muted d-block">
                            <i className="fas fa-info-circle mr-1"></i>
                            When shared, this goal will appear in your family dashboard and family members can view and contribute to it.
                          </small>
                          <small className="form-text text-muted d-block mt-1">
                            <i className="fas fa-lock mr-1"></i>
                            If not shared, this will be a personal goal only visible to you.
                          </small>
                          {goal.share_with_family !== goal.is_family_goal && (
                            <div className="alert alert-warning mt-2 py-2 mb-0">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              {goal.share_with_family 
                                ? "This goal will now be shared with your family members." 
                                : "This goal will no longer be shared with your family members."}
                            </div>
                          )}
                        </div>
                        <div className="col-md-4">
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
              <h6 className="m-0 font-weight-bold text-primary">Goal Editing Tips</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-bullseye text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Stay Focused</p>
                </div>
                <p className="text-sm ml-5 mb-0">Keep your goal specific and measurable</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-balance-scale text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Adjust Realistically</p>
                </div>
                <p className="text-sm ml-5 mb-0">Make changes that reflect your current situation</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-clock text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Timeline Updates</p>
                </div>
                <p className="text-sm ml-5 mb-0">Set achievable deadlines if extending your goal</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(54, 185, 204, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-chart-line text-info"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Track Progress</p>
                </div>
                <p className="text-sm ml-5 mb-0">Update current amount to reflect your savings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EditGoalWithErrorBoundary() {
  return (
    <GoalErrorBoundary>
      <EditGoal />
    </GoalErrorBoundary>
  );
} 