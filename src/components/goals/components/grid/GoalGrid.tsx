import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Goal } from '../../types';
import GoalCard from './GoalCard';

interface GoalGridProps {
  filteredGoals: Goal[];
  isFiltering: boolean;
  onDeleteGoal: (goalId: string) => void;
}

const GoalGrid: React.FC<GoalGridProps> = ({
  filteredGoals,
  isFiltering,
  onDeleteGoal
}) => {
  const goalListRef = useRef<HTMLDivElement>(null);

  return (
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
  );
};

export default GoalGrid;