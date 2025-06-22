import React, { useState, useEffect, FC, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import Meta from "../../layout/Meta";
import { isUserAdmin } from "../../../utils/adminHelpers";
import "../admin.css";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        setLoading(true);
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          // If not an admin, redirect to admin login with access denied parameter
          navigate('/admin?access_denied=true');
        }
        setLoading(false);
      } else {
        // Not logged in, redirect to admin login
        navigate('/admin');
      }
    };
    
    checkAdmin();
  }, [user, navigate]);
  
  // Update sidebar state on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        // On desktop/tablet, sidebar visibility depends on previous state
        setSidebarOpen(prevState => prevState);
      } else {
        // On mobile, always ensure sidebar is closed by default
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call immediately on mount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  // Show loading state while checking admin status
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
        <div className="spinner-border text-danger" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Prevent rendering content if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Meta title={title || "Admin | BudgetMe"} />
      <div id="wrapper" className="d-flex">
        {/* Admin Sidebar */}
        <div className={`sidebar-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
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
        <div id="content-wrapper" className={`d-flex flex-column ${sidebarOpen && !isMobile ? "" : "content-full"} flex-fill`}>
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