import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: React.ReactNode;
}

const BudgetErrorBoundary: React.FC<Props> = ({ children }) => {
  const handleError = (error: Error) => {
    console.error('Budget component error:', error);
    // Here you could send to analytics service
  };

  const fallback = (
    <div className="card shadow mb-4">
      <div className="card-body text-center py-5">
        <div className="mb-4">
          <i className="fas fa-wallet fa-3x text-muted mb-3"></i>
          <h5 className="text-gray-900">Budget Loading Error</h5>
          <p className="text-muted">
            Unable to load budget information. Please try refreshing the page.
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
          <a href="/budgets" className="btn btn-secondary btn-sm">
            <i className="fas fa-chart-pie mr-1"></i>
            View All Budgets
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

export default BudgetErrorBoundary;