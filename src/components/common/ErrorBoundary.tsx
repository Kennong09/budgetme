import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center">
                  <div className="text-center mb-4">
                    <div className="error-icon mb-3">
                      <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
                    </div>
                    <h4 className="text-gray-900 mb-4">Something went wrong</h4>
                    <p className="text-muted mb-4">
                      We apologize for the inconvenience. An error occurred while loading this section.
                    </p>
                  </div>
                  
                  <div className="error-details mb-4">
                    <details className="text-left">
                      <summary className="btn btn-link text-sm">View technical details</summary>
                      <div className="mt-3 p-3 bg-light rounded">
                        <code className="text-danger">
                          {this.state.error?.message}
                        </code>
                        {this.state.error?.stack && (
                          <pre className="mt-2 text-xs text-muted">
                            {this.state.error.stack.slice(0, 500)}...
                          </pre>
                        )}
                      </div>
                    </details>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => this.setState({ hasError: false, error: undefined })}
                      className="btn btn-primary btn-sm mr-2"
                    >
                      <i className="fas fa-redo mr-1"></i>
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="btn btn-secondary btn-sm"
                    >
                      <i className="fas fa-sync mr-1"></i>
                      Reload Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;