import React, { useState, FC, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import "../../assets/css/landing.css";
import "boxicons/css/boxicons.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import DashboardAnimation from "./DashboardAnimation";
import Header from "./Header";
import Footer from "./Footer";
import {
  DashboardAnimation as DashboardModuleAnimation,
  TransactionsAnimation,
  BudgetsAnimation,
  GoalsAnimation,
  FamilyAnimation,
  AIPredictionsAnimation,
} from "./ModuleAnimations";
// Import SVG Icons
import { ReactComponent as GoogleIcon } from "../../assets/icons/google-original.svg";
import { ReactComponent as FacebookIcon } from "../../assets/icons/facebook-original.svg";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import EmailVerificationModal from "../auth/EmailVerificationModal";

interface LandingPageProps {}

const LandingPage: FC<LandingPageProps> = () => {
  const { 
    signIn, 
    signUp, 
    resetUserPassword, 
    signInWithOAuth, 
    loading, 
    error,
    clearError,
    verificationEmail,
    showEmailVerificationModal,
    setShowEmailVerificationModal,
    resetPasswordSuccess,
    setResetPasswordSuccess,
    signUpSuccess,
    signInSuccess
  } = useAuth();
  
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [resetEmail, setResetEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [loginPasswordVisible, setLoginPasswordVisible] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [modalScrollPosition, setModalScrollPosition] = useState<number>(0);
  
  // Refs for the sections for auto-scrolling
  const featuresRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const testimonialsRef = useRef<HTMLElement>(null);
  const modulesRef = useRef<HTMLElement>(null);
  const loginModalRef = useRef<HTMLDivElement>(null);
  const registerModalRef = useRef<HTMLDivElement>(null);
  const forgotPasswordModalRef = useRef<HTMLDivElement>(null);
  
  // Animation states for elements that need to animate on scroll
  const [animatedSections, setAnimatedSections] = useState<{[key: string]: boolean}>({
    features: false,
    howItWorks: false,
    testimonials: false,
    modules: false,
  });
  
  const navigate = useNavigate();

  // Handle scroll-triggered animations
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Check if refs are available
      const featuresPosition = featuresRef.current?.offsetTop ?? 0;
      const howItWorksPosition = howItWorksRef.current?.offsetTop ?? 0;
      const testimonialsPosition = testimonialsRef.current?.offsetTop ?? 0;
      const modulesPosition = modulesRef.current?.offsetTop ?? 0;

      // Set animation states based on scroll position
      setAnimatedSections({
        features: scrollPosition > featuresPosition - viewportHeight * 0.8,
        howItWorks: scrollPosition > howItWorksPosition - viewportHeight * 0.8,
        testimonials: scrollPosition > testimonialsPosition - viewportHeight * 0.8,
        modules: scrollPosition > modulesPosition - viewportHeight * 0.8,
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Function to scroll to a section
  const scrollToSection = (sectionRef: React.RefObject<HTMLElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Form validation
  const validateForm = (form: 'login' | 'register' | 'resetPassword'): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (form === 'login' || form === 'register') {
      if (!email) {
        errors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.email = "Email address is invalid";
      }
      
      if (!password) {
        errors.password = "Password is required";
      } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
    }
    
    if (form === 'register') {
      if (!name) {
        errors.name = "Name is required";
      }
      
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    
    if (form === 'resetPassword') {
      if (!resetEmail) {
        errors.resetEmail = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(resetEmail)) {
        errors.resetEmail = "Email address is invalid";
      }
    }
    
    setFormErrors(errors);
    
    // Only show form validation errors, not toasts
    // Removing toast notification for validation errors
    
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm('login')) return;
    
    clearError();
    try {
      await signIn(email, password);
      
      // If login is successful, close the modal
      if (signInSuccess) {
        setShowLoginModal(false);
        showSuccessToast("Successfully logged in!");
      }
    } catch (err) {
      console.error('Login error:', err);
      // Only show error toast for backend/API errors, not validation errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast("Failed to log in. Please try again.");
      }
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm('register')) return;
    
    clearError();
    try {
      await signUp(email, password, name);
      
      // Close register modal - email verification modal will be shown by AuthContext
      if (signUpSuccess) {
        setShowRegisterModal(false);
        showSuccessToast("Account created successfully!");
      }
    } catch (err) {
      console.error('Registration error:', err);
      // Only show error toast for backend/API errors, not validation errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast("Failed to create account. Please try again.");
      }
    }
  };

  // Handle social login
  const handleSocialLogin = async (provider: string): Promise<void> => {
    clearError();
    
    try {
      // Convert provider string to Provider type
      if (provider === 'google' || provider === 'facebook') {
        await signInWithOAuth(provider);
      }
    } catch (err) {
      console.error(`${provider} login error:`, err);
      // Only show error toast for backend/API errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast(`Failed to sign in with ${provider}. Please try again.`);
      }
    }
  };

  // Add autoscroll effect for modals
  useEffect(() => {
    const modalElement = showLoginModal ? loginModalRef.current : registerModalRef.current;
    
    if (modalElement) {
      let lastScrollTop = 0;
      const scrollStep = 30; // Pixels to scroll per animation frame
      let animationFrameId: number | null = null;
      
      const scrollAnimation = () => {
        if (modalElement) {
          const currentScrollTop = modalElement.scrollTop;
          
          if (Math.abs(currentScrollTop - modalScrollPosition) > 5) {
            // Calculate the next scroll position with easing
            const direction = modalScrollPosition > currentScrollTop ? 1 : -1;
            const step = Math.min(scrollStep, Math.abs(modalScrollPosition - currentScrollTop));
            modalElement.scrollTop += direction * step;
            
            // Continue animation
            animationFrameId = requestAnimationFrame(scrollAnimation);
          }
        }
      };
      
      animationFrameId = requestAnimationFrame(scrollAnimation);
      
      // Cleanup
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [modalScrollPosition, showLoginModal, showRegisterModal]);

  // Add handler for forgot password
  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm('resetPassword')) return;
    
    setIsResettingPassword(true);
    clearError();
    
    try {
      await resetUserPassword(resetEmail);
      
      setIsResettingPassword(false);
      
      // Show success modal instead of alert
      if (resetPasswordSuccess) {
        setShowForgotPasswordModal(false);
        setShowResetSuccessModal(true);
        showSuccessToast("Password reset email sent!");
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setIsResettingPassword(false);
      // Only show error toast for backend/API errors, not validation errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast("Failed to send reset email. Please try again.");
      }
    }
  };

  return (
    <div className="landing-page">
      <Header onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} />
      
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text animate__animated animate__fadeInLeft">
            <h1>
              <span className="text-black font-bold">Take Control</span> <br /> Your Finances
            </h1>
            <p>
              BudgetMe helps you track expenses, manage budgets, and reach your
              financial goals with powerful tools designed for everyone.
            </p>
            <div className="hero-buttons">
              <button
                className="btn-primary get-started"
                onClick={() => setShowRegisterModal(true)}
              >
                Get Started - It's Free <i className="bx bx-right-arrow-alt"></i>
              </button>
              <button
                className="btn-secondary explore-features"
                onClick={() => scrollToSection(featuresRef)}
              >
                <span>Explore Features</span> <i className="bx bx-chevron-down"></i>
              </button>
            </div>
          </div>
          <div className="hero-image animate__animated animate__fadeInRight">
            <DashboardAnimation />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className={`features-section ${animatedSections.features ? 'section-animated' : ''}`}>
        <div className="section-heading">
          <h2>Features That Make Budgeting Easy</h2>
          <p>Everything you need to manage your money efficiently</p>
        </div>

        <div className="features-container">
          {/* Expense Tracking Feature */}
          <div className={`feature-item ${animatedSections.features ? 'animate__animated animate__fadeInRight' : ''}`}>
            <div className="feature-content">
              <h3>Expense Tracking</h3>
              <p>
                Easily record and categorize your expenses to see where your money
                goes.
              </p>
              <div className="feature-details">
                <div className="feature-tag">Real-time</div>
                <div className="feature-tag">Categorized</div>
                <div className="feature-tag">Insights</div>
              </div>
            </div>
            <div className="feature-visual">
              <div className="feature-circle" style={{ backgroundColor: '#4F46E5' }}>
                <i className="bx bxs-wallet" style={{ color: '#ffffff', fontSize: '2.5rem' }}></i>
              </div>
              <div className="feature-bg-element" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)' }}></div>
            </div>
          </div>
          
          {/* Budget Management Feature */}
          <div className={`feature-item reverse ${animatedSections.features ? 'animate__animated animate__fadeInLeft animation-delay-200' : ''}`}>
            <div className="feature-content">
              <h3>Budget Management</h3>
              <p>
                Create custom budgets for different spending categories and track
                your progress.
              </p>
              <div className="feature-details">
                <div className="feature-tag">Custom Categories</div>
                <div className="feature-tag">Goals</div>
                <div className="feature-tag">Alerts</div>
              </div>
            </div>
            <div className="feature-visual">
              <div className="feature-circle" style={{ backgroundColor: '#10B981' }}>
                <i className="bx bxs-bar-chart-alt-2" style={{ color: '#ffffff', fontSize: '2.5rem' }}></i>
              </div>
              <div className="feature-bg-element" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}></div>
            </div>
          </div>
          
          {/* Financial Goals Feature */}
          <div className={`feature-item ${animatedSections.features ? 'animate__animated animate__fadeInRight animation-delay-400' : ''}`}>
            <div className="feature-content">
              <h3>Financial Goals</h3>
              <p>
                Set savings goals and track your progress toward achieving them.
              </p>
              <div className="feature-details">
                <div className="feature-tag">Progress Tracking</div>
                <div className="feature-tag">Milestones</div>
                <div className="feature-tag">Reminders</div>
              </div>
            </div>
            <div className="feature-visual">
              <div className="feature-circle" style={{ backgroundColor: '#F59E0B' }}>
                <i className="bx bxs-trophy" style={{ color: '#ffffff', fontSize: '2.5rem' }}></i>
              </div>
              <div className="feature-bg-element" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} id="how-it-works" className={`how-it-works-section ${animatedSections.howItWorks ? 'section-animated' : ''}`}>
        <div className="section-heading">
          <h2>How BudgetMe Works</h2>
          <p>Start managing your finances in three simple steps</p>
        </div>

        <div className="steps-container">
          <div className={`step ${animatedSections.howItWorks ? 'animate__animated animate__fadeInLeft' : ''}`}>
            <div className="step-number">
              <i className="bx bx-user-plus"></i>
            </div>
            <div className="step-content">
              <h3>Sign Up for Free</h3>
              <p>
                Create your account in seconds with just an email and password.
              </p>
            </div>
          </div>

          <div
            className={`step ${animatedSections.howItWorks ? 'animate__animated animate__fadeInLeft animation-delay-300' : ''}`}
          >
            <div className="step-number">
              <i className="bx bx-money"></i>
            </div>
            <div className="step-content">
              <h3>Set Up Your Budget</h3>
              <p>
                Define your income sources, create expense categories, and set
                budget limits.
              </p>
            </div>
          </div>

          <div
            className={`step ${animatedSections.howItWorks ? 'animate__animated animate__fadeInLeft animation-delay-600' : ''}`}
          >
            <div className="step-number">
              <i className="bx bx-line-chart"></i>
            </div>
            <div className="step-content">
              <h3>Track & Analyze</h3>
              <p>
                Record your transactions and view insights to improve your
                financial habits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} id="testimonials" className={`testimonials-section ${animatedSections.testimonials ? 'section-animated' : ''}`}>
        <div className="section-heading">
          <h2>What Our Users Say</h2>
          <p>
            Join thousands of satisfied users who have transformed their
            finances
          </p>
        </div>

        <div className="testimonials-grid">
          <div className={`testimonial-card ${animatedSections.testimonials ? 'animate__animated animate__fadeInUp' : ''}`}>
            <div className="testimonial-content">
              <p>
                "BudgetMe helped me save enough for a down payment on my house
                in just 18 months. The goal tracking feature is fantastic!"
              </p>
            </div>
            <div className="testimonial-author">
              <img
                src="../images/placeholder.png"
                alt="Placeholder User"
              />
              <div>
                <h4>Placeholder Name</h4>
                <p>Placeholder Occupation</p>
              </div>
            </div>
          </div>

          <div
            className={`testimonial-card ${animatedSections.testimonials ? 'animate__animated animate__fadeInUp animation-delay-300' : ''}`}
          >
            <div className="testimonial-content">
              <p>
                "As a freelancer with irregular income, BudgetMe has been a
                game-changer for managing my finances and tax planning."
              </p>
            </div>
            <div className="testimonial-author">
              <img
                src="../images/placeholder.png"
                alt="Placeholder User"
              />
              <div>
                <h4>Placeholder Name</h4>
                <p>Placeholder Occupation</p>
              </div>
            </div>
          </div>

          <div
            className={`testimonial-card ${animatedSections.testimonials ? 'animate__animated animate__fadeInUp animation-delay-600' : ''}`}
          >
            <div className="testimonial-content">
              <p>
                "The visual reports helped me identify and cut unnecessary
                expenses. I'm now saving an extra $400 every month!"
              </p>
            </div>
            <div className="testimonial-author">
              <img
                src="../images/placeholder.png"
                alt="Placeholder User"
              />
              <div>
                <h4>Placeholder Name</h4>
                <p>Placeholder Occupation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section - Replacing Pricing */}
      <section ref={modulesRef} id="modules" className={`modules-section ${animatedSections.modules ? 'section-animated' : ''}`}>
        <div className="section-heading">
          <h2>Powerful Modules for Complete Financial Management</h2>
          <p>
            All the tools you need to take control of your finances in one app
          </p>
        </div>

        <div className="module-grid">
          <div className="modules-row">
            <DashboardModuleAnimation animated={animatedSections.modules} />
            <TransactionsAnimation animated={animatedSections.modules} />
            <BudgetsAnimation animated={animatedSections.modules} />
          </div>
          <div className="modules-row">
            <GoalsAnimation animated={animatedSections.modules} />
            <FamilyAnimation animated={animatedSections.modules} />
            <AIPredictionsAnimation animated={animatedSections.modules} />
          </div>
        </div>

        <div className={`cta-container ${animatedSections.modules ? 'animate__animated animate__fadeInUp' : ''}`}>
          <div className="cta-icon">
            <i className="bx bx-rocket"></i>
          </div>
          <h3>Ready to transform your financial life?</h3>
          <button
            className="btn-primary get-started-large"
            onClick={() => setShowRegisterModal(true)}
          >
            Get Started for Free <i className="bx bx-right-arrow-alt"></i>
          </button>
        </div>
      </section>

      <Footer />

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowLoginModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowLoginModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={loginModalRef}>
              <h2 className="modal-title text-center mb-6">Welcome Back!</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleLogin(e);
              }}>
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <div className={`input-with-icon ${formErrors.email ? 'input-error' : ''}`}>
                    <i className="bx bx-envelope"></i>
                    <input
                      type="email"
                      id="login-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="enhanced-input"
                      required
                    />
                  </div>
                  {formErrors.email && <div className="error-message">{formErrors.email}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className={`input-with-icon password-field ${formErrors.password ? 'input-error' : ''}`}>
                    <i className="bx bx-lock-alt"></i>
                    <input
                      type={loginPasswordVisible ? "text" : "password"}
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="enhanced-input"
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setLoginPasswordVisible(!loginPasswordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${loginPasswordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                  </div>
                  {formErrors.password && <div className="error-message">{formErrors.password}</div>}
                </div>
                
                <div className="form-options">
                  <div className="remember-me">
                    <input 
                      type="checkbox" 
                      id="remember-me" 
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="custom-checkbox"
                    />
                    <label htmlFor="remember-me">Remember me</label>
                  </div>
                  <button
                    type="button"
                    className="text-btn forgot-password"
                    onClick={() => {
                      setShowLoginModal(false);
                      setTimeout(() => setShowForgotPasswordModal(true), 300);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <button 
                  type="submit" 
                  className="btn-primary btn-block login-btn" 
                  disabled={loading}
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: loading ? "scale(0.98)" : "scale(1)"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {loading ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Logging In...
                    </>
                  ) : 'Log In'}
                </button>

                <div className="social-login">
                  <p>Or log in with</p>
                  <div className="social-buttons">
                    <button 
                      type="button"
                      className="social-btn google"
                      onClick={() => handleSocialLogin('google')}
                    >
                      <GoogleIcon className="social-icon" />
                      <span>Google</span>
                    </button>
                    <button 
                      type="button"
                      className="social-btn facebook"
                      onClick={() => handleSocialLogin('facebook')}
                    >
                      <FacebookIcon className="social-icon" />
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Don't have an account?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowLoginModal(false);
                    setTimeout(() => setShowRegisterModal(true), 300);
                  }}
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowRegisterModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={registerModalRef}>
              <h2 className="modal-title text-center mb-6">Join BudgetMe Today</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleRegister(e);
              }}>
                <div className="form-group">
                  <label htmlFor="register-name">Full Name</label>
                  <div className={`input-with-icon ${formErrors.name ? 'input-error' : ''}`}>
                    <i className="bx bx-user"></i>
                    <input
                      type="text"
                      id="register-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="enhanced-input"
                      required
                    />
                  </div>
                  {formErrors.name && <div className="error-message">{formErrors.name}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">Email</label>
                  <div className={`input-with-icon ${formErrors.email ? 'input-error' : ''}`}>
                    <i className="bx bx-envelope"></i>
                    <input
                      type="email"
                      id="register-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="enhanced-input"
                      required
                    />
                  </div>
                  {formErrors.email && <div className="error-message">{formErrors.email}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <div className={`input-with-icon password-field ${formErrors.password ? 'input-error' : ''}`}>
                    <i className="bx bx-lock-alt"></i>
                    <input
                      type={passwordVisible ? "text" : "password"}
                      id="register-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password (min. 8 characters)"
                      className="enhanced-input"
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${passwordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                  </div>
                  {formErrors.password && <div className="error-message">{formErrors.password}</div>}
                  <div className="password-strength">
                    <div className={`strength-meter ${password.length > 0 ? (password.length >= 8 ? 'strong' : 'weak') : ''}`}></div>
                    <span className="strength-text">{password.length > 0 ? (password.length >= 8 ? 'Strong' : 'Weak') : ' '}</span>
                  </div>
                </div>
                
                {/* Confirm Password Field */}
                <div className="form-group">
                  <label htmlFor="register-confirm-password">Confirm Password</label>
                  <div className={`input-with-icon password-field ${formErrors.confirmPassword ? 'input-error' : ''}`}>
                    <i className="bx bx-lock-alt"></i>
                    <input
                      type={confirmPasswordVisible ? "text" : "password"}
                      id="register-confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="enhanced-input"
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${confirmPasswordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                  </div>
                  {formErrors.confirmPassword && <div className="error-message">{formErrors.confirmPassword}</div>}
                </div>
                
                {/* Terms and Conditions Checkbox */}
                <div className="form-group terms-container">
                  <input type="checkbox" id="terms" required className="custom-checkbox" />
                  <label htmlFor="terms">
                    I agree to the <a href="/#terms">Terms of Service</a> and{" "}
                    <a href="/#privacy">Privacy Policy</a>
                  </label>
                </div>
                <button 
                  type="submit" 
                  className="btn-primary btn-block register-btn"
                  disabled={loading}
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: "scale(1)"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {loading ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Creating Account...
                    </>
                  ) : 'Create Account'}
                </button>

                <div className="social-login">
                  <p>Or sign up with</p>
                  <div className="social-buttons">
                    <button 
                      type="button"
                      className="social-btn google"
                      onClick={() => handleSocialLogin('google')}
                    >
                      <GoogleIcon className="social-icon" />
                      <span>Google</span>
                    </button>
                    <button 
                      type="button"
                      className="social-btn facebook"
                      onClick={() => handleSocialLogin('facebook')}
                    >
                      <FacebookIcon className="social-icon" />
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Already have an account?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setTimeout(() => setShowLoginModal(true), 300);
                  }}
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowForgotPasswordModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowForgotPasswordModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={forgotPasswordModalRef}>
              <h2 className="modal-title text-center mb-6">Reset Your Password</h2>
              <p className="text-center mb-4">Enter your email address and we'll send you a link to reset your password.</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword(e);
              }}>
                <div className="form-group">
                  <label htmlFor="reset-email">Email</label>
                  <div className={`input-with-icon ${formErrors.resetEmail ? 'input-error' : ''}`}>
                    <i className="bx bx-envelope"></i>
                    <input
                      type="email"
                      id="reset-email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="enhanced-input"
                      required
                    />
                  </div>
                  {formErrors.resetEmail && <div className="error-message">{formErrors.resetEmail}</div>}
                </div>
                
                <button 
                  type="submit" 
                  className="btn-primary btn-block"
                  disabled={isResettingPassword}
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: isResettingPassword ? "scale(0.98)" : "scale(1)"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {isResettingPassword ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Sending Reset Link...
                    </>
                  ) : 'Reset Password'}
                </button>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Remember your password?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setTimeout(() => setShowLoginModal(true), 300);
                  }}
                >
                  Back to Login
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Success Modal */}
      {showResetSuccessModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowResetSuccessModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowResetSuccessModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body text-center">
              <div className="success-icon mb-4">
                <i className="bx bx-check-circle text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="modal-title mb-4">Password Reset Email Sent</h2>
              <p className="mb-4">
                We've sent a password reset link to: <strong>{resetEmail}</strong>
              </p>
              <p className="mb-4">
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <div className="reset-instructions">
                <p><i className="bx bx-info-circle"></i> If you don't see the email, check your spam folder</p>
                <p><i className="bx bx-time"></i> The link will expire after 24 hours</p>
              </div>
              <button 
                className="btn-primary mt-4"
                onClick={() => {
                  setShowResetSuccessModal(false);
                  setResetEmail("");
                  setResetPasswordSuccess(false);
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerificationModal}
        onClose={() => setShowEmailVerificationModal(false)}
        email={verificationEmail}
        error={error}
      />
    </div>
  );
};

export default LandingPage;
