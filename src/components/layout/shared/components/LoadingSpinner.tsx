import React, { FC, memo } from "react";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "danger" | "success" | "warning" | "info" | "light" | "dark";
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  fullScreen?: boolean;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  text,
  className = "",
  style,
  fullScreen = false
}) => {
  const sizeClass = size === "sm" ? "spinner-border-sm" : size === "lg" ? "spinner-border-lg" : "";
  const colorClass = `text-${color}`;
  
  const spinnerElement = (
    <div className="d-flex flex-column align-items-center justify-content-center">
      <div 
        className={`spinner-border ${sizeClass} ${colorClass} ${className}`} 
        role="status"
        style={style}
      >
        <span className="sr-only">Loading...</span>
      </div>
      {text && (
        <div className={`mt-2 ${colorClass}`} style={{ fontSize: size === "sm" ? "0.875rem" : "1rem" }}>
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[9999] transition-opacity duration-300"
      >
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

// Memoize LoadingSpinner component for performance
export default memo(LoadingSpinner);