import React, { FC } from "react";

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
    <footer className={footerClasses} style={style}>
      <div className="container my-auto">
        <div className="copyright text-center my-auto">
          <span>{text || defaultText}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;