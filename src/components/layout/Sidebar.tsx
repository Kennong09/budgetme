import React, { useState, useEffect, useMemo, FC, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import "animate.css";
import { SidebarProps } from "../../types";
import { useClickOutside, useUserData } from "./shared/hooks";
import { UserProfile, NavigationMenu, QuickAccess } from "./shared/components";

interface NavItem {
  id: number;
  path: string;
  label: string;
  icon: string;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, onToggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const userInfo = useUserData();
  const sidebarRef = useRef<HTMLUListElement>(null);
  
  // Force a consistent style override to the sidebar
  useEffect(() => {
    // Apply style overrides after component mount and on any updates
    const applyNavStyles = () => {
      const navItems = document.querySelectorAll('.sidebar .nav-item .nav-link');
      navItems.forEach((item: any) => {
        item.style.color = '#ffffff';
        const icons = item.querySelectorAll('i');
        icons.forEach((icon: any) => {
          icon.style.color = '#ffffff';
        });
      });
    };
    
    // Run immediately and after a small delay to handle any style flashing
    applyNavStyles();
    const timer = setTimeout(applyNavStyles, 50);
    
    return () => clearTimeout(timer);
  }, [isOpen, activeItem]);

  useEffect(() => {
    // Set compact mode based on window size or sidebar state
    if (window.innerWidth < 992 && window.innerWidth >= 768) {
      setCompactMode(true);
    } else {
      setCompactMode(!isOpen && window.innerWidth >= 768);
    }
  }, [isOpen, user]); // Added user dependency to re-run when auth state changes
  
  // Update compact mode when sidebar toggles
  useEffect(() => {
    setCompactMode(!isOpen && window.innerWidth >= 768);
  }, [isOpen]);
  
  // Handle clicking outside of sidebar on mobile
  useClickOutside(sidebarRef, () => {
    if (isOpen && window.innerWidth < 768 && onToggleSidebar) {
      onToggleSidebar();
    }
  }, isOpen && window.innerWidth < 768);
  
  // Define navigation items with FontAwesome icons - removed subItems
  const navItems = useMemo<NavItem[]>(
    () => [
      {
        id: 1,
        path: "/dashboard",
        label: "Dashboard",
        icon: "fa-tachometer-alt",
      },
      {
        id: 2,
        path: "/transactions",
        label: "Transactions",
        icon: "fa-exchange-alt",
      },
      {
        id: 3,
        path: "/budgets",
        label: "Budgets",
        icon: "fa-wallet",
      },
      {
        id: 4,
        path: "/goals",
        label: "Goals",
        icon: "fa-bullseye",
      },
      {
        id: 5,
        path: "/family",
        label: "Family",
        icon: "fa-users",
      },
      {
        id: 6,
        path: "/predictions",
        label: "AI Predictions",
        icon: "fa-chart-line",
      },
      {
        id: 7,
        path: "/reports",
        label: "Reports",
        icon: "fa-chart-pie",
      },
      {
        id: 8,
        path: "/settings",
        label: "Settings",
        icon: "fa-cog",
      },
    ],
    []
  );

  // Update active item based on location
  useEffect(() => {
    const path = location.pathname;
    
    // Check main nav items
    const mainItem = navItems.find(item => 
      path === item.path || (path.startsWith(item.path) && item.path !== "/")
    );
    
    // If path matches a main item
    if (mainItem) {
      setActiveItem(mainItem.id);
    } else {
      // Default to Dashboard if no match found
      setActiveItem(1);
    }
  }, [location.pathname, navItems]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Force redirect to login page
      navigate("/login", { replace: true });
      // Close sidebar on mobile after action
      if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
        onToggleSidebar();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handle navigation item click
  const handleNavigationItemClick = (item: NavItem) => {
    setActiveItem(item.id);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
      onToggleSidebar();
    }
  };

  // Handle sidebar toggle button click
  const handleToggleSidebar = () => {
    if (onToggleSidebar) onToggleSidebar();
  };

  // Handle tooltip display
  const handleMouseEnter = (itemId: number, label: string, event: React.MouseEvent<HTMLLIElement>) => {
    // Tooltip is handled in NavigationMenu component
  };
  
  const handleMouseLeave = () => {
    // Tooltip is handled in NavigationMenu component
  };

  // Define quick access items
  const quickAccessItems = [
    { id: "add", path: "/transactions/add", label: "Add", icon: "fa-plus" },
    { id: "analytics", path: "/dashboard/analytics", label: "Analytics", icon: "fa-chart-bar" },
    { id: "goals", path: "/goals", label: "Goals", icon: "fa-flag" },
    { id: "budget", path: "/budgets", label: "Budget", icon: "fa-balance-scale" }
  ];

  return (
    <>
      <ul
        className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion 
          ${!isOpen && window.innerWidth >= 768 ? "toggled" : ""} 
          ${isMobile ? "mobile-sidebar" : ""}
          ${compactMode ? "sidebar-compact" : ""}`}
        id="accordionSidebar"
        ref={sidebarRef}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* User Profile Section */}
        <UserProfile 
          userInfo={userInfo}
          compactMode={compactMode}
          variant="user"
        />

        {/* Scrollable content area */}
        <div className="sidebar-content" style={{ flex: '1', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Navigation Menu */}
          <NavigationMenu
            items={navItems}
            activeItemId={activeItem}
            onItemClick={handleNavigationItemClick}
            compactMode={compactMode}
            onItemHover={handleMouseEnter}
            onItemLeave={handleMouseLeave}
            variant="user"
          />

          {/* Divider */}
          <hr className="sidebar-divider" />
          
          {/* Logout */}
          <li className="nav-item">
            <button 
              className="nav-link btn btn-link text-left w-100" 
              onClick={handleLogout}
              style={{ color: '#ffffff' }}
            >
              <i 
                className="fas fa-sign-out-alt fa-fw" 
                style={{ color: '#ffffff' }}
              ></i>
              {!compactMode && <span>Logout</span>}
            </button>
          </li>

          {/* Divider */}
          <hr className="sidebar-divider d-none d-md-block" />

          {/* Sidebar Toggler */}
          <div className="text-center d-none d-md-inline">
            <button 
              className="rounded-circle border-0 sidebar-toggle-btn" 
              id="sidebarToggle"
              onClick={handleToggleSidebar}
              style={{ 
                color: 'var(--light)', 
                background: 'var(--primary)' 
              }}
            >
              <i className={`fas ${isOpen ? "fa-angle-left" : "fa-angle-right"}`}></i>
              <span className="toggle-pulse-dot"></span>
            </button>
          </div>
          
          {/* Quick Access Section */}
          <QuickAccess
            items={quickAccessItems}
            compactMode={compactMode}
            variant="user"
          />
        </div>

        {/* Fixed Footer */}
        <div 
          className="sidebar-footer"
          style={{ 
            marginTop: 'auto',
            padding: '10px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            color: 'var(--light)',
            fontSize: compactMode ? '0.7rem' : '0.8rem',
            background: 'rgba(0,0,0,0.1)'
          }}
        >
          <div className="footer-content">
            {!compactMode ? (
              <>
                <p className="mb-1">&copy; {new Date().getFullYear()} BudgetMe</p>
                <p className="mb-0 text-white-50">Version 1.5.2</p>
              </>
            ) : (
              <p className="mb-0">
                <i className="fas fa-copyright"></i> {new Date().getFullYear()}
              </p>
            )}
          </div>
        </div>
      </ul>
      
      {/* CSS override to ensure consistent colors */}
      <style dangerouslySetInnerHTML={{ 
        __html: `
          /* Force primary theme colors with higher specificity and !important */
          #accordionSidebar, 
          #accordionSidebar.sidebar,
          .navbar-nav.sidebar.sidebar-dark.accordion,
          .navbar-nav.bg-gradient-primary {
            background: var(--primary) !important;
            background-image: linear-gradient(180deg, var(--primary) 10%, var(--primary-dark) 100%) !important;
          }
          
          .sidebar .nav-item .nav-link,
          #accordionSidebar .nav-item .nav-link {
            color: #ffffff !important;
            transition: background-color 0.2s ease !important;
          }
          
          .sidebar .nav-item .nav-link i,
          #accordionSidebar .nav-item .nav-link i {
            color: #ffffff !important;
          }
          
          .sidebar .nav-item .nav-link span,
          #accordionSidebar .nav-item .nav-link span {
            color: #ffffff !important;
          }
          
          .sidebar .nav-item.active .nav-link,
          #accordionSidebar .nav-item.active .nav-link {
            background-color: rgba(255, 255, 255, 0.1) !important;
            font-weight: bold !important;
          }
          
          .sidebar .nav-item .nav-link:hover,
          #accordionSidebar .nav-item .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          /* Make sure the sidebar brand elements are white */
          .sidebar-brand-text, 
          .sidebar-brand-icon i {
            color: #ffffff !important;
          }
          
          /* Force sidebar toggle button styling */
          .sidebar-toggle-btn {
            color: #ffffff !important;
            background: var(--primary) !important;
          }
          
          /* Force sidebar favorites styling */
          .sidebar-favorites .favorite-item,
          .sidebar-favorites .favorite-item span,
          .sidebar-favorites .favorite-item i {
            color: #ffffff !important;
          }
          
          /* Force footer text colors */
          .sidebar-footer,
          .sidebar-footer p,
          .sidebar-footer .footer-content {
            color: #ffffff !important;
          }
          
          /* Apply styles immediately without transition to prevent color flash */
          .sidebar * {
            transition-delay: 0s !important;
          }
        `
      }} />
    </>
  );
};

export default Sidebar;