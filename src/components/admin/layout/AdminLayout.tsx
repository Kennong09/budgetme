import React, { useState, useEffect, FC, ReactNode, useTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import Meta from "../../layout/Meta";
import { isUserAdmin } from "../../../utils/adminHelpers";
import "../admin.css";
import { useResize } from "../../layout/shared/hooks";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  hideNav?: boolean; // Add this prop to control visibility of navigation elements
}

const AdminLayout: FC<AdminLayoutProps> = ({ children, title, hideNav = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Get sidebar state from localStorage or default to true on desktop
    try {
      const savedState = localStorage.getItem('adminSidebarOpen');
      // If we have a saved state, use it, otherwise default based on screen size
      return savedState !== null ? savedState === 'true' : window.innerWidth >= 768;
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return window.innerWidth >= 768; // Default to open on desktop
    }
  });
  const resizeState = useResize(768, 992);
  const isMobile = resizeState.isMobile;
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, loading: authLoading } = useAuth();
  
  // Use a single loading state for better UX
  const isLoading = authLoading || loading || isPending;
  
  // Check if user is admin only when auth is ready and user is available
  useEffect(() => {
    // Skip if already completed or still loading auth
    if (adminCheckComplete || authLoading) return;
    
    // Skip admin check if user is not authenticated
    if (!user) {
      startTransition(() => {
        setLoading(false);
        setAdminCheckComplete(true);
      });
      navigate('/admin/login', { replace: true });
      return;
    }
    
    let isMounted = true;
    
    const checkAdmin = async () => {
      try {
        // Perform admin check outside of state update
        const adminStatus = await isUserAdmin();
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        // Use startTransition for state updates
        startTransition(() => {
          setIsAdmin(adminStatus);
          setLoading(false);
          setAdminCheckComplete(true);
        
          if (!adminStatus) {
            navigate('/admin/login?access_denied=true', { replace: true });
          }
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        // Use startTransition for state updates
        startTransition(() => {
          setIsAdmin(false);
          setLoading(false);
          setAdminCheckComplete(true);
          navigate('/admin/login?error=true', { replace: true });
        });
      }
    };
    
    // Call the async function
    checkAdmin();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, navigate, adminCheckComplete, authLoading]);
  
  // Update sidebar state on resize and save to localStorage
  useEffect(() => {
    if (resizeState.isMobile) {
      // On mobile, always ensure sidebar is closed by default
      setSidebarOpen(false);
      try {
        localStorage.setItem('adminSidebarOpen', 'false');
      } catch (e) {
        console.error("Error writing to localStorage:", e);
      }
    }
  }, [resizeState.isMobile]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Toggle sidebar visibility and save state to localStorage
  const toggleSidebar = () => {
    setSidebarOpen(prevState => {
      const newState = !prevState;
      try {
        localStorage.setItem('adminSidebarOpen', newState.toString());
      } catch (e) {
        console.error("Error writing to localStorage:", e);
      }
      return newState;
    });
  };

  // Show loading state while checking admin status - spinner only without text
  if (isLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }

  // Prevent rendering content if not admin
  if (!isAdmin && adminCheckComplete) {
    return null;
  }

  // If hideNav is true, return only the children without the layout
  if (hideNav) {
    return (
      <div className="admin-content-fullwidth">
        {children}
      </div>
    );
  }

  return (
    <>
      <Meta title={title || "Admin | BudgetMe"} />
      <div id="wrapper" className="d-flex" style={{ transition: 'none' }}>
        {/* Admin Sidebar */}
        <div className={`sidebar-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`} style={{ transition: 'none' }}>
          <AdminSidebar 
            isOpen={sidebarOpen} 
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && isMobile && (
          <div 
            onClick={toggleSidebar}
            aria-hidden="true"
            className="sidebar-backdrop"
          ></div>
        )}

        {/* Content Wrapper */}
        <div id="content-wrapper" className={`d-flex flex-column ${sidebarOpen && !isMobile ? "" : "content-full"} flex-fill`} style={{ transition: 'none' }}>
          {/* Main Content */}
          <div id="content" className="flex-fill">
            {/* Topbar */}
            <AdminHeader toggleSidebar={toggleSidebar} />

            {/* Begin Page Content */}
            <div className={`container-fluid admin-content pb-5 ${isMobile ? "has-mobile-nav" : ""}`}>
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className={`sticky-footer bg-white mt-auto ${isMobile ? "d-none" : ""}`}>
            <div className="container my-auto">
              <div className="copyright text-center my-auto">
                <span>Copyright &copy; BudgetMe Admin {new Date().getFullYear()}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;