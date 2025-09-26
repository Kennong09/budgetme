import React, { useState, useEffect, useRef, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { getCurrentMonthYear } from "../../utils/helpers";
import { HeaderProps } from "../../types";
import { useClickOutside, useUserData } from "./shared/hooks";
import { SearchBar, NotificationDropdown, UserDropdown } from "./shared/components";
import { useNotifications } from "../../hooks/useNotifications";

const Header: FC<HeaderProps> = ({ toggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const userInfo = useUserData();
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Use real notifications from our notification system
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    loading: notificationsLoading,
    error: notificationsError
  } = useNotifications({
    limit: 10,
    enableRealTime: true
  });
  
  // Create refs for click outside detection
  const notificationRef = useRef<HTMLLIElement>(null);
  const userMenuRef = useRef<HTMLLIElement>(null);
  const mobileSearchRef = useRef<HTMLLIElement>(null);

  // Handle clicking outside of dropdowns
  useClickOutside(notificationRef, () => setShowNotifications(false), showNotifications);
  useClickOutside(userMenuRef, () => setShowUserMenu(false), showUserMenu);
  useClickOutside(mobileSearchRef, () => setShowMobileSearch(false), showMobileSearch);

  const toggleNotifications = (): void => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
    setShowMobileSearch(false);
  };

  const toggleUserMenu = (): void => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
    setShowMobileSearch(false);
  };
  
  const toggleMobileSearch = (): void => {
    setShowMobileSearch(!showMobileSearch);
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
      // Force redirect to login page
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handle notification interactions
  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark notification as read
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navigate to relevant page based on notification type
      if (notification.related_budget_id) {
        navigate(`/budget/${notification.related_budget_id}`);
      } else if (notification.related_goal_id) {
        navigate(`/goals/${notification.related_goal_id}`);
      } else if (notification.related_transaction_id) {
        navigate(`/transactions/${notification.related_transaction_id}`);
      } else if (notification.related_family_id) {
        navigate(`/family/${notification.related_family_id}`);
      }
      
      // Close dropdown
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleShowAllNotifications = () => {
    navigate('/notifications');
    setShowNotifications(false);
  };

  return (
    <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
      {/* Sidebar Toggle (Topbar) */}
      <button
        id="sidebarToggleTop"
        className="btn btn-primary d-md-none rounded-circle mr-3"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        style={{ 
          backgroundColor: '#6366f1', 
          color: 'white',
          width: '45px',
          height: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1100,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <i className="fa fa-bars fa-lg"></i>
      </button>

      {/* Current Month/Year */}
      <div className="ml-2 d-none d-sm-inline-block">
        <div className="text-primary font-weight-bold">
          <i className="fas fa-calendar mr-2"></i>
          {getCurrentMonthYear()}
        </div>
      </div>

      {/* Topbar Search - Hidden on xs screens */}
      <SearchBar 
        className="d-none d-sm-inline-block"
        onSearch={(query) => console.log("Search query:", query)}
        enableAutoComplete={true}
        showResults={true}
      />

      {/* Topbar Navbar */}
      <ul className="navbar-nav ml-auto">
        {/* Nav Item - Search Dropdown (Visible Only XS) */}
        <li className="nav-item dropdown no-arrow d-sm-none" ref={mobileSearchRef}>
          <SearchBar 
            showMobileVersion={true}
            mobileSearchOpen={showMobileSearch}
            onMobileToggle={toggleMobileSearch}
            onSearch={(query) => console.log("Mobile search query:", query)}
            enableAutoComplete={true}
            showResults={true}
          />
        </li>

        {/* Nav Item - Add Transaction - Full text on bigger screens, icon only on small */}
        <li className="nav-item mx-1">
          <Link to="/transactions/add" className="nav-link">
            <button className="btn btn-primary btn-sm rounded-pill shadow-sm">
              <i className="fas fa-plus fa-sm"></i>
              <span className="d-none d-sm-inline-block ml-1">Add Transaction</span>
            </button>
          </Link>
        </li>

        {/* Nav Item - Notifications */}
        <NotificationDropdown
          userId={user?.id}
          isOpen={showNotifications}
          onToggle={toggleNotifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllAsRead}
          onShowAll={handleShowAllNotifications}
          enableRealTimeUpdates={true}
          maxDisplayCount={5}
        />

        <div className="topbar-divider d-none d-sm-block"></div>

        {/* Nav Item - User Information */}
        <UserDropdown
          userInfo={userInfo}
          isOpen={showUserMenu}
          onToggle={toggleUserMenu}
          onLogout={handleLogout}
        />
      </ul>
    </nav>
  );
};

export default Header;