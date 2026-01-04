import React, { useState, useEffect, FC, useCallback } from "react";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { getAdminUsers } from "../../../utils/adminHelpers";
import { useToast } from "../../../utils/ToastContext";
import { truncateNumber } from "../../../utils/helpers";
import AddUserModal from "./AddUserModal";
import UserDetailsModal from "./UserDetailsModal";
import EditUserModal from "./EditUserModal";
import DeleteUserModal from "./DeleteUserModal";
import AdminRoleModal from "./AdminRoleModal";
import { User } from "./types";

// Stats Card Detail Modal Component
interface StatsDetailModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  color: string;
  icon: string;
  data: {
    label: string;
    value: string | number;
    subLabel?: string;
  }[];
}

const StatsDetailModal: FC<StatsDetailModalProps> = ({ show, onClose, title, color, icon, data }) => {
  if (!show) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        style={{ zIndex: 1050 }}
        onClick={onClose}
      >
        <div 
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg">
            {/* Modal Header */}
            <div className="modal-header bg-gradient-danger text-white border-0">
              <h5 className="modal-title d-flex align-items-center">
                <div className="modal-icon-container mr-3">
                  <i className={`fas ${icon}`}></i>
                </div>
                <div>
                  <div className="modal-title-main">{title}</div>
                  <div className="modal-subtitle">Detailed breakdown</div>
                </div>
              </h5>
              <button 
                type="button" 
                className="close text-white" 
                onClick={onClose}
                style={{ textShadow: 'none', opacity: 0.9 }}
              >
                <span>&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <div className="stats-breakdown-list">
                {data.map((item, index) => (
                  <div key={index} className="stats-breakdown-item d-flex justify-content-between align-items-center py-3 border-bottom">
                    <div>
                      <div className="font-weight-medium text-gray-800">{item.label}</div>
                      {item.subLabel && <small className="text-muted">{item.subLabel}</small>}
                    </div>
                    <span className={`badge badge-${color} badge-pill px-3 py-2`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light border-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="modal-footer-info">
                  <small className="text-muted">
                    <i className="fas fa-info-circle mr-1"></i>
                    Data reflects current statistics
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times mr-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const UserManagement: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Mobile dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAdminRoleModal, setShowAdminRoleModal] = useState<boolean>(false);
  
  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    color: string;
    icon: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', color: '', icon: '', data: [] });
  
  const { showSuccessToast, showErrorToast } = useToast();

  // Sync profile with auth metadata if needed
  const syncProfileWithAuth = useCallback(async (userId: string, authMetadata: any) => {
    if (!authMetadata.avatar_url && !authMetadata.full_name) return;
    
    try {
      const updateData: any = {};
      if (authMetadata.avatar_url) updateData.avatar_url = authMetadata.avatar_url;
      if (authMetadata.full_name) updateData.full_name = authMetadata.full_name;
      updateData.updated_at = new Date().toISOString();
      
      await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", userId);
        
      console.log(`Synced profile for user ${userId}:`, updateData);
    } catch (error) {
      console.error(`Failed to sync profile for user ${userId}:`, error);
    }
  }, []);

  // Fetch users function
  const fetchUsers = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      // Query profiles table with auth.users data to get complete information
      let query = supabaseAdmin
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          role,
          is_active,
          created_at,
          last_login,
          email_verified,
          currency_preference
        `, { count: "exact" });

      // Apply filters
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      if (filterRole !== "all") {
        query = query.eq("role", filterRole);
      }

      if (filterStatus !== "all") {
        query = query.eq("is_active", filterStatus === "active");
      }

      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch auth.users metadata using admin client - use auth admin methods
      const userIds = (data || []).map((u: any) => u.id);
      let authUsersData: any[] = [];
      
      if (userIds.length > 0) {
        // Use supabase admin auth methods instead of querying auth.users directly
        try {
          console.log('Fetching auth user data for IDs:', userIds);
          const authPromises = userIds.map(async (userId: string) => {
            const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (error) {
              console.warn(`Failed to fetch auth data for user ${userId}:`, error);
              return null;
            }
            console.log(`Auth user ${userId}:`, authUser.user);
            return authUser.user;
          });
          
          const authResults = await Promise.all(authPromises);
          authUsersData = authResults.filter(user => user !== null);
          console.log('Fetched auth users data:', authUsersData.length, 'users');
    } catch (error) {
          console.error('Error fetching auth users:', error);
        }
      }
      
      // Transform the profiles data to match expected User interface
      const transformedUsers = (data || []).map((userData: any) => {
        // Find corresponding auth user data
        const authUser = authUsersData.find(au => au.id === userData.id);
        const authMetadata = authUser?.user_metadata || {};
        
        // Debug avatar data for troubleshooting
        console.log(`User ${userData.email} avatar data:`, {
          authMetadata_avatar_url: authMetadata.avatar_url,
          profiles_avatar_url: userData.avatar_url,
          user_metadata_full: authMetadata
        });
        
        // Try to get the best available name (same logic as useUserData)
        const bestName = authMetadata.full_name || 
                        userData.full_name || 
                        authMetadata.name || 
                        (authMetadata.first_name && authMetadata.last_name ? 
                         `${authMetadata.first_name} ${authMetadata.last_name}` : null) ||
                        userData.email?.split('@')[0] || 
                        "Unnamed User";
        
        // Avatar fetching: exactly replicate useUserData logic
        const bestAvatar = authMetadata.avatar_url || "../images/placeholder.png";
        
        // Sync profile with auth metadata if there are discrepancies
        if (authMetadata.avatar_url && userData.avatar_url !== authMetadata.avatar_url) {
          syncProfileWithAuth(userData.id, authMetadata);
        }
        
        const transformed = {
          ...userData,
          // Map profiles fields to expected User interface
          status: userData.is_active ? "active" : "inactive",
          last_sign_in_at: authUser?.last_sign_in_at || userData.last_login,
          email_confirmed_at: authUser?.email_confirmed_at || (userData.email_verified ? new Date().toISOString() : null),
          user_metadata: {
            full_name: bestName,
            avatar_url: bestAvatar,
          },
          // Add default values for fields not in profiles
          total_sessions: 0,
          active_sessions: 0,
          last_session_login: null
        };
        
        return transformed;
      });

      setUsers(transformedUsers);
      setTotalUsers(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching users:", error);
      showErrorToast("Failed to fetch users");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [currentPage, searchTerm, filterRole, filterStatus, pageSize, showErrorToast]);

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    try {
      const admins = await getAdminUsers();
      setAdminUsers(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(false), fetchAdminUsers()]);
    setRefreshing(false);
  }, [fetchUsers, fetchAdminUsers]);

  // Effects
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  // Modal handlers
  const openDetailsModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openAdminRoleModal = (user: User) => {
    setSelectedUser(user);
    setShowAdminRoleModal(true);
  };

  // Mobile dropdown functions
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = (userId: string) => {
    setActiveDropdown(activeDropdown === userId ? null : userId);
  };

  const closeAllModals = () => {
    setSelectedUser(null);
    setShowDetailsModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowAdminRoleModal(false);
    setShowAddUserModal(false);
  };

  // User management handlers
  const handleUserUpdated = (updatedUser: User) => {
    setUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
  };

  const handleUserDeleted = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    setTotalUsers(prev => prev - 1);
  };

  const handleRoleUpdated = (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      setAdminUsers(prev => [...prev, userId]);
    } else {
      setAdminUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleUserAdded = () => {
      fetchUsers();
    fetchAdminUsers();
  };

  const changeUserStatus = async (user: User, status: "active" | "inactive" | "suspended") => {
    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: status === "active" })
        .eq("id", user.id);

      if (error) throw error;

      // Update the local state with both status and is_active for consistency
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { 
          ...u, 
          status,
          is_active: status === "active"
        } : u
      ));

      showSuccessToast(`User status updated to ${status}`);
    } catch (error) {
      console.error("Error updating user status:", error);
      showErrorToast("Failed to update user status");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="user-management modern-user-management">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading user management...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          <div className="user-management-header mb-4">
            <div className="skeleton-line skeleton-header-title mb-2"></div>
            <div className="skeleton-line skeleton-header-subtitle"></div>
          </div>

          <div className="row mb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-3">
                <div className="card shadow h-100 py-3 admin-card admin-card-loading">
                  <div className="card-body text-center">
                    <div className="skeleton-line skeleton-stat-value mb-2"></div>
                    <div className="skeleton-line skeleton-stat-title"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="controls-section mb-4">
            <div className="row">
              <div className="col-md-6">
                <div className="skeleton-line skeleton-search-bar"></div>
              </div>
              <div className="col-md-3">
                <div className="skeleton-line skeleton-filter"></div>
              </div>
              <div className="col-md-3">
                <div className="skeleton-line skeleton-filter"></div>
              </div>
            </div>
          </div>

          <div className="card shadow">
            <div className="card-header">
              <div className="skeleton-line skeleton-table-header"></div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered admin-table">
                  <thead>
                    <tr>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <th key={index}>
                          <div className="skeleton-line skeleton-th"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
                          <td key={colIndex}>
                            <div className="skeleton-line skeleton-td"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">User Management</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${refreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add user"
            >
              <i className="fas fa-user-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Enhanced Header */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-users"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">User Management</h1>
                <p className="header-subtitle mb-0">
                  Manage user accounts, roles, and permissions across the platform
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddUserModal(true)}
            >
              <i className="fas fa-user-plus mr-1"></i>
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Dashboard Style */}
      <div className="stats-section mb-5">
        {(() => {
          const activeCount = users.filter(u => u.status === "active").length;
          const neverLoggedInCount = users.filter(u => !u.last_sign_in_at).length;
          const activePercentage = totalUsers > 0 ? ((activeCount / totalUsers) * 100).toFixed(1) : 0;
          const adminPercentage = totalUsers > 0 ? ((adminUsers.length / totalUsers) * 100).toFixed(1) : 0;
          const neverLoggedInPercentage = totalUsers > 0 ? ((neverLoggedInCount / totalUsers) * 100).toFixed(1) : 0;
          const inactiveCount = totalUsers - activeCount;
          const regularUsers = totalUsers - adminUsers.length;

          const openTotalUsersModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Users Breakdown',
              color: 'danger',
              icon: 'fa-users',
              data: [
                { label: 'Total Users', value: totalUsers },
                { label: 'Active Users', value: activeCount, subLabel: `${activePercentage}% of total` },
                { label: 'Inactive Users', value: inactiveCount, subLabel: `${(100 - Number(activePercentage)).toFixed(1)}% of total` },
                { label: 'Administrators', value: adminUsers.length },
                { label: 'Regular Users', value: regularUsers },
              ]
            });
          };

          const openActiveUsersModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Active Users Breakdown',
              color: 'success',
              icon: 'fa-user-check',
              data: [
                { label: 'Active Users', value: activeCount },
                { label: 'Percentage of Total', value: `${activePercentage}%` },
                { label: 'Inactive Users', value: inactiveCount },
                { label: 'Active Admins', value: adminUsers.filter(id => users.find(u => u.id === id)?.status === 'active').length },
              ]
            });
          };

          const openAdminsModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Administrators Breakdown',
              color: 'warning',
              icon: 'fa-user-shield',
              data: [
                { label: 'Total Administrators', value: adminUsers.length },
                { label: 'Percentage of Total', value: `${adminPercentage}%` },
                { label: 'Regular Users', value: regularUsers },
                { label: 'Admin to User Ratio', value: `1:${regularUsers > 0 ? Math.round(regularUsers / adminUsers.length) : 0}` },
              ]
            });
          };

          const openNeverLoggedInModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Never Logged In Breakdown',
              color: 'info',
              icon: 'fa-user-clock',
              data: [
                { label: 'Never Logged In', value: neverLoggedInCount },
                { label: 'Percentage of Total', value: `${neverLoggedInPercentage}%` },
                { label: 'Users Who Logged In', value: totalUsers - neverLoggedInCount },
                { label: 'Activation Rate', value: `${(100 - Number(neverLoggedInPercentage)).toFixed(1)}%` },
              ]
            });
          };

          return (
            <>
              {/* Mobile Stats Cards */}
              <div className="block md:hidden mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalUsersModal}>
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
                      <i className="fas fa-users text-red-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Users</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(totalUsers)}</p>
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <i className="fas fa-users text-[8px]"></i>
                      <span className="text-[9px] font-medium">{inactiveCount} inactive</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveUsersModal}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                      <i className="fas fa-user-check text-emerald-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Users</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(activeCount)}</p>
                    <div className="flex items-center gap-1 mt-1 text-emerald-500">
                      <i className="fas fa-arrow-up text-[8px]"></i>
                      <span className="text-[9px] font-medium">{activePercentage}% of total</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openAdminsModal}>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                      <i className="fas fa-user-shield text-amber-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Administrators</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(adminUsers.length)}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      <i className="fas fa-shield-alt text-[8px]"></i>
                      <span className="text-[9px] font-medium">{adminPercentage}% of total</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openNeverLoggedInModal}>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                      <i className="fas fa-user-clock text-blue-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Never Logged In</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(neverLoggedInCount)}</p>
                    <div className="flex items-center gap-1 mt-1 text-blue-500">
                      <i className="fas fa-clock text-[8px]"></i>
                      <span className="text-[9px] font-medium">{neverLoggedInPercentage}% pending</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row d-none d-md-flex">
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalUsersModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-danger text-uppercase mb-2">Total Users</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(totalUsers)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-muted">
                            <i className="fas fa-users mr-1"></i>
                            <span className="font-weight-medium">{inactiveCount} inactive</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-danger">
                            <i className="fas fa-users stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-danger">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveUsersModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-success text-uppercase mb-2">Active Users</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(activeCount)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-success">
                            <i className="fas fa-arrow-up mr-1"></i>
                            <span className="font-weight-medium">{activePercentage}%</span>
                            <span className="ml-1 small">of total</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-success">
                            <i className="fas fa-user-check stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-success">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openAdminsModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-warning text-uppercase mb-2">Administrators</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(adminUsers.length)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-warning">
                            <i className="fas fa-shield-alt mr-1"></i>
                            <span className="font-weight-medium">{adminPercentage}%</span>
                            <span className="ml-1 small">of total</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-warning">
                            <i className="fas fa-user-shield stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-warning">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openNeverLoggedInModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-info text-uppercase mb-2">Never Logged In</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(neverLoggedInCount)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-info">
                            <i className="fas fa-clock mr-1"></i>
                            <span className="font-weight-medium">{neverLoggedInPercentage}%</span>
                            <span className="ml-1 small">pending</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-info">
                            <i className="fas fa-user-clock stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-info">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
              </div>

              {/* Mobile Controls & User List */}
              <div className="block md:hidden mb-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Mobile Header */}
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                      <i className="fas fa-users text-red-500 text-[10px]"></i>
                      User List
                      {totalUsers > 0 && (
                        <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                          {totalUsers}
                        </span>
                      )}
                    </h6>
                    <button 
                      className="text-[10px] text-gray-500 flex items-center gap-1"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterRole("all");
                        setFilterStatus("all");
                      }}
                    >
                      <i className="fas fa-undo text-[8px]"></i>
                      Reset
                    </button>
                  </div>
                  
                  {/* Mobile Search & Filters */}
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <div className="relative mb-2">
                      <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
                      <input
                        type="text"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Users</option>
                      </select>
                      <select
                        className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Mobile User Cards List */}
                  <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                    {users.length > 0 ? (
                      users.map((user) => {
                        const isUserAdmin = adminUsers.includes(user.id);
                        return (
                          <div 
                            key={user.id} 
                            className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            onClick={() => openDetailsModal(user)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                <img
                                  src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                                  alt={user.user_metadata?.full_name || "User"}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                                />
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}></div>
                              </div>
                              
                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-gray-800 truncate">
                                    {user.user_metadata?.full_name || "Unnamed User"}
                                  </p>
                                  {isUserAdmin && (
                                    <span className="flex-shrink-0 px-1 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-semibold">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
                                    user.status === 'active' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Inactive"}
                                  </span>
                                  {user.email_confirmed_at && (
                                    <span className="text-[8px] text-blue-500 flex items-center gap-0.5">
                                      <i className="fas fa-check-circle"></i>
                                      Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions - Mobile Dropdown */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="relative">
                                  <button
                                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); toggleDropdown(user.id); }}
                                    onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(user.id); }}
                                    aria-label="More actions"
                                  >
                                    <i className="fas fa-ellipsis-v text-[10px]"></i>
                                  </button>
                                  
                                  {/* Dropdown Menu */}
                                  {activeDropdown === user.id && (
                                    <div className="dropdown-menu fixed w-32 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 9999, transform: 'translateX(-100px) translateY(4px)' }}>
                                      <button
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); closeDropdown(); openDetailsModal(user); }}
                                        onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openDetailsModal(user); }}
                                      >
                                        <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                                        <span className="text-gray-700">View</span>
                                      </button>
                                      <button
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); closeDropdown(); openEditModal(user); }}
                                        onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openEditModal(user); }}
                                      >
                                        <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                                        <span className="text-gray-700">Edit</span>
                                      </button>
                                      <button
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); closeDropdown(); openAdminRoleModal(user); }}
                                        onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openAdminRoleModal(user); }}
                                      >
                                        <i className={`fas ${adminUsers.includes(user.id) ? 'fa-user-minus' : 'fa-user-shield'} text-gray-500 text-[10px]`}></i>
                                        <span className="text-gray-700">
                                          {adminUsers.includes(user.id) ? 'Remove Admin' : 'Make Admin'}
                                        </span>
                                      </button>
                                      <div className="border-t border-gray-200"></div>
                                      <button
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); closeDropdown(); openDeleteModal(user); }}
                                        onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); openDeleteModal(user); }}
                                      >
                                        <i className="fas fa-trash text-red-500 text-[10px]"></i>
                                        <span className="text-red-600">Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-8 text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <i className="fas fa-users text-gray-400 text-lg"></i>
                        </div>
                        <p className="text-xs font-medium text-gray-600">No users found</p>
                        <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile Pagination */}
                  {totalPages > 1 && (
                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left text-[10px]"></i>
                        </button>
                        <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded-lg min-w-[24px] text-center">
                          {currentPage}
                        </span>
                        <button
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fas fa-chevron-right text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Controls Section */}
              <div className="controls-section mb-4 hidden md:block">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-6 col-lg-4 mb-3 mb-md-0">
                        <div className="search-container">
                          <div className="input-group">
                            <div className="input-group-prepend">
                              <span className="input-group-text bg-white border-right-0">
                                <i className="fas fa-search text-muted"></i>
                              </span>
                            </div>
                            <input
                              type="text"
                              className="form-control border-left-0 modern-input"
                              placeholder="Search users by name or email..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                        <select
                          className="form-control modern-select"
                          value={filterRole}
                          onChange={(e) => setFilterRole(e.target.value)}
                        >
                          <option value="all">All Roles</option>
                          <option value="admin">Administrators</option>
                          <option value="user">Regular Users</option>
                        </select>
                      </div>
                      <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                        <select
                          className="form-control modern-select"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="col-md-12 col-lg-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="page-size-selector">
                            <small className="text-muted mr-2">Show:</small>
                            <select
                              className="form-control form-control-sm d-inline-block w-auto"
                              value={pageSize}
                              onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                            </select>
                            <small className="text-muted ml-2">per page</small>
                          </div>
                          {(searchTerm || filterRole !== "all" || filterStatus !== "all") && (
                            <button 
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setSearchTerm("");
                                setFilterRole("all");
                                setFilterStatus("all");
                              }}
                            >
                              <i className="fas fa-times mr-1"></i>
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Users Table */}
              <div className="table-section hidden md:block">
                <div className="card shadow">
                  <div className="card-header bg-white border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="m-0 font-weight-bold text-danger">
                        <i className="fas fa-table mr-2"></i>
                        Users ({totalUsers})
                      </h6>
                      <div className="table-actions">
                        <small className="text-muted">
                          Showing {Math.min((currentPage - 1) * pageSize + 1, totalUsers)} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} entries
                        </small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover modern-table mb-0">
                        <thead className="table-header">
                          <tr>
                            <th className="border-0">User</th>
                            <th className="border-0">Email</th>
                            <th className="border-0">Status</th>
                            <th className="border-0">Role</th>
                            <th className="border-0">Last Login</th>
                            <th className="border-0 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length > 0 ? (
                            users.map((user) => {
                              const isUserAdmin = adminUsers.includes(user.id);
                              return (
                                <tr key={user.id} className="table-row">
                                  <td className="py-3">
                                    <div className="d-flex align-items-center">
                                      <div className="user-avatar-container mr-3">
                                        <img
                                          src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                                          alt={user.user_metadata?.full_name || "User"}
                                          className="user-table-avatar"
                                          onError={(e) => {
                                            e.currentTarget.src = "../images/placeholder.png";
                                          }}
                                        />
                                        <div className={`user-status-dot status-${user.status || 'inactive'}`}></div>
                                      </div>
                                      <div className="user-info">
                                        <div className="user-name font-weight-medium">
                                          {user.user_metadata?.full_name || "Unnamed User"}
                                        </div>
                                        <div className="user-id text-muted small">
                                          ID: {user.id.substring(0, 8)}...
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="user-email">
                                      {user.email}
                                      {user.email_confirmed_at && (
                                        <i className="fas fa-check-circle text-success ml-2" title="Verified"></i>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <span className={`status-badge status-${user.status || 'inactive'}`}>
                                      <i className={`fas ${
                                        user.status === "active" ? "fa-check-circle" :
                                        user.status === "suspended" ? "fa-ban" : "fa-pause-circle"
                                      } mr-1`}></i>
                                      {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Inactive"}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <span className={`role-badge ${isUserAdmin ? "role-admin" : "role-user"}`}>
                                      <i className={`fas ${isUserAdmin ? "fa-shield-alt" : "fa-user"} mr-1`}></i>
                                      {isUserAdmin ? "Administrator" : "User"}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <div className="last-login">
                                      {user.last_sign_in_at ? (
                                        <>
                                          <div className="login-date">
                                            {new Date(user.last_sign_in_at).toLocaleDateString()}
                                          </div>
                                          <div className="login-time text-muted small">
                                            {new Date(user.last_sign_in_at).toLocaleTimeString()}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-muted">Never</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="action-buttons">
                                      <button
                                        className="btn btn-sm btn-outline-primary mr-1"
                                        onClick={() => openDetailsModal(user)}
                                        title="View Details"
                                      >
                                        <i className="fas fa-eye"></i>
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-secondary mr-1"
                                        onClick={() => openEditModal(user)}
                                        title="Edit User"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button
                                        className={`btn btn-sm ${isUserAdmin ? "btn-outline-warning" : "btn-outline-info"} mr-1`}
                                        onClick={() => openAdminRoleModal(user)}
                                        title={isUserAdmin ? "Remove Admin" : "Make Admin"}
                                      >
                                        <i className={`fas ${isUserAdmin ? "fa-user-minus" : "fa-user-shield"}`}></i>
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => openDeleteModal(user)}
                                        title="Delete User"
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-5">
                                <div className="no-users-container">
                                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                                  <h5 className="text-muted">No users found</h5>
                                  <p className="text-muted">Try adjusting your search or filter criteria</p>
                                  {(searchTerm || filterRole !== "all" || filterStatus !== "all") && (
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => {
                                        setSearchTerm("");
                                        setFilterRole("all");
                                        setFilterStatus("all");
                                      }}
                                    >
                                      <i className="fas fa-times mr-1"></i>
                                      Clear Filters
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Desktop Pagination */}
                  {totalPages > 1 && (
                    <div className="card-footer bg-white border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="pagination-info">
                          <small className="text-muted">
                            Page {currentPage} of {totalPages}
                          </small>
                        </div>
                        <nav aria-label="User pagination">
                          <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                              >
                                <i className="fas fa-angle-double-left"></i>
                              </button>
                            </li>
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                              >
                                <i className="fas fa-angle-left"></i>
                              </button>
                            </li>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setCurrentPage(pageNum)}
                                  >
                                    {pageNum}
                                  </button>
                                </li>
                              );
                            })}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                              >
                                <i className="fas fa-angle-right"></i>
                              </button>
                            </li>
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                              >
                                <i className="fas fa-angle-double-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Modals */}
      <AddUserModal
        show={showAddUserModal}
        onClose={closeAllModals}
        onUserAdded={handleUserAdded}
      />

      <UserDetailsModal
        user={selectedUser}
        isOpen={showDetailsModal}
        onClose={closeAllModals}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onToggleAdmin={openAdminRoleModal}
        onChangeStatus={changeUserStatus}
        isAdmin={selectedUser ? adminUsers.includes(selectedUser.id) : false}
      />

      <EditUserModal
        user={selectedUser}
        isOpen={showEditModal}
        onClose={closeAllModals}
        onUserUpdated={handleUserUpdated}
      />

      <DeleteUserModal
        user={selectedUser}
        isOpen={showDeleteModal}
        onClose={closeAllModals}
        onUserDeleted={handleUserDeleted}
      />

      <AdminRoleModal
        user={selectedUser}
        isOpen={showAdminRoleModal}
        onClose={closeAllModals}
        onRoleUpdated={handleRoleUpdated}
        isCurrentlyAdmin={selectedUser ? adminUsers.includes(selectedUser.id) : false}
      />

      {/* Stats Detail Modal */}
      <StatsDetailModal
        show={statsDetailModal.show}
        onClose={() => setStatsDetailModal(prev => ({ ...prev, show: false }))}
        title={statsDetailModal.title}
        color={statsDetailModal.color}
        icon={statsDetailModal.icon}
        data={statsDetailModal.data}
      />
    </div>
  );
};

export default UserManagement;