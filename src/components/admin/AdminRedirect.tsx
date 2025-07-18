import React, { useEffect, useState, useTransition } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { isUserAdmin } from '../../utils/adminHelpers';

/**
 * AdminRedirect - Component for the /admin path that redirects based on authentication status:
 * - If not authenticated: redirects to /admin/login
 * - If authenticated but not admin: redirects to /admin/login?access_denied=true
 * - If authenticated and admin: redirects to /admin/dashboard
 */
const AdminRedirect: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  
  // Combined loading state
  const isLoading = authLoading || loading || isPending;
  
  useEffect(() => {
    // Skip admin check if auth is still loading or there's no user
    if (authLoading) return;
    
    // If not authenticated, we don't need to check admin status
    if (!user) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const checkAdminStatus = async () => {
      try {
        // Check if user has admin role
        const adminStatus = await isUserAdmin();
        
        // If component unmounted, don't update state
        if (!isMounted) return;
        
        // Use startTransition to prevent synchronous suspension
        startTransition(() => {
          setIsAdmin(adminStatus);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error checking admin status:', error);
        
        if (!isMounted) return;
        
        startTransition(() => {
          setIsAdmin(false);
          setLoading(false);
        });
      }
    };
    
    checkAdminStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="admin-loading-indicator"></div>
    );
  }
  
  // If not authenticated, redirect to admin login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // If not admin, redirect to login with access_denied parameter
  if (isAdmin === false) {
    return <Navigate to="/admin/login?access_denied=true" replace />;
  }
  
  // If admin, redirect to dashboard
  return <Navigate to="/admin/dashboard" replace />;
};

export default AdminRedirect; 