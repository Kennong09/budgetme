import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { formatCurrency, formatPercentage } from '../../../utils/helpers';
import { supabase } from '../../../utils/supabaseClient';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsMore from 'highcharts/highcharts-more';
import solidGauge from 'highcharts/modules/solid-gauge';
import '../../../utils/highchartsInit';

// Import SB Admin CSS
import 'startbootstrap-sb-admin-2/css/sb-admin-2.min.css';

// Initialize additional Highcharts modules
if (typeof window !== 'undefined') {
  highchartsMore(Highcharts);
  solidGauge(Highcharts);
}

interface PredictionSummary {
  userId: number;
  username: string;
  lastPredictionDate: string;
  predictionAccuracy: number;
  incomeTrend: number;
  expenseTrend: number;
  savingsTrend: number;
  predictionCount: number;
  status: 'active' | 'pending' | 'error';
}

interface ModelStats {
  name: string;
  value: number;
  description: string;
}

interface UserDistribution {
  name: string;
  value: number;
}

const AdminPredictions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userPredictions, setUserPredictions] = useState<PredictionSummary[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [userDistribution, setUserDistribution] = useState<UserDistribution[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [historicalAccuracy, setHistoricalAccuracy] = useState<any[]>([]);

  // Fetch user prediction data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // In a real app, this would fetch from Supabase
        // For now, we'll simulate with mock data
        const mockData: PredictionSummary[] = [
          {
            userId: 1,
            username: 'johndoe',
            lastPredictionDate: '2023-04-15',
            predictionAccuracy: 92.3,
            incomeTrend: 5.2,
            expenseTrend: 3.7,
            savingsTrend: 8.1,
            predictionCount: 24,
            status: 'active'
          },
          {
            userId: 2,
            username: 'janedoe',
            lastPredictionDate: '2023-04-10',
            predictionAccuracy: 88.7,
            incomeTrend: -1.5,
            expenseTrend: 2.8,
            savingsTrend: -6.2,
            predictionCount: 12,
            status: 'active'
          },
          {
            userId: 3,
            username: 'mikebrown',
            lastPredictionDate: '2023-04-14',
            predictionAccuracy: 94.1,
            incomeTrend: 7.3,
            expenseTrend: 1.9,
            savingsTrend: 12.8,
            predictionCount: 36,
            status: 'active'
          },
          {
            userId: 4,
            username: 'sarahsmith',
            lastPredictionDate: '2023-04-01',
            predictionAccuracy: 85.9,
            incomeTrend: 3.8,
            expenseTrend: 6.2,
            savingsTrend: -2.3,
            predictionCount: 8,
            status: 'active'
          },
          {
            userId: 5,
            username: 'robertjohnson',
            lastPredictionDate: '2023-03-28',
            predictionAccuracy: 79.6,
            incomeTrend: 2.1,
            expenseTrend: 4.5,
            savingsTrend: -1.8,
            predictionCount: 6,
            status: 'error'
          },
          {
            userId: 6,
            username: 'emilydavis',
            lastPredictionDate: '2023-04-12',
            predictionAccuracy: 90.3,
            incomeTrend: 4.7,
            expenseTrend: 3.2,
            savingsTrend: 5.9,
            predictionCount: 18,
            status: 'active'
          },
          {
            userId: 7,
            username: 'davidwilson',
            lastPredictionDate: '',
            predictionAccuracy: 0,
            incomeTrend: 0,
            expenseTrend: 0,
            savingsTrend: 0,
            predictionCount: 0,
            status: 'pending'
          },
          {
            userId: 8,
            username: 'lisajackson',
            lastPredictionDate: '2023-04-08',
            predictionAccuracy: 87.4,
            incomeTrend: 2.9,
            expenseTrend: 3.5,
            savingsTrend: 1.2,
            predictionCount: 16,
            status: 'active'
          }
        ];

        setUserPredictions(mockData);

        // Set model statistics
        setModelStats([
          { name: 'Average Accuracy', value: 88.6, description: 'Average prediction accuracy across all users' },
          { name: 'Total Predictions', value: 120, description: 'Total number of predictions generated' },
          { name: 'Error Rate', value: 4.8, description: 'Average prediction error rate (MAPE)' },
          { name: 'Active Users', value: 85, description: 'Percentage of users with active predictions' }
        ]);

        // Set user distribution data
        setUserDistribution([
          { name: 'High Accuracy (>90%)', value: 35 },
          { name: 'Good Accuracy (80-90%)', value: 42 },
          { name: 'Moderate Accuracy (70-80%)', value: 15 },
          { name: 'Low Accuracy (<70%)', value: 8 }
        ]);

        // Historical accuracy data for line chart
        setHistoricalAccuracy([
          { month: 'Jan', accuracy: 85.2, error: 6.8 },
          { month: 'Feb', accuracy: 86.5, error: 6.3 },
          { month: 'Mar', accuracy: 87.1, error: 5.7 },
          { month: 'Apr', accuracy: 88.6, error: 4.8 },
          { month: 'May', accuracy: 89.2, error: 4.6 },
          { month: 'Jun', accuracy: 89.7, error: 4.3 }
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching prediction data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort data
  const filteredAndSortedData = () => {
    let data = [...userPredictions];
    
    // Apply filter
    if (filter !== 'all') {
      data = data.filter(item => item.status === filter);
    }
    
    // Apply search
    if (searchTerm) {
      data = data.filter(item => 
        item.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sort
    data.sort((a, b) => {
      const fieldA = a[sortField as keyof PredictionSummary];
      const fieldB = b[sortField as keyof PredictionSummary];
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB) 
          : fieldB.localeCompare(fieldA);
      } else {
        // Handle numeric fields
        const numA = Number(fieldA) || 0;
        const numB = Number(fieldB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
    });
    
    return data;
  };

  // Calculated statistics
  const activeUsers = userPredictions.filter(u => u.status === 'active').length;
  const averageAccuracy = userPredictions
    .filter(u => u.status === 'active')
    .reduce((sum, user) => sum + user.predictionAccuracy, 0) / 
    (activeUsers || 1);

  // Handle sort toggle
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle model update
  const handleModelUpdate = () => {
    setLoading(true);
    
    // Simulate an API call to update the model
    setTimeout(() => {
      setLoading(false);
      setShowUpdateAlert(true);
      
      // Hide the alert after 5 seconds
      setTimeout(() => {
        setShowUpdateAlert(false);
      }, 5000);
    }, 2000);
  };

  // Handle regenerate predictions
  const handleRegeneratePredictions = (userId: number) => {
    setLoading(true);
    
    // Simulate an API call to regenerate predictions
    setTimeout(() => {
      const updatedPredictions = userPredictions.map(user => {
        if (user.userId === userId) {
          return {
            ...user,
            lastPredictionDate: new Date().toISOString().split('T')[0],
            status: 'active' as const
          };
        }
        return user;
      });
      
      setUserPredictions(updatedPredictions);
      setLoading(false);
    }, 1500);
  };

  // Chart options for User Income & Expense Trends (Combined Column & Line Chart)
  const getIncomeExpenseChartOptions = () => {
    const activeUserData = userPredictions.filter(u => u.status === 'active');
    
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
        categories: activeUserData.map(u => u.username),
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
          y: u.incomeTrend, 
          color: u.incomeTrend >= 0 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Expense Trend',
        type: 'column',
        data: activeUserData.map(u => ({
          y: u.expenseTrend,
          color: u.expenseTrend <= 0 ? '#1cc88a' : '#e74a3b'
        }))
      }, {
        name: 'Savings Trend',
        type: 'column',
        data: activeUserData.map(u => ({
          y: u.savingsTrend,
          color: u.savingsTrend >= 0 ? '#4e73df' : '#e74a3b'
        }))
      }, {
        name: 'Prediction Accuracy',
        type: 'spline',
        yAxis: 1,
        data: activeUserData.map(u => u.predictionAccuracy),
        tooltip: {
          valueSuffix: '%'
        },
        marker: {
          lineWidth: 2,
          lineColor: Highcharts.getOptions().colors?.[3] || '#f7a35c',
          fillColor: 'white'
        }
      }]
    };
  };

  // Chart options for Prediction Accuracy Distribution (Donut Chart)
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
        text: 'Prediction Accuracy Distribution'
      },
      subtitle: {
        text: 'Distribution of users by prediction accuracy levels'
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
        data: [
          {
            name: 'High Accuracy (>90%)',
            y: userDistribution[0].value,
            color: '#1cc88a' // green
          },
          {
            name: 'Good Accuracy (80-90%)',
            y: userDistribution[1].value,
            color: '#4e73df' // primary blue
          },
          {
            name: 'Moderate Accuracy (70-80%)',
            y: userDistribution[2].value,
            color: '#f6c23e' // yellow/warning
          },
          {
            name: 'Low Accuracy (<70%)',
            y: userDistribution[3].value,
            color: '#e74a3b' // red/danger
          }
        ]
      }]
    };
  };

  // Chart options for Model Performance Over Time (Mixed Chart)
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
        text: 'Model Performance Metrics Over Time'
      },
      xAxis: {
        categories: historicalAccuracy.map(item => item.month),
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
          min: 70
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
          max: 15
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
          data: historicalAccuracy.map(item => item.accuracy),
          tooltip: {
            valueSuffix: '%'
          },
          color: '#4e73df',
          fillOpacity: 0.3,
          zIndex: 1
        },
        {
          name: 'Error Rate (MAPE)',
          type: 'line',
          yAxis: 1,
          data: historicalAccuracy.map(item => item.error),
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

  // Chart options for User Engagement with AI Predictions (Gauge Chart)
  const getEngagementGaugeOptions = () => {
    // Calculate the percentage of active users
    const percentActive = (activeUsers / userPredictions.length) * 100;
    
    return {
      chart: {
        type: 'solidgauge',
        height: 350
      },
      credits: {
        enabled: false
      },
      title: {
        text: 'User Engagement with AI Predictions'
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
        data: [Math.round(percentActive)],
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
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading prediction management data...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <h1 className="h3 mb-2 text-gray-800">AI Predictions Management</h1>
      <p className="mb-4">
        Monitor and manage AI financial predictions across all users in the platform.
      </p>

      {showUpdateAlert && (
        <Alert 
          variant="success" 
          onClose={() => setShowUpdateAlert(false)} 
          dismissible
        >
          <Alert.Heading>Model Updated Successfully!</Alert.Heading>
          <p>
            The Prophet model has been updated with the latest data. All user predictions will
            reflect the updated model on their next forecast.
          </p>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Active Predictions
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {activeUsers} / {userPredictions.length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Average Accuracy
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {averageAccuracy.toFixed(1)}%
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-check fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Model Status
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    Active
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-robot fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Error Rate (MAPE)
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    4.8%
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Update and Controls */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">
            Prophet Model Controls
          </h6>
          <div className="dropdown no-arrow">
            <Button variant="outline-primary" onClick={handleModelUpdate}>
              <i className="fas fa-sync mr-2"></i>
              Update Model
            </Button>
          </div>
        </div>
        <div className="card-body">
          <Row>
            <Col lg={8}>
              <p>
                The Prophet forecasting model is currently active and generating financial predictions
                for all users. The model analyzes historical transaction data, seasonal patterns, and
                economic indicators to generate accurate forecasts.
              </p>
              <div className="d-flex mt-4">
                <Button variant="outline-secondary" className="mr-2" size="sm">
                  <i className="fas fa-cog mr-2"></i>
                  Model Settings
                </Button>
                <Button variant="outline-secondary" className="mr-2" size="sm">
                  <i className="fas fa-download mr-2"></i>
                  Export Model Data
                </Button>
                <Button variant="outline-info" size="sm">
                  <i className="fas fa-info-circle mr-2"></i>
                  View Documentation
                </Button>
              </div>
            </Col>
            <Col lg={4}>
              <div className="card bg-light mb-3">
                <div className="card-body">
                  <h6 className="font-weight-bold text-gray-700">Model Statistics</h6>
                  <div className="mt-3">
                    {modelStats.map((stat, i) => (
                      <div key={i} className="mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-xs">{stat.name}</span>
                          <span className="font-weight-bold">
                            {stat.name.includes('Percentage') || stat.name.includes('Rate') || stat.name.includes('Accuracy') 
                              ? `${stat.value}%` 
                              : stat.value}
                          </span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar bg-${i % 2 === 0 ? 'info' : 'primary'}`}
                            role="progressbar"
                            style={{ width: `${Math.min(stat.value, 100)}%` }}
                            aria-valuenow={stat.value}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                        <small className="text-muted">{stat.description}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">User Predictions</h6>
        </div>
        <div className="card-body">
          <div className="row mb-4 align-items-center">
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Filter by Status</Form.Label>
                <Form.Control 
                  as="select" 
                  value={filter} 
                  onChange={(e: any) => setFilter(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="error">Error</option>
                </Form.Control>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Search User</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="fas fa-search"></i>
                  </InputGroup.Text>
                  <Form.Control 
                    type="text"
                    placeholder="Search by username"
                    value={searchTerm}
                    onChange={(e: any) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Button variant="outline-primary" className="float-right mt-4">
                <i className="fas fa-download mr-2"></i>
                Export Data
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <Table className="table-bordered">
              <thead>
                <tr>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('username')}
                  >
                    Username 
                    {sortField === 'username' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('lastPredictionDate')}
                  >
                    Last Updated
                    {sortField === 'lastPredictionDate' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('predictionAccuracy')}
                  >
                    Accuracy
                    {sortField === 'predictionAccuracy' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('incomeTrend')}
                  >
                    Income Trend
                    {sortField === 'incomeTrend' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('savingsTrend')}
                  >
                    Savings Trend
                    {sortField === 'savingsTrend' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th 
                    className="cursor-pointer"
                    onClick={() => toggleSort('status')}
                  >
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <i className="fas fa-sort-amount-up ml-1"></i> : <i className="fas fa-sort-amount-down ml-1"></i>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData().map((user) => (
                  <tr key={user.userId}>
                    <td>{user.username}</td>
                    <td>
                      {user.lastPredictionDate || '—'}
                    </td>
                    <td>
                      {user.predictionAccuracy > 0 ? 
                        <span className={`text-${user.predictionAccuracy > 90 ? 'success' : user.predictionAccuracy > 80 ? 'primary' : 'warning'}`}>
                          {user.predictionAccuracy.toFixed(1)}%
                        </span> : 
                        '—'
                      }
                    </td>
                    <td>
                      {user.incomeTrend !== 0 ? 
                        <span className={`text-${user.incomeTrend > 0 ? 'success' : 'danger'}`}>
                          {user.incomeTrend > 0 ? '+' : ''}{user.incomeTrend.toFixed(1)}%
                        </span> : 
                        '—'
                      }
                    </td>
                    <td>
                      {user.savingsTrend !== 0 ? 
                        <span className={`text-${user.savingsTrend > 0 ? 'success' : 'danger'}`}>
                          {user.savingsTrend > 0 ? '+' : ''}{user.savingsTrend.toFixed(1)}%
                        </span> : 
                        '—'
                      }
                    </td>
                    <td>
                      {user.status === 'active' && (
                        <Badge bg="success">Active</Badge>
                      )}
                      {user.status === 'pending' && (
                        <Badge bg="warning">Pending</Badge>
                      )}
                      {user.status === 'error' && (
                        <Badge bg="danger">Error</Badge>
                      )}
                    </td>
                    <td>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="mr-1"
                        onClick={() => window.location.href = `/admin/users/${user.userId}`}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleRegeneratePredictions(user.userId)}
                        disabled={loading}
                      >
                        Regenerate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Charts and Analytics - First Row */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">User Financial Trends Analysis</h6>
            </div>
            <div className="card-body">
              <HighchartsReact 
                highcharts={Highcharts} 
                options={getIncomeExpenseChartOptions()} 
              />
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card shadow">
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

      {/* Charts and Analytics - Second Row */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card shadow">
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
          <div className="card shadow">
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
  );
};

export default AdminPredictions; 