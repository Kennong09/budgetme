import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "../../../utils/highchartsInit";

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  start_date: string;
  end_date: string;
  category: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: "active" | "completed" | "archived";
}

const AdminBudgets: FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { showSuccessToast, showErrorToast } = useToast();

  const ITEMS_PER_PAGE = 10;
  const categories = [
    "Housing", "Transportation", "Food", "Utilities", 
    "Insurance", "Healthcare", "Savings", "Personal", 
    "Entertainment", "Other"
  ];

  // Fetch budgets on component mount and when filters change
  useEffect(() => {
    fetchBudgets();
  }, [currentPage, searchTerm, filterCategory, filterStatus, sortField, sortDirection]);

  // Fetch budgets from Supabase
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would be a Supabase query with filters
      // For now, we'll use mock data
      let mockBudgets = Array(45).fill(null).map((_, index) => {
        const id = `budget-${index + 1}`;
        const amount = Math.round(Math.random() * 5000) + 500;
        const spent = Math.round(Math.random() * amount);
        const start = new Date();
        start.setDate(start.getDate() - Math.round(Math.random() * 30));
        const end = new Date();
        end.setDate(end.getDate() + Math.round(Math.random() * 60));
        const category = categories[Math.floor(Math.random() * categories.length)];
        const statuses = ["active", "completed", "archived"] as const;
        
        return {
          id,
          name: `${category} Budget ${index + 1}`,
          amount,
          spent,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          category,
          user_id: `user-${Math.floor(Math.random() * 20) + 1}`,
          user_name: `User ${Math.floor(Math.random() * 20) + 1}`,
          user_email: `user${Math.floor(Math.random() * 20) + 1}@example.com`,
          status: statuses[Math.floor(Math.random() * statuses.length)]
        };
      });
      
      // Apply search filter
      if (searchTerm) {
        mockBudgets = mockBudgets.filter(budget => 
          budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.user_email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply category filter
      if (filterCategory !== "all") {
        mockBudgets = mockBudgets.filter(budget => budget.category === filterCategory);
      }
      
      // Apply status filter
      if (filterStatus !== "all") {
        mockBudgets = mockBudgets.filter(budget => budget.status === filterStatus);
      }
      
      // Apply sorting
      mockBudgets.sort((a: any, b: any) => {
        let comparison = 0;
        
        if (a[sortField] < b[sortField]) {
          comparison = -1;
        } else if (a[sortField] > b[sortField]) {
          comparison = 1;
        }
        
        return sortDirection === "desc" ? comparison * -1 : comparison;
      });
      
      // Calculate pagination
      const totalItems = mockBudgets.length;
      setTotalPages(Math.ceil(totalItems / ITEMS_PER_PAGE));
      
      // Get current page
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedBudgets = mockBudgets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      setBudgets(paginatedBudgets);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      showErrorToast("Failed to load budgets");
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle budget status change
  const changeBudgetStatus = async (budget: Budget, newStatus: "active" | "completed" | "archived") => {
    try {
      setLoading(true);
      
      // In a real app, this would be a Supabase query to update the budget
      
      // Update local state
      setBudgets(prevBudgets => 
        prevBudgets.map(b => 
          b.id === budget.id ? { ...b, status: newStatus } : b
        )
      );
      
      showSuccessToast(`Budget status updated to ${newStatus}`);
      setLoading(false);
    } catch (error) {
      console.error("Error changing budget status:", error);
      showErrorToast("Failed to update budget status");
      setLoading(false);
    }
  };

  // Open budget details modal
  const openBudgetModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedBudget(null);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Get budget analytics chart options
  const getBudgetCategoryChartOptions = () => {
    // Count budgets by category
    const categoryData = categories.map(category => {
      const count = budgets.filter(budget => budget.category === category).length;
      return { name: category, y: count };
    }).filter(item => item.y > 0);
    
    return {
      chart: {
        type: "pie",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budgets by Category"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f} %",
            style: {
              color: "black"
            }
          }
        }
      },
      series: [
        {
          name: "Budgets",
          colorByPoint: true,
          data: categoryData
        }
      ]
    };
  };

  // Get budget status chart options
  const getBudgetStatusChartOptions = () => {
    // Count budgets by status
    const completedCount = budgets.filter(budget => budget.status === "completed").length;
    const activeCount = budgets.filter(budget => budget.status === "active").length;
    const archivedCount = budgets.filter(budget => budget.status === "archived").length;
    
    return {
      chart: {
        type: "column",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budget Status Distribution"
      },
      xAxis: {
        categories: ["Active", "Completed", "Archived"]
      },
      yAxis: {
        title: {
          text: "Number of Budgets"
        }
      },
      series: [
        {
          name: "Budgets",
          data: [
            { y: activeCount, color: "#36b9cc" },  // Blue for active
            { y: completedCount, color: "#1cc88a" },  // Green for completed
            { y: archivedCount, color: "#858796" }   // Gray for archived
          ]
        }
      ]
    };
  };

  // Get budget progress for selected budget
  const getBudgetProgressChartOptions = (budget: Budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    const remaining = budget.amount - budget.spent;
    
    return {
      chart: {
        type: "pie",
        height: 200
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budget Utilization"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>${point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: ${point.y}"
          }
        }
      },
      series: [
        {
          name: "Amount",
          colorByPoint: true,
          data: [
            { name: "Spent", y: budget.spent, color: "#e74a3b" },
            { name: "Remaining", y: remaining, color: "#1cc88a" }
          ]
        }
      ]
    };
  };
  
  // Loading state
  if (loading && budgets.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-budgets">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Budget Management</h1>
      </div>
      
      {/* Analytics Cards */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Categories</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getBudgetCategoryChartOptions()} />
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Status</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getBudgetStatusChartOptions()} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">Budget Filters</h6>
        </div>
        <div className="card-body">
          <div className="row align-items-center">
            {/* Search */}
            <div className="col-md-5 mb-3">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-light border-0 small"
                    placeholder="Search budgets or users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <div className="input-group-append">
                    <button className="btn btn-danger" type="submit">
                      <i className="fas fa-search fa-sm"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Category Filter */}
            <div className="col-md-3 mb-3">
              <select
                className="form-control"
                value={filterCategory}
                onChange={e => {
                  setFilterCategory(e.target.value);
                  handleFilterChange();
                }}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="col-md-3 mb-3">
              <select
                className="form-control"
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  handleFilterChange();
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            {/* Reset Filters */}
            <div className="col-md-1 mb-3 text-right">
              <button
                className="btn btn-light"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-undo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Budgets Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">
            All Budgets 
            {loading && (
              <span className="ml-2">
                <i className="fas fa-spinner fa-spin fa-sm"></i>
              </span>
            )}
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered admin-table" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                    Budget Name
                    {sortField === "name" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("user_name")} style={{ cursor: "pointer" }}>
                    User
                    {sortField === "user_name" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>
                    Category
                    {sortField === "category" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                    Amount
                    {sortField === "amount" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("spent")} style={{ cursor: "pointer" }}>
                    Spent
                    {sortField === "spent" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th>Progress</th>
                  <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                    Status
                    {sortField === "status" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No budgets found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  budgets.map(budget => {
                    const percentage = Math.round((budget.spent / budget.amount) * 100);
                    let progressClass = "bg-success";
                    
                    if (percentage >= 90) {
                      progressClass = "bg-danger";
                    } else if (percentage >= 70) {
                      progressClass = "bg-warning";
                    } else if (percentage >= 50) {
                      progressClass = "bg-info";
                    }
                    
                    return (
                      <tr key={budget.id}>
                        <td>{budget.name}</td>
                        <td>{budget.user_name}</td>
                        <td>{budget.category}</td>
                        <td>${budget.amount.toLocaleString()}</td>
                        <td>${budget.spent.toLocaleString()}</td>
                        <td>
                          <div className="progress">
                            <div
                              className={`progress-bar ${progressClass}`}
                              role="progressbar"
                              style={{ width: `${percentage}%` }}
                              aria-valuenow={percentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              {percentage}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${
                            budget.status === "active" ? "primary" :
                            budget.status === "completed" ? "success" : "secondary"
                          }`}>
                            {budget.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group admin-actions">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openBudgetModal(budget)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <span className="text-muted">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, budgets.length * totalPages)} of{" "}
                  {budgets.length * totalPages} entries
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

      {/* Budget Detail Modal */}
      {showModal && selectedBudget && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            backgroundColor: "rgba(0, 0, 0, 0.5)"
          }}
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Budget Details: {selectedBudget.name}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeModal}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="font-weight-bold mb-3">Budget Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="font-weight-bold">Budget ID:</td>
                          <td>{selectedBudget.id}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Name:</td>
                          <td>{selectedBudget.name}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Category:</td>
                          <td>{selectedBudget.category}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Amount:</td>
                          <td>${selectedBudget.amount.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Spent:</td>
                          <td>${selectedBudget.spent.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Remaining:</td>
                          <td>${(selectedBudget.amount - selectedBudget.spent).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Start Date:</td>
                          <td>{new Date(selectedBudget.start_date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">End Date:</td>
                          <td>{new Date(selectedBudget.end_date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Status:</td>
                          <td>
                            <span className={`badge badge-${
                              selectedBudget.status === "active" ? "primary" :
                              selectedBudget.status === "completed" ? "success" : "secondary"
                            }`}>
                              {selectedBudget.status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h6 className="font-weight-bold mb-3 mt-4">User Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="font-weight-bold">User ID:</td>
                          <td>{selectedBudget.user_id}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Name:</td>
                          <td>{selectedBudget.user_name}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Email:</td>
                          <td>{selectedBudget.user_email}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h6 className="border-bottom pb-2 mb-3 mt-4">Change Status</h6>
                    <div className="btn-group">
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "active" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "active")}
                      >
                        <i className="fas fa-play-circle mr-1"></i> Active
                      </button>
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "completed" ? "btn-success" : "btn-outline-success"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "completed")}
                      >
                        <i className="fas fa-check-circle mr-1"></i> Completed
                      </button>
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "archived" ? "btn-secondary" : "btn-outline-secondary"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "archived")}
                      >
                        <i className="fas fa-archive mr-1"></i> Archived
                      </button>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card mb-4">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Budget Progress</h6>
                      </div>
                      <div className="card-body">
                        <HighchartsReact 
                          highcharts={Highcharts} 
                          options={getBudgetProgressChartOptions(selectedBudget)} 
                        />
                        
                        <div className="text-center mt-3">
                          <h4 className="small font-weight-bold">
                            Overall Progress <span className="float-right">
                              {Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}%
                            </span>
                          </h4>
                          <div className="progress mb-4">
                            <div
                              className="progress-bar bg-danger"
                              role="progressbar"
                              style={{ width: `${Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}%` }}
                              aria-valuenow={Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Actions</h6>
                      </div>
                      <div className="card-body">
                        <div className="btn-group w-100 mb-3">
                          <button className="btn btn-outline-primary">
                            <i className="fas fa-edit mr-1"></i> Edit Budget
                          </button>
                          <button className="btn btn-outline-danger">
                            <i className="fas fa-trash mr-1"></i> Delete Budget
                          </button>
                        </div>
                        
                        <Link to={`/admin/users/${selectedBudget.user_id}`} className="btn btn-info w-100">
                          <i className="fas fa-user mr-1"></i> View User Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBudgets; 