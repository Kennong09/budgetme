import React, { ChangeEvent } from 'react';
import { FilterState } from '../../types';

interface GoalFiltersProps {
  filter: FilterState;
  onFilterChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onResetFilters: () => void;
  isFiltering: boolean;
  isFamilyMember: boolean;
  showAsCard?: boolean; // Whether to show as separate card or inline
}

const GoalFilters: React.FC<GoalFiltersProps> = ({
  filter,
  onFilterChange,
  onResetFilters,
  isFiltering,
  isFamilyMember,
  showAsCard = true
}) => {
  const FilterContent = () => (
    <div className="row">
      <div className="col-md-2 mb-3">
        <label htmlFor="priority" className={`font-weight-bold text-gray-800 ${showAsCard ? '' : 'small'}`}>Priority</label>
        <select
          id="priority"
          name="priority"
          value={filter.priority}
          onChange={onFilterChange}
          className={`form-control ${showAsCard ? '' : 'form-control-sm'}`}
          disabled={isFiltering}
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="col-md-2 mb-3">
        <label htmlFor="category" className={`font-weight-bold text-gray-800 ${showAsCard ? '' : 'small'}`}>Status</label>
        <select
          id="category"
          name="category"
          value={filter.category}
          onChange={onFilterChange}
          className={`form-control ${showAsCard ? '' : 'form-control-sm'}`}
          disabled={isFiltering}
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Scope Filter - only show if user is part of a family */}
      {isFamilyMember && (
        <div className="col-md-2 mb-3">
          <label htmlFor="scope" className={`font-weight-bold text-gray-800 ${showAsCard ? '' : 'small'}`}>Scope</label>
          <select
            id="scope"
            name="scope"
            value={filter.scope}
            onChange={onFilterChange}
            className={`form-control ${showAsCard ? '' : 'form-control-sm'}`}
            disabled={isFiltering}
          >
            <option value="all">All Goals</option>
            <option value="personal">My Personal Goals</option>
            <option value="family">Family Shared Goals</option>
          </select>
        </div>
      )}

      <div className="col-md-2 mb-3">
        <label htmlFor="sortBy" className={`font-weight-bold text-gray-800 ${showAsCard ? '' : 'small'}`}>Sort By</label>
        <select
          id="sortBy"
          name="sortBy"
          value={filter.sortBy}
          onChange={onFilterChange}
          className={`form-control ${showAsCard ? '' : 'form-control-sm'}`}
          disabled={isFiltering}
        >
          <option value="name">Goal Name</option>
          <option value="target_date">Target Date</option>
          <option value="progress">Progress</option>
          <option value="amount">Amount</option>
        </select>
      </div>
      
      <div className="col-md-4 mb-3">
        <label htmlFor="search" className={`font-weight-bold text-gray-800 ${showAsCard ? '' : 'small'}`}>Search</label>
        <input
          type="text"
          id="search"
          name="search"
          value={filter.search}
          onChange={onFilterChange}
          placeholder="Search goal name or notes..."
          className={`form-control ${showAsCard ? '' : 'form-control-sm'}`}
          disabled={isFiltering}
        />
      </div>
    </div>
  );

  if (showAsCard) {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filter Goals</h6>
          <button 
            onClick={onResetFilters} 
            className="btn btn-sm btn-outline-primary"
            disabled={isFiltering}
          >
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <FilterContent />
        </div>
      </div>
    );
  }

  // Inline version for table view
  return (
    <div className="card-body border-bottom bg-light">
      <FilterContent />
    </div>
  );
};

export default GoalFilters;