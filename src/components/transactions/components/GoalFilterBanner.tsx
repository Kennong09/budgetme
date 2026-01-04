import React, { FC, memo } from 'react';
import { GoalFilterBannerProps } from '../types';

const GoalFilterBanner: FC<GoalFilterBannerProps> = memo(({
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
        className="inline-flex items-center justify-center px-2 py-1.5 md:px-3 md:py-2 bg-white hover:bg-blue-50 text-[#36b9cc] border border-[#36b9cc] text-xs md:text-sm font-medium rounded shadow-sm transition-colors"
        onClick={onClearFilter}
      >
        <i className="fas fa-times text-xs mr-1"></i> Clear Filter
      </button>
    </div>
  );
});

GoalFilterBanner.displayName = 'GoalFilterBanner';

export default GoalFilterBanner;