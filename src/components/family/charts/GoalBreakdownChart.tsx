import React, { useState, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import solidGauge from 'highcharts/modules/solid-gauge';
import { GoalStatusData, GoalCommitmentData } from '../../../services/database/familyGoalService';
import { useRealtimeFamilyData } from '../../../hooks/useRealtimeFamilyData';
import { ChartErrorBoundary } from '../../common/ChartErrorBoundary';
import { ChartErrorHandler } from '../../../utils/chartErrorHandler';
import { KPICard } from './shared';
import { colorSystem, getStatusColor, calculateHealthScore, calculateCommitmentLevel } from './utils';
import './FamilyChartsResponsive.css';

// Initialize Highcharts modules
solidGauge(Highcharts);

interface GoalBreakdownChartProps {
  familyId: string;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const GoalBreakdownChart: React.FC<GoalBreakdownChartProps> = ({ familyId, chartRef }) => {
  // Use real-time data hook
  const { data: realtimeData, loading, error, isConnected, manualRefresh } = useRealtimeFamilyData({
    familyId,
    enableCategories: false,
    enableBudgets: false,
    enableGoals: true
  });

  // Extract data from real-time hook  
  const goalCommitmentData = realtimeData.goalCommitment;
  const familyHealthMetrics = realtimeData.financialSummary?.healthMetrics;
  
  // We'll need to fetch goal status data separately as it's not in the main hook yet
  const [goalStatusData, setGoalStatusData] = useState<GoalStatusData[]>([]);
  
  useEffect(() => {
    // This is a temporary solution until we add goal status to the main hook
    async function loadGoalStatusData() {
      if (!familyId || !goalCommitmentData) return;
      
      try {
        // For now, we'll create mock status data based on commitment data
        // In a complete implementation, this would come from the real-time hook
        const mockStatusData: GoalStatusData[] = [
          {
            status_category: 'in_progress',
            goal_count: goalCommitmentData.active_goals,
            total_target_value: 0,
            total_current_value: 0,
            average_progress: 0,
            status_color: '#007bff',
            commitment_insights: {
              total_goals: goalCommitmentData.total_goals,
              active_goal_count: goalCommitmentData.active_goals,
              commitment_level: goalCommitmentData.commitment_level,
              goal_commitment_score: goalCommitmentData.overall_score,
              goal_diversity: goalCommitmentData.goal_categories,
              completion_rate: goalCommitmentData.total_goals > 0 ? (goalCommitmentData.completed_goals / goalCommitmentData.total_goals) * 100 : 0,
              average_days_to_completion: goalCommitmentData.average_completion_days,
              planning_discipline_score: Math.min(100, goalCommitmentData.total_goals * 20)
            }
          },
          {
            status_category: 'completed',
            goal_count: goalCommitmentData.completed_goals,
            total_target_value: 0,
            total_current_value: 0,
            average_progress: 100,
            status_color: '#28a745',
            commitment_insights: {
              total_goals: goalCommitmentData.total_goals,
              active_goal_count: goalCommitmentData.active_goals,
              commitment_level: goalCommitmentData.commitment_level,
              goal_commitment_score: goalCommitmentData.overall_score,
              goal_diversity: goalCommitmentData.goal_categories,
              completion_rate: goalCommitmentData.total_goals > 0 ? (goalCommitmentData.completed_goals / goalCommitmentData.total_goals) * 100 : 0,
              average_days_to_completion: goalCommitmentData.average_completion_days,
              planning_discipline_score: Math.min(100, goalCommitmentData.total_goals * 20)
            }
          }
        ];
        setGoalStatusData(mockStatusData);
      } catch (err) {
        console.error('Error creating goal status data:', err);
      }
    }
    
    loadGoalStatusData();
  }, [familyId, goalCommitmentData]);

  // Loading state
  if (loading) {
    return (
      <div className="text-center text-muted p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden"></span>
        </div>
        <p className="mt-2">Loading goal breakdown data...</p>
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

  // No data state - check if there's any meaningful goal data
  if (!goalCommitmentData || goalCommitmentData.total_goals === 0) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-bullseye fa-3x mb-3"></i>
        <h5 className="text-muted mb-3">No Family Goals Found</h5>
        <p className="mb-3">Your family hasn't set any financial goals yet. Start planning your financial future!</p>
        
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 bg-light">
              <div className="card-body p-3">
                <h6 className="text-primary mb-2">
                  <i className="fas fa-lightbulb me-2"></i>
                  Get Started with Family Goals
                </h6>
                <ul className="list-unstyled small mb-0 text-start">
                  <li className="mb-1">
                    <i className="fas fa-home text-success me-2"></i>
                    Create an emergency fund goal for financial security
                  </li>
                  <li className="mb-1">
                    <i className="fas fa-plane text-info me-2"></i>
                    Plan for family vacations and experiences
                  </li>
                  <li className="mb-1">
                    <i className="fas fa-graduation-cap text-warning me-2"></i>
                    Save for children's education and future
                  </li>
                  <li>
                    <i className="fas fa-car text-primary me-2"></i>
                    Set goals for major purchases like vehicles or home improvements
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          className="btn btn-primary mt-3 me-2"
          onClick={manualRefresh}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh Data
        </button>
        
        {isConnected && (
          <small className="text-success d-block mt-3">
            <i className="fas fa-wifi me-1"></i>
            Real-time monitoring active - goal updates will appear automatically
          </small>
        )}
      </div>
    );
  }

  // Calculate comprehensive health score using utility functions
  const healthMetrics = calculateHealthScore({
    goalCommitmentScore: goalCommitmentData?.overall_score || 0,
    financialHealthScore: familyHealthMetrics?.financial_health_score || 0,
    expenseControlScore: familyHealthMetrics?.expense_control_score || 0,
    savingsDisciplineScore: familyHealthMetrics?.savings_discipline_score || 0,
    budgetPlanningScore: familyHealthMetrics?.budget_planning_score || 0
  });

  // Calculate commitment level
  const commitmentMetrics = calculateCommitmentLevel({
    totalGoals: goalCommitmentData.total_goals,
    activeGoals: goalCommitmentData.active_goals,
    completedGoals: goalCommitmentData.completed_goals,
    progressPercentage: goalCommitmentData.total_goals > 0 ? (goalCommitmentData.completed_goals / goalCommitmentData.total_goals) * 100 : 0,
    allocationRate: 0 // This would need family income data
  });

  // Calculate completion efficiency
  const averageCompletionDays = goalCommitmentData?.average_completion_days || 0;
  const efficiencyScore = averageCompletionDays > 0 && averageCompletionDays <= 90 ? 
    Math.max(0, 100 - (averageCompletionDays - 30)) : 
    averageCompletionDays === 0 ? 50 : Math.max(0, 100 - averageCompletionDays / 2);

  // Ensure we have meaningful data to display
  const hasHealthData = (
    (goalCommitmentData?.overall_score || 0) > 0 ||
    (familyHealthMetrics?.financial_health_score || 0) > 0 ||
    (familyHealthMetrics?.expense_control_score || 0) > 0 ||
    (familyHealthMetrics?.savings_discipline_score || 0) > 0 ||
    (familyHealthMetrics?.budget_planning_score || 0) > 0 ||
    goalCommitmentData.total_goals > 0
  );

  // Show simplified no data state for health metrics
  if (!hasHealthData) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-pie fa-3x mb-3"></i>
        <h5 className="text-muted mb-3">No Goal Data Available</h5>
        <p className="mb-3">Start setting family goals and tracking expenses to see your financial health score.</p>
        
        <button 
          className="btn btn-primary mt-3"
          onClick={manualRefresh}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh Data
        </button>
      </div>
    );
  }

  // Enhanced donut chart for status distribution
  const chartOptions = {
    chart: {
      type: 'pie',
      backgroundColor: colorSystem.background.transparent,
      height: 400,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: 'Goals by Status',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#5a5c69'
      }
    },
    subtitle: {
      text: `${goalCommitmentData.total_goals} Total Goals${isConnected ? ' • Live' : ''}`,
      style: {
        fontSize: '12px',
        color: '#858796'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      formatter: function(this: any) {
        const point = this.point;
        return `
          <div style="padding: 10px;">
            <strong>${point.name}</strong><br/>
            <span style="color: ${point.color};">Count: ${point.y}</span><br/>
            <span style="font-size: 10px; color: #858796;">Percentage: ${point.percentage.toFixed(1)}%</span>
          </div>
        `;
      }
    },
    plotOptions: {
      pie: {
        innerSize: '40%',
        dataLabels: {
          enabled: true,
          format: '{point.name}<br>{point.percentage:.1f}%',
          style: {
            fontSize: '11px',
            fontWeight: '600',
            color: '#5a5c69'
          }
        },
        showInLegend: false
      }
    },
    series: [{
      name: 'Goals',
      data: [
        {
          name: 'Completed',
          y: goalCommitmentData.completed_goals,
          color: colorSystem.status.completed
        },
        {
          name: 'In Progress',
          y: goalCommitmentData.active_goals,
          color: colorSystem.status.in_progress
        },
        {
          name: 'Not Started',
          y: Math.max(0, goalCommitmentData.total_goals - goalCommitmentData.completed_goals - goalCommitmentData.active_goals),
          color: colorSystem.status.not_started
        }
      ].filter(item => item.y > 0)
    }],
    credits: {
      enabled: false
    }
  };

  return (
    <ChartErrorBoundary>
      <div className="position-relative family-dashboard-charts chart-loading">
        <div className="row">
          {/* Left Section: Status Distribution Chart (50%) */}
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
                          pie: {
                            dataLabels: {
                              style: {
                                fontSize: '10px'
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
          
          {/* Right Section: Health Score KPI Cards (50%) */}
          <div className="col-lg-6 col-md-12">
            <div className="row h-100">
              {/* KPI Card 1 - Financial Health Score */}
              <div className="col-12 mb-3">
                <KPICard
                  title="Financial Health Score"
                  value={`${healthMetrics.score}/100`}
                  subtitle={healthMetrics.description}
                  icon="fas fa-heartbeat"
                  color={healthMetrics.color}
                  badge={{
                    text: healthMetrics.status,
                    color: healthMetrics.color
                  }}
                  progressValue={healthMetrics.score}
                  progressColor={healthMetrics.color}
                  className="responsive-kpi-card"
                />
              </div>
              
              {/* KPI Card 2 - Goal Commitment Level */}
              <div className="col-12 mb-3">
                <KPICard
                  title="Goal Commitment Level"
                  value={commitmentMetrics.level}
                  subtitle={`Score: ${commitmentMetrics.score}/100`}
                  icon="fas fa-medal"
                  color={commitmentMetrics.color}
                  badge={{
                    text: `${commitmentMetrics.score}/100`,
                    color: commitmentMetrics.color
                  }}
                  progressValue={commitmentMetrics.score}
                  progressColor={commitmentMetrics.color}
                  className="responsive-kpi-card"
                />
              </div>
              
              {/* KPI Card 3 - Completion Efficiency */}
              <div className="col-12">
                <KPICard
                  title="Completion Efficiency"
                  value={`${Math.round(efficiencyScore)}%`}
                  subtitle={averageCompletionDays > 0 ? `Avg: ${averageCompletionDays} days` : 'No data yet'}
                  icon="fas fa-stopwatch"
                  color={efficiencyScore >= 75 ? colorSystem.progress.excellent : efficiencyScore >= 50 ? colorSystem.progress.good : colorSystem.progress.fair}
                  badge={{
                    text: efficiencyScore >= 75 ? 'Fast' : efficiencyScore >= 50 ? 'Moderate' : 'Slow',
                    color: efficiencyScore >= 75 ? colorSystem.progress.excellent : efficiencyScore >= 50 ? colorSystem.progress.good : colorSystem.progress.fair
                  }}
                  progressValue={efficiencyScore}
                  progressColor={efficiencyScore >= 75 ? colorSystem.progress.excellent : efficiencyScore >= 50 ? colorSystem.progress.good : colorSystem.progress.fair}
                  className="responsive-kpi-card"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Goal Commitment Analysis - Below the main layout */}
        {goalCommitmentData && (
          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="text-dark mb-3">
              <i className="fas fa-bullseye text-primary me-2"></i>
              Goal Commitment Analysis
            </h6>
            
            <div className="row">
              <div className="col-md-6">
                {goalCommitmentData && goalCommitmentData.total_goals > 0 && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Commitment Level:</span>
                      <span className="badge" style={{ backgroundColor: commitmentMetrics.color + '20', color: commitmentMetrics.color }}>
                        {goalCommitmentData.commitment_level}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Active Goals:</span>
                      <strong className="text-primary">{goalCommitmentData.active_goals}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Completed Goals:</span>
                      <strong className="text-success">{goalCommitmentData.completed_goals}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Goal Categories:</span>
                      <strong className="text-info">{goalCommitmentData.goal_categories}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-md-6">
                {goalCommitmentData && goalCommitmentData.strengths && goalCommitmentData.strengths.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-success mb-2">
                      <i className="fas fa-check-circle me-1"></i>
                      Strengths
                    </h6>
                    <ul className="list-unstyled small">
                      {goalCommitmentData.strengths.slice(0, 3).map((strength: string, index: number) => (
                        <li key={index} className="text-success mb-1">
                          <i className="fas fa-star me-1"></i>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {goalCommitmentData && goalCommitmentData.recommendations && goalCommitmentData.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-top">
                <h6 className="text-info mb-2">
                  <i className="fas fa-lightbulb me-1"></i>
                  Recommendations
                </h6>
                <ul className="list-unstyled small">
                  {goalCommitmentData.recommendations.slice(0, 3).map((recommendation: string, index: number) => (
                    <li key={index} className="text-info mb-1">
                      <i className="fas fa-arrow-right me-1"></i>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

export default GoalBreakdownChart;