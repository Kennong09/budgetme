import React, { useState, useEffect, FC, ReactNode, useTransition, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import AdminMobileQuickNav from "./AdminMobileQuickNav";
import Meta from "../../layout/Meta";
import { isUserAdmin } from "../../../utils/adminHelpers";
import "../admin.css";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  hideNav?: boolean;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children, title, hideNav = false }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const { logout, user, loading: authLoading } = useAuth();
  
  const isLoading = authLoading || loading || isPending;
  
  // Check if user is admin
  useEffect(() => {
    if (adminCheckComplete || authLoading) return;
    
    if (!user) {
      startTransition(() => {
        setLoading(false);
        setAdminCheckComplete(true);
      });
      navigate('/?login=true', { replace: true });
      return;
    }
    
    let isMounted = true;
    
    const checkAdmin = async () => {
      try {
        const adminStatus = await isUserAdmin();
        
        if (!isMounted) return;
        
        startTransition(() => {
          setIsAdmin(adminStatus);
          setLoading(false);
          setAdminCheckComplete(true);
        
          if (!adminStatus) {
            navigate('/?access_denied=true', { replace: true });
          }
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        
        if (!isMounted) return;
        
        startTransition(() => {
          setIsAdmin(false);
          setLoading(false);
          setAdminCheckComplete(true);
          navigate('/?error=true', { replace: true });
        });
      }
    };
    
    checkAdmin();
    
    return () => {
      isMounted = false;
    };
  }, [user, navigate, adminCheckComplete, authLoading]);
  
  // Update mobile/tablet state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      // Auto-collapse sidebar on tablet, close drawer on mobile
      if (mobile) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      } else if (tablet) {
        setSidebarOpen(false);
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle sidebar on mobile
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Handle sidebar collapse change
  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setIsTransitioning(true);
    setSidebarCollapsed(collapsed);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, []);

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    if (hideNav || isMobile) return "";
    // Tablet always has collapsed sidebar (ml-20), desktop depends on state
    if (isTablet) return "md:ml-20";
    return sidebarCollapsed ? "lg:ml-20" : "lg:ml-64";
  };

  if (isLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }

  if (!isAdmin && adminCheckComplete) {
    return null;
  }

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
      <div id="wrapper" className="flex min-h-screen bg-slate-50">
        {/* Admin Sidebar */}
        <AdminSidebar 
          isOpen={isMobile ? sidebarOpen : true} 
          onClose={closeSidebar}
          isCollapsed={isTablet ? true : sidebarCollapsed}
          onCollapseChange={handleCollapseChange}
          isTransitioning={isTransitioning}
          isTablet={isTablet}
        />

        {/* Content Wrapper */}
        <div 
          className={`
            flex flex-col flex-1 min-h-screen transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${getMainContentMargin()}
          `}
        >
          {/* Main Content */}
          <div id="content" className="flex-1 flex flex-col">
            {/* Topbar */}
            <div className="sticky top-0 z-30">
              <AdminHeader onMenuToggle={toggleSidebar} />
            </div>

            {/* Begin Page Content */}
            <main 
              className={`
                flex-1 container-fluid
                ${isMobile ? "px-3 pt-2 pb-28" : "px-4 md:px-6 pt-4 pb-5"}
              `}
            >
              {children}
            </main>
          </div>

          {/* Footer */}
          <footer className={`bg-white border-t border-slate-200 mt-auto ${isMobile ? "hidden" : ""}`}>
            <div className="container mx-auto py-4">
              <div className="text-center text-sm text-slate-500">
                <span>Copyright &copy; BudgetMe Admin {new Date().getFullYear()}</span>
              </div>
            </div>
          </footer>

          {/* Mobile Floating Quick Navigation */}
          {isMobile && <AdminMobileQuickNav />}
        </div>
      </div>
    </>
  );
};

export default AdminLayout;