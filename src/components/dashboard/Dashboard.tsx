import React, { useState, useEffect, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

// Import budget modal
import BudgetSetupModal from "../budget/BudgetSetupModal";

// Import dashboard components
import {
  WelcomeMessage,
  PendingInvitations,
  FinancialInsights,
  FilterControls,
  SummaryCards,
  ChartSection,
  TrendsSection,
  BottomSection
} from "./components";

// Import hooks
import {
  useDashboardData,
  useFilteredData,
  useInsightsAndCharts,
  useDashboardUI
} from "./hooks";

// Import styles
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "./dashboard.css";
import "animate.css";

const Dashboard: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();

  // Custom hooks for data management
  const {
    userData,
    budgetProgress,
    recentTransactions,
    pendingInvites,
    loading,
    fetchUserData,
    handleAcceptInvite,
    handleRejectInvite
  } = useDashboardData();

  // Custom hook for filtered data
  const {
    dateFilter,
    setDateFilter,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredTransactions,
    filteredUserData,
    getFilteredUrlParams,
    clearFilters
  } = useFilteredData(userData);

  // Custom hook for insights and charts
  const {
    insights,
    trends,
    monthlyData,
    categoryData
  } = useInsightsAndCharts(
    filteredTransactions,
    budgetProgress,
    userData?.expenseCategories || [],
    user?.id || ''
  );

  // Custom hook for UI state
  const {
    showWelcome,
    setShowWelcome,
    highchartsLoaded,
    activeTip,
    expandedInsight,
    toggleTip,
    toggleInsightExpand
  } = useDashboardUI();

  // Budget Setup Modal state
  const [showBudgetSetupModal, setShowBudgetSetupModal] = useState(false);

  // Check if user should see budget setup modal
  useEffect(() => {
    if (!loading && user && userData) {
      // Check if user has any budgets using budgetProgress data
      const hasBudgets = budgetProgress && budgetProgress.length > 0;
      
      // Check if user has skipped setup
      const hasSkippedSession = sessionStorage.getItem('budgetSetupSkipped');
      const hasSkippedPermanent = localStorage.getItem('budgetSetupSkipped') === 'permanent';
      
      // Check if reminder is set and still valid
      const reminderDate = localStorage.getItem('budgetSetupReminder');
      let shouldRemind = false;
      if (reminderDate) {
        const reminder = new Date(reminderDate);
        const now = new Date();
        shouldRemind = now >= reminder;
      }
      
      // Show modal if user has no budgets and hasn't skipped (or reminder time has come)
      if (!hasBudgets && !hasSkippedSession && (!hasSkippedPermanent || shouldRemind)) {
        // Delay showing modal slightly to ensure dashboard is loaded
        const timer = setTimeout(() => {
          setShowBudgetSetupModal(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, userData, budgetProgress]);

  // Handle budget setup modal events
  const handleBudgetSetupClose = () => {
    setShowBudgetSetupModal(false);
  };

  const handleBudgetSetupSkip = () => {
    setShowBudgetSetupModal(false);
  };

  const handleBudgetCreated = () => {
    setShowBudgetSetupModal(false);
    showSuccessToast('Budget created successfully! Welcome to smart budgeting.');
    fetchUserData(); // Refresh dashboard data
  };

  // Real-time subscriptions removed to reduce API usage

  // Helper functions
  const getFilteredChartTitle = (): string => {
    if (dateFilter === 'all') {
      return 'All Time Overview';
    } else if (dateFilter === 'current-month') {
      return 'Current Month Overview';
    } else if (dateFilter === 'last-3-months') {
      return 'Last 3 Months Overview';
    } else if (dateFilter === 'last-6-months') {
      return 'Last 6 Months Overview';
    } else if (dateFilter === 'last-year') {
      return 'Last Year Overview';
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return `Custom Range (${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()})`;
    }
    return 'Monthly Overview';
  };

  const handleBudgetItemClick = (budget: any) => {
    const currentParams = getFilteredUrlParams();
    const params = new URLSearchParams(currentParams);
    params.set('categoryId', String(budget.id));
    navigate(`/transactions?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Dashboard
          </h5>
          <p className="text-gray-500">Please wait while we prepare your financial summary...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    navigate("/");
    return null;
  }

  return (
    <div className="container-fluid">
      {/* Budget Setup Modal */}
      <BudgetSetupModal
        show={showBudgetSetupModal}
        onClose={handleBudgetSetupClose}
        onSkip={handleBudgetSetupSkip}
        onBudgetCreated={handleBudgetCreated}
      />

      {/* Pending Invitations */}
      <PendingInvitations 
        invitations={pendingInvites}
        onAcceptInvite={handleAcceptInvite}
        onRejectInvite={handleRejectInvite}
      />

      {/* Welcome Message */}
      <WelcomeMessage 
        show={showWelcome}
        userName={userData.user.name || 'User'}
        onClose={() => setShowWelcome(false)}
      />

      {/* Financial Insights */}
      <FinancialInsights 
        insights={insights}
        expandedInsight={expandedInsight}
        onToggleInsightExpand={toggleInsightExpand}
      />

      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 dashboard-actions">
        <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
        <div className="d-none d-sm-flex align-items-center">
          <button
            onClick={fetchUserData}
            className="btn btn-sm btn-secondary shadow-sm mr-2"
            disabled={loading}
          >
            <i className="fas fa-sync fa-sm mr-2" style={{ color: '#6366f1' }}></i>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/reports"
            className="btn btn-sm btn-primary shadow-sm"
          >
            <i className="fas fa-download fa-sm text-white-50 mr-2"></i>
            Generate Report
          </Link>
        </div>
      </div>

      {/* Filter Controls */}
      <FilterControls 
        dateFilter={dateFilter}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        filteredTransactionsCount={filteredTransactions.length}
        totalTransactionsCount={userData.transactions.length}
        expenseCategories={userData.expenseCategories}
        incomeCategories={userData.incomeCategories}
        onDateFilterChange={setDateFilter}
        onTypeFilterChange={setTypeFilter}
        onCategoryFilterChange={setCategoryFilter}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onClearFilters={clearFilters}
      />

      {/* Summary Cards */}
      <SummaryCards 
        income={filteredUserData?.summaryData.income || 0}
        expenses={filteredUserData?.summaryData.expenses || 0}
        balance={filteredUserData?.summaryData.balance || 0}
        savingsRate={filteredUserData?.summaryData.savingsRate || 0}
        activeTip={activeTip}
        onToggleTip={toggleTip}
      />

      {/* Charts Section */}
      <ChartSection 
        monthlyData={monthlyData}
        categoryData={categoryData}
        highchartsLoaded={highchartsLoaded}
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        activeTip={activeTip}
        onToggleTip={toggleTip}
      />

      {/* Trends Section */}
      <TrendsSection 
        trends={trends}
        filteredTransactions={filteredTransactions}
        dateFilter={dateFilter}
        activeTip={activeTip}
        onToggleTip={toggleTip}
        getFilteredChartTitle={getFilteredChartTitle}
      />

      {/* Bottom Section - Budget Progress and Recent Transactions */}
      <BottomSection 
        budgetProgress={budgetProgress}
        recentTransactions={recentTransactions}
        expenseCategories={userData.expenseCategories}
        accounts={userData.accounts}
        goals={userData.goals}
        activeTip={activeTip}
        onToggleTip={toggleTip}
        getFilteredUrlParams={getFilteredUrlParams}
        onBudgetItemClick={handleBudgetItemClick}
      />
    </div>
  );
};

export default Dashboard;
