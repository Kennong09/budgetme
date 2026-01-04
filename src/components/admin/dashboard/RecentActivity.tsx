import { FC, useState } from "react";
import { Link } from "react-router-dom";
import { RecentUser, SystemStatus } from "./types";
import UserViewModal from "./UserViewModal";

interface RecentActivityProps {
  recentUsers: RecentUser[];
  systemStatus: SystemStatus;
  loading?: boolean;
}

const RecentActivity: FC<RecentActivityProps> = ({ recentUsers, systemStatus, loading = false }) => {
  const [selectedUser, setSelectedUser] = useState<RecentUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'users' | 'status'>('users');

  const handleViewUser = (user: RecentUser) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // Helper to get progress bar color class
  const getProgressColor = (value: number, type: 'db' | 'api' | 'error' | 'load') => {
    if (type === 'error') {
      return value < 2 ? 'bg-emerald-500' : value < 5 ? 'bg-amber-500' : 'bg-rose-500';
    }
    return value < 50 ? 'bg-emerald-500' : value < 80 ? 'bg-amber-500' : 'bg-rose-500';
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex bg-slate-50">
              <div className="flex-1 py-3.5 text-center">
                <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
              </div>
              <div className="flex-1 py-3.5 text-center">
                <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="row d-none d-md-flex">
          <div className="col-lg-6 col-md-12 mb-4">
            <div className="card shadow mb-4 admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Recent Users</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered admin-table table-sm">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Joined</th>
                        <th className="d-none d-md-table-cell">Account</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="skeleton-avatar mr-2"></div>
                              <div className="skeleton-line skeleton-user-name"></div>
                            </div>
                          </td>
                          <td><div className="skeleton-line skeleton-date"></div></td>
                          <td className="d-none d-md-table-cell">
                            <div className="skeleton-badge"></div>
                          </td>
                          <td><div className="skeleton-button"></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-md-12 mb-4">
            <div className="card shadow mb-4 admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">System Status</h6>
              </div>
              <div className="card-body">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="skeleton-line skeleton-status-title"></div>
                      <div className="skeleton-line skeleton-percentage"></div>
                    </div>
                    <div className="skeleton-progress-bar"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Recent Activity - Tabbed interface */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="flex bg-slate-50">
            <button
              onClick={() => setMobileActiveTab('users')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveTab === 'users'
                  ? 'text-red-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-users mr-2 text-xs"></i>
              Recent Users
              {mobileActiveTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveTab('status')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                mobileActiveTab === 'status'
                  ? 'text-red-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-server mr-2 text-xs"></i>
              System Status
              {mobileActiveTab === 'status' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {mobileActiveTab === 'users' ? (
              <div className="animate__animated animate__fadeIn">
                {recentUsers.length > 0 ? (
                  <div className="space-y-3">
                    {recentUsers.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.user_metadata.avatar_url || "../images/placeholder.png"}
                            alt={user.user_metadata.full_name || "User"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                              {user.user_metadata.full_name || "N/A"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            user.role === "admin" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                          }`}>
                            {user.role}
                          </span>
                          <button
                            onClick={() => handleViewUser(user)}
                            className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                            aria-label="View user"
                          >
                            <i className="fas fa-eye text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    <Link
                      to="/admin/users"
                      className="flex items-center justify-center gap-2 py-3 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <i className="fas fa-users text-xs"></i>
                      View All Users
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-users text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-sm text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate__animated animate__fadeIn space-y-4">
                {/* Database Storage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <i className="fas fa-database text-blue-500 text-[10px]"></i>
                      Database Storage
                    </span>
                    <span className="text-xs font-bold text-gray-800">{systemStatus.dbStorage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemStatus.dbStorage, 'db')}`}
                      style={{ width: `${systemStatus.dbStorage}%` }}
                    ></div>
                  </div>
                </div>

                {/* API Request Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <i className="fas fa-bolt text-amber-500 text-[10px]"></i>
                      API Request Rate
                    </span>
                    <span className="text-xs font-bold text-gray-800">{systemStatus.apiRequestRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemStatus.apiRequestRate, 'api')}`}
                      style={{ width: `${systemStatus.apiRequestRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Error Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-rose-500 text-[10px]"></i>
                      Error Rate
                    </span>
                    <span className="text-xs font-bold text-gray-800">{systemStatus.errorRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemStatus.errorRate, 'error')}`}
                      style={{ width: `${Math.max(systemStatus.errorRate * 10, 5)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Server Load */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <i className="fas fa-server text-indigo-500 text-[10px]"></i>
                      Server Load
                    </span>
                    <span className="text-xs font-bold text-gray-800">{systemStatus.serverLoad}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemStatus.serverLoad, 'load')}`}
                      style={{ width: `${systemStatus.serverLoad}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recent Logs */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Recent Logs</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {systemStatus.logs.slice(0, 3).map((log, index) => (
                      <div
                        key={index}
                        className={`px-3 py-2 rounded-lg text-[10px] ${
                          index === 0 ? 'bg-emerald-50 text-emerald-700' :
                          index === 1 ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <i className={`fas fa-${
                          index === 0 ? 'check-circle' : index === 1 ? 'info-circle' : 'exclamation-triangle'
                        } mr-1`}></i>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/admin/settings"
                  className="flex items-center justify-center gap-2 py-3 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                >
                  <i className="fas fa-cog text-xs"></i>
                  System Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Recent Activity */}
      <div className="row d-none d-md-flex">
        {/* Recent Users */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Recent Users</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered admin-table table-sm" width="100%" cellSpacing="0">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Joined</th>
                      <th className="d-none d-md-table-cell">Account</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="admin-user-row">
                        <td className="d-flex align-items-center">
                          <img
                            src={user.user_metadata.avatar_url || "../images/placeholder.png"}
                            alt={user.user_metadata.full_name || "User"}
                            className="admin-user-avatar mr-2"
                            style={{ maxWidth: "32px", height: "32px" }}
                          />
                          <div className="text-truncate" style={{ maxWidth: "120px" }}>
                            {user.user_metadata.full_name || "N/A"}
                          </div>
                        </td>
                        <td className="small">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="d-none d-md-table-cell">
                          <span className={`badge ${
                            user.role === "admin" ? "badge-danger" : "badge-primary"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewUser(user)}
                          >
                            <i className="fas fa-eye"></i>
                            <span className="d-none d-sm-inline ml-1">View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-3">
                          <p className="text-muted mb-0">No users found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Link to="/admin/users" className="btn btn-outline-primary btn-sm mt-1">
                <i className="fas fa-users mr-1"></i>
                <span>View All Users</span>
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">System Status</h6>
            </div>
            <div className="card-body">
              {/* Database Storage */}
              <h4 className="small font-weight-bold">
                Database Storage <span className="float-right">{systemStatus.dbStorage}%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-info"
                  role="progressbar"
                  style={{ width: `${systemStatus.dbStorage}%` }}
                  aria-valuenow={systemStatus.dbStorage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* API Request Rate */}
              <h4 className="small font-weight-bold">
                API Request Rate <span className="float-right">{systemStatus.apiRequestRate}%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${systemStatus.apiRequestRate}%` }}
                  aria-valuenow={systemStatus.apiRequestRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* Error Rates */}
              <h4 className="small font-weight-bold">
                Error Rates <span className="float-right">{systemStatus.errorRate}%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{ width: `${systemStatus.errorRate}%` }}
                  aria-valuenow={systemStatus.errorRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* Server Load */}
              <h4 className="small font-weight-bold">
                Server Load <span className="float-right">{systemStatus.serverLoad}%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-warning"
                  role="progressbar"
                  style={{ width: `${systemStatus.serverLoad}%` }}
                  aria-valuenow={systemStatus.serverLoad}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              <div className="mt-4">
                <h5 className="mb-2">Recent System Logs</h5>
                <div className="system-logs-container" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {systemStatus.logs.map((log, index) => (
                    <div key={index} className={`alert alert-${index === 0 ? 'success' : index === 1 ? 'info' : 'warning'} mb-2 py-2`}>
                      <small>
                        <i className={`fas fa-${index === 0 ? 'check-circle' : index === 1 ? 'info-circle' : 'exclamation-triangle'} mr-1`}></i>
                        {log}
                      </small>
                    </div>
                  ))}
                </div>
                <Link to="/admin/settings" className="btn btn-outline-primary btn-sm mt-3">
                  <i className="fas fa-cog mr-1"></i>
                  <span>View System Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User View Modal */}
      <UserViewModal
        user={selectedUser}
        isOpen={showUserModal}
        onClose={handleCloseModal}
        onUserUpdate={() => {
          // Optional: Handle user updates if needed
          // This could trigger a refresh of the recent users list
        }}
      />
    </>
  );
};

export default RecentActivity;