import React, { FC } from 'react';

const LoadingState: FC = () => {
  return (
    <div className="container-fluid">
      <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
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
