import React, { FC } from "react";

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
        className="d-flex align-items-center justify-content-center position-fixed"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          zIndex: 9999
        }}
      >
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner;