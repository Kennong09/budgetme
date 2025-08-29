import React, { FC, ReactElement } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  borderColor: "primary" | "info" | "success" | "warning" | "danger";
  animationDelay?: string;
  onClick?: (e: React.MouseEvent) => void;
  showTooltip?: boolean;
  tooltipId?: string;
}

const StatCard: FC<StatCardProps> = ({
  title,
  value,
  icon,
  borderColor,
  animationDelay = "0s",
  onClick,
  showTooltip = false,
  tooltipId
}) => {
  return (
    <div 
      className={`col-xl-4 col-md-6 mb-4 animate__animated animate__fadeIn`} 
      style={{ animationDelay }}
    >
      <div className={`card border-left-${borderColor} shadow h-100 py-2`}>
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className={`text-xs font-weight-bold text-${borderColor} text-uppercase mb-1 d-flex align-items-center`}>
                {title}
                {showTooltip && onClick && (
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={onClick}
                      aria-label={`${title} information`}
                    ></i>
                  </div>
                )}
              </div>
              <div className="h5 mb-0 font-weight-bold text-gray-800">
                {value}
              </div>
            </div>
            <div className="col-auto">
              <i className={`fas fa-${icon} fa-2x text-gray-300`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
