import React, { useState, ChangeEvent, FC } from 'react';
import { Link } from "react-router-dom";

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
import RealtimeGoalNotifications from './RealtimeGoalNotifications';
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

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

const Goals: FC = () => {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  
  // Contribution modal state
  const [isContributionModalOpen, setIsContributionModalOpen] = useState<boolean>(false);
  
  // Custom hooks
  const familyState = useFamilyState();
  const { goals, loading, setGoals, refetchGoals } = useGoalsData(familyState);
  const { 
    filter, 
    setFilter, 
    filteredGoals, 
    isFiltering, 
    resetFilters
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
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

  return (
    <GoalsErrorBoundary>
      {/* Real-time notifications for goal updates */}
      <RealtimeGoalNotifications 
        maxNotifications={5}
        autoHideDelay={8000}
      />
      
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
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

        {/* Goals Summary Cards */}
        <GoalSummaryCards 
          goalSummary={goalSummary}
          filteredGoalsCount={filteredGoals.length}
          onToggleTip={toggleTip}
        />

        {/* Overall Progress and Goal Health */}
        <div className="row">
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