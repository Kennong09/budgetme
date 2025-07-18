import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { addAdminRole, removeAdminRole, isUserAdmin, getAdminUsers } from "../../../utils/adminHelpers";
import { useToast } from "../../../utils/ToastContext";

// Interface for our application's user representation
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
  banned?: boolean;
  email_confirmed_at?: string | null;
}

// Interface for Supabase Auth user - includes properties we need from Supabase
interface SupabaseUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  banned?: boolean;
  email_confirmed_at?: string | null;
}

// Component initialization and state
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
  const [pageSize, setPageSize] = useState<number>(5);
  const { showSuccessToast, showErrorToast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [editedUserData, setEditedUserData] = useState<Partial<User>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");

  const USERS_PER_PAGE = pageSize;

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, filterRole, filterStatus, pageSize]);
  
  // Fetch admin users only once on component mount
  useEffect(() => {
    fetchAdminUsers();
    // No dependencies array means this effect runs only once on mount
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    // Create channel reference outside to ensure we can clean it up
    const channel = supabaseAdmin.channel('public:profiles');
    
    // Set up the subscription
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => {
          // Only refresh user data when profiles table changes
          // Avoid fetching admin users again to prevent infinite recursion
          fetchUsers();
        }
      )
      .subscribe();
    
    // Store subscription reference
    setSubscription(channel);
    
    // Cleanup subscription on component unmount
    return () => {
      if (channel) {
        // Use the channel reference directly for cleanup
        channel.unsubscribe();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First, get the total count of users for pagination
      const { data: countData, error: countError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 999999 // Large number to get all users for counting
      });
      
      if (countError) {
        throw countError;
      }
      
      // Get actual users for current page from Supabase
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: currentPage,
        perPage: USERS_PER_PAGE
      });
      
      if (error) {
        throw error;
      }
      
      // Get admin list for role assignment
      // Use the admin users from state instead of calling the function again
      // This avoids multiple calls that might trigger the infinite recursion
      let adminList: string[] = adminUsers;
      
      // Helper function to determine status
      const determineStatus = (user: SupabaseUser): "active" | "inactive" | "suspended" => {
        if (user.banned) return "suspended";
        if (user.email_confirmed_at) return "active";
        return "inactive";
      };
      
      // Format users with required fields
      const formattedUsers = data?.users?.map((user: SupabaseUser) => {
        const isAdmin = adminList.includes(user.id);
        const userStatus = determineStatus(user);
        
        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata || { full_name: 'Unknown User' },
          role: isAdmin ? 'admin' : 'user',
          status: userStatus,
          banned: user.banned,
          email_confirmed_at: user.email_confirmed_at
        } as User;
      }) || [];
      
      // Apply search and filters to ALL users for accurate total count
      let allUsers = countData?.users || [];
      let filteredTotalUsers = allUsers;
      
      if (searchTerm) {
        filteredTotalUsers = filteredTotalUsers.filter((user: SupabaseUser) => 
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply role filter to total count
      if (filterRole !== "all") {
        filteredTotalUsers = filteredTotalUsers.filter((user: SupabaseUser) => {
          const isUserAdmin: boolean = adminList.includes(user.id);
          return (filterRole === "admin" && isUserAdmin) || 
                (filterRole === "user" && !isUserAdmin);
        });
      }
      
      // Apply status filter to total count
      if (filterStatus !== "all") {
        filteredTotalUsers = filteredTotalUsers.filter((user: SupabaseUser) => {
          const status = determineStatus(user);
          return status === filterStatus;
        });
      }
      
      // Apply search filter to current page data
      let filteredUsers = [...formattedUsers];
      
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.user_metadata.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply role filter
      if (filterRole !== "all") {
        filteredUsers = filteredUsers.filter(user => user.role === filterRole);
      }
      
      // Apply status filter
      if (filterStatus !== "all") {
        filteredUsers = filteredUsers.filter(user => user.status === filterStatus);
      }
      
      // Calculate pagination based on TOTAL filtered count
      const totalItems = filteredTotalUsers.length;
      const calculatedTotalPages = Math.max(1, Math.ceil(totalItems / USERS_PER_PAGE));
      setTotalPages(calculatedTotalPages);
      
      // If current page is greater than total pages, reset to page 1
      if (currentPage > calculatedTotalPages) {
        setCurrentPage(1);
      }
      
      setUsers(filteredUsers);
      setLoading(false);
    } catch (error) {
      showErrorToast("Failed to load users");
      setLoading(false);
    }
  };

  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      // Initialize with empty array to avoid null issues
      let adminList: string[] = [];
      
      // Try a direct query with a simple approach to avoid recursion
      try {
        // Query the profiles table with a simpler query that avoids triggering the recursive policy
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, is_admin')
          .eq('is_admin', true);
        
        if (error) throw error;
        
        if (data) {
          adminList = data.map(user => user.id);
        }
      } catch (directQueryError) {
        // As a last resort, use a hardcoded approach or localStorage cache
        const cachedAdmins = localStorage.getItem('cachedAdminUsers');
        if (cachedAdmins) {
          try {
            adminList = JSON.parse(cachedAdmins);
          } catch (e) {
            // Failed to parse cached admin users
          }
        }
      }
      
      // Store the admin list in state
      setAdminUsers(adminList);
      
      // Cache the result for future use (in case the DB query fails next time)
      localStorage.setItem('cachedAdminUsers', JSON.stringify(adminList));
      localStorage.setItem('lastAdminFetch', new Date().getTime().toString());
      
    } catch (error) {
      // Initialize with empty array to prevent UI errors
      setAdminUsers([]);
    }
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

  // Toggle user admin status
  const toggleAdminStatus = async (user: User) => {
    try {
      setLoading(true);
      
      const isCurrentlyAdmin = adminUsers.includes(user.id);
      
      if (isCurrentlyAdmin) {
        // Remove admin role using the admin client
        const success = await removeAdminRole(user.id);
        
        if (!success) {
          throw new Error("Failed to remove admin role");
        }
        
        setAdminUsers(prev => prev.filter(id => id !== user.id));
        showSuccessToast(`Admin role removed from ${user.user_metadata.full_name || user.email}`);
      } else {
        // Add admin role using the admin client
        const success = await addAdminRole(user.id);
        
        if (!success) {
          throw new Error("Failed to add admin role");
        }
        
        setAdminUsers(prev => [...prev, user.id]);
        showSuccessToast(`Admin role granted to ${user.user_metadata.full_name || user.email}`);
      }
      
      // Refresh users list
      await fetchUsers();
      setLoading(false);
    } catch (error) {
      showErrorToast(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Handle status change
  const changeUserStatus = async (user: User, newStatus: "active" | "inactive" | "suspended") => {
    try {
      setLoading(true);
      
      // Update user status in Supabase
      if (newStatus === "suspended") {
        // Ban the user if status is suspended
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          ban_duration: 'none' // Permanent ban
        });
        
        if (error) throw error;
      } else if (newStatus === "active" && user.banned) {
        // Unban the user if they were previously banned
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          ban_duration: '0' // Remove ban with a '0' string value
        });
        
        if (error) throw error;
      }
      
      // Update profile status in profiles table
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user.id);
      
      if (profileError) {
        // Continue anyway as this may not exist in all implementations
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
      
      showSuccessToast(`User status updated to ${newStatus}`);
      setLoading(false);
      
      // Refresh user data
      await fetchUsers();
    } catch (error) {
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
    
    // Reset edited user data when opening the modal
    if (type === "edit") {
      setEditedUserData({
        user_metadata: {
          full_name: user.user_metadata.full_name || "",
        },
        role: adminUsers.includes(user.id) ? "admin" : user.role,
        status: user.status
      });
    }
    
    setShowModal(true);
  };

  // Reset modal state
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setEditedUserData({});
  };

  // Handle input changes in edit form
  const handleEditChange = (field: string, value: string) => {
    if (field === "full_name") {
      setEditedUserData({
        ...editedUserData,
        user_metadata: {
          ...editedUserData.user_metadata,
          full_name: value
        }
      });
    } else {
      setEditedUserData({
        ...editedUserData,
        [field]: value
      });
    }
  };

  // Save edited user data
  const saveUserChanges = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Update user metadata if changed
      if (editedUserData.user_metadata?.full_name !== selectedUser.user_metadata.full_name) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          selectedUser.id,
          {
            user_metadata: {
              ...selectedUser.user_metadata,
              full_name: editedUserData.user_metadata?.full_name
            }
          }
        );
        
        if (error) throw error;
      }
      
      // Update role if changed
      const isCurrentlyAdmin = adminUsers.includes(selectedUser.id);
      const shouldBeAdmin = editedUserData.role === "admin";
      
      if (isCurrentlyAdmin && !shouldBeAdmin) {
        const success = await removeAdminRole(selectedUser.id);
        if (!success) throw new Error("Failed to remove admin role");
      } else if (!isCurrentlyAdmin && shouldBeAdmin) {
        const success = await addAdminRole(selectedUser.id);
        if (!success) throw new Error("Failed to add admin role");
      }
      
      // Update status if changed
      if (editedUserData.status !== selectedUser.status && editedUserData.status) {
        await changeUserStatus(selectedUser, editedUserData.status);
      }
      
      showSuccessToast("User updated successfully");
      closeModal();
      fetchUsers();
      
    } catch (error) {
      showErrorToast(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle user deletion
  const deleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Check if confirmation text matches
      if (deleteConfirmation !== "DELETE") {
        showErrorToast("Please type DELETE to confirm");
        setLoading(false);
        return;
      }
      
      // Delete user from Supabase Auth
      const { error } = await supabaseAdmin.auth.admin.deleteUser(
        selectedUser.id
      );
      
      if (error) throw error;
      
      // Remove from admin users if needed
      if (adminUsers.includes(selectedUser.id)) {
        setAdminUsers(prev => prev.filter(id => id !== selectedUser.id));
      }
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      
      showSuccessToast(`User ${selectedUser.email} deleted successfully`);
      closeModal();
      
      // Reset confirmation text
      setDeleteConfirmation("");
      
      // Refresh users
      await fetchUsers();
    } catch (error) {
      showErrorToast(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshUserData = async () => {
    setLoading(true);
    try {
      await fetchUsers();
      
      // Only attempt to refresh admin users if it's been more than 5 minutes
      // This prevents excessive calls that might trigger the infinite recursion
      const now = new Date().getTime();
      const lastAdminFetchTime = localStorage.getItem('lastAdminFetch') ? 
                               parseInt(localStorage.getItem('lastAdminFetch') || '0') : 0;
      
      if (now - lastAdminFetchTime > 5 * 60 * 1000) {
        await fetchAdminUsers();
        localStorage.setItem('lastAdminFetch', now.toString());
      }
      
      showSuccessToast("User data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh user data");
    } finally {
      setLoading(false);
    }
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
                className="btn btn-outline-secondary" 
                title="Reset Filters"
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
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-danger">
              All Users 
              {loading && (
                <span className="ml-2">
                  <i className="fas fa-spinner fa-spin fa-sm"></i>
                </span>
              )}
            </h6>
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
                onClick={refreshUserData}
                disabled={loading}
                title="Refresh User Data"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
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
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-muted">
                {users.length === 0 ? (
                  "No users found"
                ) : (
                  `Showing ${Math.min((currentPage - 1) * USERS_PER_PAGE + 1, users.length)} to ${Math.min(currentPage * USERS_PER_PAGE, users.length)} of ${users.length} entries`
                )}
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
                <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
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
                            onChange={(e) => handleEditChange("full_name", e.target.value)}
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
                            onChange={(e) => handleEditChange("role", e.target.value)}
                          >
                            <option value="user">Standard User</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Status</label>
                        <div className="col-sm-9">
                          <select className="form-control" defaultValue={selectedUser.status} onChange={(e) => handleEditChange("status", e.target.value)}>
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
                        <input type="text" className="form-control text-center" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
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
                  <button type="button" className="btn btn-primary" onClick={saveUserChanges}>
                    Save Changes
                  </button>
                )}
                
                {modalType === "delete" && (
                  <button type="button" className="btn btn-danger" onClick={deleteUser}>
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