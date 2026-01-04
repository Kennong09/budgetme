import React, { FC, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { BudgetStats } from "./types";

interface BudgetAnalyticsChartsProps {
  stats: BudgetStats;
  loading?: boolean;
}

const BudgetAnalyticsCharts: FC<BudgetAnalyticsChartsProps> = ({ stats, loading = false }) => {
  // Mobile tab state - Status | Categories
  const [mobileActiveChart, setMobileActiveChart] = useState<'status' | 'categories'>('status');
  
  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get budget category chart options
  const getBudgetCategoryChartOptions = () => {
    const categoryData = Object.entries(stats.budgetsByCategory)
      .map(([name, count]) => ({
        name,
        y: count
      }))
      .filter(item => item.y > 0);
    
    return {
      chart: {
        type: "pie",
        height: isMobile ? 220 : 300
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
    const completedCount = stats.budgetsByStatus['completed'] || 0;
    const activeCount = stats.budgetsByStatus['active'] || 0;
    const archivedCount = stats.budgetsByStatus['archived'] || 0;
    
    return {
      chart: {
        type: "column",
        height: isMobile ? 220 : 300
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

  if (loading) {
    return (
      <>
        {/* Mobile Loading - Tabbed interface skeleton */}
        <div className="d-block d-md-none">
          <div className="bg-white rounded shadow-sm overflow-hidden">
            <div className="d-flex" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="flex-fill py-3 text-center">
                <div className="bg-secondary rounded mx-auto" style={{ height: '12px', width: '64px', opacity: 0.3 }}></div>
              </div>
              <div className="flex-fill py-3 text-center">
                <div className="bg-secondary rounded mx-auto" style={{ height: '12px', width: '80px', opacity: 0.3 }}></div>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ height: '220px' }}>
                <i className="fas fa-chart-bar text-secondary fa-2x" style={{ opacity: 0.3 }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Loading */}
        <div className="hidden md:block skeleton-budget-analytics">
          <div className="row">
            <div className="col-lg-6 mb-4">
              <div className="card shadow">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-budget-analytics-header">
                    <div className="skeleton-line skeleton-budget-analytics-title"></div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="skeleton-budget-chart"></div>
                </div>
              </div>
            </div>
            <div className="col-lg-6 mb-4">
              <div className="card shadow">
                <div className="card-header py-3 admin-card-header">
                  <div className="skeleton-budget-analytics-header">
                    <div className="skeleton-line skeleton-budget-analytics-title"></div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="skeleton-budget-chart"></div>
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
      {/* Mobile Charts - Tabbed interface like DashboardCharts */}
      <div className="d-block d-md-none mb-4">
        <div className="bg-white rounded shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="d-flex" style={{ backgroundColor: '#f8f9fa' }}>
            <button
              onClick={() => setMobileActiveChart('status')}
              className={`flex-fill py-3 border-0 font-weight-semibold position-relative ${
                mobileActiveChart === 'status'
                  ? 'text-danger bg-white'
                  : 'text-secondary bg-transparent'
              }`}
              style={{ fontSize: '14px' }}
            >
              <i className="fas fa-chart-bar mr-2" style={{ fontSize: '12px' }}></i>
              Status
              {mobileActiveChart === 'status' && (
                <div className="position-absolute bg-danger" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveChart('categories')}
              className={`flex-fill py-3 border-0 font-weight-semibold position-relative ${
                mobileActiveChart === 'categories'
                  ? 'text-danger bg-white'
                  : 'text-secondary bg-transparent'
              }`}
              style={{ fontSize: '14px' }}
            >
              <i className="fas fa-chart-pie mr-2" style={{ fontSize: '12px' }}></i>
              Categories
              {mobileActiveChart === 'categories' && (
                <div className="position-absolute bg-danger" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
          </div>

          {/* Chart content */}
          <div className="p-3">
            {mobileActiveChart === 'status' ? (
              <div>
                <div className="d-flex justify-content-center mb-3 flex-wrap" style={{ gap: '12px' }}>
                  <span className="d-flex align-items-center text-secondary" style={{ fontSize: '11px' }}>
                    <span className="rounded-circle mr-1" style={{ width: '10px', height: '10px', backgroundColor: '#36b9cc' }}></span>
                    Active
                  </span>
                  <span className="d-flex align-items-center text-secondary" style={{ fontSize: '11px' }}>
                    <span className="rounded-circle mr-1" style={{ width: '10px', height: '10px', backgroundColor: '#1cc88a' }}></span>
                    Completed
                  </span>
                  <span className="d-flex align-items-center text-secondary" style={{ fontSize: '11px' }}>
                    <span className="rounded-circle mr-1" style={{ width: '10px', height: '10px', backgroundColor: '#858796' }}></span>
                    Archived
                  </span>
                </div>
                <HighchartsReact highcharts={Highcharts} options={getBudgetStatusChartOptions()} />
              </div>
            ) : (
              <div>
                <div className="d-flex justify-content-center mb-3">
                  <span className="d-flex align-items-center text-secondary" style={{ fontSize: '11px' }}>
                    <span className="rounded-circle bg-danger mr-1" style={{ width: '10px', height: '10px' }}></span>
                    Budget Categories
                  </span>
                </div>
                <HighchartsReact highcharts={Highcharts} options={getBudgetCategoryChartOptions()} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts */}
      <div className="hidden md:block">
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="card shadow">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Budget Categories</h6>
              </div>
              <div className="card-body">
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getBudgetCategoryChartOptions()} 
                />
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-4">
            <div className="card shadow">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Budget Status</h6>
              </div>
              <div className="card-body">
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getBudgetStatusChartOptions()} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BudgetAnalyticsCharts;