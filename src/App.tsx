import React, { useState, useEffect, FC, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";

// External CSS
import "@fortawesome/fontawesome-free/css/all.min.css";
import "animate.css";

// SB Admin theme
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "./components/dashboard/dashboard.css";
import "./assets/css/custom.css";
import "./assets/css/responsive.css";

// Context Providers
import { AuthProvider, useAuth } from "./utils/AuthContext";
import { ToastProvider } from "./utils/ToastContext";
import { CurrencyProvider } from "./utils/CurrencyContext";
import { OnboardingProvider } from "./utils/OnboardingContext";
import AuthCallback from "./components/auth/AuthCallback";
import EmailVerificationModal from "./components/auth/EmailVerificationModal";

// Layout components
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Meta from "./components/layout/Meta";

// Onboarding components
import { OnboardingController } from "./components/onboarding";

// Page components
import Dashboard from "./components/dashboard/Dashboard";
import Transactions from "./components/transactions/Transactions";
import AddTransaction from "./components/transactions/AddTransaction";
import EditTransaction from "./components/transactions/EditTransaction";
import TransactionDetails from "./components/transactions/TransactionDetails";
import Budgets from "./components/budget/Budgets";
import CreateBudget from "./components/budget/CreateBudget";
import EditBudget from "./components/budget/EditBudget";
import BudgetDetails from "./components/budget/BudgetDetails";
import Goals from "./components/goals/Goals";
import GoalDetails from "./components/goals/GoalDetails";
import CreateGoal from "./components/goals/CreateGoal";
import EditGoal from "./components/goals/EditGoal";
import GoalContribution from "./components/goals/GoalContribution";
import FamilyDashboard from "./components/family/FamilyDashboard";
import CreateFamily from "./components/family/CreateFamily";
import EditFamily from "./components/family/EditFamily";
import InviteFamilyMember from "./components/family/InviteFamilyMember";
import LandingPage from "./components/landing/LandingPage";
import AIPrediction from "./components/predictions/AIPrediction";
import FinancialReports from "./components/reports/FinancialReports";
import Settings from "./components/settings/Settings";

// Admin components
import { AdminLayout, AdminDashboard, UserManagement, AdminBudgets, AdminLogin } from "./components/admin";
import AdminRoute from "./components/admin/AdminRoute";

// Lazy loaded components for admin section
const AdminGoals = lazy(() => import("./components/admin/goals/AdminGoals"));
const AdminTransactions = lazy(() => import("./components/admin/transactions/AdminTransactions"));
const AdminFamily = lazy(() => import("./components/admin/family/AdminFamily"));
const AdminPredictions = lazy(() => import("./components/admin/predictions/AdminPredictions"));
const AdminReports = lazy(() => import("./components/admin/reports/AdminReports"));
const AdminSettings = lazy(() => import("./components/admin/settings/AdminSettings"));

// Add activeTab to LandingPageProps
interface LandingPageProps {
  activeTab?: string;
}

interface PrivateRouteProps {
  children: React.ReactNode;
}

// Check if the user is authenticated before rendering route content
const PrivateRoute: FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // If authentication is still loading, show nothing or a loading indicator
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the children components
  return <>{children}</>;
};

const App: FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <OnboardingProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </OnboardingProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};

const AppRoutes: FC = () => {
  const { user, loading, verificationEmail, showEmailVerificationModal, setShowEmailVerificationModal } = useAuth();
  const location = useLocation();

  // Landing page paths
  const landingPaths = ["/", "/login", "/signup", "/password-reset"];
  const isLandingPage = landingPaths.includes(location.pathname);
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      <Meta title="BudgetMe - Personal Finance Manager" />
      <EmailVerificationModal 
        isOpen={showEmailVerificationModal} 
        onClose={() => setShowEmailVerificationModal(false)}
        email={verificationEmail || ''}
      />

      {/* Only show OnboardingController if user is authenticated and not on landing/admin pages */}
      {user && !loading && !isLandingPage && !isAdminPage && (
        <OnboardingController />
      )}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage activeTab="login" />} />
        <Route path="/signup" element={<LandingPage activeTab="signup" />} />
        <Route path="/password-reset" element={<LandingPage activeTab="reset" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute element={
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/families"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminFamily />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/budgets"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminBudgets />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/goals"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminGoals />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminTransactions />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminReports />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/predictions"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminPredictions />
              </AdminLayout>
            }/>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute element={
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            }/>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout title="Dashboard">
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <PrivateRoute>
              <Layout title="Transactions">
                <Transactions />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions/add"
          element={
            <PrivateRoute>
              <Layout title="Add Transaction">
                <AddTransaction />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions/:id/edit"
          element={
            <PrivateRoute>
              <Layout title="Edit Transaction">
                <EditTransaction />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions/:id"
          element={
            <PrivateRoute>
              <Layout title="Transaction Details">
                <TransactionDetails />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <PrivateRoute>
              <Layout title="Budgets">
                <Budgets />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets/create"
          element={
            <PrivateRoute>
              <Layout title="Create Budget">
                <CreateBudget />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets/:id/edit"
          element={
            <PrivateRoute>
              <Layout title="Edit Budget">
                <EditBudget />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets/:id"
          element={
            <PrivateRoute>
              <Layout title="Budget Details">
                <BudgetDetails />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <PrivateRoute>
              <Layout title="Financial Goals">
                <Goals />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals/create"
          element={
            <PrivateRoute>
              <Layout title="Create Goal">
                <CreateGoal />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals/:id/edit"
          element={
            <PrivateRoute>
              <Layout title="Edit Goal">
                <EditGoal />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals/:id"
          element={
            <PrivateRoute>
              <Layout title="Goal Details">
                <GoalDetails />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals/:id/contribute"
          element={
            <PrivateRoute>
              <Layout title="Contribute to Goal">
                <GoalContribution />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/family"
          element={
            <PrivateRoute>
              <Layout title="Family Dashboard">
                <FamilyDashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/family/create"
          element={
            <PrivateRoute>
              <Layout title="Create Family">
                <CreateFamily />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/family/edit/:id"
          element={
            <PrivateRoute>
              <Layout title="Edit Family">
                <EditFamily />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/family/invite"
          element={
            <PrivateRoute>
              <Layout title="Invite Family Member">
                <InviteFamilyMember />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/predictions"
          element={
            <PrivateRoute>
              <Layout title="AI Predictions">
                <AIPrediction />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Layout title="Financial Reports">
                <FinancialReports />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Layout title="Settings">
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
