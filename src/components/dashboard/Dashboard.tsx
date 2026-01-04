import { useState, useEffect, useCallback, useMemo, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { supabase } from "../../utils/supabaseClient";

// Import account setup modal
import AccountSetupModal from "../accounts/AccountSetupModal";

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



// Import styles (CSS imported at app level to avoid lazy loading issues)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

const Dashboard: FC = () => {
  // ALL HOOKS MUST BE CALLED FIRST - NO EXCEPTIONS
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast } = useToast();


  
  // ALL useState hooks
  const [showAccountSetupModal, setShowAccountSetupModal] = useState(false);

  // ALL custom hooks - MUST be called in same order every time
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

  // Charts should always use filtered transactions to respect the selected filters
  // When filter results in 0 transactions, charts should show "No Data"
  const transactionsForCharts = useMemo(() => {
    // Always use filtered transactions - this respects the date/type/category filters
    return filteredTransactions || [];
  }, [filteredTransactions]);

  const {
    insights,
    trends,
    refreshInsights
  } = useInsightsAndCharts(
    transactionsForCharts,
    budgetProgress,
    userData?.expenseCategories || [],
    user?.id || '',
    dateFilter,
    customStartDate,
    customEndDate
  );


  const {
    showWelcome,
    setShowWelcome,
    activeTip,
    expandedInsight,
    toggleTip,
    toggleInsightExpand
  } = useDashboardUI();

  // ALL useEffect hooks
  useEffect(() => {
    const checkAccountSetupStatus = async () => {
      if (!loading && user && userData) {
        const hasAccounts = userData.accounts && userData.accounts.length > 0;
        
        // Check if user has already completed account setup process in database
        let hasCompletedAccountSetup = false;
        try {
          const { data, error } = await supabase.rpc('check_account_setup_completed', {
            user_uuid: user.id
          });
          
          if (error) {
            console.error('Error checking account setup completion:', error);
            // Fallback to localStorage if database check fails
            hasCompletedAccountSetup = localStorage.getItem('accountSetupCompleted') === 'true';
          } else {
            hasCompletedAccountSetup = data === true;
          }
        } catch (error) {
          console.error('Exception checking account setup completion:', error);
          // Fallback to localStorage if database call fails
          hasCompletedAccountSetup = localStorage.getItem('accountSetupCompleted') === 'true';
        }

        // Check if user has skipped setup for later in database
        let hasSkippedSetup = false;
        try {
          const { data, error } = await supabase.rpc('check_account_setup_skip_active', {
            user_uuid: user.id
          });
          
          if (error) {
            console.error('Error checking account setup skip status:', error);
            // Fallback to localStorage if database check fails
            const hasSkippedSession = sessionStorage.getItem('accountSetupSkipped');
            const hasSkippedPermanent = localStorage.getItem('accountSetupSkipped') === 'permanent';
            const reminderDate = localStorage.getItem('accountSetupReminder');
            let shouldRemind = false;
            if (reminderDate) {
              const reminder = new Date(reminderDate);
              const now = new Date();
              shouldRemind = now >= reminder;
            }
            hasSkippedSetup = Boolean(hasSkippedSession) || (hasSkippedPermanent && !shouldRemind);
          } else {
            hasSkippedSetup = data === true;
          }
        } catch (error) {
          console.error('Exception checking account setup skip status:', error);
          // Fallback to localStorage if database call fails
          const hasSkippedSession = sessionStorage.getItem('accountSetupSkipped');
          const hasSkippedPermanent = localStorage.getItem('accountSetupSkipped') === 'permanent';
          const reminderDate = localStorage.getItem('accountSetupReminder');
          let shouldRemind = false;
          if (reminderDate) {
            const reminder = new Date(reminderDate);
            const now = new Date();
            shouldRemind = now >= reminder;
          }
          hasSkippedSetup = Boolean(hasSkippedSession) || (hasSkippedPermanent && !shouldRemind);
        }
        
        // Check if all accounts have zero balance
        const allAccountsHaveZeroBalance = hasAccounts && 
          userData.accounts.every((account: any) => 
            account.balance === 0 || account.balance === '0' || !account.balance
          );
        
        // Show modal if user has no accounts OR all accounts have zero balance
        // BUT NOT if they have already completed the account setup process OR skipped for later
        const shouldShowModal = (!hasAccounts || allAccountsHaveZeroBalance) && 
          !hasCompletedAccountSetup &&
          !hasSkippedSetup;
        
        if (shouldShowModal) {
          const timer = setTimeout(() => {
            setShowAccountSetupModal(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    };

    checkAccountSetupStatus();
  }, [loading, user, userData]);



  // ALL useCallback hooks
  const handleAccountSetupClose = useCallback(() => {
    setShowAccountSetupModal(false);
  }, []);

  const handleAccountCreated = useCallback(() => {
    setShowAccountSetupModal(false);
    showSuccessToast('Account created successfully! Welcome to smart financial management.');
    fetchUserData();
  }, [showSuccessToast, fetchUserData]);

  const getFilteredChartTitle = useCallback((): string => {
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
  }, [dateFilter, customStartDate, customEndDate]);

  const handleBudgetItemClick = useCallback((budget: any) => {
    const currentParams = getFilteredUrlParams();
    const params = new URLSearchParams(currentParams);
    params.set('categoryId', String(budget.id));
    navigate(`/transactions?${params.toString()}`);
  }, [getFilteredUrlParams, navigate]);



  if (loading) {
    return (
      <div className="container-fluid">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your finances...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn hidden md:block">
          <div className="spinner-border text-primary w-12 h-12" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-light text-lg">
            Loading Dashboard
          </h5>
          <p className="text-gray-500 text-base">Please wait while we prepare your financial summary...</p>
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
      {/* Account Setup Modal */}
      <AccountSetupModal
        isOpen={showAccountSetupModal}
        onClose={handleAccountSetupClose}
        onAccountCreated={handleAccountCreated}
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
        onRefreshInsights={refreshInsights}
      />

      {/* Page Heading */}
      <div className="hidden md:flex items-center justify-between mb-4 dashboard-actions flex-wrap">
        <h1 className="text-lg font-semibold mb-0 text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUserData}
            className="inline-flex items-center justify-center px-3 py-2 bg-[#1cc88a] hover:bg-[#17a673] text-white text-sm font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <i className="fas fa-sync text-xs mr-1"></i>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/reports"
            className="inline-flex items-center justify-center px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-medium rounded shadow-sm transition-colors"
          >
            <i className="fas fa-download text-xs mr-1"></i>
            Generate Report
          </Link>
        </div>
      </div>

      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserData}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={loading}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${loading ? 'fa-spin' : ''}`}></i>
            </button>
            <Link
              to="/reports"
              className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Generate report"
            >
              <i className="fas fa-chart-bar text-xs"></i>
            </Link>
          </div>
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
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        activeTip={activeTip}
        onToggleTip={toggleTip}
        transactions={transactionsForCharts}
        expenseCategories={userData?.expenseCategories || []}
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
        userData={userData}
        activeTip={activeTip}
        onToggleTip={toggleTip}
        getFilteredUrlParams={getFilteredUrlParams}
        onBudgetItemClick={handleBudgetItemClick}
      />
    </div>
  );
};

export default Dashboard;
