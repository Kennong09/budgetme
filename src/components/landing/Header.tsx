import React, { useState, FC, useEffect } from "react";
import { useScrollPosition } from "../../utils/useScrollPosition";
import { useLocation, Link } from "react-router-dom";
import '../../assets/css/header.css';

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  forceFeatureHeader?: boolean;
}

const Header: FC<HeaderProps> = ({ onLoginClick, onRegisterClick, forceFeatureHeader = false }) => {
  const scrollPosition = useScrollPosition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  
  // Check if we're on a feature details page or if forceFeatureHeader is true
  const isFeatureDetailsPage = location.pathname.includes('/features/') || forceFeatureHeader;
  
  // Handle screen resize and set mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close menu when clicking outside in mobile view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest('.landing-nav')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`landing-header ${scrollPosition > 50 ? "sticky-header" : isFeatureDetailsPage ? "feature-header" : ""}`}>
      <nav className="landing-nav">
        <div className="landing-logo animate__animated animate__fadeIn">
          {isFeatureDetailsPage ? (
            <Link to="/" className="back-button" aria-label="Back to home">
              <i className="bx bx-chevron-left"></i>
            </Link>
          ) : null}
          <div className="rotate-n-15">
            <i className={`fas fa-wallet ${scrollPosition > 50 ? "text-white" : isFeatureDetailsPage ? "text-primary-landing" : "text-primary-landing"} text-4xl`}></i>
          </div>
          <span>BudgetMe</span>
        </div>
        
        {isMobile && (
          <div className="mobile-header-buttons">
            {isFeatureDetailsPage ? (
              <Link to="/" className="mobile-back-btn" aria-label="Back to home">
                <i className="bx bx-home"></i>
              </Link>
            ) : (
              <>
                <button 
                  className="mobile-login-btn" 
                  onClick={onLoginClick}
                  aria-label="Log in"
                  title="Log in"
                >
                  <i className="bx bx-log-in"></i>
                </button>
                <button 
                  className="mobile-signup-btn"
                  onClick={onRegisterClick}
                  aria-label="Sign up"
                  title="Sign up"
                >
                  <i className="bx bx-user-plus"></i>
                </button>
              </>
            )}
          </div>
        )}
        
        <div className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <i className={`bx ${isMenuOpen ? "bx-x" : "bx-menu"}`}></i>
        </div>
        
        <div className={`landing-menu ${isMenuOpen ? "open" : ""}`}>
          {isFeatureDetailsPage ? (
            <Link to="/" className="nav-link-animation home-link" onClick={() => isMobile && setIsMenuOpen(false)}>
              <i className="bx bx-home"></i> Home
            </Link>
          ) : (
            <>
              <a href="#features" className="nav-link-animation" onClick={() => isMobile && setIsMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="nav-link-animation" onClick={() => isMobile && setIsMenuOpen(false)}>How it Works</a>
              <a href="#testimonials" className="nav-link-animation" onClick={() => isMobile && setIsMenuOpen(false)}>Testimonials</a>
              <a href="#modules" className="nav-link-animation" onClick={() => isMobile && setIsMenuOpen(false)}>Modules</a>
            </>
          )}
          <div className="menu-buttons">
            <button
              className="btn-primary-outline"
              onClick={() => {
                onLoginClick();
                isMobile && setIsMenuOpen(false);
              }}
            >
              Log In
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                onRegisterClick();
                isMobile && setIsMenuOpen(false);
              }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;