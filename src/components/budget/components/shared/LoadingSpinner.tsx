import React, { FC } from "react";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ message = "Loading..." }) => {
  return (
    <div className="container-fluid">
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
