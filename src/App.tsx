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
import AuthCallback from "./components/auth/AuthCallback";
import EmailVerificationModal from "./components/auth/EmailVerificationModal";

// Layout components
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Meta from "./components/layout/Meta";

// Page components
import Dashboard from "./components/dashboard/Dashboard";
import Transactions from "./components/transactions/Transactions";
import AddTransaction from "./components/transactions/AddTransaction";
import TransactionDetails from "./components/transactions/TransactionDetails";
import Budgets from "./components/budget/Budgets";
import CreateBudget from "./components/budget/CreateBudget";
import BudgetDetails from "./components/budget/BudgetDetails";
import Goals from "./components/goals/Goals";
import GoalDetails from "./components/goals/GoalDetails";
import CreateGoal from "./components/goals/CreateGoal";
import GoalContribution from "./components/goals/GoalContribution";
import FamilyDashboard from "./components/family/FamilyDashboard";
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

interface AppProps {}

// Route guard component with enhanced session handling
const ProtectedRoute: FC<{ element: React.ReactElement, title?: string, adminOnly?: boolean }> = ({ element, title, adminOnly }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to landing page without auto-showing login modal
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to home without setting showLogin in state
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100vh", backgroundColor: "#f8f9fc" }}
    >
      <div className="text-center">
        <div className="spinner-border text-primary mb-4" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <h1 className="h3 text-gray-800 mb-2">BudgetMe</h1>
        <p className="text-gray-600">Loading your financial dashboard...</p>
      </div>
    </div>
  );

  if (adminOnly && user) {
    // Check if user has admin role (this would use Supabase in production)
    const isAdmin = user.user_metadata?.role === 'admin'; // This is simplified
    
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }

  // Wrap the element in the Layout component if user is authenticated
  return user ? (
    <Layout title={title}>
      {element}
    </Layout>
  ) : null; // Return null to prevent flash before redirect
};

// Landing page wrapper that handles automatic login detection
const LandingPageWrapper: FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show landing page only if not authenticated
  return loading ? (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100vh", backgroundColor: "#f8f9fc" }}
    >
      <div className="text-center">
        <div className="spinner-border text-primary mb-4" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <h1 className="h3 text-gray-800 mb-2">BudgetMe</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  ) : !user ? (
    <>
      <Meta title="BudgetMe - Personal Finance Tracker" />
      <LandingPage />
    </>
  ) : null; // Return null to prevent flash before redirect
};

const AppContent: FC = () => {
  const { loading } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Loading screen
  if (isLoading || loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ height: "100vh", backgroundColor: "#f8f9fc" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h1 className="h3 text-gray-800 mb-2">BudgetMe</h1>
          <p className="text-gray-600">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <EmailVerificationModal 
        isOpen={false}
        onClose={() => {}}
        email=""
      />
      <Routes>
        {/* Landing page route */}
        <Route path="/" element={<LandingPageWrapper />} />
        
        {/* Admin login route */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Auth callback route */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} title="Dashboard | BudgetMe" />} />
        <Route path="/transactions" element={<ProtectedRoute element={<Transactions />} title="Transactions | BudgetMe" />} />
        <Route path="/transactions/add" element={<ProtectedRoute element={<AddTransaction />} title="Add Transaction | BudgetMe" />} />
        <Route path="/transactions/:id" element={<ProtectedRoute element={<TransactionDetails />} title="Transaction Details | BudgetMe" />} />
        <Route path="/budgets" element={<ProtectedRoute element={<Budgets />} title="Budgets | BudgetMe" />} />
        <Route path="/budgets/create" element={<ProtectedRoute element={<CreateBudget />} title="Create Budget | BudgetMe" />} />
        <Route path="/budgets/:id" element={<ProtectedRoute element={<BudgetDetails />} title="Budget Details | BudgetMe" />} />
        <Route path="/goals" element={<ProtectedRoute element={<Goals />} title="Goals | BudgetMe" />} />
        <Route path="/goals/create" element={<ProtectedRoute element={<CreateGoal />} title="Create Goal | BudgetMe" />} />
        <Route path="/goals/:id" element={<ProtectedRoute element={<GoalDetails />} title="Goal Details | BudgetMe" />} />
        <Route path="/goals/:id/contribute" element={<ProtectedRoute element={<GoalContribution />} title="Make Contribution | BudgetMe" />} />
        <Route path="/family" element={<ProtectedRoute element={<FamilyDashboard />} title="Family Dashboard | BudgetMe" />} />
        <Route path="/family/invite" element={<ProtectedRoute element={<InviteFamilyMember />} title="Invite Member | BudgetMe" />} />
        <Route path="/predictions" element={<ProtectedRoute element={<AIPrediction />} title="AI Predictions | BudgetMe" />} />
        <Route path="/reports" element={<ProtectedRoute element={<FinancialReports />} title="Financial Reports | BudgetMe" />} />
        <Route path="/settings" element={<ProtectedRoute element={<Settings />} title="Settings | BudgetMe" />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<AdminRoute element={<AdminDashboard />} title="Admin Dashboard | BudgetMe" />} />
        <Route path="/admin/users" element={<AdminRoute element={<UserManagement />} title="User Management | BudgetMe" />} />
        <Route path="/admin/budgets" element={<AdminRoute element={<AdminBudgets />} title="Admin Budgets | BudgetMe" />} />
        <Route path="/admin/goals" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminGoals />
        </Suspense>} title="Admin Goals | BudgetMe" />} />
        <Route path="/admin/transactions" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminTransactions />
        </Suspense>} title="Admin Transactions | BudgetMe" />} />
        <Route path="/admin/family" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminFamily />
        </Suspense>} title="Admin Family | BudgetMe" />} />
        <Route path="/admin/predictions" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminPredictions />
        </Suspense>} title="Admin Predictions | BudgetMe" />} />
        <Route path="/admin/reports" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminReports />
        </Suspense>} title="Admin Reports | BudgetMe" />} />
        <Route path="/admin/settings" element={<AdminRoute element={<Suspense fallback={<div>Loading...</div>}>
          <AdminSettings />
        </Suspense>} title="Admin Settings | BudgetMe" />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

const App: FC<AppProps> = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <AppContent />
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
