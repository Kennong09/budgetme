import React, { useState, useEffect, FC, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Meta from "./Meta";
import MobileNavigation from "./MobileNavigation";
import "../../assets/css/responsive.css";
import "./layout.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
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
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  return (
    <>
      <Meta title={title} />
      <div id="wrapper" className="d-flex">
        {/* Sidebar */}
        <div className={`sidebar-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <Sidebar 
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
            <Header toggleSidebar={toggleSidebar} />

            {/* Begin Page Content */}
            <div className={`container-fluid dashboard-content pb-5 ${isMobile ? "has-mobile-nav" : ""}`}>
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className={`sticky-footer bg-white mt-auto ${isMobile ? "d-none" : ""}`}>
            <div className="container my-auto">
              <div className="copyright text-center my-auto">
                <span>Copyright &copy; BudgetMe {new Date().getFullYear()}</span>
              </div>
            </div>
          </footer>
        </div>
        
        {/* Mobile Navigation */}
        {isMobile && <MobileNavigation />}
      </div>
    </>
  );
};

export default Layout; 