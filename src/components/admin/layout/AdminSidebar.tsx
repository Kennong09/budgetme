import React, { useState, useEffect, useMemo, FC, useRef, useTransition } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import "animate.css";
import { isUserAdmin } from "../../../utils/adminHelpers";
import { useClickOutside, useUserData } from "../../layout/shared/hooks";
import { UserProfile, NavigationMenu, QuickAccess } from "../../layout/shared/components";

interface NavItem {
  id: number;
  path: string;
  label: string;
  icon: string;
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
  const userInfo = useUserData();
  const [isPending, startTransition] = useTransition();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const sidebarRef = useRef<HTMLUListElement>(null);
  
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
  useClickOutside(sidebarRef, () => {
    if (isOpen && window.innerWidth < 768 && onToggleSidebar) {
      onToggleSidebar();
    }
  }, isOpen && window.innerWidth < 768);
  
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

  // Handle navigation item click
  const handleNavigationItemClick = (item: NavItem) => {
    setActiveItem(item.id);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768 && isOpen && onToggleSidebar) {
      onToggleSidebar();
    }
  };

  // Define quick access items
  const quickAccessItems = [
    { id: "add-user", path: "/admin/users/add", label: "Add User", icon: "fa-user-plus" },
    { id: "analytics", path: "/admin/dashboard", label: "Analytics", icon: "fa-chart-bar" },
    { id: "settings", path: "/admin/settings", label: "Settings", icon: "fa-cog" },
    { id: "reports", path: "/admin/reports", label: "Reports", icon: "fa-file-alt" }
  ];

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
        {/* User Profile Section */}
        <UserProfile 
          userInfo={userInfo}
          compactMode={compactMode}
          variant="admin"
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
            variant="admin"
          />

          {/* Divider */}
          <hr className="sidebar-divider" />
          
          {/* Back to user dashboard */}
          <li className="nav-item">
            <button 
              className="nav-link btn btn-link text-left w-100" 
              onClick={returnToUserView}
            >
              <i className="fas fa-user fa-fw"></i>
              {!compactMode && <span>User Dashboard</span>}
            </button>
          </li>
          
          {/* Logout */}
          <li className="nav-item">
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
          
          {/* Quick Access Section */}
          <QuickAccess
            items={quickAccessItems}
            compactMode={compactMode}
            heading="Quick Access"
            variant="admin"
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