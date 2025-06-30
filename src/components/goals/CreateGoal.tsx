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
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);

  const initialFormState: GoalFormData = {
    goal_name: "",
    target_amount: "",
    target_date: "",
    current_amount: "0",
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
          setFamilyRole(memberData[0].role as "admin" | "viewer");
        } else {
          // Fallback to the function
          console.log("No direct family_members record found, using check_user_family RPC");
          
          // Explicit cast for proper TypeScript typing
          const { data: familyStatus, error: statusError } = await supabase.rpc(
            'check_user_family',
            { p_user_id: user.id }
          );
          
          console.log("Family status check result:", { familyStatus, statusError });
          
          if (!statusError && familyStatus) {
            // Handle both array and object responses
            const isMember = Array.isArray(familyStatus) 
              ? familyStatus.length > 0 && familyStatus[0].is_member
              : familyStatus.is_member;
              
            console.log("Membership check:", { isMember });
            
            if (isMember) {
              // Extract the family ID from the response based on format
              const familyId = Array.isArray(familyStatus) 
                ? familyStatus[0].family_id 
                : familyStatus.family_id;
              
              console.log("Setting user family ID:", familyId);
              setIsFamilyMember(true);
              setUserFamilyId(familyId);
              
              // Fetch role
              const { data: roleData, error: roleError } = await supabase
                .from('family_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('family_id', familyId)
                .single();
                
              console.log("Role lookup result:", { roleData, roleError });
                
              if (!roleError && roleData) {
                setFamilyRole(roleData.role as "admin" | "viewer");
              } else {
                console.log("Setting default role as viewer");
                setFamilyRole("viewer"); // Default role if not found
              }
            } else {
              console.log("User is not a family member");
              setIsFamilyMember(false);
              setUserFamilyId(null);
              setFamilyRole(null);
            }
          } else {
            console.log("Failed to check family status, assuming not a family member");
            setIsFamilyMember(false);
            setUserFamilyId(null);
            setFamilyRole(null);
          }
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
        target_amount: parseFloat(goal.target_amount),
        current_amount: parseFloat(goal.current_amount) || 0,
        target_date: goal.target_date,
        priority: goal.priority,
        notes: goal.notes,
        user_id: user.id,
        status: "in_progress", // Default status for new goals
      };
      
      // Add family ID if the goal is shared with family
      if (goal.share_with_family) {
        if (isFamilyMember && userFamilyId) {
          console.log("Adding family sharing data", { family_id: userFamilyId });
          goalData.family_id = userFamilyId;
          goalData.is_shared = true;
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
          <p className="mt-3 text-gray-700">Loading...</p>
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
                    <span className="text">{isSubmitting ? "Creating..." : "Create Goal"}</span>
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
                        Current Amount (Optional)
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
                      <h5 className="font-weight-bold text-info mb-3">
                        <i className="fas fa-users mr-2"></i>
                        Family Goal Sharing
                      </h5>
                      
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="shareWithFamily"
                          name="share_with_family"
                          checked={goal.share_with_family}
                          onChange={(e) => 
                            setGoal({...goal, share_with_family: e.target.checked})
                          }
                        />
                        <label className="custom-control-label font-weight-bold" htmlFor="shareWithFamily">
                          Share this goal with my family
                        </label>
                        <div className="mt-2">
                          <small className="form-text text-muted d-block">
                            <i className="fas fa-info-circle mr-1"></i>
                            When shared, this goal will appear in your family dashboard and family members can view and contribute to it.
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
  );
};

export default CreateGoal;
