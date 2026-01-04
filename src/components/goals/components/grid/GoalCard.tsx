import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Goal } from '../../types';
import { formatCurrency, formatDate, formatPercentage, getRemainingDays, calculateMonthlySavingsForGoal } from '../../../../utils/helpers';
import { formatStatusName } from '../../utils/goalUtils';
import { useAuth } from '../../../../utils/AuthContext';
import GoalDebugInfo from '../../debug/GoalDebugInfo';

interface GoalCardProps {
  goal: Goal;
  onDeleteGoal: (goalId: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onDeleteGoal }) => {
  const { user } = useAuth();
  const [hoveringGoalBar, setHoveringGoalBar] = useState<boolean>(false);
  
  // Calculate percentage with fallback if not provided
  const calculatePercentage = (current: number, target: number): number => {
    if (!target || target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };
  
  const progressPercentage = goal.percentage ?? calculatePercentage(goal.current_amount, goal.target_amount);
  const daysLeft = getRemainingDays(goal.target_date);
  const priorityClass = goal.priority === "high" ? "text-danger" : goal.priority === "medium" ? "text-warning" : "text-info";
  const statusClass = goal.status === "completed" ? "badge-success" : 
                     goal.status === "in_progress" ? "badge-primary" :
                     goal.status === "not_started" ? "badge-secondary" : "badge-danger";
  
  const barClasses = `progress-bar ${
    progressPercentage >= 90 ? "bg-success" : 
    progressPercentage >= 50 ? "bg-info" : 
    progressPercentage >= 25 ? "bg-warning" : 
    "bg-danger"
  } ${hoveringGoalBar ? 'progress-bar-hover' : ''}`;
  
  const monthlySavingsNeeded: number = calculateMonthlySavingsForGoal({
    target_amount: goal.target_amount,
    current_amount: goal.current_amount,
    target_date: goal.target_date
  });

  const handleGoalBarHover = (isHovering: boolean) => {
    setHoveringGoalBar(isHovering);
  };

  // This component is only used for desktop grid view
  // Mobile grid view uses MobileGoalCard component
  return (
    <div className="col-xl-4 col-md-6 mb-4 d-none d-md-block">
      <div className={`card shadow h-100 ${goal.is_family_goal ? 'border-left-info' : 'border-left-secondary'}`}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">
            {goal.goal_name}
            {goal.is_family_goal ? (
              <span className="badge badge-info ml-2">
                <i className="fas fa-users mr-1"></i> Family
              </span>
            ) : (
              <span className="badge badge-secondary ml-2">
                <i className="fas fa-user mr-1"></i> Personal
              </span>
            )}
          </h6>
          <div className="dropdown no-arrow">
            <button className="btn btn-link btn-sm dropdown-toggle" type="button" id={`dropdownMenuLink${goal.id}`} data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i className="fas fa-ellipsis-v fa-fw"></i>
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow animated--fade-in" aria-labelledby={`dropdownMenuLink${goal.id}`}>
              <div className="dropdown-header">Goal Actions:</div>
              <Link to={`/goals/${goal.id}`} className="dropdown-item">
                <i className="fas fa-eye fa-fw mr-2 text-gray-400"></i>View Details
              </Link>
              {!goal.is_family_goal && (
                <>
                  <Link to={`/goals/${goal.id}/edit`} className="dropdown-item">
                    <i className="fas fa-edit fa-fw mr-2 text-gray-400"></i>Edit Goal
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item text-danger" 
                    onClick={() => onDeleteGoal(goal.id)}
                  >
                    <i className="fas fa-trash fa-fw mr-2 text-danger"></i>Delete Goal
                  </button>
                </>
              )}
              {/* Allow editing shared goals if user is the owner */}
              {goal.is_family_goal && goal.user_id === user?.id && (
                <>
                  <Link to={`/goals/${goal.id}/edit`} className="dropdown-item">
                    <i className="fas fa-edit fa-fw mr-2 text-gray-400"></i>Edit Goal
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item text-danger" 
                    onClick={() => onDeleteGoal(goal.id)}
                  >
                    <i className="fas fa-trash fa-fw mr-2 text-danger"></i>Delete Goal
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="card-body pt-2 d-flex flex-column">
          {/* Shared Goal Indicator */}
          {goal.is_family_goal && (
            <div className="mb-2">
              {goal.shared_by_name && (
                <span className="badge badge-light ml-1">
                  <i className="fas fa-user mr-1"></i> {goal.shared_by_name}
                </span>
              )}
            </div>
          )}
          
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <span className={`badge ${statusClass}`}>
              {formatStatusName(goal.status)}
            </span>
            <span className={`font-weight-bold ${priorityClass}`}>
              <i className={`fas fa-flag mr-1 ${priorityClass}`}></i>
              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
            </span>
          </div>

          <div className="mb-2 d-flex justify-content-between align-items-baseline">
            <div className="small text-gray-600">
              <i className="fas fa-calendar-alt mr-1"></i>
              {daysLeft > 0 ? `${daysLeft} days left` : "Past due"}
            </div>
            <div className="text-xs text-gray-500">
              <i className="fas fa-hourglass-half mr-1"></i>
              {formatDate(goal.target_date)}
            </div>
          </div>

          <div className="mb-2 d-flex justify-content-between">
            <span className="font-weight-bold text-gray-800">{formatCurrency(goal.current_amount)}</span>
            <span className="text-gray-600">of {formatCurrency(goal.target_amount)}</span>
          </div>

          <div className="progress mb-2" style={{height: '10px'}}
            onMouseEnter={() => handleGoalBarHover(true)}
            onMouseLeave={() => handleGoalBarHover(false)}
          >
            <div 
              className={barClasses}
              role="progressbar" 
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>

          <div className="d-flex justify-content-between mb-3">
            <small className="text-gray-600">{formatPercentage(progressPercentage)} Complete</small>
            <small className="text-gray-600">{formatCurrency(goal.remaining ?? Math.max(0, goal.target_amount - goal.current_amount))} left</small>
          </div>

          {goal.status !== "completed" && goal.status !== "cancelled" && daysLeft > 0 && (
            <div className="alert alert-info mb-3 py-2 small">
              <i className="fas fa-piggy-bank mr-1"></i>
              Save {formatCurrency(monthlySavingsNeeded)} monthly to reach your goal
            </div>
          )}

          {goal.is_overdue && goal.status !== "completed" && goal.status !== "cancelled" && (
            <div className="alert alert-danger mb-3 py-2 small">
              <i className="fas fa-exclamation-circle mr-1"></i>
              This goal is past its target date
            </div>
          )}

          <div className="mt-auto pt-3 border-top">
            <Link to={`/goals/${goal.id}`} className="btn btn-sm btn-primary btn-block">
              <i className="fas fa-eye mr-1"></i> View Details
            </Link>
          </div>
          
          {/* Debug info for development */}
          <GoalDebugInfo goal={goal} />
        </div>
      </div>
    </div>
  );
};

export default GoalCard;