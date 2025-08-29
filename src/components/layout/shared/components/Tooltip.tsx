import React, { FC } from "react";

export interface TooltipProps {
  show: boolean;
  text: string;
  position: { top: number; left: number };
  className?: string;
  style?: React.CSSProperties;
  theme?: "primary" | "secondary" | "danger" | "dark";
}

const Tooltip: FC<TooltipProps> = ({ 
  show, 
  text, 
  position, 
  className = "", 
  style = {},
  theme = "primary"
}) => {
  if (!show || !text) return null;

  const themeColors = {
    primary: { background: 'var(--primary, #4e73df)', color: 'var(--light, #ffffff)' },
    secondary: { background: 'var(--secondary, #6c757d)', color: 'var(--light, #ffffff)' },
    danger: { background: 'var(--danger, #e74a3b)', color: 'var(--light, #ffffff)' },
    dark: { background: 'var(--dark, #343a40)', color: 'var(--light, #ffffff)' }
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    backgroundColor: themeColors[theme].background,
    color: themeColors[theme].color,
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    zIndex: 1050,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    pointerEvents: 'none',
    transform: 'translateY(-50%)',
    ...style
  };

  return (
    <div 
      className={`sidebar-tooltip ${className}`}
      style={tooltipStyle}
      role="tooltip"
      aria-hidden="true"
    >
      {text}
      {/* Triangle pointer */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '-4px',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderRight: `4px solid ${themeColors[theme].background}`
        }}
      />
    </div>
  );
};

export default Tooltip;