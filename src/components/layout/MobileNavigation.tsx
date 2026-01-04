import { FC, memo, useMemo } from "react";
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
  
  // Memoize the rendered nav items
  const renderedNavItems = useMemo(() => (
    navItems.map((item) => (
      <Link
        key={item.path}
        to={item.path}
        className={`mobile-nav-item flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 ease-in-out ${isActive(item.path) ? "active text-purple-600 font-semibold" : "text-gray-600 hover:text-purple-500"}`}
      >
        <i className={`fas ${item.icon} text-lg mb-1 transition-transform duration-200 ${isActive(item.path) ? "scale-110" : ""}`}></i>
        <span className="text-xs">{item.label}</span>
      </Link>
    ))
  ), [navItems, currentPath]);

  return (
    <div className="mobile-bottom-nav d-md-none fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50 flex items-center justify-around py-1 safe-area-bottom">
      {renderedNavItems}
      
      {/* Add subtle gradient overlay */}
      <style dangerouslySetInnerHTML={{ 
        __html: `
          .mobile-bottom-nav {
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
          }
          
          .mobile-bottom-nav .mobile-nav-item.active {
            background: linear-gradient(to top, rgba(147, 51, 234, 0.05) 0%, transparent 100%);
          }
          
          /* Safe area for iPhones with notches */
          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
          
          /* Smooth transitions */
          .mobile-nav-item {
            min-width: 60px;
            text-decoration: none;
          }
        `
      }} />
    </div>
  );
};

// Memoize MobileNavigation component for performance
export default memo(MobileNavigation);