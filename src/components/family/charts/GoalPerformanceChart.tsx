import React, { useState, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import { FamilyGoalData } from '../../../services/database/familyGoalService';
import { useRealtimeFamilyData } from '../../../hooks/useRealtimeFamilyData';
import { ChartErrorBoundary } from '../../common/ChartErrorBoundary';
import { ChartErrorHandler } from '../../../utils/chartErrorHandler';
import { KPICard } from './shared';
import { colorSystem, getProgressColor, calculateGoalMetrics, getGrade } from './utils';
import './FamilyChartsResponsive.css';

interface GoalPerformanceChartProps {
  familyId: string;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const GoalPerformanceChart: React.FC<GoalPerformanceChartProps> = ({ familyId, chartRef }) => {
  // Use real-time data hook
  const { data: realtimeData, loading, error, isConnected, manualRefresh } = useRealtimeFamilyData({
    familyId,
    enableCategories: false,
    enableBudgets: false,
    enableGoals: true
  });

  // Extract data from real-time hook
  const goalProgressData = realtimeData.goalProgress || [];
  const familyFinancialSummary = realtimeData.financialSummary;

  // Loading state
  if (loading) {
    return (
      <div className="text-center text-muted p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden"></span>
        </div>
        <p className="mt-2">Loading goal progress data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
        <p className="text-danger">{error}</p>
        <button 
          className="btn btn-sm btn-outline-primary mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!goalProgressData || goalProgressData.length === 0) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-waterfall fa-3x mb-3"></i>
        <p>No family goals found</p>
        <small className="text-muted">Create your first family goal to see progress analysis</small>
      </div>
    );
  }

  // Extract financial data
  const totalIncome = familyFinancialSummary?.total_family_income || 0;
  const totalExpenses = familyFinancialSummary?.total_family_expenses || 0;
  const memberCount = familyFinancialSummary?.member_count || 1;

  // Calculate goal metrics using utility functions
  const goalMetrics = calculateGoalMetrics(goalProgressData);
  const activeGoals = goalProgressData.filter(goal => goal.status === 'in_progress' || goal.status === 'not_started');
  const completedGoals = goalProgressData.filter(goal => goal.status === 'completed');
  const totalGoalTarget = goalProgressData.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalGoalProgress = goalProgressData.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalGoalContributions = goalProgressData.reduce((sum, goal) => 
    sum + goal.family_contributions.reduce((contribSum: number, contrib: any) => contribSum + contrib.amount, 0), 0
  );

  // Calculate metrics for KPI cards
  const overallProgress = totalGoalTarget > 0 ? (totalGoalProgress / totalGoalTarget) * 100 : 0;
  const goalAllocationFromIncome = totalIncome > 0 ? (totalGoalContributions / totalIncome) * 100 : 0;
  const progressGrade = getGrade(overallProgress);
  const allocationGrade = getGrade(goalAllocationFromIncome * 5); // Amplify for grading

  // Enhanced bar chart for goal progress visualization
  const chartOptions = {
    chart: {
      type: 'bar',
      backgroundColor: colorSystem.background.transparent,
      borderRadius: 10,
      height: 400,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: 'Goal Progress Overview',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#5a5c69'
      }
    },
    subtitle: {
      text: `${activeGoals.length} Active • ${completedGoals.length} Completed${isConnected ? ' • Live' : ''}`,
      style: {
        fontSize: '12px',
        color: '#858796'
      }
    },
    xAxis: {
      categories: goalProgressData.slice(0, 5).map(goal => goal.goal_name.length > 15 ? goal.goal_name.substring(0, 15) + '...' : goal.goal_name),
      title: {
        text: null
      },
      labels: {
        style: {
          fontSize: '11px',
          color: '#5a5c69'
        }
      }
    },
    yAxis: {
      title: {
        text: 'Progress %',
        style: {
          fontSize: '12px',
          color: '#5a5c69'
        }
      },
      max: 100,
      labels: {
        formatter: function(): string {
          return (this as any).value + '%';
        },
        style: {
          fontSize: '11px',
          color: '#5a5c69'
        }
      },
      gridLineWidth: 1,
      gridLineColor: '#e3e6f0'
    },
    legend: {
      enabled: false
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e3e6f0',
      borderRadius: 8,
      shadow: true,
      formatter: function(): string {
        const point = (this as any).point;
        const goalData = goalProgressData.find(g => g.goal_name.startsWith(point.category.replace('...', '')));
        if (!goalData) return '';
        
        return `
          <div style="padding: 8px;">
            <b>${goalData.goal_name}</b><br/>
            <span style="color: ${getProgressColor(goalData.progress_percentage)};">Progress: ${goalData.progress_percentage.toFixed(1)}%</span><br/>
            <span style="font-size: 10px; color: #858796;">₱${goalData.current_amount.toLocaleString()} / ₱${goalData.target_amount.toLocaleString()}</span><br/>
            <span style="font-size: 10px; color: #858796;">Priority: ${goalData.priority}</span>
          </div>
        `;
      }
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
          formatter: function(): string {
            return (this as any).y.toFixed(1) + '%';
          },
          style: {
            fontSize: '10px',
            fontWeight: '600',
            color: '#5a5c69'
          }
        },
        borderWidth: 0,
        pointPadding: 0.3,
        groupPadding: 0.1
      }
    },
    series: [{
      name: 'Progress',
      data: goalProgressData.slice(0, 5).map(goal => ({
        y: goal.progress_percentage,
        color: getProgressColor(goal.progress_percentage)
      }))
    }],
    credits: {
      enabled: false
    }
  };

  return (
    <ChartErrorBoundary>
      <div className="position-relative family-dashboard-charts chart-loading">
        <div className="row">
          {/* Left Section: Goal Progress Chart (50%) */}
          <div className="col-lg-6 col-md-12 mb-3 mb-lg-0">
            <div 
              style={{ 
                backgroundColor: colorSystem.background.light, 
                borderRadius: '10px', 
                padding: '15px', 
                height: '400px' 
              }}
              className="responsive-chart-container"
            >
              <HighchartsReact 
                highcharts={Highcharts} 
                options={{
                  ...chartOptions,
                  responsive: {
                    rules: [{
                      condition: {
                        maxWidth: 768
                      },
                      chartOptions: {
                        chart: {
                          height: 300
                        },
                        title: {
                          style: {
                            fontSize: '16px'
                          }
                        },
                        plotOptions: {
                          bar: {
                            dataLabels: {
                              style: {
                                fontSize: '9px'
                              }
                            }
                          }
                        }
                      }
                    }]
                  }
                }}
                ref={chartRef} 
              />
            </div>
          </div>
          
          {/* Right Section: KPI Cards (50%) */}
          <div className="col-lg-6 col-md-12">
            <div className="row h-100">
              {/* KPI Card 1 - Overall Progress */}
              <div className="col-12 mb-3">
                <KPICard
                  title="Overall Progress"
                  value={`${overallProgress.toFixed(1)}%`}
                  subtitle={progressGrade.description}
                  icon="fas fa-bullseye"
                  color={progressGrade.color}
                  badge={{
                    text: progressGrade.grade,
                    color: progressGrade.color
                  }}
                  progressValue={overallProgress}
                  progressColor={progressGrade.color}
                  className="responsive-kpi-card"
                />
              </div>
              
              {/* KPI Card 2 - Active Goals */}
              <div className="col-12 mb-3">
                <KPICard
                  title="Active Goals"
                  value={`${activeGoals.length} / ${goalProgressData.length}`}
                  subtitle={activeGoals.length > 0 ? 'Goals in progress' : 'No active goals'}
                  icon="fas fa-flag-checkered"
                  color={activeGoals.length > 0 ? colorSystem.semantic.info : colorSystem.semantic.warning}
                  badge={{
                    text: activeGoals.length > 2 ? 'High Activity' : activeGoals.length > 0 ? 'Moderate' : 'Low Activity',
                    color: activeGoals.length > 2 ? colorSystem.semantic.success : activeGoals.length > 0 ? colorSystem.semantic.info : colorSystem.semantic.warning
                  }}
                  progressValue={goalProgressData.length > 0 ? (activeGoals.length / goalProgressData.length) * 100 : 0}
                  className="responsive-kpi-card"
                />
              </div>
              
              {/* KPI Card 3 - Goal Allocation Rate */}
              <div className="col-12">
                <KPICard
                  title="Goal Allocation Rate"
                  value={`${goalAllocationFromIncome.toFixed(1)}%`}
                  subtitle={allocationGrade.description}
                  icon="fas fa-chart-line"
                  color={allocationGrade.color}
                  badge={{
                    text: allocationGrade.grade,
                    color: allocationGrade.color
                  }}
                  progressValue={Math.min(100, goalAllocationFromIncome * 5)}
                  progressColor={allocationGrade.color}
                  className="responsive-kpi-card"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Individual Goal Progress - Below the main layout */}
        {activeGoals.length > 0 && (
          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="text-dark mb-3">
              <i className="fas fa-bullseye text-primary me-2"></i>
              Active Goal Progress
            </h6>
            <div className="row">
              {activeGoals.slice(0, 4).map((goal, index) => (
                <div key={goal.goal_id} className="col-md-6 mb-3">
                  <div className="card border-0 bg-white">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-1 text-truncate" title={goal.goal_name}>
                          {goal.goal_name}
                        </h6>
                        <span className={`badge text-white ${
                          goal.priority === 'high' ? 'bg-danger' : 
                          goal.priority === 'medium' ? 'bg-warning' : 'bg-secondary'
                        }`}>
                          {goal.priority}
                        </span>
                      </div>
                      <div className="progress mb-2" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar" 
                          style={{ 
                            width: `${Math.min(100, goal.progress_percentage)}%`,
                            backgroundColor: getProgressColor(goal.progress_percentage)
                          }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          ₱{goal.current_amount.toLocaleString()} / ₱{goal.target_amount.toLocaleString()}
                        </small>
                        <small className="fw-bold" style={{ color: getProgressColor(goal.progress_percentage) }}>
                          {goal.progress_percentage.toFixed(1)}%
                        </small>
                      </div>
                      {goal.days_remaining !== null && goal.days_remaining > 0 && (
                        <small className="text-muted d-block mt-1">
                          <i className="fas fa-calendar me-1"></i>
                          {goal.days_remaining} days remaining
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Connection Status */}
        {isConnected && (
          <small className="text-success d-block mt-2 text-center">
            <i className="fas fa-wifi me-1"></i>
            Real-time updates active
          </small>
        )}
      </div>
    </ChartErrorBoundary>
  );
};

export default GoalPerformanceChart;