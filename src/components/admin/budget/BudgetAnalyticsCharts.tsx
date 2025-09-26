import React, { FC } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { BudgetStats } from "./types";

interface BudgetAnalyticsChartsProps {
  stats: BudgetStats;
  loading?: boolean;
}

const BudgetAnalyticsCharts: FC<BudgetAnalyticsChartsProps> = ({ stats, loading = false }) => {
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
    const completedCount = stats.budgetsByStatus['completed'] || 0;
    const activeCount = stats.budgetsByStatus['active'] || 0;
    const archivedCount = stats.budgetsByStatus['archived'] || 0;
    
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

  if (loading) {
    return (
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Categories</h6>
            </div>
            <div className="card-body text-center">
              <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
              <p className="mt-2 text-muted">Loading chart data...</p>
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Status</h6>
            </div>
            <div className="card-body text-center">
              <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
              <p className="mt-2 text-muted">Loading chart data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
};

export default BudgetAnalyticsCharts;