import React, { useState, useEffect, useRef, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { getCurrentMonthYear } from "../../utils/helpers";
import { HeaderProps } from "../../types";
import { getCurrentUserData } from "../../data/mockData";

interface Notification {
  id: number;
  text: string;
  time: string;
  isRead: boolean;
}

interface UserInfo {
  name: string;
  email: string;
  profilePicture?: string;
}

const Header: FC<HeaderProps> = ({ toggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    email: "",
    profilePicture: ""
  });
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Create refs for click outside detection
  const notificationRef = useRef<HTMLLIElement>(null);
  const userMenuRef = useRef<HTMLLIElement>(null);
  const mobileSearchRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    // Get user data from mock data service - load immediately
    loadUserData();
  }, [user]); // Re-run when auth user changes
  
  const loadUserData = () => {
    // Check if user is authenticated first
    if (!user) {
      // If not authenticated, clear user info
      setUserInfo({
        name: "",
        email: "",
        profilePicture: "../images/placeholder.png"
      });
      return;
    }
    
    // Use auth user data if available
    if (user) {
      const userData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
        email: user.email || "user@example.com",
        profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png"
      };
      setUserInfo(userData);
      return;
    }
    
    // Fallback to mock data only if authenticated but missing details
    const userData = getCurrentUserData();
    if (userData && userData.user) {
      // Cast userData.user to any to avoid type errors with properties
      const mockUser = userData.user as any;
      setUserInfo({
        name: mockUser.name || mockUser.full_name || mockUser.username || "User",
        email: mockUser.email || "user@example.com",
        profilePicture: mockUser.profilePicture || mockUser.avatar || "../images/placeholder.png"
      });
    }
  };
  
  // Handle clicking outside of dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current && 
        !notificationRef.current.contains(event.target as Node) &&
        showNotifications
      ) {
        setShowNotifications(false);
      }
      
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target as Node) &&
        showUserMenu
      ) {
        setShowUserMenu(false);
      }
      
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target as Node) &&
        showMobileSearch
      ) {
        setShowMobileSearch(false);
      }
    }
    
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Clean up event listener
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications, showUserMenu, showMobileSearch]);

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

  // Mock notifications
  const notifications: Notification[] = [
    {
      id: 1,
      text: "You exceeded your Food budget by $50",
      time: "10 minutes ago",
      isRead: false,
    },
    {
      id: 2,
      text: "Your monthly report is ready",
      time: "1 hour ago",
      isRead: false,
    },
    {
      id: 3,
      text: "New feature: Family budgeting is now available",
      time: "2 days ago",
      isRead: true,
    },
  ];

  // Count unread notifications
  const unreadCount: number = notifications.filter((n) => !n.isRead).length;

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
      <form className="d-none d-sm-inline-block form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search">
        <div className="input-group">
          <input
            type="text"
            className="form-control bg-light border-0 small rounded-pill shadow-sm"
            placeholder="Search for..."
            aria-label="Search"
            aria-describedby="basic-addon2"
          />
          <div className="input-group-append">
            <button className="btn btn-primary rounded-pill" type="button">
              <i className="fas fa-search fa-sm"></i>
            </button>
          </div>
        </div>
      </form>

      {/* Topbar Navbar */}
      <ul className="navbar-nav ml-auto">
        {/* Nav Item - Search Dropdown (Visible Only XS) */}
        <li className="nav-item dropdown no-arrow d-sm-none" ref={mobileSearchRef}>
          <button
            className="nav-link btn btn-link"
            type="button"
            onClick={toggleMobileSearch}
            aria-expanded={showMobileSearch}
            aria-label="Toggle search"
          >
            <i className="fas fa-search fa-fw"></i>
          </button>
          {/* Dropdown - Search */}
          {showMobileSearch && (
            <div
              className="dropdown-menu dropdown-menu-right p-3 shadow animated--grow-in show position-absolute"
              style={{ width: "calc(100vw - 2rem)", maxWidth: "300px" }}
            >
              <form className="form-inline mr-auto w-100 navbar-search">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-light border-0 small rounded-pill"
                    placeholder="Search for..."
                    aria-label="Search"
                  />
                  <div className="input-group-append">
                    <button className="btn btn-primary rounded-pill" type="button">
                      <i className="fas fa-search fa-sm"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
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
        <li className="nav-item dropdown no-arrow mx-1" ref={notificationRef}>
          <i 
            className="fas fa-bell fa-fw nav-icon position-relative"
            onClick={toggleNotifications}
            style={{ cursor: 'pointer' }}
            aria-label="Notifications"
          >
            {/* Notification Dot */}
            {unreadCount > 0 && (
              <span className="notification-dot"></span>
            )}
          </i>
          {/* Dropdown - Notifications */}
          {showNotifications && (
            <div
              className="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in show position-absolute"
              aria-labelledby="alertsDropdown"
              style={{ width: "calc(100vw - 2rem)", maxWidth: "350px" }}
            >
              <h6 className="dropdown-header">Notifications Center</h6>
              <div className="notification-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className="dropdown-item d-flex align-items-center"
                    type="button"
                  >
                    <div className="mr-3">
                      <div
                        className={`icon-circle bg-${notification.isRead ? "secondary" : "primary"}`}
                      >
                        <i className="fas fa-file-alt text-white"></i>
                      </div>
                    </div>
                    <div>
                      <div className={`small text-gray-500`}>
                        {notification.time}
                      </div>
                      <span
                        className={`${notification.isRead ? "" : "font-weight-bold"}`}
                      >
                        {notification.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                className="dropdown-item text-center small text-gray-500"
                type="button"
              >
                Show All Notifications
              </button>
            </div>
          )}
        </li>

        <div className="topbar-divider d-none d-sm-block"></div>

        {/* Nav Item - User Information */}
        <li className="nav-item dropdown no-arrow" ref={userMenuRef}>
          <button
            className="nav-link dropdown-toggle btn btn-link d-flex align-items-center"
            type="button"
            id="userDropdown"
            aria-haspopup="true"
            aria-expanded={showUserMenu}
            onClick={toggleUserMenu}
          >
            <span className="mr-2 d-none d-lg-inline text-gray-600 small">
              {userInfo.name}
            </span>
            <img
              className="img-profile rounded-circle border-2 shadow-sm"
              src={userInfo.profilePicture}
              alt={userInfo.name}
            />
          </button>
          {/* Dropdown - User Information */}
          {showUserMenu && (
            <div
              className="dropdown-menu dropdown-menu-right shadow animated--grow-in show position-absolute"
              aria-labelledby="userDropdown"
              style={{ width: "calc(100vw - 2rem)", maxWidth: "300px" }}
            >
              <div className="dropdown-item-user px-3 py-2 d-flex align-items-center">
                <div className="mr-3">
                  <img
                    src={userInfo.profilePicture}
                    alt={userInfo.name}
                    className="rounded-circle"
                    style={{ width: "40px", height: "40px" }}
                  />
                </div>
                <div>
                  <div className="font-weight-bold mb-0">{userInfo.name}</div>
                  <div className="text-muted small">{userInfo.email}</div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <Link className="dropdown-item" to="/profile">
                <i className="fas fa-user fa-sm fa-fw mr-2 text-gray-400"></i>
                Profile
              </Link>
              <Link className="dropdown-item" to="/settings">
                <i className="fas fa-cogs fa-sm fa-fw mr-2 text-gray-400"></i>
                Settings
              </Link>
              <Link className="dropdown-item" to="/help">
                <i className="fas fa-question-circle fa-sm fa-fw mr-2 text-gray-400"></i>
                Help & Support
              </Link>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                type="button"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i>
                Logout
              </button>
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Header;
