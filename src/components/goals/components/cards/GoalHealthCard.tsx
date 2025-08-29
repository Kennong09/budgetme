import React from 'react';
import { Goal, GoalSummary } from '../../types';
import { formatPercentage } from '../../../../utils/helpers';
import { getGoalHealthStatus } from '../../utils/goalUtils';

interface GoalHealthCardProps {
  goals: Goal[];
  goalSummary: GoalSummary;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const GoalHealthCard: React.FC<GoalHealthCardProps> = ({
  goals,
  goalSummary,
  onToggleTip
}) => {
  const { overallProgress } = goalSummary;
  const { goalHealthStatus, goalHealthIcon, goalHealthColor } = getGoalHealthStatus(overallProgress);

  return (
    <div className="col-xl-4 col-lg-5 mb-4">
      <div className="card shadow animate__animated animate__fadeIn" style={{ animationDelay: "0.45s" }}>
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Goal Health
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => onToggleTip('goalHealth', e)}
                aria-label="Goal health information"
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </h6>
        </div>
        <div className="card-body">
          {goals.length > 0 ? (
            <>
              <div className="text-center">
                <div className="mb-3">
                  <i className={`fas fa-${goalHealthIcon} fa-3x mb-3`} style={{color: goalHealthColor}}></i>
                </div>
                <h4 className="font-weight-bold" style={{ color: goalHealthColor }}>
                  {goalHealthStatus}
                </h4>
                <p className="mb-0">
                  You've achieved {formatPercentage(overallProgress)} of your goals.
                  {overallProgress >= 90 ? " You're doing excellently!" : 
                  overallProgress >= 75 ? " Keep up the good work!" : 
                  overallProgress >= 50 ? " You're making progress!" : 
                  " Keep going, you're just getting started!"}
                </p>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                <i className="fas fa-lightbulb text-warning mr-1"></i>
                <strong>Tip:</strong> Regular contributions to your goals will help you reach them faster.
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-heartbeat fa-3x text-gray-300"></i>
              </div>
              <h5 className="text-gray-500 font-weight-light">No goal health data</h5>
              <p className="text-gray-500 mb-0 small">Create goals to see your financial health status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalHealthCard;