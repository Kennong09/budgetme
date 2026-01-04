import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Goal } from '../../types';
import GoalCard from './GoalCard';
import MobileGoalCard from './MobileGoalCard';

interface GoalGridProps {
  filteredGoals: Goal[];
  isFiltering: boolean;
  onDeleteGoal: (goalId: string) => void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const GoalGrid: React.FC<GoalGridProps> = ({
  filteredGoals,
  isFiltering,
  onDeleteGoal,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange
}) => {
  const goalListRef = useRef<HTMLDivElement>(null);

  // Dropdown state for mobile goal cards
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (goalId: string) => {
    setActiveDropdown(activeDropdown === goalId ? null : goalId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu') && !(event.target as Element).closest('.dropdown-toggle-btn')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  return (
    <>
      {/* Mobile Grid View */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-th text-indigo-500 text-[10px]"></i>
              Goal Cards
              {totalItems > 0 && (
                <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
          </div>

          {/* Grid Content */}
          <div className="p-3">
            {isFiltering ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-xs text-gray-500">Filtering goals...</p>
              </div>
            ) : filteredGoals.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredGoals.map((goal, index) => (
                  <MobileGoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onDeleteGoal={onDeleteGoal}
                    animationDelay={index * 0.03}
                    activeDropdown={activeDropdown}
                    onToggleDropdown={toggleDropdown}
                    onCloseDropdown={closeDropdown}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-flag text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-1">No goals found</p>
                <p className="text-[10px] text-gray-400 mb-3">Try adjusting your filters</p>
                <Link 
                  to="/goals/create" 
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg"
                >
                  <i className="fas fa-plus text-[9px]"></i>
                  Create Goal
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500">
                  {startIndex + 1}-{endIndex} of {totalItems}
                </span>
                <select 
                  className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
              <div className="flex items-center justify-center gap-1">
                <button 
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50"
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50"
                >
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="d-none d-md-block">
        <div className="row" ref={goalListRef}>
          {isFiltering ? (
            <div className="col-12 text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Filtering...</span>
              </div>
              <p className="mt-2 text-gray-600">Filtering goals...</p>
            </div>
          ) : filteredGoals.length > 0 ? (
            filteredGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onDeleteGoal={onDeleteGoal}
              />
            ))
          ) : (
            <div className="col-12 text-center my-5">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <h5 className="text-gray-500 font-weight-light">No goals match your filters</h5>
              <p className="text-gray-500 mb-0 small">Try adjusting your filter criteria or create a new goal.</p>
              <Link to="/goals/create" className="btn btn-sm btn-primary mt-3">
                <i className="fas fa-plus fa-sm mr-1"></i> Create New Goal
              </Link>
            </div>
          )}
        </div>
        
        {/* Desktop Pagination Footer */}
        {totalPages > 1 && filteredGoals.length > 0 && (
          <div className="card shadow mb-4 goal-table">
            <div className="card-footer bg-white border-0">
              <div className="row align-items-center">
                {/* Left: Entry counter */}
                <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Showing {Math.min(startIndex + 1, totalItems)} to {endIndex} of {totalItems} entries
                  </span>
                </div>
                
                {/* Center: Page size selector */}
                <div className="col-md-4 text-center mb-2 mb-md-0">
                  <label className="me-2 mb-0" style={{ fontSize: '0.875rem' }}>Show</label>
                  <select 
                    className="form-select d-inline-block w-auto"
                    style={{ fontSize: '0.875rem' }}
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label className="ms-2 mb-0" style={{ fontSize: '0.875rem' }}>per page</label>
                </div>
                
                {/* Right: Page navigation */}
                <div className="col-md-4 text-center text-md-end">
                  <nav>
                    <ul className="pagination mb-0 justify-content-center justify-content-md-end">
                      {/* Previous button */}
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => onPageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      </li>
                      
                      {/* Page numbers with smart logic */}
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => onPageChange(pageNum)}
                              style={currentPage === pageNum ? { color: 'white' } : {}}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      })}
                      
                      {/* Next button */}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => onPageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GoalGrid;