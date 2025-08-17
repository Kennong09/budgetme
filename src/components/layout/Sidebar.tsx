import React, { useState, useEffect, useMemo, FC, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import "animate.css";
import { SidebarProps } from "../../types";
import { getCurrentUserData } from "../../data/mockData";

// Add CSS styles for consistent navigation item colors
const navItemStyles = {
  navLink: {
    color: 'var(--light)',
    transition: 'all 0.2s ease'
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  }
};

interface NavItem {
  id: number;
  path: string;
  label: string;
  icon: string;
}

interface UserInfo {
  name: string;
  email: string;
  profilePicture?: string;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, onToggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<{show: boolean, id: number | null, label: string}>({
    show: false,
    id: null,
    label: ""
  });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    email: "",
    profilePicture: ""
  });
  const sidebarRef = useRef<HTMLUListElement>(null);
  const navRefs = useRef<{[key: number]: HTMLLIElement | null}>({});
  
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
    // Get user data from mock data service - load immediately
    loadUserData();
    
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
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        window.innerWidth < 768 && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node)
      ) {
        if (onToggleSidebar) onToggleSidebar();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggleSidebar]);
  
  const loadUserData = () => {
    // Check if user is authenticated first
    if (!user) {
      // If not authenticated, clear user info
      setUserInfo({
        name: "",
        email: "",
        profilePicture: "../images/placeholder.png"
      });
      return;
    }
    
    // Use auth user data if available
    if (user) {
      const userData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
        email: user.email || "user@example.com",
        profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png"
      };
      setUserInfo(userData);
      return;
    }
    
    // Fallback to mock data only if authenticated but missing details
    const userData = getCurrentUserData();
    if (userData && userData.user) {
      // Cast userData.user to any to avoid type errors with properties
      const mockUser = userData.user as any;
      setUserInfo({
        name: mockUser.name || mockUser.full_name || mockUser.username || "User",
        email: mockUser.email || "user@example.com",
        profilePicture: mockUser.profilePicture || mockUser.avatar || "../images/placeholder.png"
      });
    }
  };
  
  // Handle sidebar toggle button click
  const handleToggleSidebar = () => {
    if (onToggleSidebar) onToggleSidebar();
  };
  
  // Handle tooltip display
  const handleMouseEnter = (itemId: number, label: string, event: React.MouseEvent<HTMLLIElement>) => {
    if (compactMode) {
      const targetElement = event.currentTarget;
      const rect = targetElement.getBoundingClientRect();
      setTooltipPosition({ 
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX + 10
      });
      setShowTooltip({ show: true, id: itemId, label });
    }
  };
  
  const handleMouseLeave = () => {
    setShowTooltip({ show: false, id: null, label: "" });
  };

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
        {/* Sidebar - Brand */}
        <Link
          className="sidebar-brand d-flex align-items-center justify-content-center"
          to="/"
        >
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-wallet"></i>
          </div>
          <div className="sidebar-brand-text mx-3">
            {compactMode ? "BM" : "BudgetMe"}
          </div>
        </Link>
        
        {/* User Profile Card */}
        <div className={`user-profile-compact text-center my-2 
          ${compactMode ? "compact-profile" : "animate__animated animate__fadeIn"}`}>
          <img 
            src={userInfo.profilePicture}
            alt={userInfo.name}
            className="img-profile rounded-circle mx-auto mb-2 border-2 shadow-sm"
            style={{ 
              width: compactMode ? "40px" : "65px", 
              height: compactMode ? "40px" : "65px", 
              border: "2px solid var(--primary-light, rgba(255,255,255,0.3))" 
            }}
          />
          <div className="sidebar-user-details">
            {!compactMode && (
              <>
                <div className="text-white font-weight-bold">{userInfo.name}</div>
                <div className="text-white-50 small">{userInfo.email}</div>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="sidebar-divider my-0" />

        {/* Scrollable content area */}
        <div className="sidebar-content" style={{ flex: '1', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Nav Items */}
          {navItems.map((item) => (
            <li
              key={item.id}
              ref={el => navRefs.current[item.id] = el}
              className={`nav-item ${activeItem === item.id ? "active" : ""}`}
              onMouseEnter={(e) => handleMouseEnter(item.id, item.label, e)}
              onMouseLeave={handleMouseLeave}
              style={activeItem === item.id ? navItemStyles.activeNavItem : {}}
            >
              <Link
                className="nav-link"
                to={item.path}
                onClick={() => {
                  setActiveItem(item.id);
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
                    onToggleSidebar();
                  }
                }}
                style={{
                  color: '#ffffff !important', // Force white color
                  transition: 'all 0.2s ease',
                }}
              >
                <i 
                  className={`fas ${item.icon} fa-fw`} 
                  style={{ color: '#ffffff !important' }} // Force white color for icon
                ></i>
                {!compactMode && <span style={{ color: '#ffffff' }}>{item.label}</span>}
                {activeItem === item.id && (
                  <span className="position-absolute right-0 mr-3 pulse-dot"></span>
                )}
              </Link>
            </li>
          ))}

          {/* Divider */}
          <hr className="sidebar-divider" />
          
          {/* Logout */}
          <li 
            className="nav-item"
            onMouseEnter={(e) => handleMouseEnter(102, "Logout", e)}
            onMouseLeave={handleMouseLeave}
          >
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
          
          {/* Favorite Section - Quick Access */}
          {!compactMode && (
            <>
              <hr className="sidebar-divider" />
              <div className="sidebar-heading">Favorites</div>
              <div className="sidebar-favorites px-3 py-2">
                <div className="d-flex flex-wrap justify-content-around">
                  <Link to="/transactions/add" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-plus"></i>
                    </div>
                    <span>Add</span>
                  </Link>
                  <Link to="/dashboard/analytics" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-chart-bar"></i>
                    </div>
                    <span>Analytics</span>
                  </Link>
                  <Link to="/goals" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-flag"></i>
                    </div>
                    <span>Goals</span>
                  </Link>
                  <Link to="/budgets" className="favorite-item">
                    <div className="circle-icon">
                      <i className="fas fa-balance-scale"></i>
                    </div>
                    <span>Budget</span>
                  </Link>
                </div>
              </div>
            </>
          )}
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
      
      {/* Tooltip for compact mode */}
      {showTooltip.show && compactMode && (
        <div 
          className="sidebar-tooltip" 
          style={{ 
            top: tooltipPosition.top, 
            left: tooltipPosition.left,
            background: 'var(--primary)',
            color: 'var(--light)' 
          }}
        >
          {showTooltip.label}
        </div>
      )}

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