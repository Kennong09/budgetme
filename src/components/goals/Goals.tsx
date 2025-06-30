import React, { useState, useEffect, FC, useRef, ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import ErrorBoundary from "../ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percentage: number;
  progress_status: string;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  is_shared?: boolean;  // Indicates if goal is shared with family
  family_id?: string;   // ID of the family if shared
  shared_by?: string;   // User who shared the goal
  shared_by_name?: string; // Name of user who shared the goal
}

interface FilterState {
  priority: "all" | "high" | "medium" | "low";
  category: "all" | "not_started" | "in_progress" | "completed" | "cancelled";
  sortBy: "name" | "target_date" | "progress" | "amount";
  search: string;
  scope: "all" | "personal" | "family"; // Filter for personal or family goals
}

const Goals: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveringBar, setHoveringBar] = useState<boolean>(false);
  const [hoveringGoalBars, setHoveringGoalBars] = useState<{[key: string]: boolean}>({});
  // Add state for Supabase subscriptions
  const [goalSubscription, setGoalSubscription] = useState<any>(null);
  const [goalChannelName] = useState<string>(`goals_updates_${user?.id || 'anonymous'}`);
  const [goalSummary, setGoalSummary] = useState<{
    totalCurrentAmount: number;
    totalTargetAmount: number;
    overallProgress: number;
  }>({
    totalCurrentAmount: 0,
    totalTargetAmount: 0,
    overallProgress: 0
  });
  
  // Family related states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);
  
  // Add view mode state 
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Set up filter state with URL parameters or defaults
  const [filter, setFilter] = useState<FilterState>({
    priority: (queryParams.get('priority') as "all" | "high" | "medium" | "low") || "all",
    category: (queryParams.get('category') as "all" | "not_started" | "in_progress" | "completed" | "cancelled") || "all",
    sortBy: (queryParams.get('sortBy') as "name" | "target_date" | "progress" | "amount") || "name",
    search: queryParams.get('search') || "",
    scope: (queryParams.get('scope') as "all" | "personal" | "family") || "all",
  });
  
  // Create refs for any interactive elements if needed
  const goalListRef = useRef<HTMLDivElement>(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hasLinkedTransactions, setHasLinkedTransactions] = useState<boolean>(false);

  // Function to open delete confirmation modal
  const openDeleteModal = (goalId: string) => {
    setGoalToDelete(goalId);
    setShowDeleteModal(true);
  };

  // Function to close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setGoalToDelete(null);
    setIsDeleting(false);
  };

  // Function to handle goal deletion
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      setHasLinkedTransactions(false);
      
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalToDelete);
        
      if (error) {
        // Check for foreign key constraint violation
        if (error.message.includes("foreign key constraint") && error.message.includes("transactions_goal_id_fkey")) {
          setHasLinkedTransactions(true);
          throw new Error("This goal has linked transactions. Please reassign or delete these transactions before deleting the goal.");
        }
        throw new Error(`Error deleting goal: ${error.message}`);
      }
      
      // Optimistically update the UI by removing the deleted goal from state
      const updatedGoals = goals.filter(goal => goal.id !== goalToDelete);
      setGoals(updatedGoals);
      
      // Also update filtered goals to keep the UI in sync
      const updatedFiltered = filteredGoals.filter(goal => goal.id !== goalToDelete);
      setFilteredGoals(updatedFiltered);
      
      // Update goal summary
      const totalCurrentAmount = updatedGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
      const totalTargetAmount = updatedGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
      const overallProgress = totalTargetAmount > 0 
        ? Math.min((totalCurrentAmount / totalTargetAmount) * 100, 100) 
        : 0;
        
      setGoalSummary({
        totalCurrentAmount,
        totalTargetAmount,
        overallProgress
      });
      
      showSuccessToast("Goal deleted successfully");
      closeDeleteModal();
    } catch (err) {
      console.error("Error deleting goal:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setDeleteError(errorMessage);
      showErrorToast(`Failed to delete goal: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  // Function to view transactions associated with a goal
  const viewLinkedTransactions = () => {
    if (!goalToDelete) return;
    
    // Navigate to transactions page with goal filter
    navigate(`/transactions?goal_id=${goalToDelete}`);
    closeDeleteModal();
  };

  // Fetch goals data from Supabase
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          showErrorToast("Please sign in to view your goals");
          navigate("/login");
          return;
        }
        
        // Fetch personal goals
        const { data: personalGoals, error: personalGoalsError } = await supabase
          .from('goal_details')
          .select('*')
          .eq('user_id', user.id);
          
        if (personalGoalsError) {
          throw new Error(`Error fetching personal goals: ${personalGoalsError.message}`);
        }
        
        // Mark personal goals, ensuring any with family_id are correctly marked as shared
        const formattedPersonalGoals = (personalGoals || []).map(goal => ({
          ...goal,
          is_shared: !!goal.family_id // Ensure goals with family_id are marked as shared
        }));
        
        let allGoals = [...formattedPersonalGoals];
        
        // If user is in a family, also fetch family's shared goals
        if (isFamilyMember && userFamilyId) {
          // Fetch shared goals from other family members
          const { data: sharedGoals, error: sharedGoalsError } = await supabase
            .from('goals')
            .select(`
              *,
              profiles:user_id (
                user_metadata
              )
            `)
            .eq('family_id', userFamilyId)
            .neq('user_id', user.id); // Only goals from other family members
            
          if (!sharedGoalsError && sharedGoals) {
            // Format shared goals with owner information
            const formattedSharedGoals = sharedGoals.map(goal => ({
              ...goal,
              is_shared: true,
              shared_by: goal.user_id,
              shared_by_name: goal.profiles?.user_metadata?.username || 
                             goal.profiles?.user_metadata?.full_name || 
                             "Family Member"
            }));
            
            allGoals = [...formattedPersonalGoals, ...formattedSharedGoals];
          }
        }
        
        console.log(`Retrieved ${allGoals.length} goals (${formattedPersonalGoals.length} personal, ${allGoals.length - formattedPersonalGoals.length} shared)`);
        
        if (allGoals.length > 0) {
          // Calculate goal summary
          const totalCurrentAmount = allGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
          const totalTargetAmount = allGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
          const overallProgress = totalTargetAmount > 0 
            ? Math.min((totalCurrentAmount / totalTargetAmount) * 100, 100) 
            : 0;
            
          setGoalSummary({
            totalCurrentAmount,
            totalTargetAmount,
            overallProgress
          });
        }
        
        setGoals(allGoals);
        setFilteredGoals(allGoals);
        setLoading(false);
      } catch (err) {
        console.error("Error loading goals:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        showErrorToast(`Failed to load goals: ${errorMessage}`);
        setLoading(false);
      }
    };
    
    // Only fetch when we know the family status
    if (user) {
      fetchGoals();
    }
  }, [user, navigate, showErrorToast, isFamilyMember, userFamilyId]);
  
  // Set up real-time subscriptions in a separate useEffect
  useEffect(() => {
    if (!user) return;

    // Clean up any existing subscriptions first
    if (goalSubscription) {
      console.log("Removing existing goal subscription");
      supabase.removeChannel(goalSubscription);
    }

    console.log(`Setting up new subscription for user ${user.id}`);

    // Create new goal subscription with unique channel name
    const newGoalSubscription = supabase
      .channel(goalChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("Goal update received:", payload);
        
        // Refresh data when changes occur
        const fetchUpdatedGoals = async () => {
          try {
            const { data, error } = await supabase
              .from('goal_details')
              .select('*')
              .eq('user_id', user.id);
              
            if (!error && data) {
              setGoals(data);
              
              // Recalculate goal summary
              const totalCurrentAmount = data.reduce((sum, goal) => sum + goal.current_amount, 0);
              const totalTargetAmount = data.reduce((sum, goal) => sum + goal.target_amount, 0);
              const overallProgress = totalTargetAmount > 0 
                ? Math.min((totalCurrentAmount / totalTargetAmount) * 100, 100) 
                : 0;
                
              setGoalSummary({
                totalCurrentAmount,
                totalTargetAmount,
                overallProgress
              });
              
              // Apply current filters to the new data
              applyFilters(data);
            }
          } catch (err) {
            console.error("Error refreshing goals data:", err);
          }
        };
        
        fetchUpdatedGoals();
      })
      .subscribe((status) => {
        console.log(`Goal subscription status: ${status}`);
      });

    // Save subscription references
    setGoalSubscription(newGoalSubscription);

    // Clean up subscription on unmount or when dependencies change
    return () => {
      console.log("Cleaning up subscription");
      if (newGoalSubscription) {
        supabase.removeChannel(newGoalSubscription);
      }
    };
  }, [user, goalChannelName]);
  
  // Update URL when filters change
  useEffect(() => {
    if (goals.length === 0) return;
    
    // Create URL search params from filters
    const params = new URLSearchParams();
    
    // Only add parameters that are not default values
    if (filter.priority !== "all") params.set("priority", filter.priority);
    if (filter.category !== "all") params.set("category", filter.category);
    if (filter.sortBy !== "name") params.set("sortBy", filter.sortBy);
    if (filter.search !== "") params.set("search", filter.search);
    
    // Update URL without refreshing the page
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    navigate(newUrl, { replace: true });
    
    // Apply filters with loader
    applyFilters();
    
  }, [filter, goals, navigate]);
  
  // Function to apply filters with loading indicator
  const applyFilters = (dataToFilter = goals) => {
    if (dataToFilter.length === 0) return;
    
    let result = [...dataToFilter];
    
    // Show loading state
    setIsFiltering(true);
    
    setTimeout(() => {
      // Filter by priority
      if (filter.priority !== "all") {
        result = result.filter(goal => goal.priority === filter.priority);
      }
      
      // Filter by category (status)
      if (filter.category !== "all") {
        result = result.filter(goal => goal.status === filter.category);
      }
      
      // Filter by scope (personal vs family)
      if (filter.scope !== "all") {
        if (filter.scope === "personal") {
          result = result.filter(goal => !goal.is_shared);
        } else if (filter.scope === "family") {
          result = result.filter(goal => goal.is_shared);
        }
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(goal => 
          goal.goal_name.toLowerCase().includes(searchTerm) ||
          (goal.notes && goal.notes.toLowerCase().includes(searchTerm)) ||
          (goal.shared_by_name && goal.shared_by_name.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply sorting
      result = sortGoals(result, filter.sortBy);
      
      setFilteredGoals(result);
      setIsFiltering(false);
    }, 300);
  };
  
  // Function to sort goals based on sortBy criteria
  const sortGoals = (goalsToSort: Goal[], sortBy: string): Goal[] => {
    switch(sortBy) {
      case "name":
        return [...goalsToSort].sort((a, b) => a.goal_name.localeCompare(b.goal_name));
      case "target_date":
        return [...goalsToSort].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
      case "progress":
        return [...goalsToSort].sort((a, b) => {
          const progressA = a.current_amount / a.target_amount;
          const progressB = b.current_amount / b.target_amount;
          return progressB - progressA; // Higher progress first
        });
      case "amount":
        return [...goalsToSort].sort((a, b) => b.target_amount - a.target_amount); // Higher amount first
      default:
        return goalsToSort;
    }
  };

  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Set filtering state before applying changes
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      priority: "all",
      category: "all",
      sortBy: "name",
      search: "",
      scope: "all",
    });
    
    // Update URL to remove all query parameters
    navigate('', { replace: true });
  };

  // Updated toggle tip function to position tooltips correctly below each info icon
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

  const handleGoalBarHover = (goalId: string, isHovering: boolean) => {
    setHoveringGoalBars(prev => ({
      ...prev,
      [goalId]: isHovering
    }));
  };

  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user) return;
      
      try {
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
      }
    };
    
    checkFamilyStatus();
  }, [user]);

  // Add filter UI component with scope filter
  const renderFilterUI = () => {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filter Goals</h6>
          <button 
            onClick={resetFilters} 
            className="btn btn-sm btn-outline-primary"
            disabled={isFiltering}
          >
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-3">
              <label htmlFor="priority" className="font-weight-bold text-gray-800">Priority</label>
              <select
                id="priority"
                name="priority"
                value={filter.priority}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="category" className="font-weight-bold text-gray-800">Status</label>
              <select
                id="category"
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="all">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Scope Filter - only show if user is part of a family */}
            {isFamilyMember && (
              <div className="col-md-3 mb-3">
                <label htmlFor="scope" className="font-weight-bold text-gray-800">Scope</label>
                <select
                  id="scope"
                  name="scope"
                  value={filter.scope}
                  onChange={handleFilterChange}
                  className="form-control"
                  disabled={isFiltering}
                >
                  <option value="all">All Goals</option>
                  <option value="personal">My Personal Goals</option>
                  <option value="family">Family Shared Goals</option>
                </select>
              </div>
            )}

            <div className={`col-md-${isFamilyMember ? 3 : 6} mb-3`}>
              <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filter.sortBy}
                onChange={handleFilterChange}
                className="form-control"
                disabled={isFiltering}
              >
                <option value="name">Goal Name</option>
                <option value="target_date">Target Date</option>
                <option value="progress">Progress</option>
                <option value="amount">Amount</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-12 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search goal name or notes..."
                className="form-control"
                disabled={isFiltering}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Goals Table - Replace the existing grid of cards with a table
  const renderGoalsTable = () => {
    return (
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.6s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Goal List
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('goalList', e)}
                aria-label="Goal list information"
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </h6>
          <div>
            <button className="btn btn-sm btn-outline-primary mr-2">
              <i className="fas fa-download fa-sm"></i> Export
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th>Goal Name</th>
                  <th>Target Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFiltering ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <p className="text-gray-600 mt-3">Filtering goals...</p>
                    </td>
                  </tr>
                ) : filteredGoals.length > 0 ? (
                  filteredGoals.map((goal) => {
                    const progressPercentage = Math.min(goal.percentage, 100);
                    const priorityClass = goal.priority === "high" ? "text-danger" : 
                                         goal.priority === "medium" ? "text-warning" : "text-info";
                    const statusClass = goal.status === "completed" ? "badge-success" : 
                                       goal.status === "in_progress" ? "badge-primary" :
                                       goal.status === "not_started" ? "badge-secondary" : "badge-danger";
                    
                    const monthlySavingsNeeded: number = calculateMonthlySavingsForGoal({
                      target_amount: goal.target_amount,
                      current_amount: goal.current_amount,
                      target_date: goal.target_date
                    });

                    return (
                      <tr key={goal.id}>
                        <td>
                          <div className="font-weight-bold">
                            {goal.goal_name}
                          </div>
                          {goal.is_shared && (
                            <div className="small mt-1">
                              <span className="badge badge-info">
                                <i className="fas fa-users mr-1"></i> Family
                              </span>
                              {goal.shared_by_name && (
                                <span className="badge badge-light ml-1 small">
                                  {goal.shared_by_name}
                                </span>
                              )}
                            </div>
                          )}
                          {!goal.is_shared && (
                            <div className="small mt-1">
                              <span className="badge badge-secondary">
                                <i className="fas fa-user mr-1"></i> Personal
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{formatDate(goal.target_date)}</div>
                          <div className="small text-gray-600">
                            {getRemainingDays(goal.target_date) > 0 ? 
                              `${getRemainingDays(goal.target_date)} days left` : 
                              <span className="text-danger">Past due</span>
                            }
                          </div>
                        </td>
                        <td>
                          <span className={`font-weight-bold ${priorityClass}`}>
                            <i className={`fas fa-flag mr-1 ${priorityClass}`}></i>
                            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusClass}`}>
                            {formatStatusName(goal.status)}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress mr-2" style={{ height: '10px', width: '80px' }}>
                              <div 
                                className={`progress-bar ${
                                  progressPercentage >= 90 ? "bg-success" : 
                                  progressPercentage >= 50 ? "bg-info" : 
                                  progressPercentage >= 25 ? "bg-warning" : 
                                  "bg-danger"
                                }`}
                                role="progressbar" 
                                style={{ width: `${progressPercentage}%` }}
                                aria-valuenow={progressPercentage}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                            <span>{formatPercentage(progressPercentage)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="font-weight-bold">
                              {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                            </span>
                            <small className="text-gray-600">
                              {formatCurrency(monthlySavingsNeeded)} monthly
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex justify-content-center align-items-center">
                            <Link
                              to={`/goals/${goal.id}`}
                              className="btn btn-info btn-circle btn-sm mx-1"
                              title="View Goal"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            {/* Show edit and delete buttons for personal goals */}
                            {!goal.is_shared && (
                              <>
                                <Link
                                  to={`/goals/${goal.id}/edit`}
                                  className="btn btn-primary btn-circle btn-sm mx-1"
                                  title="Edit Goal"
                                >
                                  <i className="fas fa-edit"></i>
                                </Link>
                                <button
                                  className="btn btn-danger btn-circle btn-sm mx-1"
                                  onClick={() => openDeleteModal(goal.id)}
                                  title="Delete Goal"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            )}
                            {/* Allow editing shared goals if user is the owner */}
                            {goal.is_shared && goal.user_id === user?.id && (
                              <>
                                <Link
                                  to={`/goals/${goal.id}/edit`}
                                  className="btn btn-primary btn-circle btn-sm mx-1"
                                  title="Edit Goal"
                                >
                                  <i className="fas fa-edit"></i>
                                </Link>
                                <button
                                  className="btn btn-danger btn-circle btn-sm mx-1"
                                  onClick={() => openDeleteModal(goal.id)}
                                  title="Delete Goal"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                      <p className="text-gray-500">No goals found matching your filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Updated goal card component to show shared goal status
  const renderGoalCard = (goal: Goal) => {
    const progressPercentage = Math.min(goal.percentage, 100);
    const daysLeft = getRemainingDays(goal.target_date);
    const priorityClass = goal.priority === "high" ? "text-danger" : goal.priority === "medium" ? "text-warning" : "text-info";
    const statusClass = goal.status === "completed" ? "badge-success" : 
                       goal.status === "in_progress" ? "badge-primary" :
                       goal.status === "not_started" ? "badge-secondary" : "badge-danger";
    
    const barClasses = `progress-bar ${
      progressPercentage >= 90 ? "bg-success" : 
      progressPercentage >= 50 ? "bg-info" : 
      progressPercentage >= 25 ? "bg-warning" : 
      "bg-danger"
    } ${hoveringGoalBars[goal.id] ? 'progress-bar-hover' : ''}`;
    
    const monthlySavingsNeeded: number = calculateMonthlySavingsForGoal({
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date
    });
    
    return (
      <div className="col-xl-4 col-md-6 mb-4" key={goal.id}>
        <div className={`card shadow h-100 ${goal.is_shared ? 'border-left-info' : 'border-left-secondary'}`}>
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary">
              {goal.goal_name}
              {goal.is_shared ? (
                <span className="badge badge-info ml-2">
                  <i className="fas fa-users mr-1"></i> Family
                </span>
              ) : (
                <span className="badge badge-secondary ml-2">
                  <i className="fas fa-user mr-1"></i> Personal
                </span>
              )}
            </h6>
            <div className="dropdown no-arrow">
              <button className="btn btn-link btn-sm dropdown-toggle" type="button" id={`dropdownMenuLink${goal.id}`} data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i className="fas fa-ellipsis-v fa-fw"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-right shadow animated--fade-in" aria-labelledby={`dropdownMenuLink${goal.id}`}>
                <div className="dropdown-header">Goal Actions:</div>
                <Link to={`/goals/${goal.id}`} className="dropdown-item">
                  <i className="fas fa-eye fa-fw mr-2 text-gray-400"></i>View Details
                </Link>
                {!goal.is_shared && (
                  <>
                    <Link to={`/goals/${goal.id}/edit`} className="dropdown-item">
                      <i className="fas fa-edit fa-fw mr-2 text-gray-400"></i>Edit Goal
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item text-danger" 
                      onClick={() => openDeleteModal(goal.id)}
                    >
                      <i className="fas fa-trash fa-fw mr-2 text-danger"></i>Delete Goal
                    </button>
                  </>
                )}
                {/* Allow editing shared goals if user is the owner */}
                {goal.is_shared && goal.user_id === user?.id && (
                  <>
                    <Link to={`/goals/${goal.id}/edit`} className="dropdown-item">
                      <i className="fas fa-edit fa-fw mr-2 text-gray-400"></i>Edit Goal
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item text-danger" 
                      onClick={() => openDeleteModal(goal.id)}
                    >
                      <i className="fas fa-trash fa-fw mr-2 text-danger"></i>Delete Goal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="card-body pt-2 d-flex flex-column">
            {/* Shared Goal Indicator */}
            {goal.is_shared && (
              <div className="mb-2">
                {goal.shared_by_name && (
                  <span className="badge badge-light ml-1">
                    <i className="fas fa-user mr-1"></i> {goal.shared_by_name}
                  </span>
                )}
              </div>
            )}
            
            <div className="mb-2 d-flex justify-content-between align-items-center">
              <span className={`badge ${statusClass}`}>
                {formatStatusName(goal.status)}
              </span>
              <span className={`font-weight-bold ${priorityClass}`}>
                <i className={`fas fa-flag mr-1 ${priorityClass}`}></i>
                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
              </span>
            </div>

            <div className="mb-2 d-flex justify-content-between align-items-baseline">
              <div className="small text-gray-600">
                <i className="fas fa-calendar-alt mr-1"></i>
                {daysLeft > 0 ? `${daysLeft} days left` : "Past due"}
              </div>
              <div className="text-xs text-gray-500">
                <i className="fas fa-hourglass-half mr-1"></i>
                {formatDate(goal.target_date)}
              </div>
            </div>

            <div className="mb-2 d-flex justify-content-between">
              <span className="font-weight-bold text-gray-800">{formatCurrency(goal.current_amount)}</span>
              <span className="text-gray-600">of {formatCurrency(goal.target_amount)}</span>
            </div>

            <div className="progress mb-2" style={{height: '10px'}}
              onMouseEnter={() => handleGoalBarHover(goal.id, true)}
              onMouseLeave={() => handleGoalBarHover(goal.id, false)}
            >
              <div 
                className={barClasses}
                role="progressbar" 
                style={{ width: `${progressPercentage}%` }}
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>

            <div className="d-flex justify-content-between mb-3">
              <small className="text-gray-600">{formatPercentage(progressPercentage)} Complete</small>
              <small className="text-gray-600">{formatCurrency(goal.remaining)} left</small>
            </div>

            {goal.status !== "completed" && goal.status !== "cancelled" && daysLeft > 0 && (
              <div className="alert alert-info mb-3 py-2 small">
                <i className="fas fa-piggy-bank mr-1"></i>
                Save {formatCurrency(monthlySavingsNeeded)} monthly to reach your goal
              </div>
            )}

            {goal.is_overdue && goal.status !== "completed" && goal.status !== "cancelled" && (
              <div className="alert alert-danger mb-3 py-2 small">
                <i className="fas fa-exclamation-circle mr-1"></i>
                This goal is past its target date
              </div>
            )}

            <div className="mt-auto pt-3 border-top">
              <Link to={`/goals/${goal.id}`} className="btn btn-sm btn-primary btn-block">
                <i className="fas fa-eye mr-1"></i> View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Financial Goals
          </h5>
          <p className="text-gray-500">Please wait while we prepare your goal dashboard...</p>
        </div>
      </div>
    );
  }

  // Get unique statuses from goals for filter dropdown (instead of categories)
  const statuses = Array.from(new Set(goals.map(goal => goal.status))).sort();

  // Get totals directly from goalSummary
  const totalSaved = goalSummary.totalCurrentAmount;
  const totalTarget = goalSummary.totalTargetAmount;
  const overallProgress = goalSummary.overallProgress;
  
  // Function to determine progress status color
  const getProgressStatusColor = (percentage: number): string => {
    if (percentage >= 90) return "success";
    if (percentage >= 50) return "info";
    if (percentage >= 25) return "warning";
    return "danger";
  };

  // Check if there are any goals
  const hasGoals = goals.length > 0;

  // Determine goal health status based on overall progress
  const goalHealthStatus = overallProgress >= 90 ? "Healthy" : 
                         overallProgress >= 75 ? "On Track" : 
                         overallProgress >= 50 ? "Caution" : 
                         "Needs Attention";
                         
  const goalHealthIcon = overallProgress >= 90 ? "check-circle" :
                       overallProgress >= 75 ? "thumbs-up" :
                       overallProgress >= 50 ? "exclamation-circle" :
                       "exclamation-triangle";
                       
  const goalHealthColor = overallProgress >= 90 ? "#1cc88a" : 
                        overallProgress >= 75 ? "#36b9cc" :
                        overallProgress >= 50 ? "#f6c23e" :
                        "#e74a3b";

  // Helper function to format status names for display
  const formatStatusName = (status: string): string => {
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Financial Goals</h1>
        <div>
          <div className="btn-group mr-2">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <i className="fas fa-table fa-sm"></i>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <i className="fas fa-th fa-sm"></i>
            </button>
          </div>
          <Link 
            to="/goals/create" 
            className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm animate__animated animate__fadeIn"
          >
            <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>Create Goal
          </Link>
        </div>
      </div>

      {/* Goals Summary Cards - Always show, with zero values when no goals */}
      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Active Goals
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('activeGoals', e)}
                        aria-label="Active Goals information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {filteredGoals.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-flag fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Total Saved
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalSaved', e)}
                        aria-label="Total Saved information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalSaved)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Total Target
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('totalTarget', e)}
                        aria-label="Total Target information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalTarget)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-bullseye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Progress - Match Budgets/Transaction components style */}
      <div className="row">
        <div className="col-xl-8 col-lg-7 mb-4">
          <div className="card shadow animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Overall Goal Progress
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('overallProgress', e)}
                    aria-label="Overall Progress information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
              {goals.length > 0 && (
                <div className={`badge badge-${
                  overallProgress >= 90 ? "success" : 
                  overallProgress >= 75 ? "info" : 
                  overallProgress >= 50 ? "warning" : 
                  "danger"
                } ml-2`}>
                  {overallProgress >= 90 ? "Excellent" : 
                  overallProgress >= 75 ? "On Track" : 
                  overallProgress >= 50 ? "Getting Started" :
                  "Just Beginning"}
                </div>
              )}
            </div>
            <div className="card-body">
              {goals.length > 0 ? (
                <>
                  <div className="mb-2 d-flex justify-content-between">
                    <span>Overall Progress</span>
                    <span className={`font-weight-bold ${
                      overallProgress >= 90 ? "text-success" : 
                      overallProgress >= 75 ? "text-info" : 
                      overallProgress >= 50 ? "text-warning" : 
                      "text-danger"
                    }`}>{formatPercentage(overallProgress)}</span>
                  </div>
                  <div 
                    className="progress mb-4 position-relative"
                    onMouseEnter={() => setHoveringBar(true)}
                    onMouseLeave={() => setHoveringBar(false)}
                  >
                    <div
                      className={`progress-bar ${
                        overallProgress >= 90 ? "bg-success" : 
                        overallProgress >= 75 ? "bg-info" : 
                        overallProgress >= 50 ? "bg-warning" : 
                        "bg-danger"
                      }`}
                      role="progressbar"
                      style={{ width: `${overallProgress}%` }}
                      aria-valuenow={overallProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                    {hoveringBar && (
                      <div 
                        className="position-absolute text-dark px-2 py-1 small"
                        style={{
                          top: "-30px",
                          left: `${Math.min(Math.max(overallProgress, 5), 95)}%`,
                          transform: "translateX(-50%)",
                          backgroundColor: "white",
                          borderRadius: "4px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                          fontWeight: "bold",
                          zIndex: 10
                        }}
                      >
                        {formatPercentage(overallProgress)}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">GOAL STATUS</div>
                  <div className="row">
                    <div className="col-md-3 mb-4">
                      <div style={{ 
                        backgroundColor: "#1cc88a", 
                        borderRadius: "8px", 
                        height: "100%",
                        padding: "15px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                      }}>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Healthy</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>90-100%</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                      </div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div style={{ 
                        backgroundColor: "#36b9cc", 
                        borderRadius: "8px", 
                        height: "100%",
                        padding: "15px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                      }}>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>On Track</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>75-89%</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                      </div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div style={{ 
                        backgroundColor: "#f6c23e", 
                        borderRadius: "8px", 
                        height: "100%",
                        padding: "15px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                      }}>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Getting</div>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Started</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>50-74%</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                      </div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div style={{ 
                        backgroundColor: "#e74a3b", 
                        borderRadius: "8px", 
                        height: "100%",
                        padding: "15px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                      }}>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Just</div>
                        <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Beginning</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>0-49%</div>
                        <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-line fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No goal progress data available</h5>
                  <p className="text-gray-500 mb-0 small">Create financial goals to track your progress.</p>
                  <Link to="/goals/create" className="btn btn-sm btn-primary mt-3">
                    <i className="fas fa-plus fa-sm mr-1"></i> Create New Goal
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goal Health Card - Match Budget Health Card */}
        <div className="col-xl-4 col-lg-5 mb-4">
          <div className="card shadow animate__animated animate__fadeIn" style={{ animationDelay: "0.45s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Goal Health
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('goalHealth', e)}
                    aria-label="Goal health information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {goals.length > 0 ? (
                <>
                  <div className="text-center">
                    <div className="mb-3">
                      <i className={`fas fa-${goalHealthIcon} fa-3x mb-3`} style={{color: goalHealthColor}}></i>
                    </div>
                    <h4 className="font-weight-bold" style={{ color: goalHealthColor }}>
                      {goalHealthStatus}
                    </h4>
                    <p className="mb-0">
                      You've achieved {formatPercentage(overallProgress)} of your goals.
                      {overallProgress >= 90 ? " You're doing excellently!" : 
                      overallProgress >= 75 ? " Keep up the good work!" : 
                      overallProgress >= 50 ? " You're making progress!" : 
                      " Keep going, you're just getting started!"}
                    </p>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <i className="fas fa-lightbulb text-warning mr-1"></i>
                    <strong>Tip:</strong> Regular contributions to your goals will help you reach them faster.
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-heartbeat fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No goal health data</h5>
                  <p className="text-gray-500 mb-0 small">Create goals to see your financial health status.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      {renderFilterUI()}

      {/* Goals Table or Grid depending on viewMode */}
      {viewMode === "table" ? (
        renderGoalsTable()
      ) : (
        <div className="row" ref={goalListRef}>
          {isFiltering ? (
            <div className="col-12 text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Filtering...</span>
              </div>
              <p className="mt-2 text-gray-600">Filtering goals...</p>
            </div>
          ) : filteredGoals.length > 0 ? (
            filteredGoals.map(goal => renderGoalCard(goal))
          ) : (
            <div className="col-12 text-center my-5">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <h5 className="text-gray-500 font-weight-light">No goals match your filters</h5>
              <p className="text-gray-500 mb-0 small">Try adjusting your filter criteria or create a new goal.</p>
              <Link to="/goals/create" className="btn btn-sm btn-primary mt-3">
                <i className="fas fa-plus fa-sm mr-1"></i> Create New Goal
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Global tooltip that matches Budget and Transaction components */}
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
          {activeTip === 'activeGoals' && (
            <>
              <div className="tip-title">Active Goals</div>
              <p className="tip-description">
                The number of financial goals you're currently working towards. Creating specific, measurable goals helps you stay focused on your financial journey.
              </p>
            </>
          )}
          {activeTip === 'totalSaved' && (
            <>
              <div className="tip-title">Total Saved</div>
              <p className="tip-description">
                The total amount you've saved across all your goals. This represents your progress and commitment to reaching your financial targets.
              </p>
            </>
          )}
          {activeTip === 'totalTarget' && (
            <>
              <div className="tip-title">Total Target</div>
              <p className="tip-description">
                The combined amount of all your goal targets. This is the total sum you're working towards across all your financial objectives.
              </p>
            </>
          )}
          {activeTip === 'overallProgress' && (
            <>
              <div className="tip-title">Overall Goal Progress</div>
              <p className="tip-description">
                Your combined progress across all goals. This percentage shows how far you've come toward reaching all your financial targets collectively. The color indicates your progress status from beginning (red) to excellent (green).
              </p>
            </>
          )}
          {activeTip === 'goalHealth' && (
            <>
              <div className="tip-title">Goal Health Status</div>
              <p className="tip-description">
                A quick assessment of your overall financial goal health based on your progress. "Healthy" indicates excellent progress, "On Track" means good progress, "Getting Started" shows you're making headway, and "Just Beginning" signals you're in early stages.
              </p>
            </>
          )}
          {activeTip === 'goalList' && (
            <>
              <div className="tip-title">Goal List</div>
              <p className="tip-description">
                A detailed list of all your financial goals with their current status, progress, and remaining amount. You can view details, make contributions, edit or delete each goal using the action buttons.
              </p>
            </>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button type="button" className="close" onClick={closeDeleteModal} disabled={isDeleting}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                    style={{ width: "80px", height: "80px", backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                    <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
                  </div>
                </div>
                
                {deleteError ? (
                  <>
                    <div className="alert alert-danger">
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      {deleteError}
                    </div>
                    
                    {hasLinkedTransactions && (
                      <div className="mt-3">
                        <p>To resolve this issue, you need to:</p>
                        <ol className="text-left">
                          <li>View the transactions linked to this goal</li>
                          <li>Either delete them or reassign them to another goal</li>
                          <li>Then try deleting this goal again</li>
                        </ol>
                        <button 
                          type="button" 
                          className="btn btn-info mt-2"
                          onClick={viewLinkedTransactions}
                        >
                          <i className="fas fa-search mr-1"></i> View Linked Transactions
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                    <div className="alert alert-warning small mt-3">
                      <i className="fas fa-info-circle mr-1"></i>
                      <strong>Note:</strong> If this goal has linked transactions, you'll need to reassign or delete those transactions first.
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                {!deleteError && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteGoal}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Delete
                      </>
                    ) : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;

