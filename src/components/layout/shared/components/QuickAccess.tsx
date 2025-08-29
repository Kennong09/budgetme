import React, { FC } from "react";
import { Link } from "react-router-dom";

export interface QuickAccessItem {
  id: string;
  path: string;
  label: string;
  icon: string;
}

export interface QuickAccessProps {
  items: QuickAccessItem[];
  compactMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  heading?: string;
  variant?: "user" | "admin";
}

const QuickAccess: FC<QuickAccessProps> = ({
  items,
  compactMode,
  className = "",
  style = {},
  heading = "Quick Access",
  variant = "user"
}) => {
  if (compactMode) {
    return null;
  }

  return (
    <>
      <hr className="sidebar-divider" />
      <div className="sidebar-heading">{heading}</div>
      <div className={`sidebar-favorites px-3 py-2 ${className}`} style={style}>
        <div className="d-flex flex-wrap justify-content-around">
          {items.map((item) => (
            <Link 
              key={item.id} 
              to={item.path} 
              className="favorite-item mb-2"
            >
              <div className="circle-icon">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default QuickAccess;