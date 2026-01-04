import React, { FC } from 'react';

const LoadingState: FC = () => {
  return (
    <div className="container-fluid">
      {/* Mobile Loading State */}
      <div className="block md:hidden py-12 animate__animated animate__fadeIn">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-3 text-xs text-gray-500 font-medium">Loading your settings...</p>
        </div>
      </div>

      {/* Desktop Loading State */}
      <div className="text-center my-5 py-5 animate__animated animate__fadeIn hidden md:block">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="sr-only">Loading...</span>
        </div>
        <h5 className="mt-4 text-gray-600 font-weight-light">
          Loading Settings
        </h5>
        <p className="text-gray-500">Please wait while we load your preferences...</p>
      </div>
    </div>
  );
};

export default LoadingState;
