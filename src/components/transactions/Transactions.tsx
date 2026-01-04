import { FC, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

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

// Import export utilities
import {
  exportTransactionsToPDF,
  exportTransactionsToCSV,
  exportTransactionsToDOCX
} from './utils/exportUtils';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import Transaction CSS
import "./transactions.css";

const Transactions: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
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
    filteredTransactions, // Complete filtered data for charts and summary
    paginatedTransactions, // Subset for table display
    isFiltering,
    handleFilterChange,
    resetFilters,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    updatePage,
    updatePageSize
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

  // Export handlers
  const getFilterInfo = (): string | undefined => {
    const filters: string[] = [];
    if (filter.type && filter.type !== 'all') {
      filters.push(`Type: ${filter.type}`);
    }
    if (filter.categoryId) {
      filters.push(`Category ID: ${filter.categoryId}`);
    }
    if (filter.accountId) {
      filters.push(`Account ID: ${filter.accountId}`);
    }
    if (filter.month || filter.year) {
      const period = filter.month && filter.year ? `${filter.month}/${filter.year}` : filter.year || filter.month;
      filters.push(`Period: ${period}`);
    }
    if (filter.search) {
      filters.push(`Search: "${filter.search}"`);
    }
    return filters.length > 0 ? `Filters: ${filters.join(', ')}` : undefined;
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing PDF export...');
      await exportTransactionsToPDF(filteredTransactions, getFilterInfo());
      showSuccessToast('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      showErrorToast('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing CSV export...');
      exportTransactionsToCSV(filteredTransactions, getFilterInfo());
      showSuccessToast('CSV downloaded successfully!');
    } catch (error) {
      console.error('CSV Export Error:', error);
      showErrorToast('Failed to generate CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing Word document export...');
      await exportTransactionsToDOCX(filteredTransactions, getFilterInfo());
      showSuccessToast('Word document downloaded successfully!');
    } catch (error) {
      console.error('DOCX Export Error:', error);
      showErrorToast('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle user authentication redirect
  if (!user) {
    navigate('/auth/login');
    return null;
  }

  // Loading state
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading transactions...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn hidden md:block">
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
      paginatedTransactions,
      () => {}, // setFilteredTransactions is managed by useTransactionFilters
      userData!,
      setUserData
    );
  };

  return (
    <div className="container-fluid">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Transactions</h1>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="dropdown">
              <button
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                type="button"
                id="mobileExportDropdown"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                disabled={isExporting || filteredTransactions.length === 0}
                aria-label="Export"
              >
                <i className="fas fa-download text-xs"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="mobileExportDropdown">
                <button className="dropdown-item text-sm" onClick={handleExportPDF} disabled={isExporting}>
                  <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-danger"></i>PDF
                </button>
                <button className="dropdown-item text-sm" onClick={handleExportCSV} disabled={isExporting}>
                  <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-success"></i>CSV
                </button>
                <button className="dropdown-item text-sm" onClick={handleExportDOCX} disabled={isExporting}>
                  <i className="fas fa-file-word fa-sm fa-fw mr-2 text-primary"></i>Word
                </button>
              </div>
            </div>
            {/* Add Transaction Button */}
            <Link
              to="/transactions/add"
              className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add transaction"
            >
              <i className="fas fa-plus text-xs"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Page Heading */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-4 transactions-header flex-wrap">
        <h1 className="h3 mb-0 text-gray-800">
          Transactions
        </h1>
        <div className="d-flex gap-2">
          {/* Export Dropdown */}
          <div className="dropdown">
            <button
              className="inline-flex items-center justify-center px-3 py-2 bg-[#1cc88a] hover:bg-[#17a673] text-white text-sm font-medium rounded shadow-sm transition-colors dropdown-toggle disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              id="exportDropdown"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
              disabled={isExporting || filteredTransactions.length === 0}
            >
              <i className="fas fa-download text-xs mr-1"></i>
              Export
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
              <button className="dropdown-item" onClick={handleExportPDF} disabled={isExporting}>
                <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-danger"></i>Export as PDF
              </button>
              <button className="dropdown-item" onClick={handleExportCSV} disabled={isExporting}>
                <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-success"></i>Export as CSV
              </button>
              <button className="dropdown-item" onClick={handleExportDOCX} disabled={isExporting}>
                <i className="fas fa-file-word fa-sm fa-fw mr-2 text-primary"></i>Export as Word
              </button>
            </div>
          </div>
          
          {/* Add Transaction Button */}
          <Link
            to="/transactions/add"
            className="inline-flex items-center justify-center px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-medium rounded shadow-sm transition-colors"
          >
            <i className="fas fa-plus text-xs mr-1"></i>
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Goal Filter Banner */}
      <GoalFilterBanner
        goalId={filter.goal_id}
        goalName={goalName}
        onClearFilter={handleClearGoalFilter}
      />

      {/* Financial Overview Cards */}
      <div className="transaction-summary-cards">
        <TransactionSummaryCards
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          netCashflow={netCashflow}
          onToggleTip={toggleTip}
        />
      </div>

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
      {/* Mobile Transaction List Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-list text-indigo-500 text-[10px]"></i>
              Transaction List
              {totalItems > 0 && (
                <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <button 
              className="text-[10px] text-gray-500 flex items-center gap-1"
              onClick={resetFilters}
            >
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          {/* Filters */}
          <TransactionFilters
            filter={filter}
            userData={userData}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
            isFiltering={isFiltering}
          />
          
          {/* Table/List */}
          <TransactionTable
            filteredTransactions={paginatedTransactions}
            userData={userData}
            isFiltering={isFiltering}
            onToggleTip={toggleTip}
            onDeleteTransaction={openDeleteModal}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={updatePage}
            onPageSizeChange={updatePageSize}
          />
        </div>
      </div>

      {/* Desktop Transactions Table Card */}
      <div className="card shadow mb-4 transaction-table d-none d-md-block">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between flex-wrap">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center mb-1 mb-md-0">
            Transaction List
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('transactionList', e)}
                aria-label="Transaction list information"
              ></i>
            </div>
          </h6>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="inline-flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-medium rounded shadow-sm transition-colors"
              onClick={resetFilters}
            >
              <i className="fas fa-undo text-xs mr-1"></i>
              Reset
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="transaction-filters">
          <TransactionFilters
            filter={filter}
            userData={userData}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
            isFiltering={isFiltering}
          />
        </div>
        
        {/* Table */}
        <TransactionTable
          filteredTransactions={paginatedTransactions}
          userData={userData}
          isFiltering={isFiltering}
          onToggleTip={toggleTip}
          onDeleteTransaction={openDeleteModal}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={updatePage}
          onPageSizeChange={updatePageSize}
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