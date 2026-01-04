import React, { FC, memo } from "react";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onInfoClick?: (e: React.MouseEvent) => void;
  showInfo?: boolean;
  animationDelay?: string;
}

const ChartContainer: FC<ChartContainerProps> = memo(({
  title,
  subtitle,
  children,
  onInfoClick,
  showInfo = false,
  animationDelay = "0s"
}) => {
  return (
    <div className={`card shadow mb-3 md:mb-4 animate__animated animate__fadeIn`} style={{ animationDelay }}>
      <div className="card-header py-2 md:py-3">
        <h6 className="m-0 text-sm md:text-base font-weight-bold text-primary d-flex align-items-center">
          {title}
          {showInfo && onInfoClick && (
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={onInfoClick}
                aria-label={`${title} information`}
              ></i>
            </div>
          )}
        </h6>
        {subtitle && (
          <p className="m-0 text-xs md:text-sm text-gray-600">{subtitle}</p>
        )}
      </div>
      <div className="card-body p-3 md:p-4">
        {children}
      </div>
    </div>
  );
});

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;
