import React from 'react';
import { GoalFilterBannerProps } from '../types';

const GoalFilterBanner: React.FC<GoalFilterBannerProps> = ({
  goalId,
  goalName,
  onClearFilter
}) => {
  if (!goalId) return null;
  
  return (
    <div className="alert alert-info mb-4 d-flex justify-content-between align-items-center">
      <div>
        <i className="fas fa-filter mr-2"></i>
        <strong>Filtered by Goal:</strong> {goalName || "Unknown Goal"}
      </div>
      <button 
        className="btn btn-sm btn-outline-info" 
        onClick={onClearFilter}
      >
        <i className="fas fa-times mr-1"></i> Clear Filter
      </button>
    </div>
  );
};

export default GoalFilterBanner;