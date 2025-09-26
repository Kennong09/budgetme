import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: React.ReactNode;
}

const TransactionErrorBoundary: React.FC<Props> = ({ children }) => {
  const handleError = (error: Error) => {
    console.error('Transaction component error:', error);
    // Here you could send to analytics service
  };

  const fallback = (
    <div className="card shadow mb-4">
      <div className="card-body text-center py-5">
        <div className="mb-4">
          <i className="fas fa-exchange-alt fa-3x text-muted mb-3"></i>
          <h5 className="text-gray-900">Transaction Loading Error</h5>
          <p className="text-muted">
            Unable to load transaction information. Please try refreshing the page.
          </p>
        </div>
        <div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-sm mr-2"
          >
            <i className="fas fa-sync mr-1"></i>
            Refresh
          </button>
          <a href="/transactions" className="btn btn-secondary btn-sm">
            <i className="fas fa-list mr-1"></i>
            View All Transactions
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default TransactionErrorBoundary;