import React, { useState, useEffect, useMemo, FC, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import "animate.css";
import { isUserAdmin } from "../../../utils/adminHelpers";

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

interface AdminSidebarProps {
  isOpen: boolean;
  onToggleSidebar: () => void;
  isMobile: boolean;
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
    profilePicture: ""
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLUListElement>(null);
  const navRefs = useRef<{[key: number]: HTMLLIElement | null}>({});

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          // If not an admin, redirect to normal dashboard
          navigate('/dashboard');
        }
      }
    };
    
    checkAdmin();
    loadUserData();
    
    // Set compact mode based on window size or sidebar state
    if (window.innerWidth < 992 && window.innerWidth >= 768) {
      setCompactMode(true);
    } else {
      setCompactMode(!isOpen && window.innerWidth >= 768);
    }
  }, [isOpen, user, navigate]);
  
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
    if (!user) {
      setUserInfo({
        name: "",
        email: "",
        profilePicture: "../images/placeholder.png"
      });
      return;
    }
    
    // Use auth user data
    const userData = {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin",
      email: user.email || "admin@example.com",
      profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png"
    };
    setUserInfo(userData);
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
        label: "Admin Dashboard",
        icon: "fa-tachometer-alt",
      },
      {
        id: 2,
        path: "/admin/users",
        label: "User Management",
        icon: "fa-users-cog",
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
        path: "/admin/transactions",
        label: "Transactions",
        icon: "fa-exchange-alt",
      },
      {
        id: 6,
        path: "/admin/family",
        label: "Family Groups",
        icon: "fa-users",
      },
      {
        id: 7,
        path: "/admin/predictions",
        label: "AI Predictions",
        icon: "fa-chart-line",
      },
      {
        id: 8,
        path: "/admin/reports",
        label: "System Reports",
        icon: "fa-chart-pie",
      },
      {
        id: 9,
        path: "/admin/settings",
        label: "Admin Settings",
        icon: "fa-cog",
      },
    ],
    []
  );

  // Update active item based on location
  useEffect(() => {
    const path = location.pathname;
    
    const mainItem = navItems.find(item => 
      path === item.path || (path.startsWith(item.path) && item.path !== "/")
    );
    
    if (mainItem) {
      setActiveItem(mainItem.id);
    } else {
      setActiveItem(1);
    }
  }, [location.pathname, navItems]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
      if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
        onToggleSidebar();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Return to user dashboard
  const returnToUserView = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <ul
        className={`navbar-nav bg-gradient-danger sidebar sidebar-dark accordion 
          ${!isOpen && window.innerWidth >= 768 ? "toggled" : ""} 
          ${isMobile ? "mobile-sidebar" : ""}
          ${compactMode ? "sidebar-compact" : ""}`}
        id="adminSidebar"
        ref={sidebarRef}
        style={{ background: 'linear-gradient(180deg, #e74a3b 10%, #be2617 100%)' }}
      >
        {/* Sidebar - Brand */}
        <Link
          className="sidebar-brand d-flex align-items-center justify-content-center"
          to="/"
        >
          <div className="sidebar-brand-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="sidebar-brand-text mx-3">
            {compactMode ? "BM-A" : "BudgetMe Admin"}
          </div>
        </Link>
        
        {/* User Profile Card */}
        <div className={`user-profile-compact text-center my-2 
          ${compactMode ? "compact-profile" : "animate__animated animate__fadeIn"}`}>
          <img 
            src={userInfo.profilePicture}
            alt={userInfo.name}
            className="img-profile rounded-circle mx-auto mb-2 border-2 shadow-sm"
            style={{ width: compactMode ? "30px" : "60px", height: compactMode ? "30px" : "60px" }}
          />
          {!compactMode && (
            <div className="user-info text-white">
              <h6 className="mb-0">{userInfo.name}</h6>
              <p className="small">{userInfo.email}</p>
              <div className="badge badge-light mb-2">Administrator</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="sidebar-divider my-0" />

        {/* Nav Items */}
        {navItems.map((item) => (
          <li
            key={item.id}
            className={`nav-item ${activeItem === item.id ? "active" : ""}`}
            onMouseEnter={(e) => handleMouseEnter(item.id, item.label, e)}
            onMouseLeave={handleMouseLeave}
            ref={(el) => {
              if (el) {
                const refs = navRefs.current;
                refs[item.id] = el;
              }
            }}
          >
            <Link className="nav-link" to={item.path}>
              <i className={`fas ${item.icon}`}></i>
              <span className={compactMode ? "d-none" : ""}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}

        {/* Divider */}
        <hr className="sidebar-divider" />

        {/* Back to user dashboard */}
        <li className="nav-item">
          <a 
            className="nav-link" 
            href="#!" 
            onClick={(e) => {
              e.preventDefault();
              returnToUserView();
            }}
          >
            <i className="fas fa-user"></i>
            <span className={compactMode ? "d-none" : ""}>User View</span>
          </a>
        </li>

        {/* Logout */}
        <li className="nav-item">
          <a 
            className="nav-link" 
            href="#!" 
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className={compactMode ? "d-none" : ""}>Logout</span>
          </a>
        </li>

        {/* Sidebar Toggler (Sidebar) */}
        <div className="text-center d-none d-md-inline mt-3">
          <button
            className="rounded-circle border-0"
            id="sidebarToggle"
            onClick={onToggleSidebar}
          >
            <i className={`fas ${isOpen ? "fa-chevron-left" : "fa-chevron-right"}`}></i>
          </button>
        </div>
      </ul>

      {/* Tooltips for compact mode */}
      {showTooltip.show && compactMode && (
        <div 
          className="sidebar-tooltip" 
          style={{ 
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            position: 'fixed',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '4px',
            zIndex: 1070,
          }}
        >
          {showTooltip.label}
        </div>
      )}
    </>
  );
};

export default AdminSidebar; 