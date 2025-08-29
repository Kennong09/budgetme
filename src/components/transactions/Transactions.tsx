import React, { FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";

// Import refactored components
import {
  TransactionSummaryCards,
  TransactionCharts,
  TransactionFilters,
  TransactionTable,
  DeleteConfirmationModal,
  TooltipSystem,
  GoalFilterBanner
} from './components';

// Import custom hooks
import {
  useTransactionData,
  useTransactionFilters,
  useChartData,
  useTooltips,
  useDeleteTransaction
} from './hooks';

// Import utilities
import {
  calculateSummaryMetrics,
  getPeriodTitle
} from './utils';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

const Transactions: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use custom hooks for data and state management
  const {
    transactions,
    setTransactions,
    userData,
    setUserData,
    loading
  } = useTransactionData();
  
  const {
    filter,
    setFilter,
    filteredTransactions,
    isFiltering,
    handleFilterChange,
    resetFilters
  } = useTransactionFilters(transactions, userData);
  
  const {
    lineChartOptions,
    pieChartOptions
  } = useChartData(filteredTransactions, userData, filter);
  
  const {
    activeTip,
    tooltipPosition,
    toggleTip
  } = useTooltips();
  
  const {
    showDeleteModal,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteTransaction
  } = useDeleteTransaction();

  // Handle user authentication redirect
  if (!user) {
    navigate('/auth/login');
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Transactions
          </h5>
          <p className="text-gray-500">Please wait while we fetch your transaction data...</p>
        </div>
      </div>
    );
  }

  // Calculate summary metrics and other derived data
  const { totalIncome, totalExpenses, netCashflow, expensesRatio } = calculateSummaryMetrics(filteredTransactions);
  const periodTitle = getPeriodTitle(filter);
  const goalName = userData?.goals.find(g => g.id === filter.goal_id)?.goal_name;

  // Handle goal filter clearing
  const handleClearGoalFilter = () => {
    setFilter(prev => ({ ...prev, goal_id: undefined }));
    navigate('/transactions');
  };

  // Handle delete transaction with proper parameters
  const handleDeleteTransactionWrapper = () => {
    handleDeleteTransaction(
      transactions,
      setTransactions,
      filteredTransactions,
      () => {}, // setFilteredTransactions is managed by useTransactionFilters
      userData!,
      setUserData
    );
  };

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4 transactions-header">
        <h1 className="h3 mb-0 text-gray-800">Transactions</h1>
        <Link
          to="/transactions/add"
          className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm add-transaction-btn"
        >
          <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>
          Add Transaction
        </Link>
      </div>

      {/* Goal Filter Banner */}
      <GoalFilterBanner
        goalId={filter.goal_id}
        goalName={goalName}
        onClearFilter={handleClearGoalFilter}
      />

      {/* Financial Overview Cards */}
      <TransactionSummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netCashflow={netCashflow}
        onToggleTip={toggleTip}
      />

      {/* Charts Section */}
      <TransactionCharts
        lineChartOptions={lineChartOptions}
        pieChartOptions={pieChartOptions}
        filteredTransactions={filteredTransactions}
        periodTitle={periodTitle}
        expensesRatio={expensesRatio}
        onToggleTip={toggleTip}
      />

      {/* Transactions Table with Filters */}
      <div className="card shadow mb-4 transaction-table">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Transaction List
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('transactionList', e)}
                aria-label="Transaction list information"
              ></i>
            </div>
          </h6>
          <div>
            <button 
              className="btn btn-sm btn-outline-secondary mr-2" 
              onClick={resetFilters}
            >
              <i className="fas fa-undo fa-sm mr-1"></i> Reset Filters
            </button>
            <button className="btn btn-sm btn-outline-primary">
              <i className="fas fa-download fa-sm mr-1"></i> Export
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <TransactionFilters
          filter={filter}
          userData={userData}
          onFilterChange={handleFilterChange}
          onResetFilters={resetFilters}
          isFiltering={isFiltering}
        />
        
        {/* Table */}
        <TransactionTable
          filteredTransactions={filteredTransactions}
          userData={userData}
          isFiltering={isFiltering}
          onToggleTip={toggleTip}
          onDeleteTransaction={openDeleteModal}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        isDeleting={isDeleting}
        onConfirm={handleDeleteTransactionWrapper}
        onCancel={closeDeleteModal}
      />

      {/* Tooltip System */}
      <TooltipSystem
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
      />
    </div>
  );
};

export default Transactions;