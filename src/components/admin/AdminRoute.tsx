import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import AdminLayout from './layout/AdminLayout';

interface AdminRouteProps {
  element: React.ReactElement;
  title?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ element, title }) => {
  const { user, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-4" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h1 className="h3 text-danger mb-2">BudgetMe Admin</h1>
          <p className="text-danger">Loading your admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to admin login page
  if (!user) {
    return <Navigate to="/admin" replace />;
  }
  
  // Check if user has admin role using adminHelpers function
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Import the function dynamically to avoid circular dependency issues
        const { isUserAdmin } = await import('../../utils/adminHelpers');
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Show loading while checking admin status
  if (isAdmin === null) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-4" role="status">
            <span className="sr-only">Checking admin privileges...</span>
          </div>
          <h1 className="h3 text-danger mb-2">BudgetMe Admin</h1>
          <p className="text-danger">Loading your admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  // If not admin, redirect to admin login with access denied parameter
  if (!isAdmin) {
    return <Navigate to="/admin?access_denied=true" replace />;
  }
  
  // If admin, render the admin layout with the provided element
  return <AdminLayout title={title}>{element}</AdminLayout>;
};

export default AdminRoute; 