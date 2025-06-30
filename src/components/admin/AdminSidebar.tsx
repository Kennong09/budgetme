import React, { useState, useEffect, useMemo, FC, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import "animate.css";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

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
  role?: string;
}

const AdminSidebar: FC<AdminSidebarProps> = ({ isOpen, onToggleSidebar, isMobile }) => {
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
    profilePicture: "",
    role: ""
  });
  const sidebarRef = useRef<HTMLUListElement>(null);
  const navRefs = useRef<{[key: number]: HTMLLIElement | null}>({});

  useEffect(() => {
    // Load user data with admin role check
    loadUserData();
    
    // Set compact mode based on window size or sidebar state
    if (window.innerWidth < 992 && window.innerWidth >= 768) {
      setCompactMode(true);
    } else {
      setCompactMode(!isOpen && window.innerWidth >= 768);
    }
  }, [isOpen, user]);
  
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
  
  const loadUserData = async () => {
    // Check if user is authenticated
    if (!user) {
      setUserInfo({
        name: "",
        email: "",
        profilePicture: "../images/placeholder.png",
        role: ""
      });
      return;
    }
    
    try {
      // Get user data from Supabase, including role
      const { data: profile, error } = await (window as any).supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      const userData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin",
        email: user.email || "admin@example.com",
        profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png",
        role: profile?.role || "user"
      };
      
      setUserInfo(userData);
      
      // Redirect if not admin
      if (userData.role !== 'admin') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error loading user data:", error);
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

  // Define navigation items for admin panel
  const navItems = useMemo<NavItem[]>(
    () => [
      {
        id: 1,
        path: "/admin/dashboard",
        label: "Dashboard",
        icon: "fa-tachometer-alt",
      },
      {
        id: 2,
        path: "/admin/transactions",
        label: "Transactions",
        icon: "fa-exchange-alt",
      },
      {
        id: 3,
        path: "/admin/budgets",
        label: "Budgets",
        icon: "fa-wallet",
      },
      {
        id: 4,
        path: "/admin/goals",
        label: "Goals",
        icon: "fa-bullseye",
      },
      {
        id: 5,
        path: "/admin/family",
        label: "Family Groups",
        icon: "fa-users",
      },
      {
        id: 6,
        path: "/admin/predictions",
        label: "AI Predictions",
        icon: "fa-chart-line",
      },
      {
        id: 7,
        path: "/admin/reports",
        label: "Reports",
        icon: "fa-chart-pie",
      },
      {
        id: 8,
        path: "/admin/users",
        label: "User Management",
        icon: "fa-user-cog",
      },
      {
        id: 9,
        path: "/admin/settings",
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
      path === item.path || path.startsWith(item.path)
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
        className={`navbar-nav bg-gradient-danger sidebar sidebar-dark accordion 
          ${!isOpen && window.innerWidth >= 768 ? "toggled" : ""} 
          ${isMobile ? "mobile-sidebar" : ""}
          ${compactMode ? "sidebar-compact" : ""}`}
        id="accordionSidebar"
        ref={sidebarRef}
      >
        {/* Sidebar - Brand */}
        <Link
          className="sidebar-brand d-flex align-items-center justify-content-center"
          to="/admin/dashboard"
        >
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="sidebar-brand-text mx-3">
            {compactMode ? "BM" : "Admin Panel"}
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
                <div className="badge badge-light mt-1">Admin</div>
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

        {/* Return to User Dashboard */}
        <li 
          className="nav-item"
          onMouseEnter={(e) => handleMouseEnter(103, "User Dashboard", e)}
          onMouseLeave={handleMouseLeave}
        >
          <Link
            className="nav-link"
            to="/dashboard"
          >
            <i className="fas fa-user fa-fw"></i>
            {!compactMode && <span>User Dashboard</span>}
          </Link>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider d-none d-md-block" />

        {/* Sidebar Toggler */}
        <div className="text-center d-none d-md-inline">
          <button 
            className="rounded-circle border-0 sidebar-toggle-btn" 
            id="sidebarToggle"
            onClick={handleToggleSidebar}
            style={{ color: 'var(--primary)', background: '#ffffff' }}
          >
            <i className={`fas ${isOpen ? "fa-angle-left" : "fa-angle-right"}`}></i>
          </button>
        </div>
        
        {/* Admin Actions - Quick Access */}
        {!compactMode && (
          <>
            <hr className="sidebar-divider" />
            <div className="sidebar-heading">Admin Actions</div>
            <div className="sidebar-favorites px-3 py-2">
              <div className="d-flex flex-wrap justify-content-around">
                <Link to="/admin/users/add" className="favorite-item mb-2">
                  <div className="circle-icon">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <span>Add User</span>
                </Link>
                <Link to="/admin/reports/export" className="favorite-item mb-2">
                  <div className="circle-icon">
                    <i className="fas fa-file-export"></i>
                  </div>
                  <span>Export</span>
                </Link>
                <Link to="/admin/settings/system" className="favorite-item mb-2">
                  <div className="circle-icon">
                    <i className="fas fa-server"></i>
                  </div>
                  <span>System</span>
                </Link>
                <Link to="/admin/logs" className="favorite-item">
                  <div className="circle-icon">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <span>Logs</span>
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

export default AdminSidebar; 