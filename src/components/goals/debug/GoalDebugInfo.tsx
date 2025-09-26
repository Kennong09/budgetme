import React from 'react';
import { Goal } from '../types';

interface GoalDebugInfoProps {
  goal: Goal;
}

const GoalDebugInfo: React.FC<GoalDebugInfoProps> = ({ goal }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="alert alert-warning small mt-2">
      <strong>Debug Info:</strong>
      <ul className="mb-0 mt-1">
        <li><strong>ID:</strong> {goal.id}</li>
        <li><strong>Family ID:</strong> {goal.family_id || 'null'}</li>
        <li><strong>is_family_goal:</strong> {String(!!goal.is_family_goal)}</li>
        <li><strong>Percentage:</strong> {goal.percentage ?? 'undefined'}</li>
        <li><strong>Remaining:</strong> {goal.remaining ?? 'undefined'}</li>
        <li><strong>Current/Target:</strong> {goal.current_amount}/{goal.target_amount}</li>
      </ul>
    </div>
  );
};

export default GoalDebugInfo;