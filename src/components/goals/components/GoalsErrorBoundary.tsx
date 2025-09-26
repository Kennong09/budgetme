import React, { Component, ErrorInfo, ReactNode } from 'react';
import { goalsDataService } from '../services/goalsDataService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  serviceHealth: any;
}

/**
 * Error Boundary specifically for Goals components
 * Provides graceful error handling and recovery options
 */
export class GoalsErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      serviceHealth: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GoalsErrorBoundary caught an error:', error, errorInfo);
    
    // Perform health check on the data service
    try {
      const health = await goalsDataService.performHealthCheck();
      this.setState({ 
        errorInfo, 
        serviceHealth: health 
      });
    } catch (healthCheckError) {
      console.error('Health check failed:', healthCheckError);
      this.setState({ 
        errorInfo,
        serviceHealth: { status: 'error', details: { error: 'Health check failed' } }
      });
    }
  }

  handleRetry = async () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying goals component (attempt ${this.retryCount}/${this.maxRetries})`);
      
      // Perform health check before retry
      try {
        const health = await goalsDataService.performHealthCheck();
        this.setState({ 
          serviceHealth: health 
        });
        
        // If service is healthy or degraded, allow retry
        if (health.status === 'healthy' || health.status === 'degraded') {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null
          });
        }
      } catch (error) {
        console.error('Retry health check failed:', error);
      }
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  getErrorMessage(): string {
    const { error, serviceHealth } = this.state;
    
    if (serviceHealth?.status === 'error') {
      return 'Goals service is currently unavailable. This may be due to database connectivity issues.';
    }
    
    if (serviceHealth?.status === 'degraded') {
      return 'Goals service is running in limited mode. Some features may be unavailable.';
    }
    
    if (error?.message?.includes('goal_details')) {
      return 'The goals database view is being updated. Please try again in a moment.';
    }
    
    if (error?.message?.includes('auth')) {
      return 'Authentication error. Please sign in again.';
    }
    
    return error?.message || 'An unexpected error occurred in the goals system.';
  }

  getRecoveryOptions() {
    const { serviceHealth } = this.state;
    const canRetry = this.retryCount < this.maxRetries;
    
    return {
      showRetry: canRetry && (serviceHealth?.status === 'healthy' || serviceHealth?.status === 'degraded'),
      showReload: true,
      showFallbackLink: serviceHealth?.status === 'error'
    };
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.getErrorMessage();
      const recoveryOptions = this.getRecoveryOptions();
      
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-10">
              <div className="card border-left-danger shadow h-100 py-2 animate__animated animate__fadeIn">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                        Goals System Error
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {errorMessage}
                      </div>
                      
                      {/* Service Status */}
                      {this.state.serviceHealth && (
                        <div className="mt-3">
                          <div className="text-xs font-weight-bold text-gray-600 text-uppercase mb-1">
                            Service Status
                          </div>
                          <div className="small text-gray-600">
                            Status: <span className={`badge badge-${
                              this.state.serviceHealth.status === 'healthy' ? 'success' :
                              this.state.serviceHealth.status === 'degraded' ? 'warning' : 'danger'
                            }`}>
                              {this.state.serviceHealth.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {this.state.serviceHealth.details && (
                            <div className="mt-2">
                              <div className="small text-gray-600">
                                • Goals Table: {this.state.serviceHealth.details.goalsTableAvailable ? '✓ Available' : '✗ Unavailable'}
                              </div>
                              <div className="small text-gray-600">
                                • Enhanced View: {this.state.serviceHealth.details.goalDetailsAvailable ? '✓ Available' : '✗ Unavailable'}
                              </div>
                              {this.state.serviceHealth.details.fallbackMode && (
                                <div className="small text-warning">
                                  • Running in fallback mode
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Recovery Actions */}
                      <div className="mt-4">
                        {recoveryOptions.showRetry && (
                          <button 
                            className="btn btn-primary btn-sm mr-2"
                            onClick={this.handleRetry}
                          >
                            <i className="fas fa-redo fa-sm text-white-50 mr-1"></i>
                            Retry ({this.maxRetries - this.retryCount} attempts left)
                          </button>
                        )}
                        
                        {recoveryOptions.showReload && (
                          <button 
                            className="btn btn-secondary btn-sm mr-2"
                            onClick={this.handleReload}
                          >
                            <i className="fas fa-sync fa-sm text-white-50 mr-1"></i>
                            Reload Page
                          </button>
                        )}
                        
                        {recoveryOptions.showFallbackLink && (
                          <a 
                            href="/dashboard" 
                            className="btn btn-outline-primary btn-sm"
                          >
                            <i className="fas fa-arrow-left fa-sm mr-1"></i>
                            Go to Dashboard
                          </a>
                        )}
                      </div>
                      
                      {/* Technical Details (for development) */}
                      {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details className="mt-4">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Technical Details (Development Only)
                          </summary>
                          <div className="mt-2 p-2 bg-light rounded small">
                            <strong>Error:</strong> {this.state.error?.toString()}<br/>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 text-xs">{this.state.errorInfo.componentStack}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-exclamation-triangle fa-2x text-danger"></i>
                    </div>
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

/**
 * Higher-order component to wrap goals components with error boundary
 */
export const withGoalsErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => (
    <GoalsErrorBoundary>
      <WrappedComponent {...props} />
    </GoalsErrorBoundary>
  );
};