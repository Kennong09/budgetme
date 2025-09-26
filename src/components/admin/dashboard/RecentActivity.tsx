import React, { FC } from "react";
import { Link } from "react-router-dom";
import { RecentUser, SystemStatus } from "./types";

interface RecentActivityProps {
  recentUsers: RecentUser[];
  systemStatus: SystemStatus;
  loading?: boolean;
}

const RecentActivity: FC<RecentActivityProps> = ({ recentUsers, systemStatus, loading = false }) => {
  if (loading) {
    return (
      <div className="row">
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Recent Users</h6>
            </div>
            <div className="card-body text-center">
              <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
              <p className="mt-2 text-muted">Loading recent users...</p>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">System Status</h6>
            </div>
            <div className="card-body text-center">
              <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
              <p className="mt-2 text-muted">Loading system status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
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
                  {recentUsers.map((user, index) => (
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
                        <Link to={`/admin/users/${user.id}`} className="btn btn-sm btn-outline-primary">
                          <i className="fas fa-eye"></i>
                          <span className="d-none d-sm-inline ml-1">View</span>
                        </Link>
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
  );
};

export default RecentActivity;