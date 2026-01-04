import React, { FC } from 'react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
}

const AlertMessage: FC<AlertMessageProps> = ({ type, message }) => {
  const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

  // Mobile alert styles
  const getMobileStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'text-emerald-500',
          text: 'text-emerald-700'
        };
      case 'error':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          icon: 'text-rose-500',
          text: 'text-rose-700'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-700'
        };
    }
  };

  const mobileStyles = getMobileStyles();

  return (
    <>
      {/* Mobile Alert */}
      <div className={`block md:hidden ${mobileStyles.bg} border ${mobileStyles.border} rounded-xl p-3 mb-3`}>
        <div className="flex items-start space-x-2">
          <i className={`fas ${icon} ${mobileStyles.icon} text-sm mt-0.5`}></i>
          <span className={`${mobileStyles.text} text-xs leading-relaxed`}>{message}</span>
        </div>
      </div>

      {/* Desktop Alert */}
      <div className={`hidden md:block alert ${alertClass} animate__animated animate__fadeIn`} role="alert">
        <i className={`fas ${icon} mr-2`}></i>
        {message}
      </div>
    </>
  );
};

export default AlertMessage;
