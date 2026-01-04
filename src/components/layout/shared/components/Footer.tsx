import React, { FC, memo } from "react";

export interface FooterProps {
  className?: string;
  style?: React.CSSProperties;
  text?: string;
  variant?: "user" | "admin";
  hideOnMobile?: boolean;
}

const Footer: FC<FooterProps> = ({ 
  className = "", 
  style = {},
  text,
  variant = "user",
  hideOnMobile = true
}) => {
  const currentYear = new Date().getFullYear();
  const defaultText = variant === "admin" 
    ? `Copyright © BudgetMe Admin ${currentYear}`
    : `Copyright © BudgetMe ${currentYear}`;

  const footerClasses = [
    "sticky-footer",
    "bg-white",
    "mt-auto",
    hideOnMobile ? "d-none d-md-block" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <footer className={`${footerClasses} transition-all duration-300`} style={style}>
      <div className="container my-auto px-3">
        <div className="copyright text-center my-auto py-3">
          <span className="text-gray-600 text-xs md:text-sm">{text || defaultText}</span>
        </div>
      </div>
    </footer>
  );
};

// Memoize Footer component for performance
export default memo(Footer);