import React, { FC, useState, useRef } from 'react';
import { resendVerificationEmail } from '../../utils/authService';
import { useToast } from '../../utils/ToastContext';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  error?: string | null;
}

const EmailVerificationModal: FC<EmailVerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  email,
  error 
}) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const toastShown = useRef<boolean>(false);

  if (!isOpen) return null;

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendError(null);
    toastShown.current = false;
    
    try {
      const { error } = await resendVerificationEmail(email);
      if (error) {
        // Show error in the modal instead of toast
        setResendError(error.message);
      } else {
        // Success toast is still fine
        if (!toastShown.current) {
          showSuccessToast('Verification email resent successfully!');
          toastShown.current = true;
        }
      }
    } catch (err) {
      // Show error in the modal instead of toast
      if (err instanceof Error) {
        setResendError(err.message);
      } else {
        setResendError('Failed to resend verification email. Please try again.');
      }
      console.error('Error resending verification email:', err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay animate__animated animate__fadeIn"
      onClick={(e) => {
        // Only close if clicking the overlay, not its children
        if (e.target === e.currentTarget) {
          onClose();
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
            onClick={onClose}
          >
            <i className="bx bx-x"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="text-center mb-6">
            <div className="verification-icon">
              <i className="bx bx-envelope text-primary-color" style={{ fontSize: '3rem' }}></i>
            </div>
            <h2 className="modal-title">Verify Your Email</h2>
          </div>
          
          {(error || resendError) && (
            <div className="auth-error-message mb-4">
              <i className="bx bx-error-circle"></i>
              <span>{error || resendError}</span>
            </div>
          )}
          
          <p className="text-center mb-4">
            We've sent a verification email to: <strong>{email}</strong>
          </p>
          
          <p className="text-center mb-4">
            Please check your inbox and click the link in the email to verify your account.
          </p>
          
          <div className="verification-instructions">
            <p><i className="bx bx-info-circle"></i> If you don't see the email, check your spam folder</p>
            <p><i className="bx bx-time"></i> The link will expire after 24 hours</p>
          </div>
          
          <div className="verification-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleResendEmail}
              disabled={resendLoading}
              style={{ 
                transition: "all 0.3s ease",
                transform: resendLoading ? "scale(0.98)" : "scale(1)"
              }}
            >
              {resendLoading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin"></i> Sending...
                </>
              ) : 'Resend Email'}
            </button>
            
            <button 
              type="button" 
              className="btn-primary"
              onClick={onClose}
            >
              Ok, Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal; 