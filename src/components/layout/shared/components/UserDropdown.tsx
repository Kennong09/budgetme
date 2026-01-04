import React, { FC, memo, useMemo } from "react";
import { Link } from "react-router-dom";

export interface UserInfo {
  name: string;
  email: string;
  profilePicture?: string;
}

export interface UserDropdownProps {
  userInfo: UserInfo;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
  className?: string;
  style?: React.CSSProperties;
  variant?: "user" | "admin";
}

const UserDropdown: FC<UserDropdownProps> = ({
  userInfo,
  isOpen,
  onToggle,
  onLogout,
  className = "",
  style = {},
  variant = "user"
}) => {
  const isUserVariant = variant === "user";
  
  const userLinks = [
    { path: "/profile", icon: "fa-user", label: "Profile" },
    { path: "/settings", icon: "fa-cogs", label: "Settings" },
    { path: "/help", icon: "fa-question-circle", label: "Help & Support" }
  ];

  const adminLinks = [
    { path: "/dashboard", icon: "fa-user", label: "User Dashboard" },
    { path: "/admin/settings", icon: "fa-cogs", label: "Admin Settings" }
  ];

  const links = isUserVariant ? userLinks : adminLinks;

  // Memoize rendered links
  const renderedLinks = useMemo(() => (
    links.map((link) => (
      <Link 
        key={link.path} 
        className="dropdown-item flex items-center px-4 py-2 hover:bg-gray-50 transition-colors duration-150" 
        to={link.path}
      >
        <i className={`fas ${link.icon} fa-sm fa-fw mr-3 text-gray-400`}></i>
        <span className="text-sm">{link.label}</span>
      </Link>
    ))
  ), [links]);

  return (
    <li className={`nav-item dropdown no-arrow ${className}`} style={style}>
      <button
        className="nav-link dropdown-toggle flex items-center px-2 py-1 hover:bg-gray-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        type="button"
        id="userDropdown"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {/* Name hidden - display only avatar */}
        <img
          className="img-profile rounded-circle border-2 shadow-sm ring-2 ring-gray-100"
          src={userInfo.profilePicture}
          alt={userInfo.name}
          style={{ width: "32px", height: "32px" }}
        />
      </button>
      
      {/* Dropdown - User Information */}
      {isOpen && (
        <div
          className="dropdown-menu dropdown-menu-right shadow animated--grow-in show position-absolute"
          aria-labelledby="userDropdown"
          style={{ width: "calc(100vw - 2rem)", maxWidth: "300px" }}
        >
          <div className="dropdown-item-user px-3 py-2 d-flex align-items-center">
            <div className="mr-3">
              <img
                src={userInfo.profilePicture}
                alt={userInfo.name}
                className="rounded-circle"
                style={{ width: "40px", height: "40px" }}
              />
            </div>
            <div>
              <div className="font-weight-bold mb-0">{userInfo.name}</div>
              <div className="text-muted small">{userInfo.email}</div>
              {variant === "admin" && (
                <div className="mt-1">
                  <span className="badge badge-light">Administrator</span>
                </div>
              )}
            </div>
          </div>
          <div className="dropdown-divider"></div>
          
          {renderedLinks}
          
          <div className="dropdown-divider"></div>
          <button
            className="dropdown-item flex items-center px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
            type="button"
            onClick={onLogout}
          >
            <i className="fas fa-sign-out-alt fa-sm fa-fw mr-3"></i>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      )}
    </li>
  );
};

// Memoize UserDropdown component for performance
export default memo(UserDropdown);