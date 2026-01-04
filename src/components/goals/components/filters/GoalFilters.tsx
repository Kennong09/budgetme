import React, { ChangeEvent, useState } from 'react';
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
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = 
    (filter.priority !== 'all' ? 1 : 0) + 
    (filter.category !== 'all' ? 1 : 0) + 
    (filter.scope !== 'all' ? 1 : 0) + 
    (filter.search !== '' ? 1 : 0) +
    (filter.sortBy !== 'name' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Mobile Filter Content
  const MobileFilterContent = () => (
    <div className="block md:hidden">
      {/* Pill-based quick filters */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Filter toggle button */}
          <button
            onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              hasActiveFilters
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <i className="fas fa-sliders-h text-[10px]"></i>
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Priority quick filters */}
          {['all', 'high', 'medium', 'low'].map((priority) => (
            <button
              key={priority}
              onClick={() => onFilterChange({ target: { name: 'priority', value: priority } } as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                filter.priority === priority
                  ? priority === 'high' ? 'bg-rose-500 text-white shadow-sm' 
                    : priority === 'medium' ? 'bg-amber-500 text-white shadow-sm'
                    : priority === 'low' ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {mobileFiltersExpanded && (
          <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 animate__animated animate__fadeIn">
            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Priority</label>
                <select 
                  name="priority"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={filter.priority}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                <select 
                  name="category"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  value={filter.category}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Sort By</label>
                <select 
                  name="sortBy"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  value={filter.sortBy}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                >
                  <option value="name">Goal Name</option>
                  <option value="target_date">Target Date</option>
                  <option value="progress">Progress</option>
                  <option value="amount">Amount</option>
                </select>
              </div>

              {/* Scope - only show if user is part of a family */}
              {isFamilyMember && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Scope</label>
                  <select 
                    name="scope"
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                    value={filter.scope}
                    onChange={onFilterChange}
                    disabled={isFiltering}
                  >
                    <option value="all">All Goals</option>
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                  </select>
                </div>
              )}

              {/* Search - Full width */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Search</label>
                <input 
                  type="text"
                  name="search"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                  placeholder="Search goal name or notes..."
                  value={filter.search}
                  onChange={onFilterChange}
                  disabled={isFiltering}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={onResetFilters}
                className="text-[10px] text-gray-500 font-medium"
                disabled={isFiltering}
              >
                <i className="fas fa-undo mr-1 text-[8px]"></i>
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersExpanded(false)}
                className="text-[10px] text-indigo-600 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Desktop Filter Content
  const DesktopFilterContent = () => (
    <div className="row d-none d-md-flex">
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
      <>
        {/* Mobile Filter Card */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-filter text-indigo-500 text-[10px]"></i>
                Filter Goals
              </h6>
              <button 
                className="text-[10px] text-gray-500 flex items-center gap-1"
                onClick={onResetFilters}
              >
                <i className="fas fa-undo text-[8px]"></i>
                Reset
              </button>
            </div>
            <MobileFilterContent />
          </div>
        </div>

        {/* Desktop Filter Card */}
        <div className="card shadow mb-4 d-none d-md-block">
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
            <DesktopFilterContent />
          </div>
        </div>
      </>
    );
  }

  // Inline version for table view
  return (
    <>
      <MobileFilterContent />
      <div className="card-body border-bottom bg-light d-none d-md-block">
        <DesktopFilterContent />
      </div>
    </>
  );
};

export default GoalFilters;