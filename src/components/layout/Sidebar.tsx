import React, { useState, useEffect, useMemo, FC, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import "animate.css";
import { SidebarProps } from "../../types";
import { getCurrentUserData } from "../../data/mockData";
import { HelpButton } from "../../components/onboarding";

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
              border: "2px solid rgba(255,255,255,0.3)" 
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

        {/* Nav Items */}
        {navItems.map((item) => (
          <li
            key={item.id}
            ref={el => navRefs.current[item.id] = el}
            className={`nav-item ${activeItem === item.id ? "active" : ""}`}
            onMouseEnter={(e) => handleMouseEnter(item.id, item.label, e)}
            onMouseLeave={handleMouseLeave}
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
            >
              <i className={`fas ${item.icon} fa-fw`}></i>
              {!compactMode && <span>{item.label}</span>}
              {activeItem === item.id && !compactMode && (
                <span className="position-absolute right-0 mr-3 pulse-border"></span>
              )}
            </Link>
          </li>
        ))}

        {/* Divider */}
        <hr className="sidebar-divider" />
        
        {/* Help Button */}
        <li 
          className="nav-item"
          onMouseEnter={(e) => handleMouseEnter(101, "Help & Tour", e)}
          onMouseLeave={handleMouseLeave}
        >
          <HelpButton compactMode={compactMode} />
        </li>
        
        {/* Logout */}
        <li 
          className="nav-item"
          onMouseEnter={(e) => handleMouseEnter(102, "Logout", e)}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            className="nav-link btn btn-link text-left w-100" 
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt fa-fw"></i>
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
            style={{ color: 'var(--light)', background: 'var(--primary)' }}
          >
            <i className={`fas ${isOpen ? "fa-angle-left" : "fa-angle-right"}`}></i>
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
      </ul>
      
      {/* Tooltip for compact mode */}
      {showTooltip.show && compactMode && (
        <div 
          className="sidebar-tooltip" 
          style={{ 
            top: tooltipPosition.top, 
            left: tooltipPosition.left 
          }}
        >
          {showTooltip.label}
        </div>
      )}
    </>
  );
};

export default Sidebar; 