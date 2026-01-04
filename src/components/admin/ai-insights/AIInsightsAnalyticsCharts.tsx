import React, { FC, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsMore from "highcharts/highcharts-more";
import solidGauge from "highcharts/modules/solid-gauge";
import { AIInsightStats, AIInsightSummary } from "./types";

// Initialize additional Highcharts modules
if (typeof window !== 'undefined') {
  highchartsMore(Highcharts);
  solidGauge(Highcharts);
}

interface AIInsightsAnalyticsChartsProps {
  stats: AIInsightStats;
  insights: AIInsightSummary[];
  loading?: boolean;
}

const AIInsightsAnalyticsCharts: FC<AIInsightsAnalyticsChartsProps> = ({
  stats,
  insights,
  loading = false
}) => {
  const [financialTab, setFinancialTab] = useState<'trends' | 'accuracy'>('trends');
  const [performanceTab, setPerformanceTab] = useState<'performance' | 'engagement'>('performance');

  // Chart options for User Financial Trends Analysis
  const getFinancialTrendsChartOptions = () => {
    const activeInsightData = (insights || []).filter(i => i && i.status === 'active').slice(0, 10);
    
    return {
      chart: {
        type: 'column',
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: 'User Financial Trends Analysis'
      },
      xAxis: {
        categories: activeInsightData.map(i => i?.username || 'Unknown'),
        crosshair: true,
        title: {
          text: 'Users'
        }
      },
      yAxis: [{
        min: -10,
        title: {
          text: 'Trend (%)'
        },
        labels: {
          format: '{value}%'
        }
      }, {
        title: {
          text: 'Confidence (%)'
        },
        labels: {
          format: '{value}%'
        },
        opposite: true,
        min: 0,
        max: 100
      }],
      tooltip: {
        shared: true,
        valueDecimals: 1,
        valueSuffix: '%'
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          dataLabels: {
            enabled: false
          }
        }
      },
      series: [{
        name: 'Income Trend',
        type: 'column',
        data: activeInsightData.map(i => ({
          y: Math.random() * 10 - 5, // Mock data
          color: Math.random() > 0.5 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Expense Trend',
        type: 'column',
        data: activeInsightData.map(i => ({
          y: Math.random() * 10 - 5, // Mock data
          color: Math.random() > 0.5 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Savings Trend',
        type: 'column',
        data: activeInsightData.map(i => ({
          y: Math.random() * 10 - 5, // Mock data
          color: Math.random() > 0.5 ? '#1cc88a' : '#e74a3b'
        }))
      }]
    };
  };

  // Prediction Accuracy Distribution
  const getAccuracyDistributionOptions = () => ({
    chart: {
      type: 'pie',
      height: 350
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'Prediction Accuracy Distribution'
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %'
        }
      }
    },
    series: [{
      name: 'Accuracy',
      colorByPoint: true,
      data: [{
        name: 'High Accuracy (>90%)',
        y: stats.riskDistribution.high || 0,
        color: '#1cc88a'
      }, {
        name: 'Medium Accuracy (70-90%)',
        y: stats.riskDistribution.medium || 0,
        color: '#f6c23e'
      }, {
        name: 'Low Accuracy (<70%)',
        y: stats.riskDistribution.low || 0,
        color: '#e74a3b'
      }]
    }]
  });

  // Model Performance Over Time
  const getModelPerformanceOptions = () => {
    const dates = [];
    const performance = [];
    
    // Generate mock data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString());
      performance.push(Math.random() * 20 + 80); // 80-100% performance
    }

    return {
      chart: {
        type: 'line',
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: 'Model Performance Over Time'
      },
      xAxis: {
        categories: dates,
        title: {
          text: 'Date'
        }
      },
      yAxis: {
        title: {
          text: 'Performance (%)'
        },
        min: 0,
        max: 100
      },
      tooltip: {
        valueSuffix: '%'
      },
      series: [{
        name: 'Model Accuracy',
        data: performance,
        color: '#4e73df'
      }]
    };
  };

  // User Engagement Chart
  const getUserEngagementOptions = () => ({
    chart: {
      type: 'area',
      height: 350
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'User Engagement'
    },
    xAxis: {
      categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    },
    yAxis: {
      title: {
        text: 'Active Users'
      }
    },
    series: [{
      name: 'Active Users',
      data: [stats.totalUsers * 0.7, stats.totalUsers * 0.8, stats.totalUsers * 0.9, stats.totalUsers],
      color: '#1cc88a'
    }]
  });

  if (loading) {
    return (
      <div className="analytics-charts-section mb-5">
        {/* Mobile Loading State */}
        <div className="block md:hidden mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <i className="fas fa-chart-area text-red-500 text-[10px]"></i>
            </div>
            <span className="text-xs font-semibold text-gray-800">Analytics</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3"></div>
                <div className="h-40 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          <div className="card shadow">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-chart-area mr-2"></i>
                Analytics & Performance Metrics
              </h6>
              <p className="text-muted mb-0 small">Detailed AI insights analytics and model performance insights</p>
            </div>
            <div className="card-body">
              <div className="row">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="col-lg-6 mb-4">
                    <div className="skeleton-chart" style={{ height: '350px', backgroundColor: '#f8f9fc' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-section mb-5">
      {/* Mobile Section Header */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-chart-bar text-red-500 text-xs"></i>
            Analytics
          </h6>
        </div>
      </div>

      {/* Desktop Section Header */}
      <div className="section-header mb-4 hidden md:block">
        <h5 className="section-title text-gray-800 font-weight-bold mb-1">
          Analytics & Performance Metrics
        </h5>
        <p className="section-subtitle text-muted mb-0">
          Detailed AI insights analytics and model performance insights
        </p>
      </div>

      {/* Mobile Charts - 2 Separate Sections with 2 Tabs Each */}
      <div className="block md:hidden space-y-3 mb-4">
        
        {/* Section 1: Financial Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <h6 className="text-xs font-bold text-gray-800 mb-1">Financial Analysis</h6>
          </div>
          {/* Tabs */}
          <div className="flex" style={{ backgroundColor: '#f8f9fa' }}>
            <button
              onClick={() => setFinancialTab('trends')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                financialTab === 'trends'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-chart-line mr-1" style={{ fontSize: '9px' }}></i>
              Trends
              {financialTab === 'trends' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setFinancialTab('accuracy')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                financialTab === 'accuracy'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-bullseye mr-1" style={{ fontSize: '9px' }}></i>
              Accuracy
              {financialTab === 'accuracy' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
          </div>

          {/* Chart Content */}
          <div className="p-3">
            {financialTab === 'trends' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getFinancialTrendsChartOptions(), chart: {...getFinancialTrendsChartOptions().chart, height: 200}, title: { text: null }}} 
              />
            )}
            {financialTab === 'accuracy' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getAccuracyDistributionOptions(), chart: {...getAccuracyDistributionOptions().chart, height: 200}, title: { text: null }}} 
              />
            )}
          </div>
        </div>

        {/* Section 2: Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <h6 className="text-xs font-bold text-gray-800 mb-1">Performance Metrics</h6>
          </div>
          {/* Tabs */}
          <div className="flex" style={{ backgroundColor: '#f8f9fa' }}>
            <button
              onClick={() => setPerformanceTab('performance')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                performanceTab === 'performance'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-clock mr-1" style={{ fontSize: '9px' }}></i>
              Performance
              {performanceTab === 'performance' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setPerformanceTab('engagement')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                performanceTab === 'engagement'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-users mr-1" style={{ fontSize: '9px' }}></i>
              Engagement
              {performanceTab === 'engagement' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
          </div>

          {/* Chart Content */}
          <div className="p-3">
            {performanceTab === 'performance' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getModelPerformanceOptions(), chart: {...getModelPerformanceOptions().chart, height: 200}, title: { text: null }}} 
              />
            )}
            {performanceTab === 'engagement' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getUserEngagementOptions(), chart: {...getUserEngagementOptions().chart, height: 200}, title: { text: null }}} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts - 2 Row Layout */}
      <div className="hidden md:block">
        {/* Charts Row 1 */}
        <div className="row mb-4">
          <div className="col-lg-6 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">User Financial Trends Analysis</h6>
              </div>
              <div className="card-body">
                <HighchartsReact highcharts={Highcharts} options={{...getFinancialTrendsChartOptions(), title: { text: null }}} />
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Prediction Accuracy Distribution</h6>
              </div>
              <div className="card-body">
                <HighchartsReact highcharts={Highcharts} options={{...getAccuracyDistributionOptions(), title: { text: null }}} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="row">
          <div className="col-lg-8 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Model Performance Over Time</h6>
              </div>
              <div className="card-body">
                <HighchartsReact highcharts={Highcharts} options={{...getModelPerformanceOptions(), title: { text: null }}} />
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">User Engagement</h6>
              </div>
              <div className="card-body">
                <HighchartsReact highcharts={Highcharts} options={{...getUserEngagementOptions(), title: { text: null }}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsAnalyticsCharts;