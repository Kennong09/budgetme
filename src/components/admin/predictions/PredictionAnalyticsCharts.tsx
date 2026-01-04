import React, { FC, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsMore from "highcharts/highcharts-more";
import solidGauge from "highcharts/modules/solid-gauge";
import { PredictionStats, UserDistribution, HistoricalAccuracy, PredictionSummary, PredictionAnalyticsChartsProps } from "./types";

// Initialize additional Highcharts modules
if (typeof window !== 'undefined') {
  highchartsMore(Highcharts);
  solidGauge(Highcharts);
}

const PredictionAnalyticsCharts: FC<PredictionAnalyticsChartsProps> = ({
  stats,
  userDistribution,
  historicalAccuracy,
  predictions,
  loading = false
}) => {
  const [financialTab, setFinancialTab] = useState<'trends' | 'accuracy'>('trends');
  const [performanceTab, setPerformanceTab] = useState<'performance' | 'engagement'>('performance');
  // Chart options for User Financial Trends Analysis
  const getFinancialTrendsChartOptions = () => {
    const activeUserData = (predictions || []).filter(u => u && u.status === 'active');
    
    return {
      chart: {
        type: 'column',
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: null
      },
      xAxis: {
        categories: activeUserData.map(u => u?.username || 'Unknown'),
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
          text: 'Accuracy (%)'
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
        data: activeUserData.map(u => ({
          y: Number(u?.incomeTrend) || 0, 
          color: (Number(u?.incomeTrend) || 0) >= 0 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Expense Trend',
        type: 'column',
        data: activeUserData.map(u => ({
          y: Number(u?.expenseTrend) || 0,
          color: (Number(u?.expenseTrend) || 0) <= 0 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Savings Trend',
        type: 'column',
        data: activeUserData.map(u => ({
          y: Number(u?.savingsTrend) || 0,
          color: (Number(u?.savingsTrend) || 0) >= 0 ? '#4e73df' : '#e74a3b'
        }))
      }, {
        name: 'Prediction Accuracy',
        type: 'spline',
        yAxis: 1,
        data: activeUserData.map(u => Number(u?.predictionAccuracy) || 0),
        tooltip: {
          valueSuffix: '%'
        },
        marker: {
          lineWidth: 2,
          lineColor: '#f7a35c',
          fillColor: 'white'
        }
      }]
    };
  };

  // Chart options for Prediction Accuracy Distribution
  const getAccuracyDistributionChartOptions = () => {
    return {
      chart: {
        type: 'pie',
        height: 350,
        options3d: {
          enabled: true,
          alpha: 45
        }
      },
      credits: {
        enabled: false
      },
      title: {
        text: null
      },
      plotOptions: {
        pie: {
          innerSize: '50%',
          depth: 45,
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
            style: {
              fontSize: '11px'
            },
            connectorShape: 'crookedLine',
            crookDistance: '70%'
          }
        }
      },
      series: [{
        name: 'Users',
        data: (userDistribution || []).map((item, index) => ({
          name: item?.name || 'Unknown',
          y: Number(item?.value) || 0,
          color: ['#1cc88a', '#4e73df', '#f6c23e', '#e74a3b'][index] || '#gray'
        }))
      }]
    };
  };

  // Chart options for Model Performance Over Time
  const getModelPerformanceChartOptions = () => {
    return {
      chart: {
        height: 350,
        zoomType: 'xy'
      },
      credits: {
        enabled: false
      },
      title: {
        text: null
      },
      xAxis: {
        categories: (historicalAccuracy || []).map(item => item?.month || 'Unknown'),
        crosshair: true
      },
      yAxis: [
        {
          title: {
            text: 'Accuracy (%)',
            style: {
              color: '#4e73df'
            }
          },
          labels: {
            format: '{value}%',
            style: {
              color: '#4e73df'
            }
          },
          min: 0,
          max: 100
        },
        {
          title: {
            text: 'Error Rate (%)',
            style: {
              color: '#e74a3b'
            }
          },
          labels: {
            format: '{value}%',
            style: {
              color: '#e74a3b'
            }
          },
          opposite: true,
          min: 0,
          max: 100
        }
      ],
      tooltip: {
        shared: true
      },
      legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        floating: false,
        backgroundColor: 'white'
      },
      series: [
        {
          name: 'Prediction Accuracy',
          type: 'area',
          yAxis: 0,
          data: (historicalAccuracy || []).map(item => Number(item?.accuracy) || 0),
          tooltip: {
            valueSuffix: '%'
          },
          color: '#4e73df',
          fillOpacity: 0.3,
          zIndex: 1
        },
        {
          name: 'Error Rate',
          type: 'line',
          yAxis: 1,
          data: (historicalAccuracy || []).map(item => Number(item?.error) || 0),
          tooltip: {
            valueSuffix: '%'
          },
          color: '#e74a3b',
          marker: {
            enabled: true,
            radius: 4
          },
          lineWidth: 2,
          zIndex: 2
        }
      ]
    };
  };

  // Chart options for User Engagement Gauge
  const getEngagementGaugeOptions = () => {
    const totalUsers = (predictions || []).length;
    const activeUserCount = (predictions || []).filter(u => u?.status === 'active').length;
    const percentActive = totalUsers > 0 ? (activeUserCount / totalUsers) * 100 : 0;
    
    return {
      chart: {
        type: 'solidgauge',
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: null
      },
      pane: {
        center: ['50%', '85%'],
        size: '140%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      tooltip: {
        enabled: true,
        valuePrefix: '',
        valueSuffix: '%',
        pointFormat: '{series.name}: <b>{point.y}</b>'
      },
      yAxis: {
        stops: [
          [0.1, '#e74a3b'], // red
          [0.5, '#f6c23e'], // yellow
          [0.9, '#1cc88a'] // green
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        min: 0,
        max: 100,
        title: {
          text: 'Engagement Rate',
          y: -70
        },
        labels: {
          y: 16
        }
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true
          }
        }
      },
      series: [{
        name: 'Active Users',
        data: [Math.round(Number(percentActive) || 0)],
        dataLabels: {
          format: '<div style="text-align:center"><span style="font-size:25px;color:black">{y}%</span><br/>' +
            '<span style="font-size:12px;color:silver">Active User Rate</span></div>'
        },
        rounded: true
      }]
    };
  };

  if (loading) {
    return (
      <div className="charts-section mb-5">
        {/* Mobile Loading State - Tabbed interface */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab header */}
            <div className="flex" style={{ backgroundColor: '#f8f9fa' }}>
              <button
                className="flex-1 py-3 border-0 font-semibold position-relative text-gray-500 bg-transparent"
                style={{ fontSize: '13px' }}
              >
                <i className="fas fa-chart-line mr-1" style={{ fontSize: '11px' }}></i>
                Trends
              </button>
              <button
                className="flex-1 py-3 border-0 font-semibold position-relative text-gray-500 bg-transparent"
                style={{ fontSize: '13px' }}
              >
                <i className="fas fa-bullseye mr-1" style={{ fontSize: '11px' }}></i>
                Accuracy
              </button>
              <button
                className="flex-1 py-3 border-0 font-semibold position-relative text-gray-500 bg-transparent"
                style={{ fontSize: '13px' }}
              >
                <i className="fas fa-clock mr-1" style={{ fontSize: '11px' }}></i>
                Performance
              </button>
              <button
                className="flex-1 py-3 border-0 font-semibold position-relative text-gray-500 bg-transparent"
                style={{ fontSize: '13px' }}
              >
                <i className="fas fa-users mr-1" style={{ fontSize: '11px' }}></i>
                Engagement
              </button>
            </div>
            {/* Loading content */}
            <div className="p-3">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="mt-3 text-xs text-gray-500 font-medium">Loading analytics...</p>
              </div>
            </div>
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
              <p className="text-muted mb-0 small">Detailed prediction analytics and model performance insights</p>
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
          Detailed prediction analytics and model performance insights
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
          <div className="flex" style={{ backgroundColor: '#f8f9fa', margin: '0 -12px', padding: '0 12px' }}>
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
                options={{...getFinancialTrendsChartOptions(), chart: {...getFinancialTrendsChartOptions().chart, height: 200}}} 
              />
            )}
            {financialTab === 'accuracy' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getAccuracyDistributionChartOptions(), chart: {...getAccuracyDistributionChartOptions().chart, height: 200}}} 
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
          <div className="flex" style={{ backgroundColor: '#f8f9fa', margin: '0 -12px', padding: '0 12px' }}>
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
                options={{...getModelPerformanceChartOptions(), chart: {...getModelPerformanceChartOptions().chart, height: 200}}} 
              />
            )}
            {performanceTab === 'engagement' && (
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{...getEngagementGaugeOptions(), chart: {...getEngagementGaugeOptions().chart, height: 180}}} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts */}
      <div className="hidden md:block">
        {/* Charts Row 1 */}
        <div className="row mb-4">
          <div className="col-lg-6 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">User Financial Trends Analysis</h6>
              </div>
              <div className="card-body">
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getFinancialTrendsChartOptions()} 
                />
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">Prediction Accuracy Distribution</h6>
              </div>
              <div className="card-body">
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getAccuracyDistributionChartOptions()} 
                />
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
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getModelPerformanceChartOptions()} 
                />
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            <div className="card shadow admin-card">
              <div className="card-header py-3 admin-card-header">
                <h6 className="m-0 font-weight-bold text-danger">User Engagement</h6>
              </div>
              <div className="card-body">
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={getEngagementGaugeOptions()} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionAnalyticsCharts;
