import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Goal, GoalSummary } from '../../types';
import { formatPercentage } from '../../../../utils/helpers';

interface GoalProgressSectionProps {
  goals: Goal[];
  goalSummary: GoalSummary;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const GoalProgressSection: React.FC<GoalProgressSectionProps> = memo(({
  goals,
  goalSummary,
  onToggleTip
}) => {
  const [hoveringBar, setHoveringBar] = useState<boolean>(false);
  const { overallProgress } = goalSummary;

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-500' };
    if (progress >= 75) return { bg: 'bg-cyan-500', text: 'text-cyan-500' };
    if (progress >= 50) return { bg: 'bg-amber-500', text: 'text-amber-500' };
    return { bg: 'bg-rose-500', text: 'text-rose-500' };
  };

  const progressColors = getProgressColor(overallProgress);

  return (
    <>
      {/* Mobile Progress Section */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-chart-line text-indigo-500 text-[10px]"></i>
              Overall Progress
            </h6>
            {goals.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                overallProgress >= 90 ? 'bg-emerald-100 text-emerald-600' : 
                overallProgress >= 75 ? 'bg-cyan-100 text-cyan-600' : 
                overallProgress >= 50 ? 'bg-amber-100 text-amber-600' : 
                'bg-rose-100 text-rose-600'
              }`}>
                {overallProgress >= 90 ? "Excellent" : 
                overallProgress >= 75 ? "On Track" : 
                overallProgress >= 50 ? "Getting Started" :
                "Just Beginning"}
              </span>
            )}
          </div>
          <div className="p-3">
            {goals.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Progress</span>
                  <span className={`text-sm font-bold ${progressColors.text}`}>
                    {formatPercentage(overallProgress)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className={`${progressColors.bg} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-emerald-500 rounded-lg p-2 text-center">
                    <div className="text-white text-[9px] font-medium">Healthy</div>
                    <div className="text-white/70 text-[8px]">90-100%</div>
                  </div>
                  <div className="bg-cyan-500 rounded-lg p-2 text-center">
                    <div className="text-white text-[9px] font-medium">On Track</div>
                    <div className="text-white/70 text-[8px]">75-89%</div>
                  </div>
                  <div className="bg-amber-500 rounded-lg p-2 text-center">
                    <div className="text-white text-[9px] font-medium">Started</div>
                    <div className="text-white/70 text-[8px]">50-74%</div>
                  </div>
                  <div className="bg-rose-500 rounded-lg p-2 text-center">
                    <div className="text-white text-[9px] font-medium">Beginning</div>
                    <div className="text-white/70 text-[8px]">0-49%</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-chart-line text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs text-gray-500 mb-2">No progress data yet</p>
                <Link to="/goals/create" className="text-xs text-indigo-500 font-medium">
                  <i className="fas fa-plus text-[10px] mr-1"></i>Create Goal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Progress Section */}
      <div className="col-xl-8 col-lg-7 mb-4 d-none d-md-block">
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
                  style={{ height: '8px' }}
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
                    <div style={{ backgroundColor: "#1cc88a", borderRadius: "8px", height: "100%", padding: "15px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Healthy</div>
                      <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>90-100% progress</div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div style={{ backgroundColor: "#36b9cc", borderRadius: "8px", height: "100%", padding: "15px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>On Track</div>
                      <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>75-89% progress</div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div style={{ backgroundColor: "#f6c23e", borderRadius: "8px", height: "100%", padding: "15px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Getting Started</div>
                      <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>50-74% progress</div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div style={{ backgroundColor: "#e74a3b", borderRadius: "8px", height: "100%", padding: "15px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Just Beginning</div>
                      <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>0-49% progress</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="mb-3"><i className="fas fa-chart-line fa-3x text-gray-300"></i></div>
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
    </>
  );
});

GoalProgressSection.displayName = 'GoalProgressSection';

export default GoalProgressSection;
