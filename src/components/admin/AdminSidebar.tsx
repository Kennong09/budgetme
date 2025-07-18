import React, { useState, useEffect, FC, useTransition } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { isUserAdmin } from '../../utils/adminHelpers';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onToggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check admin status on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        startTransition(() => {
          setIsAdmin(false);
          setLoading(false);
        });
        return;
      }
      
      try {
        const adminStatus = await isUserAdmin();
        
        startTransition(() => {
          setIsAdmin(adminStatus);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        startTransition(() => {
          setIsAdmin(false);
          setLoading(false);
        });
      }
    };
    
    checkAdminStatus();
  }, [user]);
  
  const handleToggleSidebar = () => {
    onToggleSidebar();
  };
  
  // Show loading state when checking admin status
  if (loading || isPending || authLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }
  
  // If not admin, don't render the sidebar
  if (!isAdmin) {
    return null;
  }

  return (
    <ul
      className={`navbar-nav bg-gradient-danger sidebar sidebar-dark accordion 
        ${!isOpen && window.innerWidth >= 768 ? "toggled" : ""} 
        ${isMobile ? "mobile-sidebar" : ""}
        ${isOpen ? "" : "sidebar-compact"}`}
      id="accordionSidebar"
    >
      {/* Sidebar - Brand */}
      <Link
        className="sidebar-brand d-flex align-items-center justify-content-center"
        to="/admin/dashboard"
      >
        <div className="sidebar-brand-icon rotate-n-15">
          <i className="fas fa-shield-alt"></i>
        </div>
        <div className="sidebar-brand-text mx-3">
          {!isOpen ? "BM" : "Admin Panel"}
        </div>
      </Link>

      {/* Divider */}
      <hr className="sidebar-divider my-0" />

      {/* Nav Item - Dashboard */}
      <li className={`nav-item ${location.pathname === '/admin/dashboard' ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/dashboard">
          <i className="fas fa-fw fa-tachometer-alt"></i>
          <span>Dashboard</span>
        </Link>
      </li>

      {/* Divider */}
      <hr className="sidebar-divider" />

      {/* Heading */}
      <div className="sidebar-heading">
        Management
      </div>

      {/* Nav Item - Users */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/users') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/users">
          <i className="fas fa-fw fa-users"></i>
          <span>Users</span>
        </Link>
      </li>

      {/* Nav Item - Transactions */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/transactions') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/transactions">
          <i className="fas fa-fw fa-exchange-alt"></i>
          <span>Transactions</span>
        </Link>
      </li>

      {/* Nav Item - Budgets */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/budgets') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/budgets">
          <i className="fas fa-fw fa-wallet"></i>
          <span>Budgets</span>
        </Link>
      </li>

      {/* Nav Item - Goals */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/goals') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/goals">
          <i className="fas fa-fw fa-bullseye"></i>
          <span>Goals</span>
        </Link>
      </li>

      {/* Nav Item - Family */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/family') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/family">
          <i className="fas fa-fw fa-users"></i>
          <span>Family Groups</span>
        </Link>
      </li>

      {/* Divider */}
      <hr className="sidebar-divider" />

      {/* Heading */}
      <div className="sidebar-heading">
        Settings
      </div>

      {/* Nav Item - Settings */}
      <li className={`nav-item ${location.pathname.startsWith('/admin/settings') ? "active" : ""}`}>
        <Link className="nav-link" to="/admin/settings">
          <i className="fas fa-fw fa-cog"></i>
          <span>Settings</span>
        </Link>
      </li>

      {/* Divider */}
      <hr className="sidebar-divider d-none d-md-block" />

      {/* Sidebar Toggler (Sidebar) */}
      <div className="text-center d-none d-md-inline">
        <button className="rounded-circle border-0" id="sidebarToggle" onClick={handleToggleSidebar}>
          <i className={`fas fa-${isOpen ? "angle-left" : "angle-right"}`}></i>
        </button>
      </div>
    </ul>
  );
};

export default AdminSidebar; 