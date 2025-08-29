import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Goal, GoalSummary } from '../../types';
import { formatPercentage } from '../../../../utils/helpers';

interface GoalProgressSectionProps {
  goals: Goal[];
  goalSummary: GoalSummary;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const GoalProgressSection: React.FC<GoalProgressSectionProps> = ({
  goals,
  goalSummary,
  onToggleTip
}) => {
  const [hoveringBar, setHoveringBar] = useState<boolean>(false);
  const { overallProgress } = goalSummary;

  return (
    <div className="col-xl-8 col-lg-7 mb-4">
      <div className="card shadow animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Overall Goal Progress
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => onToggleTip('overallProgress', e)}
                aria-label="Overall Progress information"
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </h6>
          {goals.length > 0 && (
            <div className={`badge badge-${
              overallProgress >= 90 ? "success" : 
              overallProgress >= 75 ? "info" : 
              overallProgress >= 50 ? "warning" : 
              "danger"
            } ml-2`}>
              {overallProgress >= 90 ? "Excellent" : 
              overallProgress >= 75 ? "On Track" : 
              overallProgress >= 50 ? "Getting Started" :
              "Just Beginning"}
            </div>
          )}
        </div>
        <div className="card-body">
          {goals.length > 0 ? (
            <>
              <div className="mb-2 d-flex justify-content-between">
                <span>Overall Progress</span>
                <span className={`font-weight-bold ${
                  overallProgress >= 90 ? "text-success" : 
                  overallProgress >= 75 ? "text-info" : 
                  overallProgress >= 50 ? "text-warning" : 
                  "text-danger"
                }`}>{formatPercentage(overallProgress)}</span>
              </div>
              <div 
                className="progress mb-4 position-relative"
                onMouseEnter={() => setHoveringBar(true)}
                onMouseLeave={() => setHoveringBar(false)}
              >
                <div
                  className={`progress-bar ${
                    overallProgress >= 90 ? "bg-success" : 
                    overallProgress >= 75 ? "bg-info" : 
                    overallProgress >= 50 ? "bg-warning" : 
                    "bg-danger"
                  }`}
                  role="progressbar"
                  style={{ width: `${overallProgress}%` }}
                  aria-valuenow={overallProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
                {hoveringBar && (
                  <div 
                    className="position-absolute text-dark px-2 py-1 small"
                    style={{
                      top: "-30px",
                      left: `${Math.min(Math.max(overallProgress, 5), 95)}%`,
                      transform: "translateX(-50%)",
                      backgroundColor: "white",
                      borderRadius: "4px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      fontWeight: "bold",
                      zIndex: 10
                    }}
                  >
                    {formatPercentage(overallProgress)}
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-xs font-weight-bold text-gray-500 text-uppercase mb-1">GOAL STATUS</div>
              <div className="row">
                <div className="col-md-3 mb-4">
                  <div style={{ 
                    backgroundColor: "#1cc88a", 
                    borderRadius: "8px", 
                    height: "100%",
                    padding: "15px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Healthy</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>90-100%</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div style={{ 
                    backgroundColor: "#36b9cc", 
                    borderRadius: "8px", 
                    height: "100%",
                    padding: "15px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>On Track</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>75-89%</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div style={{ 
                    backgroundColor: "#f6c23e", 
                    borderRadius: "8px", 
                    height: "100%",
                    padding: "15px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Getting</div>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Started</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>50-74%</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div style={{ 
                    backgroundColor: "#e74a3b", 
                    borderRadius: "8px", 
                    height: "100%",
                    padding: "15px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Just</div>
                    <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Beginning</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>0-49%</div>
                    <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-chart-line fa-3x text-gray-300"></i>
              </div>
              <h5 className="text-gray-500 font-weight-light">No goal progress data available</h5>
              <p className="text-gray-500 mb-0 small">Create financial goals to track your progress.</p>
              <Link to="/goals/create" className="btn btn-sm btn-primary mt-3">
                <i className="fas fa-plus fa-sm mr-1"></i> Create New Goal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalProgressSection;