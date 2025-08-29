import React, { FC } from "react";
import { Link } from "react-router-dom";

interface ErrorMessageProps {
  title?: string;
  message: string;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
}

const ErrorMessage: FC<ErrorMessageProps> = ({ 
  title = "Budget not found",
  message,
  showBackButton = true,
  backTo = "/budgets",
  backLabel = "Back to Budgets"
}) => {
  return (
    <div className="container-fluid">
      <div className="text-center my-5 animate__animated animate__fadeIn">
        <div className="error-icon mb-4">
          <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
        </div>
        <h1 className="h3 mb-3 font-weight-bold text-gray-800">{title}</h1>
        <p className="mb-4">{message}</p>
        {showBackButton && (
          <Link to={backTo} className="btn btn-primary">
            <i className="fas fa-arrow-left mr-2"></i> {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
