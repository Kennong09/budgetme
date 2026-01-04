import React, { FC, useState, useEffect, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";

// CSS for animations and custom scrollbar - Admin Red Theme
const adminSidebarStyles = `
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes pulse-soft {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-4px); }
  }

  .admin-sidebar-nav-item {
    animation: slideInLeft 0.3s ease-out forwards;
    opacity: 0;
  }
  
  .admin-sidebar-nav-item:nth-child(1) { animation-delay: 0.05s; }
  .admin-sidebar-nav-item:nth-child(2) { animation-delay: 0.1s; }
  .admin-sidebar-nav-item:nth-child(3) { animation-delay: 0.15s; }
  .admin-sidebar-nav-item:nth-child(4) { animation-delay: 0.2s; }
  .admin-sidebar-nav-item:nth-child(5) { animation-delay: 0.25s; }
  .admin-sidebar-nav-item:nth-child(6) { animation-delay: 0.3s; }
  .admin-sidebar-nav-item:nth-child(7) { animation-delay: 0.35s; }
  .admin-sidebar-nav-item:nth-child(8) { animation-delay: 0.4s; }
  .admin-sidebar-nav-item:nth-child(9) { animation-delay: 0.45s; }
  .admin-sidebar-nav-item:nth-child(10) { animation-delay: 0.5s; }
  .admin-sidebar-nav-item:nth-child(11) { animation-delay: 0.55s; }

  .admin-mobile-nav-item {
    animation: slideInUp 0.3s ease-out forwards;
    opacity: 0;
  }
  
  .admin-mobile-nav-item:nth-child(1) { animation-delay: 0.05s; }
  .admin-mobile-nav-item:nth-child(2) { animation-delay: 0.08s; }
  .admin-mobile-nav-item:nth-child(3) { animation-delay: 0.11s; }
  .admin-mobile-nav-item:nth-child(4) { animation-delay: 0.14s; }
  .admin-mobile-nav-item:nth-child(5) { animation-delay: 0.17s; }
  .admin-mobile-nav-item:nth-child(6) { animation-delay: 0.2s; }
  .admin-mobile-nav-item:nth-child(7) { animation-delay: 0.23s; }
  .admin-mobile-nav-item:nth-child(8) { animation-delay: 0.26s; }
  .admin-mobile-nav-item:nth-child(9) { animation-delay: 0.29s; }
  .admin-mobile-nav-item:nth-child(10) { animation-delay: 0.32s; }
  .admin-mobile-nav-item:nth-child(11) { animation-delay: 0.35s; }
  
  .admin-sidebar-link {
    text-decoration: none !important;
  }
  
  .admin-sidebar-link:hover,
  .admin-sidebar-link:focus,
  .admin-sidebar-link:active {
    text-decoration: none !important;
  }
  
  .admin-nav-icon-bounce:hover {
    animation: bounce 0.4s ease-in-out;
  }
  
  .admin-avatar-pulse:hover {
    animation: pulse 0.6s ease-in-out;
  }

  .admin-quick-access-item {
    animation: fadeIn 0.4s ease-out forwards;
    opacity: 0;
  }
  
  .admin-quick-access-item:nth-child(1) { animation-delay: 0.6s; }
  .admin-quick-access-item:nth-child(2) { animation-delay: 0.65s; }
  .admin-quick-access-item:nth-child(3) { animation-delay: 0.7s; }
  .admin-quick-access-item:nth-child(4) { animation-delay: 0.75s; }

  /* Ultra-thin custom scrollbar */
  .admin-sidebar-scroll::-webkit-scrollbar {
    width: 3px;
  }
  
  .admin-sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .admin-sidebar-scroll::-webkit-scrollbar-thumb {
    background: #fecaca;
    border-radius: 10px;
  }
  
  .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background: #fca5a5;
  }

  .admin-sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: #fecaca transparent;
  }

  .admin-mobile-header-gradient {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
  }

  .admin-glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }
  
  .admin-loading-pulse {
    animation: pulse-soft 1.2s ease-in-out infinite;
  }
  
  .admin-loading-dot {
    animation: dot-bounce 1.4s ease-in-out infinite;
  }
  
  .admin-loading-dot:nth-child(1) { animation-delay: 0s; }
  .admin-loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .admin-loading-dot:nth-child(3) { animation-delay: 0.4s; }
`;

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  isTransitioning?: boolean;
  isTablet?: boolean;
}

interface NavItem {
  id: number;
  label: string;
  route: string;
  icon: string;
  subItems?: { label: string; route: string; icon: string }[];
}

interface QuickAccessItem {
  id: string;
  label: string;
  route: string;
  icon: string;
}

interface UserInfo {
  name: string;
  email: string;
  avatar: string;
}

const AdminSidebar: FC<AdminSidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  isCollapsed: controlledCollapsed, 
  onCollapseChange, 
  isTransitioning = false,
  isTablet = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', avatar: '' });
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [expandedSubMenu, setExpandedSubMenu] = useState<number | null>(null);
  
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  useEffect(() => {
    if (user) {
      setUserInfo({
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url || ''
      });
    }
  }, [user]);

  const mainNavItems: NavItem[] = [
    { id: 1, label: "Dashboard", route: "/admin/dashboard", icon: "fa-tachometer-alt" },
    { id: 2, label: "User Management", route: "/admin/users", icon: "fa-users-cog" },
    { id: 3, label: "Transactions", route: "/admin/transactions", icon: "fa-exchange-alt" },
    { id: 4, label: "Accounts", route: "/admin/accounts", icon: "fa-university" },
    { id: 5, label: "Budgets", route: "/admin/budgets", icon: "fa-wallet" },
    { id: 6, label: "Goals", route: "/admin/goals", icon: "fa-bullseye" },
    { id: 7, label: "Family Groups", route: "/admin/family", icon: "fa-users" },
    { id: 8, label: "AI Predictions", route: "/admin/predictions", icon: "fa-chart-line", 
      subItems: [{ label: "AI Insights", route: "/admin/ai-insights", icon: "fa-lightbulb" }] 
    },
    { id: 9, label: "Chatbot", route: "/admin/chatbot", icon: "fa-robot" },
    { id: 10, label: "Reports", route: "/admin/reports", icon: "fa-chart-pie" },
    { id: 11, label: "Settings", route: "/admin/settings", icon: "fa-cog" },
  ];

  const quickAccessItems: QuickAccessItem[] = [
    { id: "transactions", label: "Transactions", route: "/admin/transactions", icon: "fa-exchange-alt" },
    { id: "dashboard", label: "Dashboard", route: "/admin/dashboard", icon: "fa-tachometer-alt" },
    { id: "settings", label: "Settings", route: "/admin/settings", icon: "fa-cog" },
    { id: "reports", label: "Reports", route: "/admin/reports", icon: "fa-file-alt" },
  ];

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      if (mobile) {
        if (onCollapseChange) {
          onCollapseChange(false);
        } else {
          setInternalCollapsed(false);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onCollapseChange]);

  const isActive = useCallback((route: string) => {
    if (route === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard" || location.pathname === "/admin";
    }
    return location.pathname === route || location.pathname.startsWith(route + "/");
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  const handleOverlayClick = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  const handleItemClick = useCallback((itemId: string) => {
    setClickedItem(itemId);
    setTimeout(() => setClickedItem(null), 200);
  }, []);

  const toggleSubMenu = useCallback((itemId: number) => {
    setExpandedSubMenu(prev => prev === itemId ? null : itemId);
  }, []);

  const goToUserDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminSidebarStyles }} />
      
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={handleOverlayClick}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile ? (
        <aside
          className={`
            fixed top-0 left-0 h-full z-50 w-[85%] max-w-[320px]
            bg-slate-50 shadow-2xl
            transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            flex flex-col overflow-hidden
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="admin-mobile-header-gradient px-5 pt-12 pb-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all duration-200"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            <Link to="/admin/settings" onClick={onClose} className="admin-sidebar-link flex flex-col items-center text-center mt-4">
              <div className="admin-avatar-pulse mb-3">
                {userInfo.avatar ? (
                  <img src={userInfo.avatar} alt={userInfo.name} className="w-20 h-20 rounded-2xl object-cover border-3 border-white/30 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white text-3xl font-bold border-3 border-white/30 shadow-lg">
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-white font-bold text-xl truncate max-w-full leading-none">{userInfo.name}</h3>
              <p className="text-red-100 text-sm truncate max-w-full leading-none -mt-0.5">{userInfo.email}</p>
              {/* Administrator Badge */}
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-white rounded-full text-[10px] font-bold text-red-600 tracking-wider">
                  ADMINISTRATOR
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-red-200">View Profile</span>
                <i className="fas fa-chevron-right text-[10px] text-red-200"></i>
              </div>
            </Link>
          </div>

          <nav className="admin-sidebar-scroll flex-1 overflow-y-auto px-4 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Admin Menu</p>
            <div className="grid grid-cols-2 gap-2">
              {mainNavItems.map((item) => (
                <React.Fragment key={item.id}>
                  <div className="admin-mobile-nav-item">
                    <Link
                      to={item.route}
                      onClick={() => { handleItemClick(item.label); onClose?.(); }}
                      className={`
                        admin-sidebar-link flex items-center gap-3 p-3 rounded-2xl
                        transition-all duration-200 active:scale-95
                        ${isActive(item.route)
                          ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                          : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100"
                        }
                      `}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive(item.route) ? "bg-white/20" : "bg-slate-100"}`}>
                        <i className={`fas ${item.icon} ${isActive(item.route) ? "text-white" : "text-red-500"}`}></i>
                      </div>
                      <span className="font-medium text-sm truncate">{item.label}</span>
                    </Link>
                  </div>
                  {/* Render subItems as separate nav items in mobile view */}
                  {item.subItems?.map((subItem) => (
                    <div key={subItem.route} className="admin-mobile-nav-item">
                      <Link
                        to={subItem.route}
                        onClick={() => { handleItemClick(subItem.label); onClose?.(); }}
                        className={`
                          admin-sidebar-link flex items-center gap-3 p-3 rounded-2xl
                          transition-all duration-200 active:scale-95
                          ${isActive(subItem.route)
                            ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                            : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100"
                          }
                        `}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive(subItem.route) ? "bg-white/20" : "bg-slate-100"}`}>
                          <i className={`fas ${subItem.icon} ${isActive(subItem.route) ? "text-white" : "text-red-500"}`}></i>
                        </div>
                        <span className="font-medium text-sm truncate">{subItem.label}</span>
                      </Link>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </nav>

          <div className="p-4 bg-white border-t border-slate-100 space-y-2">
            <button
              onClick={() => { goToUserDashboard(); onClose?.(); }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all duration-200 font-medium"
            >
              <i className="fas fa-home"></i>
              <span>User Dashboard</span>
            </button>
            <button
              onClick={() => { handleLogout(); onClose?.(); }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all duration-200 font-medium"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </aside>
      ) : (

        /* Desktop Sidebar */
        <aside
          className={`
            fixed top-0 left-0 h-full z-50
            bg-white border-r border-slate-200/80
            shadow-xl shadow-slate-200/50
            flex flex-col
            transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isCollapsed ? "w-20" : "w-64"}
          `}
        >
          {/* Loading Overlay */}
          {isTransitioning && (
            <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="admin-loading-pulse mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <i className="fas fa-shield-alt text-white text-xl"></i>
                </div>
              </div>
              <p className="text-slate-600 font-medium text-sm mb-2">Please wait</p>
              <div className="flex gap-1">
                <span className="admin-loading-dot w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span className="admin-loading-dot w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span className="admin-loading-dot w-1.5 h-1.5 rounded-full bg-red-300"></span>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className={`
            bg-gradient-to-br from-[#ef4444] to-[#dc2626]
            relative
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isCollapsed ? "px-2 py-3" : "px-4 py-3"}
          `}>
            {/* Collapse toggle button - hidden on tablet (always collapsed) */}
            {!isTablet && (
              <button
                onClick={toggleCollapse}
                className={`
                  absolute z-20 flex items-center justify-center
                  text-white/70 hover:text-white hover:bg-white/20 
                  active:scale-90 rounded-lg
                  transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${isCollapsed ? "top-3 left-1/2 -translate-x-1/2 w-8 h-8" : "top-2 right-2 w-6 h-6"}
                `}
              >
                <i className={`fas fa-chevron-left text-xs transition-transform duration-300 ${isCollapsed ? "rotate-180" : "rotate-0"}`}></i>
              </button>
            )}

            {/* Logo */}
            <Link 
              to="/admin/dashboard" 
              className={`admin-sidebar-link flex items-center justify-center relative z-10 group transition-all duration-300 ${isCollapsed ? "mt-10 mb-3" : "mt-6 mb-4"}`}
              style={{ gap: 0 }}
            >
              <i className="fas fa-shield-alt text-white transition-all duration-300 group-hover:scale-110" style={{ fontSize: isCollapsed ? '1.5rem' : '1.8rem' }}></i>
              <span 
                className={`text-white group-hover:text-white/90 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? "w-0 opacity-0 scale-95 ml-0" : "w-auto opacity-100 scale-100 ml-2"}`}
                style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}
              >
                Admin
              </span>
            </Link>

            {/* User Profile */}
            <Link
              to="/admin/settings"
              className="admin-sidebar-link flex flex-col items-center group relative z-10 transition-all duration-300"
              onMouseEnter={() => setHoveredItem("profile")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="admin-avatar-pulse transition-all duration-300">
                {userInfo.avatar ? (
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    className={`rounded-full object-cover border-2 border-white/30 group-hover:border-white/50 transition-all duration-300 ${isCollapsed ? "w-11 h-11" : "w-20 h-20"}`}
                  />
                ) : (
                  <div className={`rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30 group-hover:border-white/50 transition-all duration-300 ${isCollapsed ? "w-11 h-11 text-base" : "w-20 h-20 text-2xl"}`}>
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className={`text-center overflow-hidden transition-all duration-300 ${isCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-24 opacity-100 mt-2"}`} style={{ lineHeight: 1.2 }}>
                <span className="block text-lg font-semibold text-white truncate max-w-full">{userInfo.name}</span>
                <span className="block text-sm text-white/70 truncate max-w-full">{userInfo.email}</span>
                {/* Administrator Badge */}
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-white rounded-full text-[10px] font-bold text-red-600 tracking-wider">
                    ADMINISTRATOR
                  </span>
                </div>
              </div>

              {isCollapsed && hoveredItem === "profile" && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                  <p className="font-semibold">{userInfo.name}</p>
                  <p className="text-xs text-slate-300">{userInfo.email}</p>
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              )}
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="admin-sidebar-scroll flex-1 overflow-y-auto py-2 px-2">
            <p className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 transition-all duration-300 ${isCollapsed ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100 h-auto"}`}>
              Admin Menu
            </p>
            
            <ul className={`space-y-1 list-none p-0 m-0 transition-all duration-300 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
              {mainNavItems.map((item) => (
                <li key={item.id} className={`admin-sidebar-nav-item transition-all duration-300 ${isCollapsed ? "w-full flex flex-col items-center" : ""}`}>
                  {item.subItems ? (
                    <>
                      <button
                        onClick={() => !isCollapsed && toggleSubMenu(item.id)}
                        onMouseEnter={() => setHoveredItem(item.label)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`
                          admin-sidebar-link flex items-center rounded-xl w-full group relative transition-all duration-200
                          ${isCollapsed ? "w-12 h-12 justify-center p-0" : "px-3 py-2.5 gap-3"}
                          ${isActive(item.route) ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30" : "text-slate-600 hover:bg-slate-100 hover:text-red-600"}
                        `}
                      >
                        <div className={`admin-nav-icon-bounce flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? "w-full h-full" : "w-9 h-9 rounded-lg"} ${isActive(item.route) ? (isCollapsed ? "" : "bg-white/20") : (isCollapsed ? "" : "bg-slate-100 group-hover:bg-red-100 group-hover:scale-110")}`}>
                          <i className={`fas ${item.icon} transition-all duration-300 ${isActive(item.route) ? "text-white" : "text-slate-500 group-hover:text-red-600"}`}></i>
                        </div>
                        <span className={`font-medium text-sm whitespace-nowrap flex-1 text-left transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>{item.label}</span>
                        {!isCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${expandedSubMenu === item.id ? "rotate-180" : ""}`}></i>}
                        {isCollapsed && hoveredItem === item.label && (
                          <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                            {item.label}
                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                          </div>
                        )}
                      </button>
                      {!isCollapsed && expandedSubMenu === item.id && (
                        <div className="ml-6 mt-1 space-y-1">
                          <Link to={item.route} onClick={() => handleItemClick(item.label)} className={`admin-sidebar-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.route) && !item.subItems?.some(sub => isActive(sub.route)) ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-red-600"}`}>
                            <i className={`fas ${item.icon} text-xs`}></i>
                            <span>{item.label}</span>
                          </Link>
                          {item.subItems.map((subItem) => (
                            <Link key={subItem.route} to={subItem.route} onClick={() => handleItemClick(subItem.label)} className={`admin-sidebar-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(subItem.route) ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-red-600"}`}>
                              <i className={`fas ${subItem.icon} text-xs`}></i>
                              <span>{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (

                    <Link
                      to={item.route}
                      onClick={() => handleItemClick(item.label)}
                      className={`
                        admin-sidebar-link flex items-center rounded-xl group relative transition-all duration-200
                        ${isCollapsed ? "w-12 h-12 justify-center p-0" : "px-3 py-2.5 gap-3"}
                        ${isActive(item.route) ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30" : "text-slate-600 hover:bg-slate-100 hover:text-red-600"}
                        ${!isCollapsed && !isActive(item.route) ? "hover:translate-x-1" : ""}
                        ${clickedItem === item.label ? "scale-95" : ""}
                      `}
                      onMouseEnter={() => setHoveredItem(item.label)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className={`admin-nav-icon-bounce flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? "w-full h-full" : "w-9 h-9 rounded-lg"} ${isActive(item.route) ? (isCollapsed ? "" : "bg-white/20") : (isCollapsed ? "" : "bg-slate-100 group-hover:bg-red-100 group-hover:scale-110")}`}>
                        <i className={`fas ${item.icon} transition-all duration-300 ${isActive(item.route) ? "text-white" : "text-slate-500 group-hover:text-red-600"}`}></i>
                      </div>
                      <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>{item.label}</span>
                      {isActive(item.route) && <div className={`ml-auto w-2 h-2 rounded-full bg-white/80 animate-pulse transition-all duration-300 ${isCollapsed ? "hidden" : "block"}`}></div>}
                      {isCollapsed && hoveredItem === item.label && (
                        <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                          {item.label}
                          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Quick Access Section */}
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "max-h-0 opacity-0 mt-0 pt-0" : "max-h-96 opacity-100 mt-6 pt-4 border-t border-slate-200/60"}`}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Quick Access</p>
              <div className="grid grid-cols-2 gap-2 px-1">
                {quickAccessItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.route}
                    onClick={() => handleItemClick(item.id)}
                    className={`admin-quick-access-item admin-sidebar-link flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group ${isActive(item.route) ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-red-600 hover:scale-105"} ${clickedItem === item.id ? "scale-90" : ""}`}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`admin-nav-icon-bounce w-9 h-9 rounded-lg flex items-center justify-center mb-1 transition-all duration-300 ${isActive(item.route) ? "bg-red-500 text-white shadow-md shadow-red-500/30" : "bg-slate-100 text-slate-500 group-hover:bg-red-100 group-hover:text-red-600"}`}>
                      <i className={`fas ${item.icon} text-sm transition-all duration-300`}></i>
                    </div>
                    <span className="text-[10px] font-medium transition-all duration-300">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className={`border-t border-slate-200/80 bg-white/50 transition-all duration-300 ${isCollapsed ? "p-2 space-y-2" : "p-4 space-y-2"}`}>
            <button
              onClick={goToUserDashboard}
              className={`w-full flex items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 group active:scale-95 transition-all duration-300 ${isCollapsed ? "justify-center w-12 h-12 mx-auto p-0" : "px-3 py-2.5 gap-3 hover:translate-x-1"}`}
              onMouseEnter={() => setHoveredItem("user-dashboard")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`admin-nav-icon-bounce flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? "w-full h-full" : "w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 group-hover:scale-110"}`}>
                <i className="fas fa-home text-slate-500 group-hover:text-slate-700 transition-colors duration-300"></i>
              </div>
              <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>User Dashboard</span>
              {isCollapsed && hoveredItem === "user-dashboard" && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                  User Dashboard
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 group active:scale-95 transition-all duration-300 ${isCollapsed ? "justify-center w-12 h-12 mx-auto p-0" : "px-3 py-2.5 gap-3 hover:translate-x-1"}`}
              onMouseEnter={() => setHoveredItem("logout")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`admin-nav-icon-bounce flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? "w-full h-full" : "w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-red-100 group-hover:scale-110"}`}>
                <i className="fas fa-sign-out-alt text-slate-500 group-hover:text-red-600 transition-colors duration-300"></i>
              </div>
              <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>Logout</span>
              {isCollapsed && hoveredItem === "logout" && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                  Logout
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              )}
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export default memo(AdminSidebar);
