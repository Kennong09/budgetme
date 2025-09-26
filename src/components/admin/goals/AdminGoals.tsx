import React, { useState, useEffect, ChangeEvent, useTransition, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
} from "../../../utils/helpers";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { Goal as BaseGoal, GoalSummary } from "../../../types";

// Import any necessary CSS
import "../admin.css";

// Interface for Supabase goal data
interface SupabaseGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: string;
  category?: string;
  notes?: string;
  created_at: string;
  family_id?: string;
}

// Interface for user profile
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

// Extended Goal interface for admin view
interface Goal extends BaseGoal {
  user_name?: string;
  user_email?: string;
  progress_status?: string;
}

const AdminGoals: React.FC = () => {
  // Add useTransition hook
  const [isPending, startTransition] = useTransition();
  
  // State for goals data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const { showSuccessToast, showErrorToast } = useToast();

  const ITEMS_PER_PAGE = pageSize;

  // Set up filter state
  const [filter, setFilter] = useState({
    priority: "all",
    status: "all",
    user: "all",
    sortBy: "name",
    search: "",
  });

  // Mock user data for filtering
  const users = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Robert Johnson" },
  ];

  useEffect(() => {
    // Use startTransition for data loading
    startTransition(() => {
      fetchGoals();
      fetchUserProfiles();
    });
  }, [currentPage, filter.priority, filter.status, filter.user, filter.search, filter.sortBy, pageSize]);

  // Set up real-time subscription
  useEffect(() => {
    // Create channel reference outside to ensure we can clean it up
    const channel = supabaseAdmin.channel('admin-goals-channel');
    
    // Set up the subscription
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'goals' }, 
        () => {
          // Refresh goal data when goals table changes - wrap in startTransition
          startTransition(() => {
            fetchGoals();
          });
        }
      )
      .subscribe();
    
    // Store subscription reference
    setSubscription(channel);
    
    // Cleanup subscription on component unmount
    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, []); // Empty dependency array means this runs once on mount

  // Fetch user profiles from Supabase
  const fetchUserProfiles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email');
      
      if (profilesError) {
        throw profilesError;
      }
      
      // Create a map of user profiles by ID for quick access
      const profilesMap: {[key: string]: UserProfile} = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || 'No Email'
        };
      });
      
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      showErrorToast("Failed to load user profiles");
    }
  };

  // Fetch goals from Supabase
  const fetchGoals = async () => {
    try {
      setLoading(true);

      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('goals')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      if (filter.priority !== 'all') {
        countQuery = countQuery.eq('priority', filter.priority);
      }
      
      if (filter.status !== 'all') {
        countQuery = countQuery.eq('status', filter.status);
      }
      
      if (filter.user !== 'all') {
        countQuery = countQuery.eq('user_id', filter.user);
      }
      
      if (filter.search) {
        countQuery = countQuery.ilike('goal_name', `%${filter.search}%`);
      }
      
      // Get total count with filters applied
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }
      
      // Construct query for goals with all data
      let dataQuery = supabaseAdmin
        .from('goals')
        .select('*');
      
      // Apply sorting
      const sortField = filter.sortBy === 'name' ? 'goal_name' : 
                       filter.sortBy === 'amount' ? 'target_amount' : 
                       filter.sortBy === 'progress' ? 'current_amount' : 'target_date';
      
      const sortDirection = filter.sortBy === 'progress' ? { ascending: false } : { ascending: true };
      dataQuery = dataQuery.order(sortField, sortDirection);
      
      // Apply same filters to main query
      if (filter.priority !== 'all') {
        dataQuery = dataQuery.eq('priority', filter.priority);
      }
      
      if (filter.status !== 'all') {
        dataQuery = dataQuery.eq('status', filter.status);
      }
      
      if (filter.user !== 'all') {
        dataQuery = dataQuery.eq('user_id', filter.user);
      }
      
      if (filter.search) {
        dataQuery = dataQuery.ilike('goal_name', `%${filter.search}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // Final query with pagination
      const { data: goalData, error: goalError } = await dataQuery
        .range(from, to);
      
      if (goalError) {
        throw goalError;
      }
      
      // Process goal data to calculate percentages, remaining amounts, etc.
      const processedGoals: Goal[] = [];
      
      for (const goal of goalData || []) {
        const userProfile = userProfiles[goal.user_id] || {
          id: goal.user_id,
          full_name: 'Unknown User',
          email: 'No Email'
        };
        
        // Calculate percentage and remaining amount
        const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
        const remaining = goal.target_amount - goal.current_amount;
        
        // Create processed goal object
        const processedGoal: Goal = {
          id: goal.id,
          user_id: goal.user_id,
          goal_name: goal.goal_name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          target_date: goal.target_date,
          priority: goal.priority,
          status: goal.status,
          category: goal.category || '',
          created_at: goal.created_at,
          user_name: userProfile.full_name, // Add to the Goal interface if needed
          user_email: userProfile.email, // Add to the Goal interface if needed
          remaining: goal.target_amount - goal.current_amount,
          percentage: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
          progress_status: getProgressStatus(percentage),
          is_overdue: new Date(goal.target_date) < new Date() && percentage < 100,
          is_family_goal: !!goal.family_id,
          family_id: goal.family_id
        };
        
        processedGoals.push(processedGoal);
      }
      
      // Set state with processed data
      setGoals(processedGoals);
      
      // Calculate summary data
      calculateGoalSummary(processedGoals);
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.ceil((totalCount || 0) / ITEMS_PER_PAGE));
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching goals:", error);
      showErrorToast(`Failed to load goals: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      setLoading(false);
    }
  };

  // Helper function to determine progress status
  const getProgressStatus = (percentage: number): string => {
    if (percentage >= 100) return "completed";
    if (percentage >= 75) return "on_track";
    if (percentage >= 50) return "in_progress";
    if (percentage >= 25) return "behind";
    return "at_risk";
  };

  // Calculate summary data for goals
  const calculateGoalSummary = (goalsList: Goal[]) => {
    const summary = {
      totalGoals: goalsList.length,
      activeGoals: goalsList.filter(g => g.status !== 'completed').length,
      completedGoals: goalsList.filter(g => g.status === 'completed').length,
      totalTargetAmount: goalsList.reduce((sum, g) => sum + g.target_amount, 0),
      totalCurrentAmount: goalsList.reduce((sum, g) => sum + g.current_amount, 0),
      totalRemainingAmount: goalsList.reduce((sum, g) => {
        const remaining = g.remaining !== undefined ? g.remaining : (g.target_amount - g.current_amount);
        return sum + remaining;
      }, 0),
      overallProgress: goalsList.length > 0 ? 
        (goalsList.reduce((sum, g) => sum + g.current_amount, 0) / 
         goalsList.reduce((sum, g) => sum + g.target_amount, 0)) * 100 : 0,
      goalsByPriority: {
        high: goalsList.filter(g => g.priority === 'high').length,
        medium: goalsList.filter(g => g.priority === 'medium').length,
        low: goalsList.filter(g => g.priority === 'low').length,
      }
    };
    
    setGoalSummary(summary);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchGoals(); // Re-fetch with the current search term
  };

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Use startTransition to avoid suspense during synchronous updates
    startTransition(() => {
      setFilter(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Reset to first page when filtering
      setCurrentPage(1);
    });
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setFilter({
      priority: "all",
      status: "all",
      user: "all",
      sortBy: "name",
      search: "",
    });
    
    // Reset to first page
    setCurrentPage(1);
  };

  // Handle goal deletion
  const handleDeleteClick = (goalId: string): void => {
    setSelectedGoalId(goalId);
    setShowDeleteModal(true);
  };

  // Confirm goal deletion
  const confirmDelete = async (): Promise<void> => {
    if (selectedGoalId) {
      try {
        // Delete goal from Supabase
        const { error } = await supabaseAdmin
          .from('goals')
          .delete()
          .eq('id', selectedGoalId);
        
        if (error) {
          throw error;
        }
        
        // Show success message
        showSuccessToast("Goal deleted successfully");
      
        // Close modal and refresh data
      setShowDeleteModal(false);
      setSelectedGoalId(null);
        
        // Refresh goals data
        fetchGoals();
      } catch (error) {
        console.error("Error deleting goal:", error);
        showErrorToast(`Failed to delete goal: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (current: number, target: number): number => {
    return (current / target) * 100;
  };

  // Get appropriate color for progress bar
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "success";
    if (percentage >= 75) return "info";
    if (percentage >= 50) return "primary";
    if (percentage >= 25) return "warning";
    return "danger";
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Manual refresh function
  const refreshGoalData = async () => {
    setLoading(true);
    try {
      await fetchGoals();
      await fetchUserProfiles();
      showSuccessToast("Goal data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh goal data");
      console.error("Error refreshing goal data:", error);
    } finally {
      setLoading(false);
    }
  };

  // If still loading initial data, show a loading indicator
  if (loading) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Goals</h2>
        <p className="admin-loader-subtitle">Please wait while we retrieve your financial goals...</p>
      </div>
    );
  }

  // Return the component UI with Suspense
  return (
    <Suspense fallback={
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Goals</h2>
        <p className="admin-loader-subtitle">Please wait while we retrieve your financial goals...</p>
      </div>
    }>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Goal Management</h1>
          <div>
            <button className="btn btn-sm btn-primary shadow-sm mr-2">
              <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Goals
            </button>
            <Link to="/admin/goals/add" className="btn btn-sm btn-success shadow-sm">
              <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Add Goal
            </Link>
          </div>
        </div>

        {/* Show transition indicator */}
        {isPending && (
          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm mr-2" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <span>Updating data...</span>
            </div>
          </div>
        )}

        {/* Summary Stats Cards Row */}
        <div className="row">
          {/* Total Goals Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Total Goals
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {goalSummary?.totalGoals || 0}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-flag fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Goals Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-success shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                      Active Goals
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {goalSummary?.activeGoals || 0}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-tasks fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Target Amount Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                      Total Target Amount
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {formatCurrency(goalSummary?.totalTargetAmount || 0)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-warning shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                      Overall Progress
                    </div>
                    <div className="row no-gutters align-items-center">
                      <div className="col-auto">
                        <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                          {formatPercentage(goalSummary?.overallProgress || 0)}
                        </div>
                      </div>
                      <div className="col">
                        <div className="progress progress-sm mr-2">
                          <div
                            className={`progress-bar bg-${getProgressColor(goalSummary?.overallProgress || 0)}`}
                            role="progressbar"
                            style={{ width: `${goalSummary?.overallProgress || 0}%` }}
                            aria-valuenow={goalSummary?.overallProgress || 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats Row - Moved above filters */}
        <div className="row">
          {/* Priority Distribution Card */}
          <div className="col-lg-6 mb-4">
            <div className="card shadow">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Goal Priority Distribution</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h4 className="small font-weight-bold">High Priority <span className="float-right">({goalSummary?.goalsByPriority.high || 0} goals)</span></h4>
                    <span className="text-xs">{((goalSummary?.goalsByPriority.high || 0) / (goalSummary?.totalGoals || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress mb-4" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{ width: `${(goalSummary?.goalsByPriority.high || 0) / (goalSummary?.totalGoals || 1) * 100}%` }}
                      aria-valuenow={(goalSummary?.goalsByPriority.high || 0) / (goalSummary?.totalGoals || 1) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h4 className="small font-weight-bold">Medium Priority <span className="float-right">({goalSummary?.goalsByPriority.medium || 0} goals)</span></h4>
                    <span className="text-xs">{((goalSummary?.goalsByPriority.medium || 0) / (goalSummary?.totalGoals || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress mb-4" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: `${(goalSummary?.goalsByPriority.medium || 0) / (goalSummary?.totalGoals || 1) * 100}%` }}
                      aria-valuenow={(goalSummary?.goalsByPriority.medium || 0) / (goalSummary?.totalGoals || 1) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h4 className="small font-weight-bold">Low Priority <span className="float-right">({goalSummary?.goalsByPriority.low || 0} goals)</span></h4>
                    <span className="text-xs">{((goalSummary?.goalsByPriority.low || 0) / (goalSummary?.totalGoals || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress mb-4" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${(goalSummary?.goalsByPriority.low || 0) / (goalSummary?.totalGoals || 1) * 100}%` }}
                      aria-valuenow={(goalSummary?.goalsByPriority.low || 0) / (goalSummary?.totalGoals || 1) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Savings Progress Card */}
          <div className="col-lg-6 mb-4">
            <div className="card shadow">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Goal Savings Progress</h6>
              </div>
              <div className="card-body">
                <div className="chart-pie pt-4 pb-2">
                  <div className="text-center mb-4">
                    <div style={{ height: "160px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <div className="position-relative" style={{ width: "160px", height: "160px" }}>
                        {/* This would be a chart in a real implementation */}
                        <div 
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background: `conic-gradient(#1cc88a ${goalSummary?.overallProgress || 0}%, #e0e0e0 0%)`
                          }}
                        ></div>
                        <div 
                          style={{
                            position: "absolute",
                            top: "20%",
                            left: "20%",
                            width: "60%",
                            height: "60%",
                            borderRadius: "50%",
                            background: "white",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column"
                          }}
                        >
                          <div className="font-weight-bold text-gray-800" style={{ fontSize: "1.5rem" }}>
                            {formatPercentage(goalSummary?.overallProgress || 0)}
                          </div>
                          <div className="small text-gray-600">Overall</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3 text-center">
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(goalSummary?.totalCurrentAmount || 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total Saved</div>
                    </div>
                    <div className="col-md-4 mb-3 text-center">
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(goalSummary?.totalRemainingAmount || 0)}
                      </div>
                      <div className="text-xs text-gray-600">Remaining</div>
                    </div>
                    <div className="col-md-4 mb-3 text-center">
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(goalSummary?.totalTargetAmount || 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total Target</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary">Filter Goals</h6>
            <button onClick={resetFilters} className="btn btn-sm btn-outline-primary">
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
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="status" className="font-weight-bold text-gray-800">Status</label>
                <select
                  id="status"
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="behind">Behind Schedule</option>
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="user" className="font-weight-bold text-gray-800">User</label>
                <select
                  id="user"
                  name="user"
                  value={filter.user}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Users</option>
                  {Object.values(userProfiles).map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
                <select
                  id="sortBy"
                  name="sortBy"
                  value={filter.sortBy}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="name">Goal Name</option>
                  <option value="date">Target Date</option>
                  <option value="progress">Progress</option>
                  <option value="amount">Target Amount</option>
                </select>
              </div>

              <div className="col-12 mb-3">
                <form onSubmit={handleSearch}>
                <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
                  <div className="input-group">
                <input
                  type="text"
                  id="search"
                  name="search"
                  value={filter.search}
                  onChange={handleFilterChange}
                  placeholder="Search goals by name or category..."
                  className="form-control"
                />
                    <div className="input-group-append">
                      <button type="submit" className="btn btn-primary">
                        <i className="fas fa-search"></i>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Goals Table */}
        <div className="card shadow mb-4">
          <div className="card-header py-3">
            <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">All Goals</h6>
              <div className="d-flex align-items-center">
                <div className="input-group input-group-sm mr-3" style={{ width: "auto" }}>
                  <div className="input-group-prepend">
                    <span 
                      className="input-group-text border-right-0" 
                      style={{ 
                        backgroundColor: "#e74a3b", 
                        color: "white", 
                        borderColor: "#e74a3b"
                      }}
                    >Show</span>
                  </div>
                  <select 
                    className="form-control form-control-sm border-left-0 border-right-0" 
                    style={{ width: "70px" }}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <div className="input-group-append">
                    <span 
                      className="input-group-text border-left-0" 
                      style={{ 
                        backgroundColor: "#e74a3b", 
                        color: "white", 
                        borderColor: "#e74a3b" 
                      }}
                    >entries</span>
                  </div>
                </div>
                <button 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={refreshGoalData}
                  disabled={loading}
                  title="Refresh Goal Data"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {isFiltering ? (
              <div className="text-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Filtering...</span>
                </div>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center p-4">
                <div className="mb-3">
                  <i className="fas fa-search fa-3x text-gray-300"></i>
                </div>
                <p className="text-gray-600 mb-0">No goals found matching your criteria.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing="0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>User</th>
                      <th>Target Amount</th>
                      <th>Current Amount</th>
                      <th>Target Date</th>
                      <th>Progress</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => {
                      const progressPercent = getProgressPercentage(goal.current_amount, goal.target_amount);
                      const progressColor = getProgressColor(progressPercent);
                      
                      let priorityBadgeClass = "";
                      if (goal.priority === "high") priorityBadgeClass = "badge-danger";
                      else if (goal.priority === "medium") priorityBadgeClass = "badge-warning";
                      else priorityBadgeClass = "badge-info";
                      
                      let statusBadgeClass = "";
                      if (goal.status === "completed") statusBadgeClass = "badge-success";
                      else if (goal.status === "in_progress") statusBadgeClass = "badge-primary";
                      else statusBadgeClass = "badge-danger";
                      
                      return (
                        <tr key={goal.id}>
                          <td>
                            <Link to={`/admin/goals/${goal.id}`} className="font-weight-bold text-primary">
                              {goal.goal_name}
                            </Link>
                            {goal.category && <div className="small text-gray-600">{goal.category}</div>}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              {goal.user_name}
                              {goal.is_family_goal && (
                                <span className="badge badge-info ml-2" title="Family Shared Goal">
                                  <i className="fas fa-users"></i>
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatCurrency(goal.target_amount)}</td>
                          <td>{formatCurrency(goal.current_amount)}</td>
                          <td>
                            {formatDate(goal.target_date)}
                            <div className="small text-gray-600">
                              {getRemainingDays(goal.target_date)} days left
                            </div>
                          </td>
                          <td>
                            <span className={`text-${progressColor}`}>
                                {formatPercentage(progressPercent)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${priorityBadgeClass} p-2`}>
                              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${statusBadgeClass} p-2`}>
                              {goal.status === "in_progress" ? "In Progress" : 
                               goal.status === "completed" ? "Completed" : 
                               "Behind Schedule"}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group">
                              <Link to={`/admin/goals/${goal.id}`} className="btn btn-sm btn-outline-primary mr-1" title="View">
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link to={`/admin/goals/${goal.id}/edit`} className="btn btn-sm btn-outline-warning mr-1" title="Edit">
                                <i className="fas fa-edit"></i>
                              </Link>
                              <button 
                                onClick={() => handleDeleteClick(goal.id.toString())} 
                                className="btn btn-sm btn-outline-danger" 
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <span className="text-muted">
                    Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of{" "}
                    {totalItems} entries
                  </span>
              </div>
                <nav>
                  <ul className="pagination admin-pagination">
                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                      // Show pages around current page
                      let pageNumber: number;
                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = currentPage - 2 + index;
                      }
                      
                      if (pageNumber <= totalPages) {
                      return (
                        <li
                          key={index}
                          className={`page-item ${pageNumber === currentPage ? "active" : ""}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      );
                      }
                      return null;
                    })}
                    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
                            </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button 
                    type="button" 
                    className="close" 
                    onClick={() => setShowDeleteModal(false)}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                  <p className="text-danger font-weight-bold">Warning: Deleting a goal will also remove all associated transactions and contributions.</p>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={confirmDelete}
                  >
                    Delete Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Suspense>
  );
};

export default AdminGoals; 