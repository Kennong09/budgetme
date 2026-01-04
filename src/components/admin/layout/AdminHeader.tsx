import React, { useState, useEffect, useRef, FC, useTransition, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../utils/AuthContext";
import { AdminSearchBar } from "./shared/components";

// CSS for admin header - matching user header style with red theme
const adminHeaderStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }

  .admin-mobile-header-sticky {
    animation: slideDown 0.5s ease;
  }

  .admin-mobile-logo-container {
    display: flex;
    align-items: center;
    gap: 0;
    text-decoration: none;
  }

  .admin-mobile-logo-container:hover .admin-mobile-logo-icon {
    transform: scale(1.1);
  }

  .admin-mobile-logo-icon {
    font-size: 1.5rem;
    transition: all 0.3s ease;
  }

  .admin-mobile-logo-text {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    transition: all 0.3s ease;
    margin-left: 8px;
  }
`;

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

const AdminHeader: FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userInfo, setUserInfo] = useState({ name: '', email: '', profilePicture: '' });
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  // Mobile view: < 768px shows mobile header with hamburger
  // Tablet (768px - 1024px) shows desktop header since sidebar is visible but collapsed
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
  const userMenuRef = useRef<HTMLLIElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (user) {
      startTransition(() => {
        setUserInfo({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
          email: user.email || '',
          profilePicture: user.user_metadata?.avatar_url || '../images/placeholder.png'
        });
      });
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest(".dropdown")) {
        setShowDropdown(false);
      }
      if (showMobileSearch && mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowMobileSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown, showMobileSearch]);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate]);

  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
    setShowMobileSearch(false);
  }, []);

  const toggleMobileSearch = useCallback(() => {
    setShowMobileSearch(prev => !prev);
    setShowDropdown(false);
  }, []);

  if (isPending || isLoading) {
    return (
      <nav className="h-16 bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
      </nav>
    );
  }

  // Mobile Header Layout
  if (isMobileView) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: adminHeaderStyles }} />
        
        <header 
          className={`
            sticky top-0 z-40 w-full transition-all duration-300 ease-in-out
            ${isScrolled 
              ? "bg-white border-b border-slate-100 shadow-sm admin-mobile-header-sticky" 
              : "bg-gradient-to-r from-[#ef4444] to-[#dc2626] shadow-lg"
            }
          `}
        >
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left Section - Logo */}
            <Link to="/admin/dashboard" className="admin-mobile-logo-container">
              <i 
                className={`fas fa-shield-alt admin-mobile-logo-icon ${isScrolled ? "text-[#ef4444]" : "text-white"}`}
              ></i>
              <span className={`admin-mobile-logo-text ${isScrolled ? "text-[#ef4444]" : "text-white"}`}>
                Admin
              </span>
            </Link>

            {/* Admin Badge */}
            <div className={`px-2 py-1 rounded-full ${isScrolled ? "bg-red-100" : "bg-white/20"}`}>
              <span className={`text-xs font-bold ${isScrolled ? "text-red-600" : "text-white"}`}>ADMIN</span>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={toggleMobileSearch}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95
                  ${isScrolled 
                    ? "text-slate-500 hover:text-red-500 hover:bg-slate-100" 
                    : "text-white/80 hover:text-white hover:bg-white/20"
                  }
                `}
                aria-label="Search"
              >
                <i className="fas fa-search text-lg"></i>
              </button>

              {/* Menu Button */}
              <button
                onClick={onMenuToggle}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95
                  ${isScrolled 
                    ? "text-slate-600 hover:text-red-500 hover:bg-slate-100" 
                    : "text-white/80 hover:text-white hover:bg-white/20"
                  }
                `}
                aria-label="Toggle menu"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>
          </div>

          {/* Mobile Search Dropdown */}
          {showMobileSearch && (
            <div 
              ref={mobileSearchRef}
              className={`
                absolute top-full left-0 right-0 p-4 shadow-lg transition-all duration-300
                ${isScrolled ? "bg-white border-b border-slate-100" : "bg-[#dc2626]"}
              `}
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            >
              <AdminSearchBar
                className="w-full"
                onSearch={(query) => {
                  console.log("Admin mobile search query:", query);
                  setShowMobileSearch(false);
                }}
                enableAutoComplete={true}
                showResults={true}
              />
            </div>
          )}
        </header>
      </>
    );
  }

  // Desktop Header Layout
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminHeaderStyles }} />
      
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left Section - Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors">
              <i className="fas fa-shield-alt text-xl"></i>
              <span className="font-bold text-lg">BudgetMe Admin</span>
            </Link>
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
              ADMIN PANEL
            </span>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-4">
            <AdminSearchBar
              className=""
              onSearch={(query) => console.log("Admin search query:", query)}
              enableAutoComplete={true}
              showResults={true}
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* User Dashboard Link */}
            <Link 
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              <i className="fas fa-home text-sm"></i>
              <span className="text-sm font-medium hidden xl:inline">User Dashboard</span>
            </Link>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200"></div>

            {/* User Dropdown */}
            <div className="relative dropdown">
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-all duration-200"
              >
                <span className="text-sm font-medium text-slate-600 hidden lg:inline">{userInfo.name}</span>
                <img
                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                  src={userInfo.profilePicture}
                  alt="User avatar"
                />
                <i className={`fas fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}></i>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <i className="fas fa-user text-slate-400 w-4"></i>
                    User Dashboard
                  </Link>
                  <Link 
                    to="/admin/settings" 
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <i className="fas fa-cog text-slate-400 w-4"></i>
                    Admin Settings
                  </Link>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <i className="fas fa-sign-out-alt w-4"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AdminHeader;