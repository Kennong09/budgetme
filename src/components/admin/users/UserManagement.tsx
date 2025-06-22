import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../utils/supabaseClient";
import { addAdminRole, removeAdminRole, isUserAdmin } from "../../../utils/adminHelpers";
import { useToast } from "../../../utils/ToastContext";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  role?: string;
  status?: "active" | "inactive" | "suspended";
}

const UserManagement: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<"view" | "edit" | "delete">("view");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const { showSuccessToast, showErrorToast } = useToast();

  const USERS_PER_PAGE = 10;

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
    fetchAdminUsers();
  }, [currentPage, searchTerm, filterRole, filterStatus]);

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would be a Supabase query with proper filters
      // For now, we'll use mock data
      let mockUsers = Array(25).fill(null).map((_, index) => {
        const id = `user-${index + 1}`;
        const randomNum = Math.floor(Math.random() * 100);
        const statusOptions = ["active", "inactive", "suspended"] as const;
        const roleOptions = ["user", "admin"] as const;
        
        return {
          id,
          email: `user${index + 1}@example.com`,
          created_at: new Date(Date.now() - randomNum * 24 * 60 * 60 * 1000).toISOString(),
          last_sign_in_at: randomNum > 70 ? null : new Date(Date.now() - (randomNum * 12 * 60 * 60 * 1000)).toISOString(),
          user_metadata: {
            full_name: `User ${index + 1}`,
            avatar_url: `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${(index % 70) + 1}.jpg`
          },
          role: roleOptions[index % roleOptions.length],
          status: statusOptions[index % statusOptions.length]
        };
      });
      
      // Apply search filter
      if (searchTerm) {
        mockUsers = mockUsers.filter(user => 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.user_metadata.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply role filter
      if (filterRole !== "all") {
        mockUsers = mockUsers.filter(user => user.role === filterRole);
      }
      
      // Apply status filter
      if (filterStatus !== "all") {
        mockUsers = mockUsers.filter(user => user.status === filterStatus);
      }
      
      // Calculate pagination
      const totalItems = mockUsers.length;
      setTotalPages(Math.max(1, Math.ceil(totalItems / USERS_PER_PAGE)));
      
      // Get current page of users
      const startIndex = (currentPage - 1) * USERS_PER_PAGE;
      const paginatedUsers = mockUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
      
      setUsers(paginatedUsers);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      showErrorToast("Failed to load users");
      setLoading(false);
    }
  };

  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      // In a real app, this would call getAdminUsers from adminHelpers
      // For now, mock it
      setAdminUsers(["user-3", "user-6", "user-9"]);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Toggle user admin status
  const toggleAdminStatus = async (user: User) => {
    try {
      setLoading(true);
      
      const isCurrentlyAdmin = adminUsers.includes(user.id);
      
      if (isCurrentlyAdmin) {
        // Remove admin role
        await removeAdminRole(user.id);
        setAdminUsers(prev => prev.filter(id => id !== user.id));
        showSuccessToast(`Admin role removed from ${user.user_metadata.full_name || user.email}`);
      } else {
        // Add admin role
        await addAdminRole(user.id);
        setAdminUsers(prev => [...prev, user.id]);
        showSuccessToast(`Admin role granted to ${user.user_metadata.full_name || user.email}`);
      }
      
      // Refresh users list
      await fetchUsers();
      setLoading(false);
    } catch (error) {
      console.error("Error toggling admin status:", error);
      showErrorToast("Failed to update user role");
      setLoading(false);
    }
  };

  // Handle status change
  const changeUserStatus = async (user: User, newStatus: "active" | "inactive" | "suspended") => {
    try {
      setLoading(true);
      
      // In a real app, this would be a Supabase query to update the user's status
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
      
      showSuccessToast(`User status updated to ${newStatus}`);
      setLoading(false);
    } catch (error) {
      console.error("Error changing user status:", error);
      showErrorToast("Failed to update user status");
      setLoading(false);
    }
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

  // Handle user selection for modal
  const openUserModal = (user: User, type: "view" | "edit" | "delete") => {
    setSelectedUser(user);
    setModalType(type);
    setShowModal(true);
  };

  // Reset modal state
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // Loading state
  if (loading && users.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">User Management</h1>
        <button className="d-none d-sm-inline-block btn btn-sm btn-danger shadow-sm">
          <i className="fas fa-user-plus fa-sm text-white-50 mr-1"></i> Add New User
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">User Filters</h6>
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
                    placeholder="Search by name or email..."
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
            
            {/* Role Filter */}
            <div className="col-md-3 mb-3">
              <select
                className="form-control"
                value={filterRole}
                onChange={e => {
                  setFilterRole(e.target.value);
                  handleFilterChange();
                }}
              >
                <option value="all">All Roles</option>
                <option value="user">Standard Users</option>
                <option value="admin">Administrators</option>
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
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            {/* Reset Filters */}
            <div className="col-md-1 mb-3 text-right">
              <button
                className="btn btn-light"
                onClick={() => {
                  setSearchTerm("");
                  setFilterRole("all");
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

      {/* Users Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">
            All Users 
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
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No users found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    const isUserAdminRole = adminUsers.includes(user.id);
                    
                    return (
                      <tr key={user.id} className="admin-user-row">
                        <td className="d-flex align-items-center">
                          <img
                            src={user.user_metadata.avatar_url || "../images/placeholder.png"}
                            alt={user.user_metadata.full_name || "User"}
                            className="admin-user-avatar mr-2"
                          />
                          <div>
                            {user.user_metadata.full_name || "N/A"}
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge badge-${
                            user.status === "active" ? "success" : 
                            user.status === "suspended" ? "danger" : "secondary"
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            user.role === "admin" || isUserAdminRole ? "badge-danger" : "badge-primary"
                          }`}>
                            {isUserAdminRole ? "Admin" : user.role}
                          </span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          {user.last_sign_in_at 
                            ? new Date(user.last_sign_in_at).toLocaleString() 
                            : "Never"}
                        </td>
                        <td>
                          <div className="btn-group admin-actions">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openUserModal(user, "view")}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => openUserModal(user, "edit")}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openUserModal(user, "delete")}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                            
                            {/* Toggle admin status */}
                            <button
                              className={`btn btn-sm ${isUserAdminRole ? "btn-outline-secondary" : "btn-outline-info"}`}
                              onClick={() => toggleAdminStatus(user)}
                              title={isUserAdminRole ? "Remove Admin Role" : "Make Admin"}
                            >
                              <i className={`fas ${isUserAdminRole ? "fa-user-minus" : "fa-user-shield"}`}></i>
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
                  Showing {(currentPage - 1) * USERS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * USERS_PER_PAGE, users.length * totalPages)} of{" "}
                  {users.length * totalPages} entries
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

      {/* User Detail Modal */}
      {showModal && selectedUser && (
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
                  {modalType === "view" && `User Details: ${selectedUser.user_metadata.full_name || selectedUser.email}`}
                  {modalType === "edit" && `Edit User: ${selectedUser.user_metadata.full_name || selectedUser.email}`}
                  {modalType === "delete" && `Delete User: ${selectedUser.user_metadata.full_name || selectedUser.email}`}
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
                {modalType === "view" && (
                  <div className="row">
                    <div className="col-md-4 text-center mb-3">
                      <img
                        src={selectedUser.user_metadata.avatar_url || "../images/placeholder.png"}
                        alt={selectedUser.user_metadata.full_name || "User"}
                        className="img-fluid rounded-circle mb-3"
                        style={{ width: "150px", height: "150px" }}
                      />
                      <h5>{selectedUser.user_metadata.full_name || "N/A"}</h5>
                      <p className="text-muted">{selectedUser.email}</p>
                      
                      <span className={`badge badge-${
                        selectedUser.status === "active" ? "success" : 
                        selectedUser.status === "suspended" ? "danger" : "secondary"
                      }`}>
                        {selectedUser.status}
                      </span>
                      
                      <span className="badge badge-primary ml-2">
                        {adminUsers.includes(selectedUser.id) ? "Admin" : selectedUser.role}
                      </span>
                    </div>
                    <div className="col-md-8">
                      <h6 className="border-bottom pb-2 mb-3">User Information</h6>
                      <div className="row mb-2">
                        <div className="col-sm-4 text-muted">User ID:</div>
                        <div className="col-sm-8">{selectedUser.id}</div>
                      </div>
                      <div className="row mb-2">
                        <div className="col-sm-4 text-muted">Created At:</div>
                        <div className="col-sm-8">
                          {new Date(selectedUser.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="row mb-2">
                        <div className="col-sm-4 text-muted">Last Login:</div>
                        <div className="col-sm-8">
                          {selectedUser.last_sign_in_at 
                            ? new Date(selectedUser.last_sign_in_at).toLocaleString() 
                            : "Never"}
                        </div>
                      </div>
                      
                      <h6 className="border-bottom pb-2 mb-3 mt-4">Actions</h6>
                      <div className="btn-group">
                        <button className="btn btn-outline-primary" onClick={() => openUserModal(selectedUser, "edit")}>
                          <i className="fas fa-edit mr-1"></i> Edit User
                        </button>
                        <button 
                          className={`btn ${adminUsers.includes(selectedUser.id) ? "btn-outline-secondary" : "btn-outline-info"}`}
                          onClick={() => toggleAdminStatus(selectedUser)}
                        >
                          <i className={`fas ${adminUsers.includes(selectedUser.id) ? "fa-user-minus" : "fa-user-shield"} mr-1`}></i>
                          {adminUsers.includes(selectedUser.id) ? "Remove Admin Role" : "Make Admin"}
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => openUserModal(selectedUser, "delete")}>
                          <i className="fas fa-trash mr-1"></i> Delete User
                        </button>
                      </div>
                      
                      <h6 className="border-bottom pb-2 mb-3 mt-4">Change Status</h6>
                      <div className="btn-group">
                        <button 
                          className={`btn btn-sm ${selectedUser.status === "active" ? "btn-success" : "btn-outline-success"}`}
                          onClick={() => changeUserStatus(selectedUser, "active")}
                        >
                          <i className="fas fa-check-circle mr-1"></i> Active
                        </button>
                        <button 
                          className={`btn btn-sm ${selectedUser.status === "inactive" ? "btn-secondary" : "btn-outline-secondary"}`}
                          onClick={() => changeUserStatus(selectedUser, "inactive")}
                        >
                          <i className="fas fa-clock mr-1"></i> Inactive
                        </button>
                        <button 
                          className={`btn btn-sm ${selectedUser.status === "suspended" ? "btn-danger" : "btn-outline-danger"}`}
                          onClick={() => changeUserStatus(selectedUser, "suspended")}
                        >
                          <i className="fas fa-ban mr-1"></i> Suspended
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {modalType === "edit" && (
                  <div>
                    <form>
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Full Name</label>
                        <div className="col-sm-9">
                          <input 
                            type="text" 
                            className="form-control" 
                            defaultValue={selectedUser.user_metadata.full_name || ""} 
                          />
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Email</label>
                        <div className="col-sm-9">
                          <input 
                            type="email" 
                            className="form-control" 
                            defaultValue={selectedUser.email} 
                            readOnly 
                          />
                          <small className="form-text text-muted">
                            Email changes require verification
                          </small>
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Role</label>
                        <div className="col-sm-9">
                          <select 
                            className="form-control" 
                            defaultValue={adminUsers.includes(selectedUser.id) ? "admin" : selectedUser.role}
                          >
                            <option value="user">Standard User</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Status</label>
                        <div className="col-sm-9">
                          <select className="form-control" defaultValue={selectedUser.status}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
                
                {modalType === "delete" && (
                  <div className="text-center">
                    <div className="mb-4">
                      <i className="fas fa-exclamation-triangle text-warning fa-4x mb-3"></i>
                      <h5>Are you sure you want to delete this user?</h5>
                      <p className="text-muted">
                        This will permanently delete the user account, transaction history,
                        budgets, and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="alert alert-danger">
                      <strong>Warning:</strong> Deleting this user will remove all of their data from the system.
                    </div>
                    <div className="mt-3">
                      <div className="form-group">
                        <label>Type "DELETE" to confirm:</label>
                        <input type="text" className="form-control text-center" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
                
                {modalType === "edit" && (
                  <button type="button" className="btn btn-primary">
                    Save Changes
                  </button>
                )}
                
                {modalType === "delete" && (
                  <button type="button" className="btn btn-danger">
                    Delete User
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

export default UserManagement; 