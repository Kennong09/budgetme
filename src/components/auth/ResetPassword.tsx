import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { establishSessionFromURL, updatePassword, signOut } from '../../utils/authService';
import { supabase } from '../../utils/supabaseClient';
import '../../assets/css/landing.css';

// Add password strength validation styles
const passwordStrengthValidationStyles = `
  .input-success {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
  }
  
  .input-success:focus {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
  }
  
  .input-warning {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  .input-warning:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  }
  
  /* Password Strength Validation Styles */
  .password-strength-container {
    margin-top: 8px;
  }
  
  .password-strength-meter {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
  }
  
  .strength-bar {
    height: 4px;
    border-radius: 2px;
    flex: 1;
    background-color: #e2e8f0;
    transition: background-color 0.3s ease;
  }
  
  .strength-bar.weak { background-color: #ef4444; }
  .strength-bar.fair { background-color: #f59e0b; }
  .strength-bar.good { background-color: #3b82f6; }
  .strength-bar.strong { background-color: #10b981; }
  
  .password-strength-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .strength-weak { color: #ef4444; }
  .strength-fair { color: #f59e0b; }
  .strength-good { color: #3b82f6; }
  .strength-strong { color: #10b981; }
  
  .password-requirements {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 12px;
  }
  
  .requirement-item {
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.3s ease;
  }
  
  .requirement-item.met {
    color: #10b981;
  }
  
  .requirement-item.unmet {
    color: #64748b;
  }
  
  .requirement-item i {
    font-size: 14px;
  }
  
  .password-suggestions {
    margin-top: 8px;
    padding: 8px;
    background: rgba(79, 114, 255, 0.05);
    border-radius: 6px;
    border-left: 3px solid #4f72ff;
  }
  
  .suggestions-title {
    font-size: 12px;
    font-weight: 600;
    color: #4f72ff;
    margin-bottom: 4px;
  }
  
  .suggestions-list {
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }

  .requirement {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    transition: color 0.3s ease;
    margin-bottom: 8px;
  }

  .requirement.valid {
    color: #10b981;
  }

  .requirement.invalid {
    color: #64748b;
  }

  .requirement i {
    font-size: 16px;
    width: 16px;
  }

  .requirements-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #10b981;
    margin-top: 4px;
  }

  .success-message i {
    font-size: 16px;
  }

  .error-message {
    color: #ef4444;
    font-size: 14px;
    margin-top: 4px;
  }

  .enhanced-input.no-left-icon {
    padding-left: 12px;
  }
`;

interface PasswordValidation {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  hasMinLength: boolean;
  suggestions: string[];
}

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  
  // Component state
  const [verifying, setVerifying] = useState<boolean>(true);
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  
  // Form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Password validation
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    strength: 'weak',
    score: 0,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
    hasMinLength: false,
    suggestions: [],
  });
  
  // Refs for accessibility and cleanup
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Password validation functions
  const validatePasswordStrength = useCallback((password: string) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    const hasMinLength = password.length >= 8;
    
    let score = 0;
    const suggestions: string[] = [];
    
    // Calculate score and suggestions
    if (hasMinLength) score += 1;
    else suggestions.push("Use at least 8 characters");
    
    if (hasUppercase) score += 1;
    else suggestions.push("Add uppercase letters (A-Z)");
    
    if (hasLowercase) score += 1;
    else suggestions.push("Add lowercase letters (a-z)");
    
    if (hasNumber) score += 1;
    else suggestions.push("Add numbers (0-9)");
    
    if (hasSymbol) score += 1;
    else suggestions.push("Add symbols (!@#$%^&*)");
    
    // Determine strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 1) strength = 'weak';
    else if (score <= 2) strength = 'fair';
    else if (score <= 3) strength = 'good';
    else strength = 'strong';
    
    return {
      strength,
      score,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
      hasMinLength,
      suggestions,
    };
  }, []);

  const handlePasswordChange = useCallback((newPassword: string) => {
    setNewPassword(newPassword);
    
    // Clear form errors when user starts typing
    if (formErrors.newPassword) {
      setFormErrors(prev => ({ ...prev, newPassword: '' }));
    }
    
    // Clear confirm password error if passwords now match
    if (formErrors.confirmPassword && confirmPassword && newPassword === confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
    
    // Validate password strength immediately
    const validation = validatePasswordStrength(newPassword);
    setPasswordValidation(validation);
  }, [formErrors.newPassword, formErrors.confirmPassword, confirmPassword, validatePasswordStrength]);

  // Verify reset session on component mount
  useEffect(() => {
    let mounted = true;
    
    const verifySession = async () => {
      if (!mounted) return;
      
      setVerifying(true);
      setError(null);
      
      // Get the hash parameters from URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      console.log('🔍 URL Debug Info:');
      console.log('Full URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search:', window.location.search);
      console.log('Hash Params:', Object.fromEntries(hashParams.entries()));
      console.log('Query Params:', Object.fromEntries(queryParams.entries()));
      
      // Try multiple possible token parameter names and locations
      const resetToken = hashParams.get('access_token') || 
                        hashParams.get('token') || 
                        hashParams.get('confirmation_token') ||
                        hashParams.get('token_hash') ||
                        queryParams.get('access_token') || 
                        queryParams.get('token') || 
                        queryParams.get('confirmation_token') ||
                        queryParams.get('token_hash');
      
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      
      console.log('🔑 Extracted tokens:');
      console.log('Reset Token:', resetToken ? `${resetToken.substring(0, 20)}...` : 'null');
      console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
      console.log('Type:', type);
      
      if (!resetToken) {
        console.error('❌ No reset token found in URL parameters');
        if (mounted) {
          setError('Invalid reset link. Please request a new password reset.');
          setVerified(false);
          setVerifying(false);
        }
        return;
      }

      try {
        // For password reset flow, we'll validate the token format and type
        // The actual token validation will happen when the user submits the form
        const isValidType = type === 'recovery' || !type; // type might not always be present
        const isValidTokenFormat = resetToken && resetToken.length > 15; // Basic format check (token_hash can be shorter)
        
        console.log('🔍 Token validation:');
        console.log('Is valid type:', isValidType, '(type:', type, ')');
        console.log('Is valid token format:', isValidTokenFormat, '(length:', resetToken?.length, ')');
        
        if (!mounted) return;

        if (!isValidTokenFormat) {
          console.error('❌ Invalid token format');
          setError('Invalid reset link format. Please request a new password reset.');
          setVerified(false);
        } else if (!isValidType) {
          console.error('❌ Invalid token type');
          setError('Invalid reset link type. Please request a new password reset.');
          setVerified(false);
        } else {
          // Token format appears valid, user can proceed with password reset
          // Actual token validation will happen during password update
          console.log('✅ Token validation passed - user can proceed');
          setVerified(true);
        }
      } catch (err: any) {
        if (!mounted) return;
        
        console.error('Token verification error:', err);
        setError('Failed to verify reset link. Please request a new password reset.');
        setVerified(false);
      } finally {
        if (mounted) {
          setVerifying(false);
        }
      }
    };

    verifySession();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Validate password in real-time (now handled by handlePasswordChange)
  // This useEffect has been replaced by the handlePasswordChange callback function

  // Handle form validation
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Password validation
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (passwordValidation.strength === 'weak') {
      errors.newPassword = 'Password does not meet security requirements';
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!verified) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = formRef.current?.querySelector('.input-error input') as HTMLElement;
      firstErrorField?.focus();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the token from URL for password reset
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      // Try multiple possible token parameter names and locations
      const resetToken = hashParams.get('access_token') || 
                        hashParams.get('token') || 
                        hashParams.get('confirmation_token') ||
                        hashParams.get('token_hash') ||
                        queryParams.get('access_token') || 
                        queryParams.get('token') || 
                        queryParams.get('confirmation_token') ||
                        queryParams.get('token_hash');
      
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      
      console.log('🔄 Password Reset Submit - Token Info:');
      console.log('Reset Token:', resetToken ? `${resetToken.substring(0, 20)}...` : 'null');
      console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
      
      if (!resetToken) {
        throw new Error('Reset token not found. Please request a new password reset.');
      }

      // Check if we have a token_hash (from query params) or access_token (from hash)
      const isTokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      
      if (isTokenHash) {
        // Use verifyOtp for token_hash
        console.log('🔐 Verifying OTP with token_hash...');
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: resetToken,
          type: 'recovery'
        });

        if (sessionError) {
          console.error('❌ OTP verification failed:', sessionError);

          // If the link is invalid or expired, switch to the invalid-link state
          const message = sessionError.message?.toLowerCase() || '';
          const isInvalidOrExpired =
            sessionError.status === 403 ||
            message.includes('invalid') ||
            message.includes('expired');

          if (isInvalidOrExpired) {
            setError('Invalid or expired reset link. Please request a new password reset.');
            setVerified(false);
            return;
          }

          throw new Error('Invalid or expired reset token. Please request a new password reset.');
        }
        
        console.log('✅ OTP verified successfully:', sessionData?.session?.user?.id || 'No user ID');
      } else {
        // Use setSession for access_token
        console.log('🔐 Establishing session with tokens...');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: resetToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('❌ Session establishment failed:', sessionError);
          throw new Error('Invalid or expired reset token. Please request a new password reset.');
        }
        
        console.log('✅ Session established successfully:', sessionData?.session?.user?.id || 'No user ID');
      }

      // Now update the password using the established session
      console.log('🔄 Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update failed:', error);
        throw new Error(error.message || 'Failed to update password');
      }
      
      console.log('✅ Password updated successfully');

      // Immediately sign out the user for security
      await supabase.auth.signOut();

      setSuccess(true);
      setCountdown(5);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            navigate('/', { state: { showLogin: true } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimeout(() => {
        successRef.current?.focus();
      }, 100);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setTimeout(() => {
        errorRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend reset email (redirect to landing page with forgot password modal)
  const handleResendReset = () => {
    navigate('/', { state: { activeTab: 'reset' } });
  };

  // Handle login redirect
  const handleGoToLogin = () => {
    // Clear countdown interval if active
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    navigate('/', { state: { showLogin: true } });
  };

  // Check if form is valid
  const isFormValid = verified && 
                     passwordValidation.strength !== 'weak' && 
                     passwordValidation.hasMinLength &&
                     passwordValidation.hasUppercase &&
                     passwordValidation.hasLowercase &&
                     passwordValidation.hasNumber &&
                     passwordValidation.hasSymbol &&
                     newPassword === confirmPassword && 
                     newPassword.length > 0 && 
                     confirmPassword.length > 0;

  return (
    <div className="landing-page">
      {/* Inject password strength validation styles */}
      <style dangerouslySetInnerHTML={{ __html: passwordStrengthValidationStyles }} />
      <div className="modal-overlay animate__animated animate__fadeIn">
        <div className="modal-container animate__animated animate__fadeInUp">
          
          {/* Modal Header */}
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
              onClick={() => navigate('/')}
              aria-label="Close and return to home"
            >
              <i className="bx bx-x"></i>
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            
            {/* Verifying State */}
            {verifying && (
              <div className="text-center" role="status" aria-live="polite">
                <div className="mb-4">
                  <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '3rem', color: 'var(--landing-primary)' }}></i>
                </div>
                <h2 className="modal-title mb-4">Verifying Reset Link</h2>
                <p>Please wait while we verify your password reset link...</p>
              </div>
            )}

            {/* Verification Error */}
            {!verifying && !verified && error && (
              <div className="text-center">
                <div className="mb-4">
                  <i className="bx bx-error-circle" style={{ fontSize: '3rem', color: '#ef4444' }}></i>
                </div>
                <h2 className="modal-title mb-4">Reset Link Invalid</h2>
                <div 
                  className="auth-error-message" 
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  aria-live="assertive"
                >
                  <i className="bx bx-error-circle"></i>
                  {error}
                </div>
                <div className="verification-actions mt-4">
                  <button 
                    className="btn-primary"
                    onClick={handleResendReset}
                    type="button"
                  >
                    <i className="bx bx-envelope"></i> Request New Reset
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={handleGoToLogin}
                    type="button"
                  >
                    <i className="bx bx-log-in"></i> Back to Login
                  </button>
                </div>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="text-center">
                <div className="mb-4">
                  <i className="bx bx-check-circle" style={{ fontSize: '3rem', color: '#22c55e' }}></i>
                </div>
                <h2 
                  className="modal-title mb-4"
                  ref={successRef}
                  tabIndex={-1}
                >
                  Password Updated Successfully!
                </h2>
                <div 
                  className="auth-success-message"
                  role="status"
                  aria-live="polite"
                >
                  <i className="bx bx-check-circle"></i>
                  Your password has been updated. You've been signed out for security.
                </div>
                <p className="mb-4">
                  Redirecting to login in <strong>{countdown}</strong> seconds...
                </p>
                <button 
                  className="btn-primary"
                  onClick={handleGoToLogin}
                  type="button"
                >
                  Login Now
                </button>
              </div>
            )}

            {/* Password Reset Form */}
            {verified && !success && (
              <>
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="bx bx-shield-quarter" style={{ fontSize: '3rem', color: 'var(--landing-primary)' }}></i>
                  </div>
                  <h2 className="modal-title">Set New Password</h2>
                  <p>Enter a strong password to secure your account.</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div 
                    className="auth-error-message"
                    ref={errorRef}
                    tabIndex={-1}
                    role="alert"
                    aria-live="assertive"
                  >
                    <i className="bx bx-error-circle"></i>
                    {error}
                  </div>
                )}

                <form 
                  onSubmit={handleSubmit}
                  ref={formRef}
                  role="form"
                  noValidate
                >
                  {/* New Password Field */}
                  <div className="form-group">
                    <label htmlFor="new-password">New Password</label>
                    <div className={`input-with-icon password-field ${
                      formErrors.newPassword ? 'input-error' : 
                      passwordValidation.strength === 'strong' ? 'input-success' : 
                      passwordValidation.strength === 'good' ? 'input-warning' : ''
                    }`}>
                      {!formErrors.newPassword && newPassword.length === 0 && (
                        <i className="bx bx-lock-alt"></i>
                      )}
                      <input
                        type={passwordVisible ? "text" : "password"}
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="Enter your new password"
                        className={`enhanced-input ${
                          formErrors.newPassword || newPassword.length > 0
                          ? 'no-left-icon' : ''
                        }`}
                        required
                        disabled={loading}
                        aria-describedby={formErrors.newPassword ? "new-password-error" : "password-requirements"}
                      />
                      <button 
                        type="button" 
                        className="toggle-password-inline"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        tabIndex={-1}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        aria-pressed={passwordVisible}
                      >
                        <i className={`bx ${passwordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                      </button>
                      {newPassword.length > 0 && passwordValidation.strength === 'strong' && (
                        <i className="bx bx-check-circle" style={{ 
                          position: 'absolute', 
                          right: '44px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: '#10b981',
                          fontSize: '18px'
                        }}></i>
                      )}
                      {newPassword.length > 0 && passwordValidation.strength !== 'strong' && (
                        <i className="bx bx-info-circle" style={{ 
                          position: 'absolute', 
                          right: '44px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: passwordValidation.strength === 'good' ? '#3b82f6' : passwordValidation.strength === 'fair' ? '#f59e0b' : '#ef4444',
                          fontSize: '18px'
                        }}></i>
                      )}
                    </div>
                    {formErrors.newPassword && (
                      <div className="error-message" id="new-password-error" role="alert">
                        {formErrors.newPassword}
                      </div>
                    )}
                    
                    {/* Enhanced Password Requirements */}
                    {newPassword.length > 0 && (
                      <div className="password-strength-container">
                        {/* Strength Meter */}
                        <div className="password-strength-meter">
                          {[1, 2, 3, 4, 5].map((bar) => (
                            <div 
                              key={bar}
                              className={`strength-bar ${
                                bar <= passwordValidation.score ? passwordValidation.strength : ''
                              }`}
                            />
                          ))}
                        </div>
                        
                        {/* Strength Label */}
                        <div className={`password-strength-label strength-${passwordValidation.strength}`}>
                          <i className={`bx ${
                            passwordValidation.strength === 'strong' ? 'bxs-shield-check' :
                            passwordValidation.strength === 'good' ? 'bxs-shield' :
                            passwordValidation.strength === 'fair' ? 'bxs-shield-minus' :
                            'bxs-shield-x'
                          }`}></i>
                          Password strength: {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                        </div>
                        
                        {/* Requirements */}
                        <div className="password-requirements">
                          <div className={`requirement-item ${passwordValidation.hasMinLength ? 'met' : 'unmet'}`}>
                            <i className={`bx ${passwordValidation.hasMinLength ? 'bx-check' : 'bx-x'}`}></i>
                            <span>8+ characters</span>
                          </div>
                          <div className={`requirement-item ${passwordValidation.hasUppercase ? 'met' : 'unmet'}`}>
                            <i className={`bx ${passwordValidation.hasUppercase ? 'bx-check' : 'bx-x'}`}></i>
                            <span>Uppercase (A-Z)</span>
                          </div>
                          <div className={`requirement-item ${passwordValidation.hasLowercase ? 'met' : 'unmet'}`}>
                            <i className={`bx ${passwordValidation.hasLowercase ? 'bx-check' : 'bx-x'}`}></i>
                            <span>Lowercase (a-z)</span>
                          </div>
                          <div className={`requirement-item ${passwordValidation.hasNumber ? 'met' : 'unmet'}`}>
                            <i className={`bx ${passwordValidation.hasNumber ? 'bx-check' : 'bx-x'}`}></i>
                            <span>Number (0-9)</span>
                          </div>
                          <div className={`requirement-item ${passwordValidation.hasSymbol ? 'met' : 'unmet'}`}>
                            <i className={`bx ${passwordValidation.hasSymbol ? 'bx-check' : 'bx-x'}`}></i>
                            <span>Symbol (!@#$)</span>
                          </div>
                        </div>
                        
                        {/* Suggestions */}
                        {passwordValidation.suggestions.length > 0 && (
                          <div className="password-suggestions">
                            <div className="suggestions-title">💡 To strengthen your password:</div>
                            <div className="suggestions-list">
                              {passwordValidation.suggestions.join(' • ')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <div className={`input-with-icon password-field ${
                      formErrors.confirmPassword ? 'input-error' : 
                      confirmPassword.length > 0 && newPassword === confirmPassword ? 'input-success' : 
                      confirmPassword.length > 0 && newPassword !== confirmPassword ? 'input-error' : ''
                    }`}>
                      {!formErrors.confirmPassword && confirmPassword.length === 0 && (
                        <i className="bx bx-lock-alt"></i>
                      )}
                      <input
                        type={confirmPasswordVisible ? "text" : "password"}
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          const newConfirmPassword = e.target.value;
                          setConfirmPassword(newConfirmPassword);
                          // Clear form errors when user starts typing
                          if (formErrors.confirmPassword) {
                            setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
                          }
                        }}
                        placeholder="Confirm your new password"
                        className={`enhanced-input ${
                          formErrors.confirmPassword || confirmPassword.length > 0
                          ? 'no-left-icon' : ''
                        }`}
                        required
                        disabled={loading}
                        aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
                      />
                      <button 
                        type="button" 
                        className="toggle-password-inline"
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        tabIndex={-1}
                        aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
                        aria-pressed={confirmPasswordVisible}
                      >
                        <i className={`bx ${confirmPasswordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                      </button>
                      {confirmPassword.length > 0 && newPassword === confirmPassword && (
                        <i className="bx bx-check-circle" style={{ 
                          position: 'absolute', 
                          right: '44px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: '#10b981',
                          fontSize: '18px'
                        }}></i>
                      )}
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <i className="bx bx-x-circle" style={{ 
                          position: 'absolute', 
                          right: '44px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: '#ef4444',
                          fontSize: '18px'
                        }}></i>
                      )}
                    </div>
                    {formErrors.confirmPassword && (
                      <div className="error-message" id="confirm-password-error" role="alert">
                        {formErrors.confirmPassword}
                      </div>
                    )}
                    
                    {/* Enhanced Password Match Indicator */}
                    {!formErrors.confirmPassword && confirmPassword.length > 0 && newPassword === confirmPassword && (
                      <div className="success-message" style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                        <i className="bx bx-check-circle"></i> Passwords match
                      </div>
                    )}
                    {!formErrors.confirmPassword && confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <div className="error-message">
                        Passwords do not match
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn-primary btn-block reset-btn"
                    disabled={loading || !isFormValid}
                    style={{ 
                      transition: "all 0.3s ease",
                      transform: loading ? "scale(0.98)" : "scale(1)",
                      opacity: !isFormValid ? 0.6 : 1
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="bx bx-loader-alt bx-spin"></i> Updating Password...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-check"></i> Update Password
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Modal Footer */}
          {verified && !success && (
            <div className="modal-footer">
              <p>
                Need help?{" "}
                <button
                  className="text-btn"
                  onClick={handleResendReset}
                  type="button"
                >
                  Request New Reset Link
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;