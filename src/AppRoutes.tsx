import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import AdminLayout from "./components/admin/layout/AdminLayout";
import { AdminRoute } from "./components/admin";
import PrivateRoute from "./components/auth/PrivateRoute";
import LandingPage from "./components/landing/LandingPage";
import AdminRedirect from "./components/admin/AdminRedirect";

// Import feature detail components
const ExpenseTrackingDetails = lazy(() => import("./components/featureDetails/ExpenseTrackingDetails"));
const SmartBudgetingDetails = lazy(() => import("./components/featureDetails/SmartBudgetingDetails"));
const FinancialGoalsDetails = lazy(() => import("./components/featureDetails/FinancialGoalsDetails"));
const FinancialReportsDetails = lazy(() => import("./components/featureDetails/FinancialReportsDetails"));
const FamilyFinanceDetails = lazy(() => import("./components/featureDetails/FamilyFinanceDetails"));
const AIInsightsDetails = lazy(() => import("./components/featureDetails/AI-InsightsDetails"));

// Lazy load components for better performance
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Transactions = lazy(() => import("./components/transactions/Transactions"));
const TransactionDetails = lazy(() => import("./components/transactions/TransactionDetails"));
const AddTransaction = lazy(() => import("./components/transactions/AddTransaction"));
const EditTransaction = lazy(() => import("./components/transactions/EditTransaction"));
const Goals = lazy(() => import("./components/goals/Goals"));
const GoalDetails = lazy(() => import("./components/goals/GoalDetails"));
const CreateGoal = lazy(() => import("./components/goals/CreateGoal"));
const EditGoal = lazy(() => import("./components/goals/EditGoal"));
const GoalContribution = lazy(() => import("./components/goals/GoalContribution"));
const Budgets = lazy(() => import("./components/budget/Budgets"));
const BudgetDetails = lazy(() => import("./components/budget/BudgetDetails"));
const CreateBudget = lazy(() => import("./components/budget/CreateBudget"));
const EditBudget = lazy(() => import("./components/budget/EditBudget"));
const Settings = lazy(() => import("./components/settings/Settings"));
const FinancialReports = lazy(() => import("./components/reports/FinancialReports"));
const AIPrediction = lazy(() => import("./components/predictions/AIPrediction"));
const FamilyDashboard = lazy(() => import("./components/family/FamilyDashboard"));
const CreateFamily = lazy(() => import("./components/family/CreateFamily"));
const EditFamily = lazy(() => import("./components/family/EditFamily"));
const JoinFamily = lazy(() => import("./components/family/JoinFamily"));
const InviteFamilyMember = lazy(() => import("./components/family/InviteFamilyMember"));

// Auth components
const AuthCallback = lazy(() => import("./components/auth/AuthCallback"));
const ResetPassword = lazy(() => import("./components/auth/ResetPassword"));

// Admin components
const AdminDashboard = lazy(() => import("./components/admin/dashboard/AdminDashboard"));
const UserManagement = lazy(() => import("./components/admin/users/UserManagement"));
const AdminBudgets = lazy(() => import("./components/admin/budget/AdminBudgets"));
const AdminGoals = lazy(() => import("./components/admin/goals/AdminGoals"));
const AdminTransactions = lazy(() => import("./components/admin/transactions/AdminTransactions"));
const AdminFamily = lazy(() => import("./components/admin/family/AdminFamily"));
const AdminReports = lazy(() => import("./components/admin/reports/AdminReports"));
const AdminPredictions = lazy(() => import("./components/admin/predictions/AdminPredictions"));
const AdminAIInsights = lazy(() => import("./components/admin/ai-insights/AdminAIInsights"));
const AdminSettings = lazy(() => import("./components/admin/settings/AdminSettings"));
const AdminChatbot = lazy(() => import("./components/admin/chatbot/AdminChatbot"));
const AdminAccounts = lazy(() => import("./components/admin/accounts/AdminAccounts"));
const AdminNotFound = lazy(() => import("./components/admin/layout/AdminNotFound"));

// 404 component
const NotFound = lazy(() => import("./components/landing/NotFound"));

// Loading fallback
const LoadingFallback = () => (
  <div className="app-loading-container">
    <div className="app-spinner"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={
        <Suspense fallback={<LoadingFallback />}>
          <AuthCallback />
        </Suspense>
      } />
      <Route path="/reset-password" element={
        <Suspense fallback={<LoadingFallback />}>
          <ResetPassword />
        </Suspense>
      } />

      {/* Feature Detail Pages */}
      <Route path="/features/expense-tracking" element={
        <Suspense fallback={<LoadingFallback />}>
          <ExpenseTrackingDetails />
        </Suspense>
      } />
      <Route path="/features/smart-budgeting" element={
        <Suspense fallback={<LoadingFallback />}>
          <SmartBudgetingDetails />
        </Suspense>
      } />
      <Route path="/features/financial-goals" element={
        <Suspense fallback={<LoadingFallback />}>
          <FinancialGoalsDetails />
        </Suspense>
      } />
      <Route path="/features/financial-reports" element={
        <Suspense fallback={<LoadingFallback />}>
          <FinancialReportsDetails />
        </Suspense>
      } />
      <Route path="/features/family-sharing" element={
        <Suspense fallback={<LoadingFallback />}>
          <FamilyFinanceDetails />
        </Suspense>
      } />
      <Route path="/features/ai-insights" element={
        <Suspense fallback={<LoadingFallback />}>
          <AIInsightsDetails />
        </Suspense>
      } />

      {/* Protected User Routes */}
      <Route path="/dashboard" element={
        <PrivateRoute element={
          <Layout title="Dashboard">
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/transactions" element={
        <PrivateRoute element={
          <Layout title="Transactions">
            <Suspense fallback={<LoadingFallback />}>
              <Transactions />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/transactions/:id" element={
        <PrivateRoute element={
          <Layout title="Transaction Details">
            <Suspense fallback={<LoadingFallback />}>
              <TransactionDetails />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/transactions/add" element={
        <PrivateRoute element={
          <Layout title="Add Transaction">
            <Suspense fallback={<LoadingFallback />}>
              <AddTransaction />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/transactions/:id/edit" element={
        <PrivateRoute element={
          <Layout title="Edit Transaction">
            <Suspense fallback={<LoadingFallback />}>
              <EditTransaction />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/goals" element={
        <PrivateRoute element={
          <Layout title="Financial Goals">
            <Suspense fallback={<LoadingFallback />}>
              <Goals />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/goals/:id" element={
        <PrivateRoute element={
          <Layout title="Goal Details">
            <Suspense fallback={<LoadingFallback />}>
              <GoalDetails />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/goals/create" element={
        <PrivateRoute element={
          <Layout title="Create Goal">
            <Suspense fallback={<LoadingFallback />}>
              <CreateGoal />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/goals/:id/edit" element={
        <PrivateRoute element={
          <Layout title="Edit Goal">
            <Suspense fallback={<LoadingFallback />}>
              <EditGoal />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/goals/:id/contribute" element={
        <PrivateRoute element={
          <Layout title="Contribute to Goal">
            <Suspense fallback={<LoadingFallback />}>
              <GoalContribution />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/budgets" element={
        <PrivateRoute element={
          <Layout title="Budgets">
            <Suspense fallback={<LoadingFallback />}>
              <Budgets />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/budgets/:id" element={
        <PrivateRoute element={
          <Layout title="Budget Details">
            <Suspense fallback={<LoadingFallback />}>
              <BudgetDetails />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/budgets/create" element={
        <PrivateRoute element={
          <Layout title="Create Budget">
            <Suspense fallback={<LoadingFallback />}>
              <CreateBudget />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/budgets/:id/edit" element={
        <PrivateRoute element={
          <Layout title="Edit Budget">
            <Suspense fallback={<LoadingFallback />}>
              <EditBudget />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/reports" element={
        <PrivateRoute element={
          <Layout title="Financial Reports">
            <Suspense fallback={<LoadingFallback />}>
              <FinancialReports />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/predictions" element={
        <PrivateRoute element={
          <Layout title="AI Financial Predictions">
            <Suspense fallback={<LoadingFallback />}>
              <AIPrediction />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/settings" element={
        <PrivateRoute element={
          <Layout title="Settings">
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/family" element={
        <PrivateRoute element={
          <Layout title="Family Dashboard">
            <Suspense fallback={<LoadingFallback />}>
              <FamilyDashboard />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/family/create" element={
        <PrivateRoute element={
          <Layout title="Create Family Group">
            <Suspense fallback={<LoadingFallback />}>
              <CreateFamily />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/family/:id/edit" element={
        <PrivateRoute element={
          <Layout title="Edit Family Group">
            <Suspense fallback={<LoadingFallback />}>
              <EditFamily />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/family/join/:inviteCode" element={
        <PrivateRoute element={
          <Layout title="Join Family Group">
            <Suspense fallback={<LoadingFallback />}>
              <JoinFamily />
            </Suspense>
          </Layout>
        } />
      } />
      <Route path="/family/:id/invite" element={
        <PrivateRoute element={
          <Layout title="Invite Family Member">
            <Suspense fallback={<LoadingFallback />}>
              <InviteFamilyMember />
            </Suspense>
          </Layout>
        } />
      } />

      {/* Admin Root Redirect */}
      <Route path="/admin" element={
        <Suspense fallback={<LoadingFallback />}>
          <AdminRedirect />
        </Suspense>
      } />


      {/* Protected Admin Routes */}
      <Route path="/admin/dashboard" element={
        <AdminRoute element={
          <AdminLayout title="Admin Dashboard">
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/users/*" element={
        <AdminRoute element={
          <AdminLayout title="User Management">
            <Suspense fallback={<LoadingFallback />}>
              <UserManagement />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/budgets/*" element={
        <AdminRoute element={
          <AdminLayout title="Budget Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminBudgets />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/goals/*" element={
        <AdminRoute element={
          <AdminLayout title="Goal Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminGoals />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/transactions/*" element={
        <AdminRoute element={
          <AdminLayout title="Transaction Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminTransactions />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/family/*" element={
        <AdminRoute element={
          <AdminLayout title="Family Group Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminFamily />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/reports/*" element={
        <AdminRoute element={
          <AdminLayout title="Reports Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminReports />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/predictions/*" element={
        <AdminRoute element={
          <AdminLayout title="AI Predictions Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminPredictions />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/ai-insights/*" element={
        <AdminRoute element={
          <AdminLayout title="AI Insights">
            <Suspense fallback={<LoadingFallback />}>
              <AdminAIInsights />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/settings/*" element={
        <AdminRoute element={
          <AdminLayout title="Admin Settings">
            <Suspense fallback={<LoadingFallback />}>
              <AdminSettings />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/chatbot/*" element={
        <AdminRoute element={
          <AdminLayout title="Chatbot Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminChatbot />
            </Suspense>
          </AdminLayout>
        } />
      } />
      <Route path="/admin/accounts/*" element={
        <AdminRoute element={
          <AdminLayout title="Account Management">
            <Suspense fallback={<LoadingFallback />}>
              <AdminAccounts />
            </Suspense>
          </AdminLayout>
        } />
      } />

      {/* Admin 404 */}
      <Route path="/admin/*" element={
        <AdminRoute element={<AdminNotFound />} />
      } />

      {/* Redirect legacy paths */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />

      {/* 404 page */}
      <Route path="/404" element={
        <Suspense fallback={<LoadingFallback />}>
          <NotFound />
        </Suspense>
      } />

      {/* 404 catch-all */}
      <Route path="*" element={
        <Suspense fallback={<LoadingFallback />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
};

export default AppRoutes; 