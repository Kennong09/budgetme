import React, { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

interface PrivateRouteProps {
  element: ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    // Redirect to landing page with login state, preserving the attempted location
    return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
  }

  return element;
};

export default PrivateRoute;