import React, { useState, useEffect, FC, useRef, ChangeEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
  getCurrentMonthYear,
} from "../../utils/helpers";
import { getCurrentUserData, getUserGoalsSummary, calculateBudgetToGoalRelationship } from "../../data/mockData";
import { GoalSummary, BudgetGoalRelationship } from "../../types";
import ErrorBoundary from "../ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  category: string;
  description?: string;
}

interface FilterState {
  priority: "all" | "high" | "medium" | "low";
  category: string;
  sortBy: "name" | "target_date" | "progress" | "amount";
  search: string;
}

const Goals: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveringBar, setHoveringBar] = useState<boolean>(false);
  const [hoveringGoalBars, setHoveringGoalBars] = useState<{[key: string]: boolean}>({});
  
  // Get URL parameters
  const queryParams = new URLSearchParams(location.search);
  
  // Set up filter state with URL parameters or defaults
  const [filter, setFilter] = useState<FilterState>({
    priority: (queryParams.get('priority') as "all" | "high" | "medium" | "low") || "all",
    category: queryParams.get('category') || "all",
    sortBy: (queryParams.get('sortBy') as "name" | "target_date" | "progress" | "amount") || "name",
    search: queryParams.get('search') || "",
  });
  
  // Create refs for any interactive elements if needed
  const goalListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      const user = getCurrentUserData();
      if (user && user.goals) {
        // Add missing properties and convert to Goal type
        const goalsWithCategories = user.goals.map((goal) => ({
          ...goal,
          category: "General", // Add required category field
        }));
        setGoals(goalsWithCategories as unknown as Goal[]);
        setFilteredGoals(goalsWithCategories as unknown as Goal[]);
      }
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);
  
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
  const applyFilters = () => {
    if (goals.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    // Use setTimeout to allow the UI to update with the loading state
    setTimeout(() => {
      let result = [...goals];
      
      // Filter by priority
      if (filter.priority !== "all") {
        result = result.filter(goal => goal.priority === filter.priority);
      }
      
      // Filter by category
      if (filter.category !== "all") {
        result = result.filter(goal => goal.category === filter.category);
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(goal => 
          goal.goal_name.toLowerCase().includes(searchTerm) ||
          goal.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort results
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading your financial goals...</p>
        </div>
      </div>
    );
  }

  // Get unique categories from goals for filter dropdown
  const categories = Array.from(new Set(goals.map(goal => goal.category))).sort();
  
  // Get goal summary using the helper function
  const goalSummary = getUserGoalsSummary(1) as GoalSummary; // Using user ID 1 for mock data
  const budgetGoalRelationship = calculateBudgetToGoalRelationship(1) as BudgetGoalRelationship;
  
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

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Financial Goals</h1>
        <Link 
          to="/goals/create" 
          className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm animate__animated animate__fadeIn"
        >
          <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>Create Goal
        </Link>
      </div>

      {/* Goals Summary Cards - Match Dashboard style */}
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
      
      {/* Filters Card - Similar to Transactions and Budgets */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
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
              <label htmlFor="category" className="font-weight-bold text-gray-800">Category</label>
              <select
                id="category"
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
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
                <option value="target_date">Target Date</option>
                <option value="progress">Progress</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search goals..."
                className="form-control"
              />
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
            </div>
            <div className="card-body">
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
            </div>
          </div>
        </div>
      </div>
      
      {/* Goal List - Match Dashboard card style */}
      <div className="row" ref={goalListRef}>
        {isFiltering ? (
          <div className="col-12">
            <div className="text-center my-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="text-gray-600 mt-3">Filtering goals...</p>
            </div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="col-12">
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
              <div className="card-body text-center py-5">
                <div className="text-gray-500 mb-3">
                  <i className="fas fa-filter fa-3x mb-3"></i>
                  <h5>No goals found</h5>
                </div>
                <p>No goals match your filter criteria. Try adjusting your filters or create a new goal.</p>
                <div className="mt-4">
                  <button onClick={resetFilters} className="btn btn-outline-primary mr-2">
                    <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset Filters
                  </button>
                  <Link to="/goals/create" className="btn btn-primary">
                    <i className="fas fa-plus fa-sm mr-2"></i>Create Goal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          filteredGoals.map((goal, index) => {
            const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
            const remainingDays = getRemainingDays(goal.target_date);
            const monthlySavings = calculateMonthlySavingsForGoal(goal);

            let statusClass: string;
            if (progressPercentage >= 75) {
              statusClass = "bg-success";
            } else if (progressPercentage >= 40) {
              statusClass = "bg-warning";
            } else {
              statusClass = "bg-danger";
            }

            let priorityBadgeClass: string;
            switch (goal.priority) {
              case "high":
                priorityBadgeClass = "badge-danger";
                break;
              case "medium":
                priorityBadgeClass = "badge-warning";
                break;
              default:
                priorityBadgeClass = "badge-info";
            }

            return (
              <div key={goal.id} className="col-lg-6 mb-4">
                <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: `${0.1 * (index + 6)}s` }}>
                  <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                    <h6 className="m-0 font-weight-bold text-primary">
                      {goal.goal_name}
                    </h6>
                    <span className={`badge ${priorityBadgeClass}`}>
                      {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="text-xs font-weight-bold text-uppercase mb-1">Target Amount</div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(goal.target_amount)}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-xs font-weight-bold text-uppercase mb-1">Current Amount</div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(goal.current_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs font-weight-bold text-uppercase mb-1">Progress</div>
                      {/* Progress bar matching Budget/Transactions style */}
                      <div 
                        className="progress position-relative"
                        onMouseEnter={() => handleGoalBarHover(goal.id, true)}
                        onMouseLeave={() => handleGoalBarHover(goal.id, false)}
                      >
                        <div
                          className={`progress-bar ${statusClass}`}
                          role="progressbar"
                          style={{
                            width: `${progressPercentage > 100 ? 100 : progressPercentage}%`,
                          }}
                          aria-valuenow={progressPercentage > 100 ? 100 : progressPercentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                        </div>
                        {hoveringGoalBars[goal.id] && (
                          <div 
                            className="position-absolute text-dark px-2 py-1 small"
                            style={{
                              top: "-30px",
                              left: `${Math.min(Math.max(progressPercentage, 5), 95)}%`,
                              transform: "translateX(-50%)",
                              backgroundColor: "white",
                              borderRadius: "4px",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                              fontWeight: "bold",
                              zIndex: 10
                            }}
                          >
                            {formatPercentage(progressPercentage)}
                          </div>
                        )}
                      </div>
                      <div className="d-flex justify-content-between mt-1">
                        <small className="text-gray-500">
                          {formatCurrency(goal.current_amount)}
                        </small>
                        <small className="text-gray-500">
                          {formatCurrency(goal.target_amount - goal.current_amount)} to go
                        </small>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="text-xs font-weight-bold text-uppercase mb-1">Target Date</div>
                        <div className="mb-0 text-gray-800">
                          {formatDate(goal.target_date)}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-xs font-weight-bold text-uppercase mb-1">Time Remaining</div>
                        <div className="mb-0 text-gray-800">
                          {remainingDays} days
                        </div>
                      </div>
                    </div>

                    <hr />
                    <div className="mb-3">
                      <div className="text-xs font-weight-bold text-uppercase mb-1">
                        Recommended Monthly Contribution
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(monthlySavings)}
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-3">
                      <Link to={`/goals/${goal.id}`} className="btn btn-info btn-circle btn-sm mr-2">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <Link to={`/goals/${goal.id}/contribute`} className="btn btn-success btn-circle btn-sm mr-2" title="Make a Contribution">
                        <i className="fas fa-plus-circle"></i>
                      </Link>
                      <Link to={`/goals/edit/${goal.id}`} className="btn btn-primary btn-circle btn-sm">
                        <i className="fas fa-edit"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
        </div>
      )}
    </div>
  );
};

export default Goals;
