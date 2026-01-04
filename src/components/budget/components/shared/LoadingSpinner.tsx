import React, { FC, memo } from "react";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = memo(({ message = "Loading..." }) => {
  return (
    <div className="container-fluid">
      <div className="text-center my-3 md:my-5 py-4 md:py-8">
        <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-700">{message}</p>
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
