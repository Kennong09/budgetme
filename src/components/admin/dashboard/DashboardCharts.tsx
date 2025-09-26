import React, { FC } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { ChartData } from "./types";

interface DashboardChartsProps {
  chartData: ChartData;
  loading?: boolean;
}

const DashboardCharts: FC<DashboardChartsProps> = ({ chartData, loading = false }) => {
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
          color: "#1cc88a"
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="row">
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
    );
  }

  return (
    <div className="row">
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
  );
};

export default DashboardCharts;