import React, { FC } from "react";

interface WelcomeMessageProps {
  show: boolean;
  userName: string;
  onClose: () => void;
}

const WelcomeMessage: FC<WelcomeMessageProps> = ({
  show,
  userName,
  onClose,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div
      className="alert animate__animated animate__fadeIn shadow-sm border-0"
      role="alert"
      style={{
        borderLeft: '4px solid #6366f1',
        borderRadius: '8px',
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent)'
      }}
    >
      <button
        type="button"
        className="close"
        onClick={onClose}
        aria-label="Close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <div className="d-flex align-items-center">
        <div className="welcome-icon mr-3" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
          <i className="fas fa-chart-line fa-2x text-primary"></i>
        </div>
        <div>
          <h4 className="alert-heading font-weight-bold mb-1 text-gray-800">
            Welcome back, {userName}!
          </h4>
          <p className="mb-0 text-gray-600">Here's a summary of your finances. You're doing great!</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
