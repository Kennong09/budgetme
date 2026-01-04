import { FC, memo, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const adminMobileQuickNavStyles = `
  .admin-magic-nav-link {
    text-decoration: none !important;
  }
  .admin-magic-nav-link:hover,
  .admin-magic-nav-link:focus,
  .admin-magic-nav-link:active {
    text-decoration: none !important;
  }

  .admin-magic-nav-wrapper {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
  }

  .admin-magic-nav-bar {
    position: relative;
    display: flex;
    align-items: flex-end;
    background: white;
    border-radius: 20px;
    padding: 8px 6px 10px 6px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
    height: 70px;
  }

  .admin-magic-nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    width: 64px;
    height: 100%;
    z-index: 1;
    padding-bottom: 2px;
  }

  /* The floating circle indicator - Admin Red */
  .admin-magic-indicator-circle {
    position: absolute;
    top: -22px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.5);
    transition: left 0.5s cubic-bezier(0.68, -0.3, 0.32, 1.3);
    z-index: 10;
  }

  /* SVG curved cutout that follows the indicator */
  .admin-magic-nav-curve {
    position: absolute;
    top: -14px;
    width: 72px;
    height: 16px;
    transition: left 0.5s cubic-bezier(0.68, -0.3, 0.32, 1.3);
    z-index: 5;
  }

  .admin-magic-nav-curve svg {
    width: 100%;
    height: 100%;
  }

  /* Label inside the bar */
  .admin-magic-nav-label {
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    transition: all 0.3s ease;
    margin-top: 4px;
  }

  .admin-magic-nav-label.active {
    color: #dc2626;
  }

  .admin-magic-nav-label.inactive {
    color: #94a3b8;
  }

  .admin-magic-nav-icon-wrapper {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .admin-magic-nav-icon {
    font-size: 18px;
    color: #64748b;
    transition: all 0.3s ease;
  }

  .admin-magic-nav-icon.active {
    opacity: 0;
    transform: scale(0);
  }

  .admin-magic-nav-icon.in-circle {
    color: white;
    font-size: 18px;
  }
`;

interface QuickAccessItem {
  id: string;
  label: string;
  route: string;
  icon: string;
}

const AdminMobileQuickNav: FC = () => {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);

  const quickAccessItems: QuickAccessItem[] = [
    { id: "dashboard", label: "Dashboard", route: "/admin/dashboard", icon: "fa-tachometer-alt" },
    { id: "transactions", label: "Transactions", route: "/admin/transactions", icon: "fa-exchange-alt" },
    { id: "reports", label: "Reports", route: "/admin/reports", icon: "fa-chart-pie" },
    { id: "settings", label: "Settings", route: "/admin/settings", icon: "fa-cog" },
  ];

  const isActive = useCallback((route: string) => {
    if (route === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard" || location.pathname === "/admin";
    }
    return location.pathname === route || location.pathname.startsWith(route + "/");
  }, [location.pathname]);

  useEffect(() => {
    const index = quickAccessItems.findIndex(item => isActive(item.route));
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [location.pathname, isActive]);

  // Calculate positions - each item is 64px wide
  const itemWidth = 64;
  const indicatorSize = 50;
  const curveWidth = 72;
  const padding = 6;
  
  const indicatorLeft = (activeIndex * itemWidth) + (itemWidth / 2) - (indicatorSize / 2) + padding;
  const curveLeft = (activeIndex * itemWidth) + (itemWidth / 2) - (curveWidth / 2) + padding;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminMobileQuickNavStyles }} />
      
      <div className="admin-magic-nav-wrapper">
        <div className="admin-magic-nav-bar">
          {/* Curved cutout SVG */}
          <div className="admin-magic-nav-curve" style={{ left: `${curveLeft}px` }}>
            <svg viewBox="0 0 72 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M0 16C0 16 10 16 18 8C26 0 32 0 36 0C40 0 46 0 54 8C62 16 72 16 72 16H0Z" 
                fill="white"
              />
            </svg>
          </div>

          {/* Floating indicator circle */}
          <div 
            className="admin-magic-indicator-circle"
            style={{ left: `${indicatorLeft}px` }}
          >
            <i className={`fas ${quickAccessItems[activeIndex]?.icon} admin-magic-nav-icon in-circle`}></i>
          </div>

          {/* Nav items */}
          {quickAccessItems.map((item, index) => (
            <Link
              key={item.id}
              to={item.route}
              className="admin-magic-nav-link admin-magic-nav-item"
            >
              {/* Icon in bar */}
              <div className="admin-magic-nav-icon-wrapper">
                <i className={`fas ${item.icon} admin-magic-nav-icon ${index === activeIndex ? 'active' : ''}`}></i>
              </div>
              
              {/* Label inside bar */}
              <span className={`admin-magic-nav-label ${index === activeIndex ? 'active' : 'inactive'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default memo(AdminMobileQuickNav);
