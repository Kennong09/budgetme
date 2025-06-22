import React, { FC } from "react";
import { Link, useLocation } from "react-router-dom";

interface MobileNavigationProps {}

const MobileNavigation: FC<MobileNavigationProps> = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Define navigation items
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "fa-tachometer-alt" },
    { path: "/transactions", label: "Transactions", icon: "fa-exchange-alt" },
    { path: "/budgets", label: "Budgets", icon: "fa-wallet" },
    { path: "/goals", label: "Goals", icon: "fa-bullseye" }
  ];
  
  // Check if a path is active
  const isActive = (path: string) => {
    return currentPath === path || (path !== "/dashboard" && currentPath.startsWith(path));
  };
  
  return (
    <div className="mobile-bottom-nav d-md-none">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`mobile-nav-item ${isActive(item.path) ? "active" : ""}`}
        >
          <i className={`fas ${item.icon}`}></i>
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileNavigation; 