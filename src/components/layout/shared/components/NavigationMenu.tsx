import React, { FC, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Tooltip from "./Tooltip";

export interface NavItem {
  id: number;
  path: string;
  label: string;
  icon: string;
  isActive?: boolean;
}

export interface NavigationMenuProps {
  items: NavItem[];
  activeItemId: number | null;
  onItemClick?: (item: NavItem) => void;
  compactMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  onItemHover?: (itemId: number, label: string, event: React.MouseEvent<HTMLLIElement>) => void;
  onItemLeave?: () => void;
  variant?: "user" | "admin";
}

const NavigationMenu: FC<NavigationMenuProps> = ({
  items,
  activeItemId,
  onItemClick,
  compactMode,
  className = "",
  style = {},
  onItemHover,
  onItemLeave,
  variant = "user"
}) => {
  const navRefs = useRef<{[key: number]: HTMLLIElement | null}>({});
  const [showTooltip, setShowTooltip] = useState<{show: boolean, id: number | null, label: string}>({
    show: false,
    id: null,
    label: ""
  });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (itemId: number, label: string, event: React.MouseEvent<HTMLLIElement>) => {
    if (compactMode && onItemHover) {
      onItemHover(itemId, label, event);
    } else if (compactMode) {
      // Default tooltip behavior
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
    if (onItemLeave) {
      onItemLeave();
    } else {
      setShowTooltip({ show: false, id: null, label: "" });
    }
  };

  const handleNavigation = (item: NavItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const theme = variant === "admin" ? "danger" : "primary";

  return (
    <>
      {/* Nav Items */}
      {items.map((item) => (
        <li
          key={item.id}
          ref={el => navRefs.current[item.id] = el}
          className={`nav-item ${activeItemId === item.id ? "active" : ""}`}
          onMouseEnter={(e) => handleMouseEnter(item.id, item.label, e)}
          onMouseLeave={handleMouseLeave}
          style={activeItemId === item.id ? { backgroundColor: 'rgba(255, 255, 255, 0.1)' } : {}}
        >
          <Link
            className="nav-link"
            to={item.path}
            onClick={() => handleNavigation(item)}
            style={{
              color: '#ffffff !important',
              transition: 'all 0.2s ease',
            }}
          >
            <i 
              className={`fas ${item.icon} fa-fw`} 
              style={{ color: '#ffffff !important' }}
            ></i>
            {!compactMode && <span style={{ color: '#ffffff' }}>{item.label}</span>}
            {activeItemId === item.id && !compactMode && (
              <span className="position-absolute right-0 mr-3 pulse-dot"></span>
            )}
          </Link>
        </li>
      ))}

      {/* Tooltip for compact mode */}
      <Tooltip 
        show={showTooltip.show && compactMode}
        text={showTooltip.label}
        position={tooltipPosition}
        theme={theme}
      />
    </>
  );
};

export default NavigationMenu;