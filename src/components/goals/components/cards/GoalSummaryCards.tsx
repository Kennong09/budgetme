import React from 'react';
import { GoalSummary } from '../../types';
import { formatCurrency } from '../../../../utils/helpers';

interface GoalSummaryCardsProps {
  goalSummary: GoalSummary;
  filteredGoalsCount: number;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const GoalSummaryCards: React.FC<GoalSummaryCardsProps> = ({
  goalSummary,
  filteredGoalsCount,
  onToggleTip
}) => {
  return (
    <div className="row">
      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-primary shadow h-100 py-2 animate__animated animate__fadeIn">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                  Active Goals
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('activeGoals', e)}
                      aria-label="Active Goals information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {filteredGoalsCount}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-flag fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-success shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                  Total Saved
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('totalSaved', e)}
                      aria-label="Total Saved information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(goalSummary.totalCurrentAmount)}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-4 col-md-6 mb-4">
        <div className="card border-left-info shadow h-100 py-2 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                  Total Target
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onToggleTip('totalTarget', e)}
                      aria-label="Total Target information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(goalSummary.totalTargetAmount)}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-bullseye fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalSummaryCards;