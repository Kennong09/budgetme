import React, { FC, memo } from "react";
import { Link } from "react-router-dom";

interface ErrorMessageProps {
  title?: string;
  message: string;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
}

const ErrorMessage: FC<ErrorMessageProps> = memo(({ 
  title = "Budget not found",
  message,
  showBackButton = true,
  backTo = "/budgets",
  backLabel = "Back to Budgets"
}) => {
  return (
    <div className="container-fluid">
      <div className="text-center my-3 md:my-5 py-4 md:py-8 animate__animated animate__fadeIn">
        <div className="error-icon mb-3 md:mb-4">
          <i className="fas fa-exclamation-triangle fa-3x md:fa-4x text-warning"></i>
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl mb-2 md:mb-3 font-bold text-gray-800">{title}</h1>
        <p className="mb-3 md:mb-4 text-sm md:text-base text-gray-600 px-4">{message}</p>
        {showBackButton && (
          <Link 
            to={backTo} 
            className="inline-flex items-center px-4 py-2 md:px-5 md:py-2.5 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors"
          >
            <i className="fas fa-arrow-left mr-2 text-xs md:text-sm"></i> 
            <span>{backLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;
