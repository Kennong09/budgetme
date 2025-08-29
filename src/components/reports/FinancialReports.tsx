import React, { useState, useEffect, useRef, FC } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';

// Import refactored components
import {
  ReportHeader,
  ReportSummaryCards,
  ReportControls,
  ReportChart,
  ReportTable,
  EmailModal,
  TooltipSystem,
  ReportType,
  TimeframeType,
  FormatType,
  ChartType
} from './components';

// Import custom hooks
import {
  useReportData,
  useReportSettings,
  useTooltips,
  useEmailReport,
  useSummaryData,
  SpendingDataItem,
  IncomeExpenseDataItem,
  SavingsDataItem,
  TrendData,
  BudgetRelationship
} from './hooks';

// Import utilities
import {
  processSpendingData,
  processIncomeExpenseData,
  processSavingsData,
  processTrendsData,
  processGoalsData,
  processPredictionsData
} from './utils';

import { generateChartOptions } from './utils/chartOptions';
import { exportToPDF, exportToCSV, exportToExcel } from './utils/exportUtils';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

const FinancialReports: FC = () => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const chartRef = useRef<any>(null);

  // Use custom hooks for state management
  const {
    reportType,
    timeframe,
    format,
    chartType,
    setReportType,
    setTimeframe,
    setFormat,
    setChartType
  } = useReportSettings();

  const {
    transactions,
    budgets,
    goals,
    categories,
    loading
  } = useReportData(timeframe, reportType);

  const {
    activeTip,
    tooltipPosition,
    toggleTip,
    closeTip
  } = useTooltips();

  const {
    showEmailModal,
    emailRecipient,
    emailSubject,
    emailMessage,
    emailSending,
    setEmailRecipient,
    setEmailSubject,
    setEmailMessage,
    openEmailModal,
    closeEmailModal,
    sendEmail
  } = useEmailReport();

  const {
    totalTransactions,
    activeBudgets,
    activeGoals,
    lastUpdated,
    monthlyFinancials
  } = useSummaryData(transactions, budgets, goals);

  // State for processed data
  const [categoryData, setCategoryData] = useState<SpendingDataItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<IncomeExpenseDataItem[] | SavingsDataItem[]>([]);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [goalRelationship, setGoalRelationship] = useState<BudgetRelationship | null>(null);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [chartOptions, setChartOptions] = useState<any>({});

  // CSS for better mobile responsiveness
  const responsiveStyles = `
    @media (max-width: 576px) {
      .card-body { padding: 0.75rem; }
      .btn { padding: 0.375rem 0.5rem; font-size: 0.8rem; }
      .table-responsive { font-size: 0.8rem; }
      .h5 { font-size: 1rem; }
      .card-header { padding: 0.75rem; }
      .animate__animated { animation-duration: 0.5s; }
      .text-xs { font-size: 0.65rem; }
      .fa-2x { font-size: 1.5em; }
      .dropdown-menu { width: 100%; min-width: auto; }
    }
    @media (max-width: 768px) {
      .dropdown-menu { min-width: 180px; }
      .h3 { font-size: 1.5rem; }
      .d-sm-flex.align-items-center { flex-direction: column; align-items: flex-start !important; }
    }
  `;

  // Inject CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = responsiveStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Process data when transactions, timeframe, or report type changes
  useEffect(() => {
    if (loading || transactions.length === 0) return;

    switch (reportType) {
      case 'spending':
        const spendingData = processSpendingData(transactions, categories);
        setCategoryData(spendingData);
        break;
      case 'income-expense':
        const incomeExpenseData = processIncomeExpenseData(transactions, timeframe);
        setMonthlyData(incomeExpenseData);
        break;
      case 'savings':
        const savingsData = processSavingsData(transactions, timeframe);
        setMonthlyData(savingsData);
        break;
      case 'trends':
        const trends = processTrendsData(transactions, categories, timeframe);
        setTrendsData(trends);
        break;
      case 'goals':
        const { goalRelationship: goalRel, formattedGoals } = processGoalsData(transactions, budgets, goals);
        setGoalRelationship(goalRel);
        setBudgetData(formattedGoals);
        break;
      case 'predictions':
        const predictionsData = processPredictionsData(transactions);
        setMonthlyData(predictionsData);
        break;
    }
  }, [transactions, timeframe, reportType, categories, budgets, goals, loading]);

  // Update chart options when data changes
  useEffect(() => {
    if (loading) return;

    const options = generateChartOptions(
      reportType,
      chartType,
      categoryData,
      monthlyData,
      trendsData,
      budgetData
    );
    setChartOptions(options);
  }, [reportType, chartType, categoryData, monthlyData, trendsData, budgetData, loading]);

  // Export handlers
  const handleExportPDF = async () => {
    try {
      showSuccessToast('Preparing PDF export...');
      await exportToPDF(
        reportType,
        timeframe,
        format,
        categoryData,
        monthlyData,
        trendsData,
        goalRelationship || undefined,
        monthlyFinancials,
        chartRef
      );
      showSuccessToast('PDF report downloaded successfully!');
    } catch (error) {
      showErrorToast('Failed to generate PDF report. Please try again.');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(
        reportType,
        timeframe,
        categoryData,
        monthlyData,
        trendsData,
        goalRelationship || undefined
      );
      showSuccessToast('CSV report downloaded successfully!');
    } catch (error) {
      showErrorToast('Failed to generate CSV report. Please try again.');
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(
        reportType,
        timeframe,
        categoryData,
        monthlyData,
        trendsData,
        goalRelationship || undefined,
        monthlyFinancials
      );
      showSuccessToast('Excel report downloaded successfully!');
    } catch (error) {
      showErrorToast('Failed to generate Excel report. Please try again.');
    }
  };

  const handleEmailReport = () => {
    openEmailModal(reportType);
  };

  // Handle user authentication redirect
  if (!user) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="error mx-auto" data-text="401">401</div>
          <p className="lead text-gray-800 mb-5">Authentication Required</p>
          <p className="text-gray-500 mb-0">Please log in to view your financial reports.</p>
          <Link to="/login" className="btn btn-primary mt-3">
            <i className="fas fa-sign-in-alt mr-2"></i>Log In
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <ReportHeader
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onEmailReport={handleEmailReport}
      />

      {/* Summary Cards */}
      <ReportSummaryCards
        totalTransactions={totalTransactions}
        activeBudgets={activeBudgets}
        activeGoals={activeGoals}
        lastUpdated={lastUpdated}
      />

      {/* Report Controls */}
      <ReportControls
        reportType={reportType}
        timeframe={timeframe}
        format={format}
        chartType={chartType}
        onReportTypeChange={setReportType}
        onTimeframeChange={setTimeframe}
        onFormatChange={setFormat}
        onChartTypeChange={setChartType}
        onToggleTip={toggleTip}
      />

      {/* Report Content */}
      {format === "chart" ? (
        <ReportChart
          reportType={reportType}
          timeframe={timeframe}
          chartOptions={chartOptions}
          onToggleTip={toggleTip}
        />
      ) : (
        <ReportTable
          reportType={reportType}
          timeframe={timeframe}
          categoryData={categoryData}
          monthlyData={monthlyData}
          trendsData={trendsData}
          goalRelationship={goalRelationship}
          onToggleTip={toggleTip}
        />
      )}

      {/* Email Modal */}
      <EmailModal
        show={showEmailModal}
        emailRecipient={emailRecipient}
        emailSubject={emailSubject}
        emailMessage={emailMessage}
        emailSending={emailSending}
        onEmailRecipientChange={setEmailRecipient}
        onEmailSubjectChange={setEmailSubject}
        onEmailMessageChange={setEmailMessage}
        onSubmit={sendEmail}
        onClose={closeEmailModal}
      />

      {/* Tooltip System */}
      <TooltipSystem
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onClose={closeTip}
      />
    </div>
  );
};

export default FinancialReports;