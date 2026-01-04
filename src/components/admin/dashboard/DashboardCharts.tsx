import React, { FC, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { ChartData } from "./types";

interface DashboardChartsProps {
  chartData: ChartData;
  loading?: boolean;
}

const DashboardCharts: FC<DashboardChartsProps> = ({ chartData, loading = false }) => {
  const [mobileActiveChart, setMobileActiveChart] = useState<'users' | 'transactions'>('users');

  // Generate chart options for user growth
  const getUserGrowthChartOptions = () => {
    return {
      chart: {
        type: "spline",
        height: null,
        reflow: true,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      credits: {
        enabled: false
      },
      title: {
        text: "User Growth (Last 30 Days)",
        style: {
          fontSize: '16px'
        }
      },
      xAxis: {
        categories: chartData.users.map(item => item.date),
        labels: {
          step: window.innerWidth < 576 ? 10 : 5,
          style: {
            fontSize: '11px'
          },
          rotation: window.innerWidth < 576 ? -45 : 0
        }
      },
      yAxis: {
        title: {
          text: "New Users",
          style: {
            fontSize: '12px'
          }
        }
      },
      legend: {
        itemStyle: {
          fontSize: '12px'
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 500
          },
          chartOptions: {
            legend: {
              enabled: false
            }
          }
        }]
      },
      tooltip: {
        crosshairs: true,
        shared: true
      },
      series: [
        {
          name: "New Users",
          data: chartData.users.map(item => item.count),
          color: "#dc2626"
        }
      ]
    };
  };

  // Generate chart options for transaction volume
  const getTransactionChartOptions = () => {
    return {
      chart: {
        type: "column",
        height: null,
        reflow: true,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Transaction Volume (Last 30 Days)",
        style: {
          fontSize: '16px'
        }
      },
      xAxis: {
        categories: chartData.transactions.map(item => item.date),
        labels: {
          step: window.innerWidth < 576 ? 10 : 5,
          style: {
            fontSize: '11px'
          },
          rotation: window.innerWidth < 576 ? -45 : 0
        }
      },
      yAxis: {
        title: {
          text: "Transaction Count",
          style: {
            fontSize: '12px'
          }
        }
      },
      legend: {
        itemStyle: {
          fontSize: '12px'
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 500
          },
          chartOptions: {
            legend: {
              enabled: false
            }
          }
        }]
      },
      series: [
        {
          name: "Transactions",
          data: chartData.transactions.map(item => item.count),
          color: "#b91c1c"
        }
      ]
    };
  };

  // Mobile chart options
  const getMobileUserGrowthOptions = () => {
    return {
      chart: {
        type: "spline",
        height: 280,
        spacing: [10, 10, 10, 10],
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      credits: { enabled: false },
      title: { text: null },
      xAxis: {
        categories: chartData.users.map(item => item.date),
        labels: {
          step: 7,
          style: { fontSize: '10px', color: '#6b7280' },
          rotation: -45
        }
      },
      yAxis: {
        title: { text: null },
        labels: { style: { fontSize: '10px', color: '#6b7280' } }
      },
      legend: { enabled: false },
      tooltip: { crosshairs: true, shared: true },
      series: [{
        name: "New Users",
        data: chartData.users.map(item => item.count),
        color: "#dc2626"
      }]
    };
  };

  const getMobileTransactionOptions = () => {
    return {
      chart: {
        type: "column",
        height: 280,
        spacing: [10, 10, 10, 10],
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      credits: { enabled: false },
      title: { text: null },
      xAxis: {
        categories: chartData.transactions.map(item => item.date),
        labels: {
          step: 7,
          style: { fontSize: '10px', color: '#6b7280' },
          rotation: -45
        }
      },
      yAxis: {
        title: { text: null },
        labels: { style: { fontSize: '10px', color: '#6b7280' } }
      },
      legend: { enabled: false },
      series: [{
        name: "Transactions",
        data: chartData.transactions.map(item => item.count),
        color: "#b91c1c"
      }]
    };
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="d-block d-md-none">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="d-flex bg-light">
              <div className="flex-fill py-3 text-center">
                <div className="bg-secondary rounded mx-auto" style={{ height: '12px', width: '64px', opacity: 0.3 }}></div>
              </div>
              <div className="flex-fill py-3 text-center">
                <div className="bg-secondary rounded mx-auto" style={{ height: '12px', width: '80px', opacity: 0.3 }}></div>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ height: '256px' }}>
                <i className="fas fa-chart-line text-secondary fa-2x" style={{ opacity: 0.3 }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="row d-none d-md-flex">
          <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
            <div className="card shadow mb-4">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">User Growth</h6>
              </div>
              <div className="card-body text-center">
                <div style={{ minHeight: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div>
                    <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
                    <p className="mt-2 text-muted">Loading chart data...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
            <div className="card shadow mb-4">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Transaction Volume</h6>
              </div>
              <div className="card-body text-center">
                <div style={{ minHeight: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div>
                    <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
                    <p className="mt-2 text-muted">Loading chart data...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Charts - Tabbed interface */}
      <div className="d-block d-md-none mb-4">
        <div className="bg-white rounded shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="d-flex" style={{ backgroundColor: '#f8f9fa' }}>
            <button
              onClick={() => setMobileActiveChart('users')}
              className={`flex-fill py-3 border-0 font-weight-semibold position-relative ${
                mobileActiveChart === 'users'
                  ? 'text-danger bg-white'
                  : 'text-secondary bg-transparent'
              }`}
              style={{ fontSize: '14px' }}
            >
              <i className="fas fa-users mr-2" style={{ fontSize: '12px' }}></i>
              User Growth
              {mobileActiveChart === 'users' && (
                <div className="position-absolute bg-danger" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveChart('transactions')}
              className={`flex-fill py-3 border-0 font-weight-semibold position-relative ${
                mobileActiveChart === 'transactions'
                  ? 'text-danger bg-white'
                  : 'text-secondary bg-transparent'
              }`}
              style={{ fontSize: '14px' }}
            >
              <i className="fas fa-exchange-alt mr-2" style={{ fontSize: '12px' }}></i>
              Transactions
              {mobileActiveChart === 'transactions' && (
                <div className="position-absolute bg-danger" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
          </div>

          {/* Chart content */}
          <div className="p-3">
            {mobileActiveChart === 'users' ? (
              chartData.users.length > 0 ? (
                <div>
                  <div className="d-flex justify-content-center mb-3">
                    <span className="d-flex align-items-center text-secondary" style={{ fontSize: '12px' }}>
                      <span className="rounded-circle bg-danger mr-2" style={{ width: '12px', height: '12px' }}></span>
                      New Users
                    </span>
                  </div>
                  <HighchartsReact highcharts={Highcharts} options={getMobileUserGrowthOptions()} />
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                    <i className="fas fa-users text-secondary fa-2x"></i>
                  </div>
                  <p className="text-secondary">No user data available</p>
                </div>
              )
            ) : (
              chartData.transactions.length > 0 ? (
                <div>
                  <div className="d-flex justify-content-center mb-3">
                    <span className="d-flex align-items-center text-secondary" style={{ fontSize: '12px' }}>
                      <span className="rounded-circle mr-2" style={{ width: '12px', height: '12px', backgroundColor: '#b91c1c' }}></span>
                      Transactions
                    </span>
                  </div>
                  <HighchartsReact highcharts={Highcharts} options={getMobileTransactionOptions()} />
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                    <i className="fas fa-exchange-alt text-secondary fa-2x"></i>
                  </div>
                  <p className="text-secondary">No transaction data available</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts */}
      <div className="row d-none d-md-flex">
        {/* User Growth Chart */}
        <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
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
              <div className="admin-chart-container" style={{ minHeight: "250px", width: "100%" }}>
                <HighchartsReact highcharts={Highcharts} options={getUserGrowthChartOptions()} />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Chart */}
        <div className="col-xl-6 col-lg-6 col-md-12 mb-4">
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
              <div className="admin-chart-container" style={{ minHeight: "250px", width: "100%" }}>
                <HighchartsReact highcharts={Highcharts} options={getTransactionChartOptions()} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardCharts;
