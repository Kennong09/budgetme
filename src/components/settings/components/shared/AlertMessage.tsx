import React, { FC } from 'react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
}

const AlertMessage: FC<AlertMessageProps> = ({ type, message }) => {
  const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

  return (
    <div className={`alert ${alertClass} animate__animated animate__fadeIn`} role="alert">
      <i className={`fas ${icon} mr-2`}></i>
      {message}
    </div>
  );
};

export default AlertMessage;
