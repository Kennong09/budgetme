import React, { FC } from "react";
import { formatPercentage } from "../../../../utils/helpers";

interface ProgressBarProps {
  percentage: number;
  status: "success" | "warning" | "danger";
  showTooltip?: boolean;
  label?: string;
}

const ProgressBar: FC<ProgressBarProps> = ({
  percentage,
  status,
  showTooltip = true,
  label
}) => {
  const colorClass = status === "danger" ? "danger" : status === "warning" ? "warning" : "success";

  return (
    <div className="mb-4">
      {label && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="small font-weight-bold mb-0">{label}</h4>
          <span className={`font-weight-bold text-${colorClass}`}>
            {formatPercentage(percentage)}
          </span>
        </div>
      )}
      <div className="progress mb-4 position-relative">
        <div
          className={`progress-bar bg-${colorClass}`}
          role="progressbar"
          style={{ width: `${Math.min(percentage, 100)}%` }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          data-toggle="tooltip"
          data-placement="top"
          title={formatPercentage(percentage)}
        ></div>
        {showTooltip && (
          <div className="progress-tooltip">
            {formatPercentage(percentage)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
