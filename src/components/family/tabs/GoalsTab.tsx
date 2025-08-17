import React from 'react';
import { Link } from 'react-router-dom';
import type HighchartsReact from 'highcharts-react-official';
import { Goal } from '../types';
import { formatCurrency, formatDate, formatPercentage } from '../../../utils/helpers';
import { ContributionChart } from '../charts';

interface GoalsTabProps {
  familyGoals: Goal[];
  isCreator: boolean;
  loadingFamilyGoals: boolean;
  selectedGoalForContributions: string | null;
  loadingContributions: boolean;
  goalContributions: any[];
  contributionChartData: any;
  contributionPieChartData: any;
  contributionBarChartRef: React.RefObject<HighchartsReact.RefObject>;
  contributionPieChartRef: React.RefObject<HighchartsReact.RefObject>;
  openContributeModal: (goal: Goal) => void;
  fetchGoalContributions: (goalId: string) => void;
  toggleTip: (tipId: string, event?: React.MouseEvent) => void;
  getRemainingDays: (targetDate: string) => number;
}

const GoalsTab: React.FC<GoalsTabProps> = ({
  familyGoals,
  isCreator,
  loadingFamilyGoals,
  selectedGoalForContributions,
  loadingContributions,
  goalContributions,
  contributionChartData,
  contributionPieChartData,
  contributionBarChartRef,
  contributionPieChartRef,
  openContributeModal,
  fetchGoalContributions,
  toggleTip,
  getRemainingDays
}) => {
  if (loadingFamilyGoals) {
    return (
      <div className="animate__animated animate__fadeIn">
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-gray-600 mt-2">Loading family goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="mb-4">
        <h5 className="text-primary font-weight-bold">Family Goals Overview</h5>
        <p className="text-muted">Track and contribute to shared financial goals</p>
      </div>

      {familyGoals.length > 0 ? (
        <>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Owner</th>
                  <th>Progress</th>
                  <th>Amount</th>
                  <th>Target Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {familyGoals.map(goal => {
                  const progressPercentage = goal.percentage || 0;
                  const statusClass = 
                    goal.status === "completed" ? "badge-success" :
                    goal.status === "in_progress" ? "badge-primary" :
                    goal.status === "not_started" ? "badge-secondary" :
                    "badge-danger";
                  const priorityBadgeClass = 
                    goal.priority === "high" ? "badge-danger" :
                    goal.priority === "medium" ? "badge-warning" :
                    "badge-info";
                  
                  return (
                    <tr key={goal.id}>
                      <td>
                        <div className="font-weight-bold">{goal.goal_name}</div>
                        <div className="small text-muted">
                          <span className="badge badge-info">
                            <i className="fas fa-users mr-1"></i> Family Goal
                          </span>
                          {goal.shared_by && goal.user_id !== goal.shared_by && (
                            <span className="badge badge-secondary ml-1">
                              <i className="fas fa-share-alt mr-1"></i> Shared
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div>{goal.owner_name || "Family Member"}</div>
                        </div>
                      </td>
                      <td style={{width: "150px"}}>
                        <div className="progress" style={{height: '10px'}}>
                          <div 
                            className={`progress-bar ${
                              goal.status === "completed" ? "bg-success" :
                              goal.progress_status === "good" ? "bg-success" : 
                              goal.progress_status === "average" ? "bg-info" : 
                              goal.progress_status === "poor" ? "bg-warning" : 
                              progressPercentage >= 90 ? "bg-success" : 
                              progressPercentage >= 50 ? "bg-info" : 
                              progressPercentage >= 25 ? "bg-warning" : 
                              "bg-danger"
                            }`}
                            role="progressbar" 
                            style={{ width: `${progressPercentage}%` }}
                            aria-valuenow={progressPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                        <div className="small text-muted text-center mt-1">
                          {formatPercentage(progressPercentage)}
                        </div>
                      </td>
                      <td>
                        <div className="font-weight-bold">{formatCurrency(goal.current_amount)}</div>
                        <div className="small text-muted">of {formatCurrency(goal.target_amount)}</div>
                      </td>
                      <td>
                        <div>{formatDate(goal.target_date || goal.deadline)}</div>
                        <div className="small text-muted">
                          {getRemainingDays(goal.target_date || goal.deadline)} days left
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {goal.status === "not_started" ? "Not Started" : 
                           goal.status === "in_progress" ? "In Progress" : 
                           goal.status === "completed" ? "Completed" : 
                           "Cancelled"}
                        </span>
                        <div className="small mt-1">
                          <span className={`badge ${priorityBadgeClass}`}>
                            {(goal.priority || 'medium').charAt(0).toUpperCase() + (goal.priority || 'medium').slice(1)} Priority
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button 
                            className="btn btn-success btn-sm" 
                            title="Contribute"
                            onClick={() => openContributeModal(goal)}
                          >
                            <i className="fas fa-plus mr-1"></i> Contribute
                          </button>
                          <button 
                            className="btn btn-info btn-sm ml-1" 
                            onClick={() => fetchGoalContributions(goal.id)}
                            disabled={loadingContributions && selectedGoalForContributions === goal.id}
                          >
                            {loadingContributions && selectedGoalForContributions === goal.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="fas fa-chart-bar"></i>
                            )}
                          </button>
                          <Link to={`/goals/${goal.id}`} className="btn btn-primary btn-sm ml-1">
                            <i className="fas fa-eye"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            
          {/* Contribution Visualization Section */}
          {selectedGoalForContributions && (
            <div className="card shadow mb-4 mt-4 animate__animated animate__fadeIn">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">
                  Family Goal Contributions
                  <i 
                    className="fas fa-info-circle ml-2 text-gray-400"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => toggleTip('goal-contributions', e)}
                  ></i>
                </h6>
                <div>
                  <strong>{familyGoals.find(g => g.id === selectedGoalForContributions)?.goal_name || "Shared Goal"}</strong>
                </div>
              </div>
              <div className="card-body">
                {loadingContributions ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    <p className="text-gray-600 mt-2">Loading contribution data...</p>
                  </div>
                ) : goalContributions.length > 0 ? (
                  <div className="row">
                    <div className="col-xl-6 mb-4">
                      <div className="card h-100">
                        <div className="card-header py-3">
                          <h6 className="m-0 font-weight-bold text-primary">Contribution by Member</h6>
                        </div>
                        <div className="card-body">
                          <ContributionChart data={contributionChartData} chartRef={contributionBarChartRef} />
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-6 mb-4">
                      <div className="card h-100">
                        <div className="card-header py-3">
                          <h6 className="m-0 font-weight-bold text-primary">Contribution Breakdown</h6>
                        </div>
                        <div className="card-body">
                          <ContributionChart data={contributionPieChartData} chartRef={contributionPieChartRef} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-3">
                      <i className="fas fa-users fa-3x text-gray-300"></i>
                    </div>
                    <h5 className="text-gray-500 font-weight-light">No Contributions Yet</h5>
                    <p className="text-gray-500 mb-0 small">
                      No one has contributed to this goal yet. 
                      Be the first to contribute and help reach this family goal!
                    </p>
                    <button 
                      className="btn btn-primary mt-3" 
                      onClick={() => {
                        const goal = familyGoals.find(g => g.id === selectedGoalForContributions);
                        if (goal) openContributeModal(goal);
                      }}
                    >
                      <i className="fas fa-plus-circle mr-2"></i>
                      Make First Contribution
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-4">
          <div className="mb-3">
            <i className="fas fa-flag-checkered fa-3x text-gray-300"></i>
          </div>
          <h5 className="text-gray-500 font-weight-light">No family goals found</h5>
          <p className="text-gray-500 mb-0 small">
            Create a goal and share it with family members to track progress together.
          </p>
          {isCreator && (
            <Link to="/goals/create?share=family" className="btn btn-sm btn-primary mt-3">
              <i className="fas fa-plus fa-sm mr-1"></i> Create Family Goal
            </Link>
          )}
          {!isCreator && (
            <div className="alert alert-info mt-3 text-left" role="alert">
              <i className="fas fa-info-circle mr-1"></i> 
              As a family member, you can contribute to existing family goals, but only the family creator can add new family goals.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalsTab;
