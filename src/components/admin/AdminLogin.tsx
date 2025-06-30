import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { isUserAdmin } from '../../utils/adminHelpers';
import Meta from '../layout/Meta';
import '../admin/admin.css';

const AdminLogin: React.FC = () => {
  const { signIn, loading, error, clearError, user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  // Check URL parameters for access_denied flag
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('access_denied') === 'true') {
      setAccessDenied(true);
      showErrorToast("Access denied: You don't have admin privileges");
    }
  }, [location, showErrorToast]);

  // Check if user is already logged in and is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        // Check if user has admin role
        const adminStatus = await isUserAdmin();
        
        if (adminStatus) {
          // If admin, redirect to admin dashboard
          navigate('/admin/dashboard');
        } else {
          // If not admin, show access denied message
          setAccessDenied(true);
        }
      }
      setCheckingAdmin(false);
    };
    
    checkAdminStatus();
  }, [user, navigate]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }
    
    if (!password) {
      errors.password = "Password is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;
    
    clearError();
    try {
      await signIn(email, password);
      
      // After login, check if user is admin
      const adminStatus = await isUserAdmin();
      
      if (adminStatus) {
        showSuccessToast("Successfully logged in as admin");
        navigate('/admin/dashboard');
      } else {
        // If not admin, show access denied message
        setAccessDenied(true);
        showErrorToast("Access denied: You don't have admin privileges");
      }
    } catch (err) {
      console.error('Login error:', err);
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast("Failed to log in. Please try again.");
      }
    }
  };

  // Show loading state while checking admin status
  if (loading || checkingAdmin) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-4" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h1 className="h3 text-danger mb-2">BudgetMe Admin</h1>
          <p className="text-danger">Loading your admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Meta title="Admin Login | BudgetMe" />
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">
              <i className="fas fa-user-shield text-danger"></i>
              <h1>BudgetMe Admin</h1>
            </div>
            <p className="admin-login-subtitle">Sign in to access the admin dashboard</p>
          </div>
          
          {accessDenied ? (
            <div className="access-denied-container">
              <div className="alert alert-danger" role="alert">
                <h4 className="alert-heading">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Access Denied
                </h4>
                <p>Your account does not have admin privileges. Only administrators can access this area.</p>
                <hr />
                <p className="mb-0">
                  Please contact an administrator if you believe this is an error.
                </p>
              </div>
              <div className="text-center mt-3">
                <button 
                  className="btn btn-outline-secondary mr-2"
                  onClick={() => {
                    setAccessDenied(false);
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Try Another Account
                </button>
                <a href="/" className="btn btn-danger">
                  Return to Main Site
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="admin-login-form">
              <div className="form-group">
                <label htmlFor="adminEmail">Email Address</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">
                      <i className="fas fa-envelope"></i>
                    </span>
                  </div>
                  <input
                    type="email"
                    className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                    id="adminEmail"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {formErrors.email && <div className="invalid-feedback d-block">{formErrors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="adminPassword">Password</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">
                      <i className="fas fa-lock"></i>
                    </span>
                  </div>
                  <input
                    type={passwordVisible ? "text" : "password"}
                    className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                    id="adminPassword"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      <i className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>
                {formErrors.password && <div className="invalid-feedback d-block">{formErrors.password}</div>}
              </div>
              
              <div className="form-group">
                <button
                  type="submit"
                  className="btn btn-danger btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
              
              <div className="text-center mt-3">
                <a href="/" className="text-muted">
                  <i className="fas fa-arrow-left mr-1"></i> Back to main site
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminLogin; 