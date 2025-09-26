import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for graceful error handling in chart components
 * 
 * This component catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
    
    // Store error info in state
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Here you could log to external services like Sentry, LogRocket, etc.
    // For now, we'll just log to console with structured data
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorData });
      console.error('Production error captured:', errorData);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="alert alert-danger m-3" role="alert">
          <div className="d-flex align-items-center mb-3">
            <i className="fas fa-exclamation-triangle fa-2x text-danger me-3"></i>
            <div>
              <h5 className="alert-heading mb-1">Chart Failed to Load</h5>
              <p className="mb-0">Something went wrong while rendering this chart.</p>
            </div>
          </div>
          
          {this.state.error && (
            <div className="mb-3">
              <small className="text-muted">
                <strong>Error:</strong> {this.state.error.message}
              </small>
            </div>
          )}

          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={this.handleRetry}
            >
              <i className="fas fa-redo me-1"></i>
              Try Refresh
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={this.handleReload}
            >
              <i className="fas fa-sync-alt me-1"></i>
              Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-3">
              <summary className="text-muted small">Error Details (Development)</summary>
              <pre className="small mt-2 p-2 bg-light rounded">
                {this.state.error && this.state.error.stack}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export const useAsyncError = () => {
  const [, setError] = React.useState(null);
  
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};

/**
 * Higher-order component for wrapping chart components with error boundaries
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ChartErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ChartErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ChartErrorBoundary;