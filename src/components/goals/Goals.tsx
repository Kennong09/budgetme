import { useState, ChangeEvent, FC } from 'react';
import { Link } from "react-router-dom";
import { useToast } from "../../utils/ToastContext";
import { formatCurrency, formatPercentage } from "../../utils/helpers";

// Import types
import { ViewMode } from './types';

// Import components
import {
  GoalSummaryCards,
  GoalProgressSection,
  GoalHealthCard,
  GoalFilters,
  GoalTable,
  GoalGrid,
  DeleteGoalModal,
  TooltipManager
} from './components';
import { GoalsErrorBoundary } from './components/GoalsErrorBoundary';
import ContributionModal from './components/ContributionModal';

// Import hooks
import {
  useGoalsData,
  useGoalFilters,
  useFamilyState,
  useGoalSummary,
  useTooltips,
  useGoalDeletion
} from './hooks';

// Import export utilities
import {
  exportGoalsToPDF,
  exportGoalsToCSV,
  exportGoalsToDOCX
} from './utils/exportUtils';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import Goals Pagination CSS
import "./goals-pagination.css";

const Goals: FC = () => {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  
  // Contribution modal state
  const [isContributionModalOpen, setIsContributionModalOpen] = useState<boolean>(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccessToast, showErrorToast } = useToast();
  
  // Custom hooks
  const familyState = useFamilyState();
  const { goals, loading, setGoals, refetchGoals } = useGoalsData(familyState);
  const { 
    filter, 
    setFilter, 
    filteredGoals, 
    isFiltering, 
    resetFilters,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    updatePage,
    updatePageSize
  } = useGoalFilters(goals);
  const goalSummary = useGoalSummary(goals);
  const { activeTip, tooltipPosition, toggleTip } = useTooltips();
  const { 
    deleteModalState, 
    openDeleteModal, 
    closeDeleteModal, 
    handleDeleteGoal, 
    viewLinkedTransactions 
  } = useGoalDeletion(goals, setGoals, filteredGoals, () => {}, () => {});

  // Handle filter changes
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle contribution modal
  const handleOpenContributionModal = () => {
    setIsContributionModalOpen(true);
  };

  const handleCloseContributionModal = () => {
    setIsContributionModalOpen(false);
  };

  const handleContributionSuccess = () => {
    // Refresh goals data after successful contribution
    refetchGoals();
  };

  // Export handlers
  const getFilterInfo = (): string | undefined => {
    const filters: string[] = [];
    if (filter.priority && filter.priority !== 'all') {
      filters.push(`Priority: ${filter.priority}`);
    }
    if (filter.category && filter.category !== 'all') {
      filters.push(`Status: ${filter.category}`);
    }
    if (filter.scope && filter.scope !== 'all') {
      filters.push(`Scope: ${filter.scope}`);
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
      await exportGoalsToPDF(filteredGoals, getFilterInfo());
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
      exportGoalsToCSV(filteredGoals, getFilterInfo());
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
      await exportGoalsToDOCX(filteredGoals, getFilterInfo());
      showSuccessToast('Word document downloaded successfully!');
    } catch (error) {
      console.error('DOCX Export Error:', error);
      showErrorToast('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your goals...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn hidden md:block">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Financial Goals
          </h5>
          <p className="text-gray-500">Please wait while we prepare your goal dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate summary values for mobile cards
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
  
  // Calculate goal counts for mobile summary
  const totalGoalsCount = goals.length;
  const completedGoalsCount = goals.filter(g => g.status === 'completed').length;
  const inProgressGoalsCount = goals.filter(g => g.status === 'in_progress').length;
  const notStartedGoalsCount = goals.filter(g => g.status === 'not_started').length;
  const overdueGoalsCount = goals.filter(g => g.is_overdue && g.status !== 'completed' && g.status !== 'cancelled').length;

  return (
    <GoalsErrorBoundary>
      <div className="container-fluid">
        {/* Mobile Page Heading - Floating action buttons */}
        <div className="block md:hidden mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Financial Goals</h1>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode("table")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    viewMode === "table" ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'
                  }`}
                  aria-label="Table view"
                >
                  <i className="fas fa-list text-[10px]"></i>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    viewMode === "grid" ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'
                  }`}
                  aria-label="Grid view"
                >
                  <i className="fas fa-th text-[10px]"></i>
                </button>
              </div>
              {/* Export Button */}
              <div className="dropdown">
                <button
                  className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                  type="button"
                  id="mobileExportDropdown"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  disabled={isExporting || filteredGoals.length === 0}
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
              {/* Contribute Button */}
              <button
                onClick={handleOpenContributionModal}
                className="w-9 h-9 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                aria-label="Contribute to goal"
              >
                <i className="fas fa-plus-circle text-xs"></i>
              </button>
              {/* Create Goal Button */}
              <Link
                to="/goals/create"
                className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                aria-label="Create goal"
              >
                <i className="fas fa-plus text-xs"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Summary Cards - Modern stacked design */}
        <div className="block md:hidden mb-4">
          {/* Main goal overview card */}
          <div className={`bg-gradient-to-br ${overallProgress >= 75 ? 'from-emerald-500 via-teal-500 to-cyan-500' : overallProgress >= 50 ? 'from-cyan-500 via-blue-500 to-indigo-500' : overallProgress >= 25 ? 'from-amber-500 via-orange-500 to-yellow-500' : 'from-rose-500 via-red-500 to-orange-500'} rounded-2xl p-4 mb-3 shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">Goal Progress</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className={`fas fa-${overallProgress >= 75 ? 'trophy' : overallProgress >= 50 ? 'chart-line' : 'flag'} text-white text-sm`}></i>
              </div>
            </div>
            <div className="text-white text-2xl font-bold mb-1">
              {formatPercentage(overallProgress)} Complete
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${overallProgress >= 75 ? 'text-green-200' : overallProgress >= 50 ? 'text-blue-200' : overallProgress >= 25 ? 'text-amber-200' : 'text-red-200'}`}>
                <i className={`fas fa-${overallProgress >= 50 ? 'arrow-up' : 'arrow-right'} text-[10px] mr-1`}></i>
                {overallProgress >= 75 ? 'Excellent' : overallProgress >= 50 ? 'Good Progress' : overallProgress >= 25 ? 'Getting There' : 'Just Started'}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Secondary cards grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total Goals */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center mb-2">
                <i className="fas fa-flag text-indigo-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Goals</p>
              <p className="text-sm font-bold text-gray-800">{totalGoalsCount}</p>
            </div>

            {/* Target Amount */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-bullseye text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Target</p>
              <p className="text-sm font-bold text-gray-800 truncate">{formatCurrency(totalTargetAmount)}</p>
            </div>

            {/* Saved Amount */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                <i className="fas fa-piggy-bank text-emerald-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Saved</p>
              <p className="text-sm font-bold text-emerald-600 truncate">{formatCurrency(totalCurrentAmount)}</p>
            </div>
          </div>

          {/* Goal Status Pills */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-medium text-emerald-700">{completedGoalsCount} Done</span>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[10px] font-medium text-blue-700">{inProgressGoalsCount} Active</span>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span className="text-[10px] font-medium text-gray-600">{notStartedGoalsCount} Pending</span>
            </div>
            {overdueGoalsCount > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-[10px] font-medium text-rose-700">{overdueGoalsCount} Overdue</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Page Heading */}
        <div className="d-none d-md-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">Financial Goals</h1>
          <div className="d-flex align-items-center">
            <div className="btn-group mr-2">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <i className="fas fa-table fa-sm"></i>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <i className="fas fa-th fa-sm"></i>
              </button>
            </div>
            
            {/* Export Dropdown */}
            <div className="dropdown mr-2">
              <button
                className="btn btn-sm btn-success shadow-sm dropdown-toggle d-flex align-items-center"
                type="button"
                id="exportDropdown"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                disabled={isExporting || filteredGoals.length === 0}
              >
                <i className="fas fa-download fa-sm text-white-50 mr-2"></i>
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
            
            <button 
              onClick={handleOpenContributionModal}
              className="btn btn-success shadow-sm mr-2 d-inline-flex align-items-center animate__animated animate__fadeIn"
              title="Contribute to Goal"
            >
              <i className="fas fa-plus-circle mr-2"></i>Contribute to Goal
            </button>
            <Link 
              to="/goals/create" 
              className="d-none d-sm-inline-block btn btn-primary shadow-sm animate__animated animate__fadeIn"
            >
              <i className="fas fa-plus fa-sm text-white-50 mr-2"></i>Create Goal
            </Link>
          </div>
        </div>

        {/* Goals Summary Cards - Desktop only */}
        <div className="d-none d-md-block">
          <GoalSummaryCards 
            goalSummary={goalSummary}
            filteredGoalsCount={filteredGoals.length}
            onToggleTip={toggleTip}
          />
        </div>

        {/* Overall Progress and Goal Health - Desktop only */}
        <div className="d-none d-md-flex row">
          <GoalProgressSection 
            goals={goals}
            goalSummary={goalSummary}
            onToggleTip={toggleTip}
          />
          
          <GoalHealthCard 
            goals={goals}
            goalSummary={goalSummary}
            onToggleTip={toggleTip}
          />
        </div>

        {/* Goals Table with Integrated Filters or Grid depending on viewMode */}
        {viewMode === "table" ? (
          <GoalTable
            filteredGoals={filteredGoals}
            isFiltering={isFiltering}
            filter={filter}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
            onDeleteGoal={openDeleteModal}
            onToggleTip={toggleTip}
            isFamilyMember={familyState.isFamilyMember}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={updatePage}
            onPageSizeChange={updatePageSize}
          />
        ) : (
          <>
            {/* Filter Section for Grid View */}
            <GoalFilters
              filter={filter}
              onFilterChange={handleFilterChange}
              onResetFilters={resetFilters}
              isFiltering={isFiltering}
              isFamilyMember={familyState.isFamilyMember}
              showAsCard={true}
            />
            
            {/* Grid View Goals Display */}
            <GoalGrid
              filteredGoals={filteredGoals}
              isFiltering={isFiltering}
              onDeleteGoal={openDeleteModal}
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={updatePage}
              onPageSizeChange={updatePageSize}
            />
          </>
        )}

        {/* Global tooltip */}
        <TooltipManager
          activeTip={activeTip}
          tooltipPosition={tooltipPosition}
        />

        {/* Delete confirmation modal */}
        <DeleteGoalModal
          deleteModalState={deleteModalState}
          onCloseModal={closeDeleteModal}
          onDeleteGoal={handleDeleteGoal}
          onViewLinkedTransactions={viewLinkedTransactions}
        />

        {/* Contribution modal */}
        <ContributionModal
          isOpen={isContributionModalOpen}
          onClose={handleCloseContributionModal}
          goals={goals}
          onContributionSuccess={handleContributionSuccess}
        />
      </div>
    </GoalsErrorBoundary>
  );
};

export default Goals;