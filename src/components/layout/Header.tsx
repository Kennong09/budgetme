import React, { useState, useRef, FC, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { getCurrentMonthYear } from "../../utils/helpers";
import { SearchBar, UserDropdown } from "./shared/components";

// CSS for logo animations matching landing page EXACTLY
const headerStyles = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* SlideDown animation for sticky header - matching landing page */
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  /* Sticky header animation */
  .mobile-header-sticky {
    animation: slideDown 0.5s ease;
  }

  /* Logo container hover effects - NO gap between icon and text */
  .mobile-logo-container {
    display: flex;
    align-items: center;
    gap: 0;
    text-decoration: none;
  }

  .mobile-logo-container:hover .mobile-logo-icon {
    transform: rotate(-15deg) scale(1.1);
  }

  .mobile-logo-container:hover .mobile-logo-text-primary {
    color: #4f46e5;
  }

  /* Tilted wallet icon - NO background, just the icon - matching landing page */
  .mobile-logo-icon {
    transform: rotate(-15deg);
    font-size: 1.8rem;
    transition: all 0.3s ease;
  }

  /* Logo text styling - matching landing page exactly */
  .mobile-logo-text {
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    transition: all 0.3s ease;
    margin-left: 0;
  }

  .mobile-logo-text-primary {
    color: #6366f1;
  }

  .mobile-logo-text-white {
    color: white;
  }
`;

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: FC<HeaderProps> = ({ onMenuToggle }) => {
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState({ name: '', email: '', profilePicture: '' });
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Set user info from auth context
  React.useEffect(() => {
    if (user) {
      setUserInfo({
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        profilePicture: user.user_metadata?.avatar_url || ''
      });
    }
  }, [user]);

  // Handle scroll for header theme change
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Create refs for click outside detection
  const userMenuRef = useRef<HTMLLIElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside of dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (showMobileSearch && mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowMobileSearch(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showMobileSearch]);

  // Memoized toggle functions
  const toggleUserMenu = useCallback((): void => {
    setShowUserMenu(!showUserMenu);
    setShowMobileSearch(false);
  }, [showUserMenu]);
  
  const toggleMobileSearch = useCallback((): void => {
    setShowMobileSearch(!showMobileSearch);
    setShowUserMenu(false);
  }, [showMobileSearch]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setShowUserMenu(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  // Check if we're on mobile (< 768px shows mobile header with hamburger)
  // Tablet (768px - 1024px) shows desktop header since sidebar is visible but collapsed
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile Header Layout with scroll-based theme
  // NOT scrolled: Indigo gradient background with WHITE icon/text
  // Scrolled: White background with #1f2937 (dark) icon/text (with slideDown animation)
  if (isMobileView) {
    return (
      <>
        {/* Inject styles */}
        <style dangerouslySetInnerHTML={{ __html: headerStyles }} />
        
        <header 
          className={`
            sticky top-0 z-40 w-full transition-all duration-300 ease-in-out
            ${isScrolled 
              ? "bg-white border-b border-slate-100 shadow-sm mobile-header-sticky" 
              : "bg-gradient-to-r from-[#6366f1] to-[#4f46e5] shadow-lg"
            }
          `}
        >
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left Section - Logo (tilted icon, no background, matching landing page) */}
            <Link to="/dashboard" className="mobile-logo-container">
              {/* Tilted wallet icon - NO background */}
              <i 
                className={`
                  fas fa-wallet mobile-logo-icon
                  ${isScrolled ? "text-[#6366f1]" : "text-white"}
                `}
              ></i>
              {/* Logo Text */}
              <span 
                className={`
                  mobile-logo-text
                  ${isScrolled ? "text-[#6366f1]" : "mobile-logo-text-white"}
                `}
              >
                BudgetMe
              </span>
            </Link>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={toggleMobileSearch}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95
                  ${isScrolled 
                    ? "text-slate-500 hover:text-[#6366f1] hover:bg-slate-100" 
                    : "text-white/80 hover:text-white hover:bg-white/20"
                  }
                `}
                aria-label="Search"
              >
                <i className="fas fa-search text-lg"></i>
              </button>

              {/* Add Transaction Button */}
              <Link to="/transactions/add">
                <button 
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95
                    ${isScrolled 
                      ? "bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg" 
                      : "bg-white text-[#6366f1] shadow-lg"
                    }
                  `}
                  style={{
                    boxShadow: isScrolled 
                      ? '0 4px 12px rgba(99, 102, 241, 0.25)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <i className="fas fa-plus text-sm font-bold"></i>
                </button>
              </Link>

              {/* Menu Button */}
              <button
                onClick={onMenuToggle}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95
                  ${isScrolled 
                    ? "text-slate-600 hover:text-[#6366f1] hover:bg-slate-100" 
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
                ${isScrolled 
                  ? "bg-white border-b border-slate-100" 
                  : "bg-[#4f46e5]"
                }
              `}
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            >
              <SearchBar 
                className="w-full"
                onSearch={(query) => {
                  console.log("Mobile search query:", query);
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
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Current Month/Year */}
          <div className="flex items-center space-x-2 text-indigo-600">
            <i className="fas fa-calendar text-indigo-500"></i>
            <span className="text-sm md:text-base font-semibold">
              {getCurrentMonthYear()}
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <SearchBar 
            className=""
            onSearch={(query) => console.log("Search query:", query)}
            enableAutoComplete={true}
            showResults={true}
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Add Transaction Button */}
          <Link to="/transactions/add">
            <button 
              className="flex items-center justify-center px-3 py-2 text-white text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none active:scale-95"
            >
              <i className="fas fa-plus text-xs mr-2"></i>
              <span>Add Transaction</span>
            </button>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* User Dropdown */}
          <UserDropdown
            userInfo={userInfo}
            isOpen={showUserMenu}
            onToggle={toggleUserMenu}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
};

// Memoize Header component for performance
export default memo(Header);