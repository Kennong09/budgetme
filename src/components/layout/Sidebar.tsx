import { FC, useState, useEffect, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";

// CSS for animations and custom scrollbar
const sidebarStyles = `
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

  .sidebar-nav-item {
    animation: slideInLeft 0.3s ease-out forwards;
    opacity: 0;
  }
  
  .sidebar-nav-item:nth-child(1) { animation-delay: 0.05s; }
  .sidebar-nav-item:nth-child(2) { animation-delay: 0.1s; }
  .sidebar-nav-item:nth-child(3) { animation-delay: 0.15s; }
  .sidebar-nav-item:nth-child(4) { animation-delay: 0.2s; }
  .sidebar-nav-item:nth-child(5) { animation-delay: 0.25s; }
  .sidebar-nav-item:nth-child(6) { animation-delay: 0.3s; }
  .sidebar-nav-item:nth-child(7) { animation-delay: 0.35s; }
  .sidebar-nav-item:nth-child(8) { animation-delay: 0.4s; }

  .mobile-nav-item {
    animation: slideInUp 0.3s ease-out forwards;
    opacity: 0;
  }
  
  .mobile-nav-item:nth-child(1) { animation-delay: 0.05s; }
  .mobile-nav-item:nth-child(2) { animation-delay: 0.08s; }
  .mobile-nav-item:nth-child(3) { animation-delay: 0.11s; }
  .mobile-nav-item:nth-child(4) { animation-delay: 0.14s; }
  .mobile-nav-item:nth-child(5) { animation-delay: 0.17s; }
  .mobile-nav-item:nth-child(6) { animation-delay: 0.2s; }
  .mobile-nav-item:nth-child(7) { animation-delay: 0.23s; }
  .mobile-nav-item:nth-child(8) { animation-delay: 0.26s; }
  
  .sidebar-link {
    text-decoration: none !important;
  }
  
  .sidebar-link:hover,
  .sidebar-link:focus,
  .sidebar-link:active {
    text-decoration: none !important;
  }
  
  .nav-icon-bounce:hover {
    animation: bounce 0.4s ease-in-out;
  }
  
  .avatar-pulse:hover {
    animation: pulse 0.6s ease-in-out;
  }
  
  .quick-access-item {
    animation: fadeIn 0.4s ease-out forwards;
    opacity: 0;
  }
  
  .quick-access-item:nth-child(1) { animation-delay: 0.45s; }
  .quick-access-item:nth-child(2) { animation-delay: 0.5s; }
  .quick-access-item:nth-child(3) { animation-delay: 0.55s; }
  .quick-access-item:nth-child(4) { animation-delay: 0.6s; }

  /* Ultra-thin custom scrollbar */
  .sidebar-scroll::-webkit-scrollbar {
    width: 3px;
  }
  
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  
  .sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  .sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
  }

  .mobile-header-gradient {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }
  
  .loading-shimmer {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  
  .loading-pulse {
    animation: pulse-soft 1.2s ease-in-out infinite;
  }
  
  .loading-dot {
    animation: dot-bounce 1.4s ease-in-out infinite;
  }
  
  .loading-dot:nth-child(1) { animation-delay: 0s; }
  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }
`;

interface SidebarProps {
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


const Sidebar: FC<SidebarProps> = ({ isOpen = true, onClose, isCollapsed: controlledCollapsed, onCollapseChange, isTransitioning = false, isTablet = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', avatar: '' });
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  
  // Use controlled or internal collapsed state
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  useEffect(() => {
    if (user) {
      setUserInfo({
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url || ''
      });
    }
  }, [user]);

  const mainNavItems: NavItem[] = [
    { id: 1, label: "Dashboard", route: "/dashboard", icon: "fa-tachometer-alt" },
    { id: 2, label: "Transactions", route: "/transactions", icon: "fa-exchange-alt" },
    { id: 3, label: "Budgets", route: "/budgets", icon: "fa-wallet" },
    { id: 4, label: "Goals", route: "/goals", icon: "fa-bullseye" },
    { id: 5, label: "Family", route: "/family", icon: "fa-users" },
    { id: 6, label: "AI Predictions", route: "/predictions", icon: "fa-chart-line" },
    { id: 7, label: "Reports", route: "/reports", icon: "fa-chart-pie" },
    { id: 8, label: "Settings", route: "/settings", icon: "fa-cog" },
  ];

  const quickAccessItems: QuickAccessItem[] = [
    { id: "dashboard", label: "Dashboard", route: "/dashboard", icon: "fa-tachometer-alt" },
    { id: "add", label: "Add", route: "/transactions/add", icon: "fa-plus" },
    { id: "goals", label: "Goals", route: "/goals", icon: "fa-flag" },
    { id: "budget", label: "Budget", route: "/budgets", icon: "fa-balance-scale" },
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
    if (route === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/analytics";
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


  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sidebarStyles }} />
      
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
          <div className="mobile-header-gradient px-5 pt-12 pb-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all duration-200"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            <Link to="/settings" onClick={onClose} className="sidebar-link flex flex-col items-center text-center">
              <div className="avatar-pulse mb-3">
                {userInfo.avatar ? (
                  <img src={userInfo.avatar} alt={userInfo.name} className="w-20 h-20 rounded-2xl object-cover border-3 border-white/30 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white text-3xl font-bold border-3 border-white/30 shadow-lg">
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-white font-bold text-xl truncate max-w-full leading-none">{userInfo.name}</h3>
              <p className="text-indigo-100 text-sm truncate max-w-full leading-none -mt-0.5">{userInfo.email}</p>
              {/* User Badge */}
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-white rounded-full text-[10px] font-bold text-indigo-600 tracking-wider">
                  USER
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-indigo-200">View Profile</span>
                <i className="fas fa-chevron-right text-[10px] text-indigo-200"></i>
              </div>
            </Link>
          </div>

          <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Menu</p>
            <div className="grid grid-cols-2 gap-2">
              {mainNavItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.route}
                  onClick={() => { handleItemClick(item.label); onClose?.(); }}
                  className={`
                    mobile-nav-item sidebar-link flex items-center gap-3 p-3 rounded-2xl
                    transition-all duration-200 active:scale-95
                    ${isActive(item.route)
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100"
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive(item.route) ? "bg-white/20" : "bg-slate-100"}`}>
                    <i className={`fas ${item.icon} ${isActive(item.route) ? "text-white" : "text-indigo-500"}`}></i>
                  </div>
                  <span className="font-medium text-sm truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-4 bg-white border-t border-slate-100">
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

        /* Desktop Sidebar - Smooth expand/collapse animations */
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
          {/* Loading Overlay - Please Wait */}
          {isTransitioning && (
            <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
              {/* Animated Icon */}
              <div className="loading-pulse mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fas fa-wallet text-white text-xl" style={{ transform: 'rotate(-15deg)' }}></i>
                </div>
              </div>
              
              {/* Please Wait Text */}
              <p className="text-slate-600 font-medium text-sm mb-2">Please wait</p>
              
              {/* Animated Dots */}
              <div className="flex gap-1">
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
              </div>
            </div>
          )}
          {/* Header Section */}
          <div className={`
            bg-gradient-to-br from-[#6366f1] to-[#4f46e5]
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
                  ${isCollapsed 
                    ? "top-3 left-1/2 -translate-x-1/2 w-8 h-8" 
                    : "top-2 right-2 w-6 h-6"
                  }
                `}
              >
                <i className={`
                  fas fa-chevron-left text-xs
                  transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${isCollapsed ? "rotate-180" : "rotate-0"}
                `}></i>
              </button>
            )}

            {/* Logo */}
            <Link 
              to="/dashboard" 
              className={`
                sidebar-link flex items-center justify-center relative z-10 group
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed ? "mt-10 mb-3" : "mb-4"}
              `}
              style={{ gap: 0 }}
            >
              <i 
                className="fas fa-wallet text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110"
                style={{ 
                  transform: 'rotate(-15deg)',
                  fontSize: isCollapsed ? '1.5rem' : '1.8rem'
                }}
              ></i>
              <span 
                className={`
                  text-white group-hover:text-white/90
                  transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                  whitespace-nowrap overflow-hidden
                  ${isCollapsed ? "w-0 opacity-0 scale-95" : "w-auto opacity-100 scale-100"}
                `}
                style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}
              >
                BudgetMe
              </span>
            </Link>

            {/* User Profile */}
            <Link
              to="/settings"
              className="sidebar-link flex flex-col items-center group relative z-10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              onMouseEnter={() => setHoveredItem("profile")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="avatar-pulse transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
                {userInfo.avatar ? (
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    className={`
                      rounded-full object-cover border-2 border-white/30
                      group-hover:border-white/50 group-hover:shadow-lg group-hover:shadow-white/20
                      transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isCollapsed ? "w-11 h-11" : "w-20 h-20"}
                    `}
                  />
                ) : (
                  <div className={`
                    rounded-full bg-white/20
                    flex items-center justify-center text-white font-semibold
                    border-2 border-white/30 group-hover:border-white/50
                    group-hover:shadow-lg group-hover:shadow-white/20
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isCollapsed ? "w-11 h-11 text-base" : "w-20 h-20 text-2xl"}
                  `}>
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className={`
                text-center overflow-hidden
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-24 opacity-100 mt-2"}
              `} style={{ lineHeight: 1.2 }}>
                <span className="block text-lg font-semibold text-white truncate max-w-full group-hover:text-white/90 transition-colors duration-300">
                  {userInfo.name}
                </span>
                <span className="block text-sm text-white/70 truncate max-w-full group-hover:text-white/80 transition-colors duration-300">
                  {userInfo.email}
                </span>
                {/* User Badge */}
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-white rounded-full text-[10px] font-bold text-indigo-600 tracking-wider">
                    USER
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
          <nav className="sidebar-scroll flex-1 overflow-y-auto py-2 px-2">
            <p className={`
              text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3
              transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${isCollapsed ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100 h-auto"}
            `}>
              Main Menu
            </p>
            
            <ul className={`
              space-y-1 list-none p-0 m-0
              transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${isCollapsed ? "flex flex-col items-center" : ""}
            `}>
              {mainNavItems.map((item) => (
                <li 
                  key={item.id} 
                  className={`
                    sidebar-nav-item
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isCollapsed ? "w-full flex justify-center" : ""}
                  `}
                >
                  <Link
                    to={item.route}
                    onClick={() => handleItemClick(item.label)}
                    className={`
                      sidebar-link flex items-center rounded-xl
                      group relative
                      transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isCollapsed ? "w-12 h-12 justify-center p-0" : "px-3 py-2.5 gap-3"}
                      ${isActive(item.route)
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                      }
                      ${!isCollapsed && !isActive(item.route) ? "hover:translate-x-1" : ""}
                      ${clickedItem === item.label ? "scale-95" : ""}
                    `}
                    onMouseEnter={() => setHoveredItem(item.label)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`
                      nav-icon-bounce flex items-center justify-center flex-shrink-0
                      transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isCollapsed ? "w-full h-full" : "w-9 h-9 rounded-lg"}
                      ${isActive(item.route)
                        ? isCollapsed ? "" : "bg-white/20"
                        : isCollapsed ? "" : "bg-slate-100 group-hover:bg-indigo-100 group-hover:scale-110"
                      }
                    `}>
                      <i className={`
                        fas ${item.icon}
                        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                        ${isActive(item.route) ? "text-white" : "text-slate-500 group-hover:text-indigo-600"}
                      `}></i>
                    </div>
                    
                    <span className={`
                      font-medium text-sm whitespace-nowrap
                      transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}
                    `}>
                      {item.label}
                    </span>

                    {isActive(item.route) && (
                      <div className={`
                        ml-auto w-2 h-2 rounded-full bg-white/80 animate-pulse
                        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                        ${isCollapsed ? "hidden" : "block"}
                      `}></div>
                    )}

                    {isCollapsed && hoveredItem === item.label && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 animate-[fadeIn_0.15s_ease-out]">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>


            {/* Quick Access Section */}
            <div className={`
              overflow-hidden
              transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${isCollapsed 
                ? "max-h-0 opacity-0 mt-0 pt-0" 
                : "max-h-96 opacity-100 mt-6 pt-4 border-t border-slate-200/60"
              }
            `}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Quick Access
              </p>
              <div className="grid grid-cols-2 gap-2 px-1">
                {quickAccessItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.route}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      quick-access-item sidebar-link flex flex-col items-center justify-center p-2 rounded-xl
                      transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group
                      ${isActive(item.route)
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600 hover:scale-105"
                      }
                      ${clickedItem === item.id ? "scale-90" : ""}
                    `}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`
                      nav-icon-bounce w-9 h-9 rounded-lg flex items-center justify-center mb-1
                      transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isActive(item.route)
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                        : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      }
                    `}>
                      <i className={`fas ${item.icon} text-sm transition-all duration-300`}></i>
                    </div>
                    <span className="text-[10px] font-medium transition-all duration-300">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Bottom Section - Logout */}
          <div className={`
            border-t border-slate-200/80 bg-white/50
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isCollapsed ? "p-2" : "p-4"}
          `}>
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center rounded-xl
                text-slate-600 hover:bg-red-50 hover:text-red-600
                group active:scale-95
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed 
                  ? "justify-center w-12 h-12 mx-auto p-0" 
                  : "px-3 py-2.5 gap-3 hover:translate-x-1"
                }
              `}
              onMouseEnter={() => setHoveredItem("logout")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`
                nav-icon-bounce flex items-center justify-center flex-shrink-0
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed 
                  ? "w-full h-full" 
                  : "w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-red-100 group-hover:scale-110"
                }
              `}>
                <i className="fas fa-sign-out-alt text-slate-500 group-hover:text-red-600 transition-colors duration-300"></i>
              </div>
              
              <span className={`
                font-medium text-sm whitespace-nowrap
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}
              `}>
                Logout
              </span>

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

export default memo(Sidebar);