import React, { FC, memo, useMemo } from "react";
import { formatPercentage } from "../../../../utils/helpers";

interface ProgressBarProps {
  percentage: number;
  status: "success" | "warning" | "danger";
  showTooltip?: boolean;
  label?: string;
}

const ProgressBar: FC<ProgressBarProps> = memo(({
  percentage,
  status,
  showTooltip = true,
  label
}) => {
  const colorClass = useMemo(() => 
    status === "danger" ? "danger" : status === "warning" ? "warning" : "success",
    [status]
  );

  return (
    <div className="mb-3 md:mb-4">
      {label && (
        <div className="d-flex justify-content-between align-items-center mb-1 md:mb-2">
          <h4 className="text-xs md:text-sm font-weight-bold mb-0">{label}</h4>
          <span className={`font-weight-bold text-${colorClass} text-xs md:text-sm`}>
            {formatPercentage(percentage)}
          </span>
        </div>
      )}
      <div className="progress mb-3 md:mb-4 position-relative" style={{ height: window.innerWidth < 768 ? '0.5rem' : '0.7rem' }}>
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
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
