import React, { useState, useEffect, useTransition, Component, ErrorInfo, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { isUserAdmin } from '../../utils/adminHelpers';

// Add an ErrorBoundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by AdminRoute error boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="alert alert-danger m-3">
          <h4>Something went wrong</h4>
          <p>There was an error loading the admin panel. Please try refreshing the page.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AdminRouteProps {
  element: React.ReactElement;
  title?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ element, title }) => {
  const { user, loading: authLoading } = useAuth();
  // Move useState hook to the top level before any conditional returns
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  
  // Use a single loading state for better UX
  const isLoading = authLoading || loading || isPending;
  
  useEffect(() => {
    // Don't do anything if we're still loading auth state
    if (authLoading) return;
    
    let isMounted = true;
    
    const checkAdminStatus = async () => {
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      
      try {
        // Perform the admin check outside of the transition
        const adminStatus = await isUserAdmin();
        
        // Use startTransition for state updates to avoid suspension during render
        if (isMounted) {
          startTransition(() => {
            setIsAdmin(adminStatus);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        
        if (isMounted) {
          startTransition(() => {
            setIsAdmin(false);
            setLoading(false);
          });
        }
      }
    };
    
    checkAdminStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, startTransition, authLoading]);
  
  // Show loading state when checking authentication or when transition is pending
  if (isLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }
  
  // If not authenticated, show 404 page instead of redirecting
  if (!user) {
    return <Navigate to="/404" replace />;
  }
  
  // If admin status is still unknown, show loading - spinner only
  if (isAdmin === null) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }
  
  // If not admin, redirect to main page with access denied parameter
  if (!isAdmin) {
    return <Navigate to="/?access_denied=true" replace />;
  }
  
  // If admin, render the provided element wrapped in an error boundary
  return (
    <ErrorBoundary>
      {element}
    </ErrorBoundary>
  );
};

export default AdminRoute; 