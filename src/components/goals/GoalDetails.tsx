import React, { useState, useEffect, FC, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import {
  goals as mockGoals,
  transactions as mockTransactions,
  getTransactionsByGoalId,
  calculateBudgetToGoalRelationship,
  getUserGoalsSummary
} from "../../data/mockData";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import { Goal as GoalType, Transaction } from "../../types";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface RouteParams {
  id: string;
}

const GoalDetails: FC = () => {
  const { id } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Create refs for Highcharts instances
  const progressChartRef = useRef<any>(null);
  const contributionsChartRef = useRef<any>(null);
  const timelineChartRef = useRef<any>(null);
  
  // Progress chart config
  const [progressConfig, setProgressConfig] = useState<any>(null);
  const [contributionsConfig, setContributionsConfig] = useState<any>(null);
  const [timelineConfig, setTimelineConfig] = useState<any>(null);

  useEffect(() => {
    // Simulate API call to get goal details
    const timer = setTimeout(() => {
      const foundGoal = mockGoals.find((g) => g.id.toString() === id);

      if (foundGoal) {
        setGoal({ ...foundGoal, category: "General" } as unknown as GoalType);

        // Use the helper function to get transactions related to this goal
        const relatedTransactions = getTransactionsByGoalId(id);
        setTransactions(relatedTransactions as unknown as Transaction[]);
        
        // Create chart configurations after data is loaded
        if (foundGoal) {
          createChartConfigs(
            { ...foundGoal, category: "General" } as unknown as GoalType,
            relatedTransactions as unknown as Transaction[]
          );
        }
      }

      setLoading(false);
      setHighchartsLoaded(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);
  
  const createChartConfigs = (goal: GoalType, transactions: Transaction[]) => {
    // Progress gauge chart
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    setProgressConfig({
      chart: {
        type: 'solidgauge',
        height: 200,
        backgroundColor: 'transparent',
      },
      title: null,
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
        enabled: false
      },
      yAxis: {
        min: 0,
        max: 100,
        stops: [
          [0.3, '#e74a3b'], // red
          [0.5, '#f6c23e'], // yellow
          [0.7, '#1cc88a']  // green
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        tickAmount: 2,
        labels: {
          enabled: false
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
      credits: {
        enabled: false
      },
      series: [{
        name: 'Progress',
        data: [{
          y: Math.min(progressPercentage, 100),
          innerRadius: '60%',
          radius: '100%'
        }],
        dataLabels: {
          format: '<div style="text-align:center"><span style="font-size:24px;font-weight:bold">{y:.1f}%</span></div>'
        },
        rounded: true
      }]
    });
    
    // Fallback circular progress chart in case solidgauge module isn't loaded
    if (!Highcharts.seriesTypes.solidgauge) {
      setProgressConfig({
        chart: {
          type: 'pie',
          height: 200,
          backgroundColor: 'transparent'
        },
        title: null,
        tooltip: {
          enabled: false
        },
        plotOptions: {
          pie: {
            innerSize: '80%',
            dataLabels: {
              enabled: false
            },
            borderWidth: 0,
            startAngle: -90,
            endAngle: 90,
            center: ['50%', '85%']
          }
        },
        series: [{
          name: 'Progress',
          data: [
            {
              name: 'Completed',
              y: Math.min(progressPercentage, 100),
              color: progressPercentage >= 75 ? '#1cc88a' : 
                     progressPercentage >= 40 ? '#f6c23e' : '#e74a3b'
            },
            {
              name: 'Remaining',
              y: Math.max(0, 100 - progressPercentage),
              color: '#e9ecef'
            }
          ],
          size: '170%',
          innerSize: '80%'
        }],
        credits: {
          enabled: false
        }
      });
    }
    
    // Contributions over time chart
    const contributionsByMonth: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      const month = transaction.date.substring(0, 7); // Format: YYYY-MM
      if (!contributionsByMonth[month]) {
        contributionsByMonth[month] = 0;
      }
      contributionsByMonth[month] += transaction.amount;
    });
    
    const sortedMonths = Object.keys(contributionsByMonth).sort();
    const contributionData = sortedMonths.map(month => contributionsByMonth[month]);
    
    setContributionsConfig({
      chart: {
        type: 'column',
        height: 250,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      xAxis: {
        categories: sortedMonths.map(month => {
          const date = new Date(month + '-01');
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        crosshair: true,
        labels: {
          style: {
            color: '#858796'
          }
        }
      },
             yAxis: {
         min: 0,
         title: {
           text: null
         },
         gridLineColor: '#eaecf4',
         gridLineDashStyle: 'dash',
         labels: {
           format: '${value}',
           style: {
             color: '#858796'
           }
         }
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>${point.y:.2f}</b></td></tr>',
        footerFormat: '</table>',
        shared: true,
        useHTML: true,
        style: {
          fontSize: '12px',
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 4
        },
        series: {
          animation: {
            duration: 1000
          }
        }
      },
      series: [{
        name: 'Contributions',
        data: contributionData,
        color: '#4e73df',
        type: 'column'
      }],
      credits: {
        enabled: false
      }
    });
    
    // Timeline/projection chart
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    const monthDiff = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
    
    // Create monthly projection data points
    const projectionData = [];
    const totalContributed = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyRate = calculateMonthlySavingsForGoal(goal);
    let currentAmount = goal.current_amount;
    
    // Historical data - assume we have the current amount already saved
    projectionData.push({
      x: today.getTime(),
      y: currentAmount,
      marker: {
        fillColor: '#4e73df',
        radius: 5
      }
    });
    
    // Future projection data
    for (let i = 1; i <= monthDiff + 1; i++) {
      const projDate = new Date(today);
      projDate.setMonth(today.getMonth() + i);
      
      currentAmount += monthlyRate;
      if (currentAmount > goal.target_amount) {
        // If we hit the target before the target date
        projectionData.push({
          x: projDate.getTime(),
          y: goal.target_amount,
          marker: {
            fillColor: '#1cc88a',
            radius: 6,
            symbol: 'circle'
          }
        });
        break;
      } else {
        projectionData.push({
          x: projDate.getTime(),
          y: currentAmount
        });
      }
    }
    
    // Add target point
    projectionData.push({
      x: targetDate.getTime(),
      y: goal.target_amount,
      marker: {
        fillColor: '#1cc88a',
        radius: 7,
        symbol: 'diamond'
      },
      dataLabels: {
        enabled: true,
        format: 'Target: ${y}'
      }
    });
    
    setTimelineConfig({
      chart: {
        type: 'spline',
        height: 250,
        backgroundColor: 'transparent'
      },
      title: {
        text: null
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%b %Y}'
        }
      },
             yAxis: {
         min: 0,
         max: Math.ceil(goal.target_amount * 1.1 / 1000) * 1000, // Round up to nearest 1000
         title: {
           text: null
         },
         labels: {
           format: '${value}'
         },
        plotLines: [{
          value: goal.target_amount,
          color: '#1cc88a',
          dashStyle: 'shortdash',
          width: 2,
          label: {
            text: 'Target: $' + goal.target_amount
          }
        }]
      },
      tooltip: {
        headerFormat: '<b>{point.x:%b %Y}</b><br>',
        pointFormat: 'Projected Balance: ${point.y:,.2f}'
      },
      plotOptions: {
        spline: {
          marker: {
            enabled: false
          },
          lineWidth: 3
        }
      },
      series: [{
        name: 'Balance Projection',
        data: projectionData,
        color: '#4e73df'
      }],
      credits: {
        enabled: false
      }
    });
  };

  const handleDelete = (): void => {
    if (
      window.confirm(
        "Are you sure you want to delete this goal? This action cannot be undone."
      )
    ) {
      // In a real app, would call API to delete goal
      console.log("Deleting goal:", goal);
      alert("Goal deleted successfully!");
      navigate("/goals");
    }
  };

  // Updated toggle tip function to position tooltips correctly below each info icon
  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        // Get the position of the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate position accounting for scroll
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading goal details...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 animate__animated animate__fadeIn">
          <div className="error-icon mb-4">
            <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Goal not found</h1>
          <p className="mb-4">The goal you're looking for does not exist or has been deleted.</p>
          <Link to="/goals" className="btn btn-primary">
            <i className="fas fa-arrow-left mr-2"></i> Back to Goals
          </Link>
        </div>
      </div>
    );
  }

  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const remainingAmount = goal.target_amount - goal.current_amount;
  const remainingDays = getRemainingDays(goal.target_date);
  const monthlySavings = calculateMonthlySavingsForGoal(goal);

  let statusColor: string;
  let statusBg: string;
  let statusIcon: string;

  if (progressPercentage >= 75) {
    statusColor = "success";
    statusBg = "rgba(28, 200, 138, 0.1)";
    statusIcon = "check-circle";
  } else if (progressPercentage >= 40) {
    statusColor = "warning";
    statusBg = "rgba(246, 194, 62, 0.1)";
    statusIcon = "clock";
  } else {
    statusColor = "danger";
    statusBg = "rgba(231, 74, 59, 0.1)";
    statusIcon = "exclamation-circle";
  }

  let priorityColor: string;
  if (goal.priority === "high") {
    priorityColor = "danger";
  } else if (goal.priority === "medium") {
    priorityColor = "warning";
  } else {
    priorityColor = "info";
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 animate__animated animate__fadeInDown">
        <h1 className="h3 mb-0 text-gray-800">{goal.goal_name}</h1>
        <div className="d-flex">
          <Link to="#" onClick={handleDelete} className="btn btn-primary btn-sm mr-2 shadow-sm" style={{ backgroundColor: "#e74a3b", borderColor: "#e74a3b" }}>
            <i className="fas fa-trash fa-sm mr-2"></i> Delete Goal
          </Link>
          <Link to={`/goals/${id}/edit`} className="btn btn-primary btn-sm mr-2 shadow-sm">
            <i className="fas fa-edit fa-sm mr-2"></i> Edit Goal
          </Link>
          <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goals
          </Link>
        </div>
      </div>

      {/* Goal Overview Row */}
      <div className="row">
        {/* Total Goal Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Target Amount
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('targetAmount', e)}
                        aria-label="Target Amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(goal.target_amount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-bullseye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Current Amount
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('currentAmount', e)}
                        aria-label="Current Amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(goal.current_amount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1 d-flex align-items-center">
                    Remaining
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('remaining', e)}
                        aria-label="Remaining amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hourglass-half fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Days Remaining Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Time Remaining
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('timeRemaining', e)}
                        aria-label="Time Remaining information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {remainingDays} days
                  </div>
                  <div className="text-xs text-gray-500">
                    Target: {formatDate(goal.target_date)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Goal Progress Card with Highcharts */}
        <div className="col-lg-8 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
          <div className="card shadow">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Goal Progress
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('goalProgress', e)}
                    aria-label="Goal Progress information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
              <div className={`badge badge-${statusColor}`}>{formatPercentage(progressPercentage)}</div>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-5">
                  <div className="position-relative">
                    {highchartsLoaded && progressConfig && (
                      <>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={progressConfig}
                          ref={progressChartRef}
                        />
                        {/* Only show this label for pie chart fallback */}
                        {progressConfig.chart?.type === 'pie' && (
                          <div className="position-absolute" style={{ 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -20%)',
                            textAlign: 'center'
                          }}>
                            <div className="font-weight-bold" style={{ fontSize: '24px' }}>
                              {formatPercentage(progressPercentage)}
                            </div>
                            <div className="text-xs text-gray-500">Complete</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="mb-4">
                    <div className="mb-2 d-flex justify-content-between">
                      <span>Progress</span>
                      <span>{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="progress mb-4">
                      <div
                        className={`progress-bar bg-${statusColor}`}
                        role="progressbar"
                        style={{
                          width: `${progressPercentage > 100 ? 100 : progressPercentage}%`,
                        }}
                        aria-valuenow={progressPercentage > 100 ? 100 : progressPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                      </div>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h4 className="small font-weight-bold mb-1">Status</h4>
                        <div className="d-flex align-items-center">
                          <div className={`bg-${statusColor} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                            <i className={`fas fa-${statusIcon} text-${statusColor}`}></i>
                          </div>
                          <span className="text-gray-800 font-weight-bold">{goal.status?.replace("_", " ").toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h4 className="small font-weight-bold mb-1">Priority</h4>
                        <div className="d-flex align-items-center">
                          <div className={`bg-${priorityColor} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                            <i className={`fas fa-flag text-${priorityColor}`}></i>
                          </div>
                          <span className={`text-${priorityColor} font-weight-bold`}>{goal.priority.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline projection chart */}
              <div className="mt-4">
                <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center">
                  Goal Timeline Projection
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('goalTimeline', e)}
                      aria-label="Goal Timeline Projection information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                </h6>
                {highchartsLoaded && timelineConfig && (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={timelineConfig}
                    ref={timelineChartRef}
                  />
                )}
              </div>

              {goal.description && (
                <div className="mt-4">
                  <h4 className="small font-weight-bold">Description</h4>
                  <div className="p-3 bg-light rounded">
                    <p className="mb-0 text-gray-700">{goal.description}</p>
                  </div>
                </div>
              )}

              <div className="text-center mt-4">
                <Link to={`/goals/${id}/contribute`} className="btn btn-success btn-lg shadow-sm">
                  <i className="fas fa-plus-circle mr-2"></i> Make a Contribution
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Saving Recommendation and History Card */}
        <div className="col-lg-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.6s" }}>
          {/* Monthly Recommendation Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Saving Recommendation
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('savingRec', e)}
                    aria-label="Saving Recommendation information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div className="rounded-circle bg-success p-2 mx-auto mb-3" style={{ width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-chart-line fa-lg text-white"></i>
                </div>

                <div className="text-xs text-gray-500 mb-1">Recommended Monthly Saving</div>
                <div className="h3 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(monthlySavings)}
                </div>
                <div className="text-sm text-gray-600 mt-1 mb-3">
                  to reach your goal by {formatDate(goal.target_date)}
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <div>
                  <div className="text-xs text-gray-500">Time Left</div>
                  <div className="font-weight-bold">
                    {remainingDays} days
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="font-weight-bold">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contribution History Chart */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Contribution History
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('contHistory', e)}
                    aria-label="Contribution History information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {transactions.length === 0 ? (
                <div className="text-center py-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-bar fa-3x text-gray-300"></i>
                  </div>
                  <p className="text-gray-600 mb-0">No contribution data available</p>
                </div>
              ) : (
                highchartsLoaded && contributionsConfig && (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={contributionsConfig}
                    ref={contributionsChartRef}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Transactions */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.7s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Goal Transactions
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('goalTransactions', e)}
                aria-label="Goal Transactions information"
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </h6>
          <div className="dropdown no-arrow">
            <button className="btn btn-link btn-sm dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i className="fas fa-ellipsis-v text-gray-400"></i>
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow animated--fade-in" aria-labelledby="dropdownMenuButton">
              <a className="dropdown-item" href="#">Export to CSV</a>
              <a className="dropdown-item" href="#">Filter Transactions</a>
              <div className="dropdown-divider"></div>
              <a className="dropdown-item" href="#">View All Transactions</a>
            </div>
          </div>
        </div>
        <div className="card-body">
          {transactions.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fas fa-receipt fa-4x text-gray-300"></i>
              </div>
              <h4 className="text-gray-800 mb-2">No Transactions Yet</h4>
              <p className="text-gray-600">No contributions have been made towards this goal yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td width="20%">{formatDate(transaction.date)}</td>
                      <td>
                        <Link
                          to={`/transactions/${transaction.id}`}
                          className="font-weight-bold text-primary"
                        >
                          {transaction.notes}
                        </Link>
                      </td>
                      <td width="20%">
                        <span className="badge badge-light">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="text-right font-weight-bold" width="20%">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-light">
                    <td colSpan={3} className="font-weight-bold">
                      Total Contributions
                    </td>
                    <td className="text-right font-weight-bold text-success">
                      {formatCurrency(
                        transactions.reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Global tooltip */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "12px 15px",
            borderRadius: "8px",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            maxWidth: "300px",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          {activeTip === 'targetAmount' && (
            <>
              <div className="tip-title">Target Amount</div>
              <p className="tip-description">
                The total amount you're aiming to save for this goal. This is your financial destination.
              </p>
            </>
          )}
          {activeTip === 'currentAmount' && (
            <>
              <div className="tip-title">Current Amount</div>
              <p className="tip-description">
                The amount you've already saved towards this goal. This represents your progress so far.
              </p>
            </>
          )}
          {activeTip === 'remaining' && (
            <>
              <div className="tip-title">Remaining Amount</div>
              <p className="tip-description">
                The amount still needed to reach your goal. This is the gap between your current savings and your target.
              </p>
            </>
          )}
          {activeTip === 'timeRemaining' && (
            <>
              <div className="tip-title">Time Remaining</div>
              <p className="tip-description">
                The number of days left until your target date. This helps you plan your saving schedule to reach your goal on time.
              </p>
            </>
          )}
          
          {activeTip === 'goalProgress' && (
            <>
              <div className="tip-title">Goal Progress</div>
              <p className="tip-description">
                Visual representation of your progress toward this financial goal. The percentage shows how much of your target amount you've already saved.
              </p>
            </>
          )}
          
          {activeTip === 'savingRec' && (
            <>
              <div className="tip-title">Saving Recommendation</div>
              <p className="tip-description">
                Suggested monthly contribution amount to help you reach your goal by the target date. This is calculated based on your remaining amount and time left.
              </p>
            </>
          )}
          
          {activeTip === 'contHistory' && (
            <>
              <div className="tip-title">Contribution History</div>
              <p className="tip-description">
                Chart showing your historical contributions to this goal over time. This helps you track your saving consistency and patterns.
              </p>
            </>
          )}
          
          {activeTip === 'goalTransactions' && (
            <>
              <div className="tip-title">Goal Transactions</div>
              <p className="tip-description">
                Detailed list of all contributions made toward this goal, including dates, descriptions, and amounts. This provides a complete history of your saving activity.
              </p>
            </>
          )}
          
          {activeTip === 'goalTimeline' && (
            <>
              <div className="tip-title">Goal Timeline Projection</div>
              <p className="tip-description">
                This chart shows the projected growth of your savings towards this goal over time. It visualizes how your current saving rate will help you reach your target amount by the target date.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalDetails;
