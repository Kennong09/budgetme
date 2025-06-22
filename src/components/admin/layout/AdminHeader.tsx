import React, { useState, useEffect, FC } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";

interface AdminHeaderProps {
  toggleSidebar: () => void;
}

const AdminHeader: FC<AdminHeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  
  useEffect(() => {
    // Set user info from auth context
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin");
      setUserAvatar(user.user_metadata?.avatar_url || "../images/placeholder.png");
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest(".dropdown")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  return (
    <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
      {/* Sidebar Toggle (Topbar) */}
      <button
        id="sidebarToggleTop"
        className="btn btn-link d-md-none rounded-circle mr-3"
        onClick={toggleSidebar}
      >
        <i className="fa fa-bars"></i>
      </button>

      {/* Admin Badge */}
      <div className="d-none d-md-block">
        <span className="badge badge-danger mr-2">
          <i className="fas fa-shield-alt mr-1"></i> Admin Panel
        </span>
      </div>

      {/* Topbar Search */}
      <form className="d-none d-sm-inline-block form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search">
        <div className="input-group">
          <input
            type="text"
            className="form-control bg-light border-0 small"
            placeholder="Search for..."
            aria-label="Search"
            aria-describedby="basic-addon2"
          />
          <div className="input-group-append">
            <button className="btn btn-danger" type="button">
              <i className="fas fa-search fa-sm"></i>
            </button>
          </div>
        </div>
      </form>

      {/* Topbar Navbar */}
      <ul className="navbar-nav ml-auto">
        {/* Nav Item - Search Dropdown (Visible Only XS) */}
        <li className="nav-item dropdown no-arrow d-sm-none">
          <a
            className="nav-link dropdown-toggle"
            href="#!"
            id="searchDropdown"
            role="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            onClick={(e) => {
              e.preventDefault();
              // Mobile search functionality
            }}
          >
            <i className="fas fa-search fa-fw"></i>
          </a>
        </li>

        {/* Nav Item - Alerts */}
        <li className="nav-item dropdown no-arrow mx-1">
          <a
            className="nav-link dropdown-toggle"
            href="#!"
            id="alertsDropdown"
            role="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i className="fas fa-bell fa-fw"></i>
            {/* Counter - Alerts */}
            <span className="badge badge-danger badge-counter">3+</span>
          </a>
        </li>

        {/* Nav Item - Messages */}
        <li className="nav-item dropdown no-arrow mx-1">
          <a
            className="nav-link dropdown-toggle"
            href="#!"
            id="messagesDropdown"
            role="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i className="fas fa-envelope fa-fw"></i>
            {/* Counter - Messages */}
            <span className="badge badge-danger badge-counter">7</span>
          </a>
        </li>

        <div className="topbar-divider d-none d-sm-block"></div>

        {/* Nav Item - User Information */}
        <li className="nav-item dropdown no-arrow">
          <a
            className="nav-link dropdown-toggle"
            href="#!"
            id="userDropdown"
            role="button"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown();
            }}
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <span className="mr-2 d-none d-lg-inline text-gray-600 small">
              {userName}
            </span>
            <img
              className="img-profile rounded-circle"
              src={userAvatar}
              alt="User avatar"
            />
          </a>
          {/* Dropdown - User Information */}
          <div
            className={`dropdown-menu dropdown-menu-right shadow animated--grow-in ${
              showDropdown ? "show" : ""
            }`}
            aria-labelledby="userDropdown"
          >
            <Link className="dropdown-item" to="/dashboard">
              <i className="fas fa-user fa-sm fa-fw mr-2 text-gray-400"></i>
              User Dashboard
            </Link>
            <Link className="dropdown-item" to="/admin/settings">
              <i className="fas fa-cogs fa-sm fa-fw mr-2 text-gray-400"></i>
              Admin Settings
            </Link>
            <div className="dropdown-divider"></div>
            <a
              className="dropdown-item"
              href="#!"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i>
              Logout
            </a>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default AdminHeader; 