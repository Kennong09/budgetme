import React, { useState, useEffect, useMemo, FC, useRef, useTransition } from "react";
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

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onToggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, loading: authLoading } = useAuth();
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
  const [isPending, startTransition] = useTransition();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const sidebarRef = useRef<HTMLUListElement>(null);
  const navRefs = useRef<{[key: number]: HTMLLIElement | null}>({});
  
  // Use a single loading state for better UX
  const isLoading = authLoading || isCheckingAdmin || isPending;
  
  // Load sidebar state from localStorage on initial mount
  useEffect(() => {
    try {
      const savedCompactMode = localStorage.getItem('adminSidebarCompact');
      if (savedCompactMode !== null) {
        setCompactMode(savedCompactMode === 'true');
      } else if (window.innerWidth < 992 && window.innerWidth >= 768) {
        setCompactMode(true);
        localStorage.setItem('adminSidebarCompact', 'true');
      } else {
        setCompactMode(!isOpen && window.innerWidth >= 768);
        localStorage.setItem('adminSidebarCompact', (!isOpen && window.innerWidth >= 768).toString());
      }
    } catch (e) {
      console.error("Error accessing localStorage:", e);
    }
    
    // Load user data immediately without waiting for admin check
    loadUserData();
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // Check admin status only once on initial mount or when user changes
  useEffect(() => {
    // Skip check if already completed or auth is loading
    if (adminCheckComplete || authLoading) return;
    
    // Skip admin check if user is not authenticated
    if (!user) {
      startTransition(() => {
        setIsCheckingAdmin(false);
        setAdminCheckComplete(true);
      });
      return;
    }
    
    // Set loading state
    setIsCheckingAdmin(true);
    
    // Create cleanup variable
    let isMounted = true;
    
    // Check admin status
    const checkAdmin = async () => {
      try {
        // Perform admin check outside state updates
        const adminStatus = await isUserAdmin();
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        startTransition(() => {
          setIsCheckingAdmin(false);
          setAdminCheckComplete(true);
          
          if (!adminStatus) {
            // If not admin, redirect once to avoid loops
            navigate('/admin/login?access_denied=true', { replace: true });
          }
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        startTransition(() => {
          setIsCheckingAdmin(false);
          setAdminCheckComplete(true);
        });
      }
    };
    
    checkAdmin();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, navigate, adminCheckComplete, authLoading]);
  
  // Update localStorage when sidebar state changes
  useEffect(() => {
    try {
      localStorage.setItem('adminSidebarCompact', compactMode.toString());
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
  }, [compactMode]);
  
  // Update compact mode when sidebar toggles, but persist in localStorage
  useEffect(() => {
    const newCompactMode = !isOpen && window.innerWidth >= 768;
    setCompactMode(newCompactMode);
    
    try {
      localStorage.setItem('adminSidebarCompact', newCompactMode.toString());
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
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
  
  // Load user data from auth context
  const loadUserData = () => {
    // Check if user is authenticated first
    if (!user) {
      // If not authenticated, clear user info
      startTransition(() => {
        setUserInfo({
          name: "",
          email: "",
          profilePicture: "../images/placeholder.png"
        });
      });
      return;
    }
    
    // Use auth user data if available
    if (user) {
      const userData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin",
        email: user.email || "admin@example.com",
        profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png"
      };
      startTransition(() => {
        setUserInfo(userData);
      });
      return;
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
        path: "/admin/users",
        label: "User Management",
        icon: "fa-users-cog",
      },
      {
        id: 3,
        path: "/admin/transactions",
        label: "Transactions",
        icon: "fa-exchange-alt",
      },
      {
        id: 4,
        path: "/admin/budgets",
        label: "Budgets",
        icon: "fa-wallet",
      },
      {
        id: 5,
        path: "/admin/goals",
        label: "Goals",
        icon: "fa-bullseye",
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
        label: "Reports",
        icon: "fa-chart-pie",
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
      path === item.path || (path.startsWith(item.path) && item.path !== "/")
    );
    
    // If path matches a main item
    if (mainItem) {
      startTransition(() => {
        setActiveItem(mainItem.id);
      });
    } else {
      // Default to Dashboard if no match found
      startTransition(() => {
        setActiveItem(1);
      });
    }
  }, [location.pathname, navItems]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Force redirect to login page
      navigate("/admin/login", { replace: true });
      // Close sidebar on mobile after action
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
    // Close sidebar on mobile after action
    if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
      onToggleSidebar();
    }
  };

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }

  return (
    <>
      <ul
        className={`navbar-nav bg-gradient-danger sidebar sidebar-dark accordion 
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
          to="/admin/dashboard"
        >
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="sidebar-brand-text mx-3">
            {compactMode ? "BM-A" : "BudgetMe Admin"}
          </div>
        </Link>
        
        {/* User Profile Card */}
        <div className={`user-profile-compact text-center my-2 
          ${compactMode ? "compact-profile" : ""}`}>
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
                <div className="mt-1">
                  <span className="badge badge-light">Administrator</span>
                </div>
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
          
          {/* Back to user dashboard */}
          <li 
            className="nav-item"
            onMouseEnter={(e) => handleMouseEnter(101, "User Dashboard", e)}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              className="nav-link btn btn-link text-left w-100" 
              onClick={returnToUserView}
            >
              <i className="fas fa-user fa-fw"></i>
              {!compactMode && <span>User Dashboard</span>}
            </button>
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
              style={{ color: 'var(--light)', background: 'var(--danger)' }}
            >
              <i className={`fas ${isOpen ? "fa-angle-left" : "fa-angle-right"}`}></i>
            </button>
          </div>
          
          {/* Admin Quick Access */}
          {!compactMode && (
            <>
              <hr className="sidebar-divider" />
              <div className="sidebar-heading">Quick Access</div>
              <div className="sidebar-favorites px-3 py-2">
                <div className="d-flex flex-wrap justify-content-around">
                  <Link to="/admin/users/add" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-user-plus"></i>
                    </div>
                    <span>Add User</span>
                  </Link>
                  <Link to="/admin/dashboard" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-chart-bar"></i>
                    </div>
                    <span>Analytics</span>
                  </Link>
                  <Link to="/admin/settings" className="favorite-item mb-2">
                    <div className="circle-icon">
                      <i className="fas fa-cog"></i>
                    </div>
                    <span>Settings</span>
                  </Link>
                  <Link to="/admin/reports" className="favorite-item">
                    <div className="circle-icon">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <span>Reports</span>
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
                <p className="mb-1">&copy; {new Date().getFullYear()} BudgetMe Admin</p>
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
            left: tooltipPosition.left 
          }}
        >
          {showTooltip.label}
        </div>
      )}
      
      {/* CSS override to ensure consistent colors */}
      <style dangerouslySetInnerHTML={{ 
        __html: `
          /* Force danger theme colors with higher specificity and !important */
          #accordionSidebar, 
          #accordionSidebar.sidebar,
          .navbar-nav.sidebar.sidebar-dark.accordion,
          .navbar-nav.bg-gradient-danger {
            background: var(--danger) !important;
            background-image: linear-gradient(180deg, var(--danger) 10%, var(--danger-dark, #c0392b) 100%) !important;
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
            background: var(--danger) !important;
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

export default AdminSidebar; 