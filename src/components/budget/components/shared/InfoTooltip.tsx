import React, { FC } from "react";
import { TooltipPosition } from "../../types";

interface InfoTooltipProps {
  isActive: boolean;
  position: TooltipPosition | null;
  title: string;
  content: string;
  onClose: () => void;
}

const InfoTooltip: FC<InfoTooltipProps> = ({
  isActive,
  position,
  title,
  content,
  onClose
}) => {
  if (!isActive || !position) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="tooltip-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1000,
          background: "transparent"
        }}
      />
      
      {/* Tooltip */}
      <div
        className="tooltip-custom show animate__animated animate__fadeIn"
        style={{
          position: "absolute",
          top: position.top + 10,
          left: position.left,
          transform: "translateX(-50%)",
          zIndex: 1001,
          maxWidth: "300px",
          backgroundColor: "#fff",
          border: "1px solid #e3e6f0",
          borderRadius: "0.35rem",
          boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
          padding: "0.75rem",
          fontSize: "0.875rem",
          lineHeight: "1.5"
        }}
      >
        <div className="arrow" style={{
          position: "absolute",
          top: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "6px solid #fff"
        }}></div>
        
        <div className="font-weight-bold text-primary mb-2">{title}</div>
        <div className="text-gray-700">{content}</div>
      </div>
    </>
  );
};

export default InfoTooltip;
