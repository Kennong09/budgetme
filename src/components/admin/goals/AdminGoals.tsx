import React, { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
} from "../../../utils/helpers";
import { getUserGoalsSummary } from "../../../data/mockData";
import { Goal, GoalSummary } from "../../../types";

// Import any necessary CSS
import "../admin.css";

const AdminGoals: React.FC = () => {
  // State for goals data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

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
    // Simulate API call to fetch all goals across users
    const timer = setTimeout(() => {
      // This would normally be an API call to get all goals
      const mockGoals = [
        {
          id: "1",
          goal_name: "Emergency Fund",
          target_amount: 10000,
          current_amount: 5000,
          target_date: "2023-12-31",
          priority: "high",
          status: "in_progress",
          user_id: "1",
          category: "Savings",
          created_at: "2023-01-15",
        },
        {
          id: "2",
          goal_name: "New Car",
          target_amount: 25000,
          current_amount: 8000,
          target_date: "2024-06-30",
          priority: "medium",
          status: "in_progress",
          user_id: "1",
          category: "Major Purchase",
          created_at: "2023-02-10",
        },
        {
          id: "3",
          goal_name: "Vacation Fund",
          target_amount: 5000,
          current_amount: 4800,
          target_date: "2023-08-15",
          priority: "low",
          status: "in_progress",
          user_id: "2",
          category: "Travel",
          created_at: "2023-01-05",
        },
        {
          id: "4",
          goal_name: "Home Down Payment",
          target_amount: 50000,
          current_amount: 15000,
          target_date: "2025-10-01",
          priority: "high",
          status: "in_progress",
          user_id: "2",
          category: "Major Purchase",
          created_at: "2022-11-20",
        },
        {
          id: "5",
          goal_name: "Education Fund",
          target_amount: 15000,
          current_amount: 15000,
          target_date: "2023-09-01",
          priority: "medium",
          status: "completed",
          user_id: "3",
          category: "Education",
          created_at: "2022-08-15",
        },
      ] as unknown as Goal[];

      setGoals(mockGoals);
      setFilteredGoals(mockGoals);
      
      // Set goal summary
      const summary = {
        totalGoals: mockGoals.length,
        activeGoals: mockGoals.filter(g => g.status !== 'completed').length,
        completedGoals: mockGoals.filter(g => g.status === 'completed').length,
        totalTargetAmount: mockGoals.reduce((sum, g) => sum + g.target_amount, 0),
        totalCurrentAmount: mockGoals.reduce((sum, g) => sum + g.current_amount, 0),
        totalRemainingAmount: mockGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0),
        overallProgress: (mockGoals.reduce((sum, g) => sum + g.current_amount, 0) / 
                         mockGoals.reduce((sum, g) => sum + g.target_amount, 0)) * 100,
        goalsByPriority: {
          high: mockGoals.filter(g => g.priority === 'high').length,
          medium: mockGoals.filter(g => g.priority === 'medium').length,
          low: mockGoals.filter(g => g.priority === 'low').length,
        }
      };
      setGoalSummary(summary);
      
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Apply filters when filter state changes
  useEffect(() => {
    if (goals.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    setTimeout(() => {
      let result = [...goals];
      
      // Filter by priority
      if (filter.priority !== "all") {
        result = result.filter(goal => goal.priority === filter.priority);
      }
      
      // Filter by status
      if (filter.status !== "all") {
        result = result.filter(goal => goal.status === filter.status);
      }
      
      // Filter by user
      if (filter.user !== "all") {
        result = result.filter(goal => goal.user_id === filter.user);
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(goal => 
          goal.goal_name.toLowerCase().includes(searchTerm) ||
          goal.category?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort results
      result = sortGoals(result, filter.sortBy);
      
      setFilteredGoals(result);
      setIsFiltering(false);
    }, 300);
  }, [filter, goals]);

  // Function to sort goals
  const sortGoals = (goalsToSort: Goal[], sortBy: string): Goal[] => {
    switch(sortBy) {
      case "name":
        return [...goalsToSort].sort((a, b) => a.goal_name.localeCompare(b.goal_name));
      case "date":
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

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      priority: "all",
      status: "all",
      user: "all",
      sortBy: "name",
      search: "",
    });
  };

  // Handle goal deletion
  const handleDeleteClick = (goalId: string): void => {
    setSelectedGoalId(goalId);
    setShowDeleteModal(true);
  };

  const confirmDelete = (): void => {
    if (selectedGoalId) {
      // In a real app, this would make an API call
      console.log(`Deleting goal with ID: ${selectedGoalId}`);
      
      // Filter out the deleted goal
      const updatedGoals = goals.filter(goal => goal.id.toString() !== selectedGoalId);
      setGoals(updatedGoals);
      setFilteredGoals(filteredGoals.filter(goal => goal.id.toString() !== selectedGoalId));
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedGoalId(null);
    }
  };

  // Get user name by ID
  const getUserNameById = (userId: string | number | undefined): string => {
    const user = users.find(u => u.id === userId?.toString());
    return user ? user.name : 'Unknown User';
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading goals data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Goal Management</h1>
        <div>
          <button className="btn btn-sm btn-primary shadow-sm mr-2">
            <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Goals
          </button>
          <Link to="/admin/goals/create" className="btn btn-sm btn-success shadow-sm">
            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Create Goal
          </Link>
        </div>
      </div>

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
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
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
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search goals by name or category..."
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goals Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">All Goals</h6>
        </div>
        <div className="card-body">
          {isFiltering ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Filtering...</span>
              </div>
            </div>
          ) : filteredGoals.length === 0 ? (
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
                  {filteredGoals.map((goal) => {
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
                          <div className="small text-gray-600">{goal.category}</div>
                        </td>
                        <td>{getUserNameById(goal.user_id)}</td>
                        <td>{formatCurrency(goal.target_amount)}</td>
                        <td>{formatCurrency(goal.current_amount)}</td>
                        <td>
                          {formatDate(goal.target_date)}
                          <div className="small text-gray-600">
                            {getRemainingDays(goal.target_date)} days left
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="mr-2">
                              {formatPercentage(progressPercent)}
                            </div>
                            <div className="w-100">
                              <div className="progress progress-sm">
                                <div
                                  className={`progress-bar bg-${progressColor}`}
                                  role="progressbar"
                                  style={{ width: `${progressPercent}%` }}
                                  aria-valuenow={progressPercent}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                ></div>
                              </div>
                            </div>
                          </div>
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
        </div>
      </div>

      {/* Additional Stats Row */}
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
                <div className="progress mb-4">
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
                <div className="progress mb-4">
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
                <div className="progress mb-4">
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
  );
};

export default AdminGoals; 