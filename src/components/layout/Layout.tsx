import { useState, useEffect, FC, ReactNode, memo, useCallback } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileQuickNav from "./MobileQuickNav";
import Meta from "./Meta";
import "../../assets/css/responsive.css";
import "./layout.css";
import { Footer } from "./shared/components";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideSidebar?: boolean;
}

const Layout: FC<LayoutProps> = ({ children, title, hideSidebar = false }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    
    // Clear transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, []);

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    if (hideSidebar || isMobile) return "";
    // Tablet always has collapsed sidebar (ml-20), desktop depends on state
    if (isTablet) return "md:ml-20";
    return sidebarCollapsed ? "lg:ml-20" : "lg:ml-64";
  };

  return (
    <>
      <Meta title={title} />
      
      <div id="wrapper" className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
        {!hideSidebar && (
          <Sidebar 
            isOpen={isMobile ? sidebarOpen : true} 
            onClose={closeSidebar}
            isCollapsed={isTablet ? true : sidebarCollapsed}
            onCollapseChange={handleCollapseChange}
            isTransitioning={isTransitioning}
            isTablet={isTablet}
          />
        )}

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
              <Header 
                onMenuToggle={toggleSidebar}
              />
            </div>

            {/* Begin Page Content */}
            <main 
              className={`
                flex-1 container-fluid
                ${isMobile ? "has-mobile-nav px-3 pt-2 pb-24" : "px-4 md:px-6 pt-4 pb-5"}
              `}
            >
              {children}
            </main>
          </div>

          {/* Footer */}
          <Footer />

          {/* Mobile Floating Quick Navigation */}
          {isMobile && !hideSidebar && <MobileQuickNav />}
        </div>
      </div>
    </>
  );
};

// Memoize Layout component for performance
export default memo(Layout);
