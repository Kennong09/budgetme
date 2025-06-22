import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary p-4 m-2 rounded border border-danger">
          <h2 className="text-danger">Something went wrong</h2>
          <p>
            There was an error in the application. Please try refreshing the
            page.
          </p>
          <details style={{ whiteSpace: "pre-wrap" }}>
            <summary>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button
            className="btn btn-primary mt-3"
            onClick={() =>
              this.setState({ hasError: false, error: null, errorInfo: null })
            }
          >
            Try again
          </button>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
