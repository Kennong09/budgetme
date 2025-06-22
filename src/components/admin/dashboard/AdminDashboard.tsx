import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../utils/supabaseClient";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "../../../utils/highchartsInit";

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  link: string;
}

interface ChartData {
  users: { date: string; count: number }[];
  transactions: { date: string; count: number }[];
  budgets: { date: string; count: number }[];
  goals: { date: string; count: number }[];
}

const AdminDashboard: FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    users: [],
    transactions: [],
    budgets: [],
    goals: []
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch summary statistics
        await Promise.all([
          fetchStats(), 
          fetchChartData(),
          fetchRecentUsers()
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch summary statistics
  const fetchStats = async () => {
    try {
      // In a real implementation, these would be actual queries to your database
      // For now, we'll use mock data
      const mockStats: StatCard[] = [
        {
          title: "Total Users",
          value: 1236,
          icon: "fa-users",
          color: "primary",
          change: "+3.5%",
          changeType: "increase",
          link: "/admin/users"
        },
        {
          title: "Monthly Transactions",
          value: 5428,
          icon: "fa-exchange-alt",
          color: "success",
          change: "+1.2%",
          changeType: "increase",
          link: "/admin/transactions"
        },
        {
          title: "Active Budgets",
          value: 843,
          icon: "fa-wallet",
          color: "info",
          change: "-0.8%",
          changeType: "decrease",
          link: "/admin/budgets"
        },
        {
          title: "Progress Goals",
          value: 621,
          icon: "fa-bullseye",
          color: "warning",
          change: "+4.6%",
          changeType: "increase",
          link: "/admin/goals"
        }
      ];
      
      setStatCards(mockStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      // Mock chart data - in production this would be a Supabase query
      const today = new Date();
      const dates = Array(30)
        .fill(null)
        .map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (29 - i));
          return d.toISOString().split("T")[0];
        });

      // Generate random mock data
      const mockData: ChartData = {
        users: dates.map(date => ({
          date,
          count: Math.floor(Math.random() * 10) + 5
        })),
        transactions: dates.map(date => ({
          date,
          count: Math.floor(Math.random() * 100) + 50
        })),
        budgets: dates.map(date => ({
          date,
          count: Math.floor(Math.random() * 15) + 2
        })),
        goals: dates.map(date => ({
          date,
          count: Math.floor(Math.random() * 8) + 1
        }))
      };

      setChartData(mockData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  // Fetch recent users
  const fetchRecentUsers = async () => {
    try {
      // In a real application, this would be a Supabase query
      // For now, using mock data
      const mockRecentUsers = [
        {
          id: "1",
          created_at: "2023-11-15T08:24:56",
          email: "user1@example.com",
          full_name: "Alex Johnson",
          avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
          role: "user"
        },
        {
          id: "2",
          created_at: "2023-11-14T14:12:05",
          email: "user2@example.com",
          full_name: "Samantha Lee",
          avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
          role: "user"
        },
        {
          id: "3",
          created_at: "2023-11-14T09:15:22",
          email: "user3@example.com",
          full_name: "Michael Chen",
          avatar_url: "https://randomuser.me/api/portraits/men/22.jpg",
          role: "admin"
        },
        {
          id: "4",
          created_at: "2023-11-13T16:48:11",
          email: "user4@example.com",
          full_name: "Jessica Taylor",
          avatar_url: "https://randomuser.me/api/portraits/women/17.jpg",
          role: "user"
        },
        {
          id: "5",
          created_at: "2023-11-13T10:32:45",
          email: "user5@example.com",
          full_name: "David Wilson",
          avatar_url: "https://randomuser.me/api/portraits/men/67.jpg",
          role: "admin"
        }
      ];
      
      setRecentUsers(mockRecentUsers);
    } catch (error) {
      console.error("Error fetching recent users:", error);
    }
  };

  // Generate chart options for user growth
  const getUserGrowthChartOptions = () => {
    return {
      chart: {
        type: "spline",
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: "User Growth (Last 30 Days)"
      },
      xAxis: {
        categories: chartData.users.map(item => item.date),
        labels: {
          step: 5
        }
      },
      yAxis: {
        title: {
          text: "New Users"
        }
      },
      tooltip: {
        crosshairs: true,
        shared: true
      },
      series: [
        {
          name: "New Users",
          data: chartData.users.map(item => item.count),
          color: "#4e73df"
        }
      ]
    };
  };

  // Generate chart options for transaction volume
  const getTransactionChartOptions = () => {
    return {
      chart: {
        type: "column",
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Transaction Volume (Last 30 Days)"
      },
      xAxis: {
        categories: chartData.transactions.map(item => item.date),
        labels: {
          step: 5
        }
      },
      yAxis: {
        title: {
          text: "Transaction Count"
        }
      },
      series: [
        {
          name: "Transactions",
          data: chartData.transactions.map(item => item.count),
          color: "#1cc88a"
        }
      ]
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h1 className="h3 mb-2 text-gray-800">Admin Dashboard</h1>
      <p className="mb-4">Overview of all BudgetMe statistics and user activities</p>

      {/* Statistics Cards */}
      <div className="row">
        {statCards.map((card, index) => (
          <div key={index} className="col-xl-3 col-md-6 mb-4">
            <div className={`card border-left-${card.color} shadow h-100 py-2 admin-card`}>
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className={`text-xs font-weight-bold text-${card.color} text-uppercase mb-1`}>
                      {card.title}
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {card.value}
                    </div>
                    {card.change && (
                      <div className={`text-xs mt-2 font-weight-bold ${
                        card.changeType === "increase" ? "text-success" : 
                        card.changeType === "decrease" ? "text-danger" : "text-muted"
                      }`}>
                        <i className={`fas ${
                          card.changeType === "increase" ? "fa-arrow-up" :
                          card.changeType === "decrease" ? "fa-arrow-down" : "fa-equals"
                        } mr-1`}></i>
                        {card.change} since last month
                      </div>
                    )}
                  </div>
                  <div className="col-auto">
                    <i className={`fas ${card.icon} fa-2x text-gray-300`}></i>
                  </div>
                </div>
              </div>
              <Link to={card.link} className="card-footer text-center small text-primary">
                <span>View Details</span>
                <i className="fas fa-chevron-right ml-2"></i>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row">
        {/* User Growth Chart */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">User Growth</h6>
              <div className="dropdown no-arrow">
                <a
                  className="dropdown-toggle"
                  href="#"
                  role="button"
                  id="dropdownMenuLink"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <i className="fas fa-ellipsis-v fa-sm fa-fw text-gray-400"></i>
                </a>
              </div>
            </div>
            <div className="card-body">
              <div className="admin-chart-container">
                <HighchartsReact highcharts={Highcharts} options={getUserGrowthChartOptions()} />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Chart */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Transaction Volume</h6>
              <div className="dropdown no-arrow">
                <a
                  className="dropdown-toggle"
                  href="#"
                  role="button"
                  id="dropdownMenuLink"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <i className="fas fa-ellipsis-v fa-sm fa-fw text-gray-400"></i>
                </a>
              </div>
            </div>
            <div className="card-body">
              <div className="admin-chart-container">
                <HighchartsReact highcharts={Highcharts} options={getTransactionChartOptions()} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users and Activity */}
      <div className="row">
        {/* Recent Users */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Recent Users</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered admin-table" width="100%" cellSpacing="0">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Joined Date</th>
                      <th>Account Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user, index) => (
                      <tr key={index} className="admin-user-row">
                        <td className="d-flex align-items-center">
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="admin-user-avatar mr-2"
                          />
                          <div>
                            <div className="font-weight-bold">{user.full_name}</div>
                            <div className="small text-muted">{user.email}</div>
                          </div>
                        </td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`badge badge-${
                            user.role === "admin" ? "danger" : "primary"
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td>
                          <Link to={`/admin/users/${user.id}`} className="btn btn-sm btn-outline-primary">
                            <i className="fas fa-eye mr-1"></i> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link to="/admin/users" className="btn btn-outline-primary btn-sm mt-3">
                View All Users <i className="fas fa-chevron-right ml-1"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">System Status</h6>
            </div>
            <div className="card-body">
              {/* Database Storage */}
              <h4 className="small font-weight-bold">
                Database Storage <span className="float-right">60%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-info"
                  role="progressbar"
                  style={{ width: "60%" }}
                  aria-valuenow={60}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* API Request Rate */}
              <h4 className="small font-weight-bold">
                API Request Rate <span className="float-right">42%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: "42%" }}
                  aria-valuenow={42}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* Error Rates */}
              <h4 className="small font-weight-bold">
                Error Rates <span className="float-right">2%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{ width: "2%" }}
                  aria-valuenow={2}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              {/* Server Load */}
              <h4 className="small font-weight-bold">
                Server Load <span className="float-right">75%</span>
              </h4>
              <div className="progress mb-4">
                <div
                  className="progress-bar bg-warning"
                  role="progressbar"
                  style={{ width: "75%" }}
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>

              <div className="mt-4">
                <h5 className="mb-2">Recent System Logs</h5>
                <div className="alert alert-success mb-2">
                  <small>
                    <i className="fas fa-check-circle mr-1"></i> All systems operational
                  </small>
                </div>
                <div className="alert alert-info mb-2">
                  <small>
                    <i className="fas fa-info-circle mr-1"></i> Database backup completed successfully
                  </small>
                </div>
                <div className="alert alert-warning mb-2">
                  <small>
                    <i className="fas fa-exclamation-triangle mr-1"></i> High API usage detected
                  </small>
                </div>
                <Link to="/admin/settings" className="btn btn-outline-primary btn-sm mt-3">
                  View System Settings <i className="fas fa-cog ml-1"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 