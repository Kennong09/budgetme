import React, { useState, useEffect, useRef, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';

// Import refactored components
import {
  ReportHeader,
  ReportSummaryCards,
  ReportControls,
  ReportChart,
  ReportTable,
  TooltipSystem,
  FinancialInsights,
  AnomalyAlerts,
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
import { exportToPDF, exportToCSV, exportToDOCX } from './utils/exportUtils';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

const FinancialReports: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  
  // Mobile UI state
  const [isExporting, setIsExporting] = useState(false);
  const [mobileSettingsExpanded, setMobileSettingsExpanded] = useState(false);

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
      setIsExporting(true);
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
        chartRef,
        aiInsights
      );
      showSuccessToast('PDF report downloaded successfully!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      showErrorToast('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing CSV export...');
      exportToCSV(
        reportType,
        timeframe,
        categoryData,
        monthlyData,
        trendsData,
        goalRelationship || undefined,
        aiInsights
      );
      showSuccessToast('CSV report downloaded successfully!');
    } catch (error) {
      console.error('CSV Export Error:', error);
      showErrorToast('Failed to generate CSV report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      setIsExporting(true);
      showSuccessToast('Preparing Word document export...');
      await exportToDOCX(
        reportType,
        timeframe,
        categoryData,
        monthlyData,
        trendsData,
        goalRelationship || undefined,
        monthlyFinancials,
        aiInsights
      );
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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your reports...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center mt-5 hidden md:block">
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
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Reports</h1>
          <div className="flex items-center gap-2">
            {/* Settings Toggle Button */}
            <button
              onClick={() => setMobileSettingsExpanded(!mobileSettingsExpanded)}
              className={`w-9 h-9 rounded-full ${mobileSettingsExpanded ? 'bg-indigo-600' : 'bg-gray-500 hover:bg-gray-600'} text-white flex items-center justify-center shadow-md transition-all active:scale-95`}
              aria-label="Toggle settings"
            >
              <i className={`fas fa-${mobileSettingsExpanded ? 'times' : 'sliders-h'} text-xs`}></i>
            </button>
            {/* Export Button */}
            <div className="dropdown">
              <button
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                type="button"
                id="mobileExportDropdown"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                disabled={isExporting}
                aria-label="Export"
              >
                <i className={`fas fa-download text-xs ${isExporting ? 'animate-pulse' : ''}`}></i>
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
            {/* View Toggle Button */}
            <button
              onClick={() => setFormat(format === 'chart' ? 'table' : 'chart')}
              className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label={format === 'chart' ? 'Switch to table view' : 'Switch to chart view'}
            >
              <i className={`fas fa-${format === 'chart' ? 'table' : 'chart-bar'} text-xs`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Page Header */}
      <div className="hidden md:block">
        <ReportHeader
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          onExportDOCX={handleExportDOCX}
        />
      </div>

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
        mobileExpanded={mobileSettingsExpanded}
        onMobileToggle={() => setMobileSettingsExpanded(!mobileSettingsExpanded)}
      />

      {/* Anomaly Alerts */}
      <AnomalyAlerts
        transactions={transactions}
      />

      {/* Financial Insights */}
      <FinancialInsights
        reportType={reportType}
        reportData={categoryData.length > 0 ? categoryData : monthlyData}
        transactions={transactions}
        categories={categories}
        timeframe={timeframe}
        onInsightsChange={setAiInsights}
      />

      {/* Report Content */}
      {format === "chart" ? (
        <ReportChart
          reportType={reportType}
          timeframe={timeframe}
          chartOptions={chartOptions}
          onToggleTip={toggleTip}
          categoryData={categoryData}
          monthlyData={monthlyData}
          trendsData={trendsData}
          budgetData={budgetData}
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