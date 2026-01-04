import React from 'react';
import { Link } from 'react-router-dom';
import { Goal } from '../../types';
import { formatCurrency, getRemainingDays } from '../../../../utils/helpers';
import { useAuth } from '../../../../utils/AuthContext';

interface MobileGoalCardProps {
  goal: Goal;
  onDeleteGoal: (goalId: string) => void;
  animationDelay?: number;
  activeDropdown?: string | null;
  onToggleDropdown?: (goalId: string) => void;
  onCloseDropdown?: () => void;
}

const MobileGoalCard: React.FC<MobileGoalCardProps> = ({ 
  goal, 
  onDeleteGoal, 
  animationDelay = 0,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown
}) => {
  const { user } = useAuth();
  
  // Calculate percentage with fallback if not provided
  const calculatePercentage = (current: number, target: number): number => {
    if (!target || target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };
  
  const progressPercentage = goal.percentage ?? calculatePercentage(goal.current_amount, goal.target_amount);
  const daysLeft = getRemainingDays(goal.target_date);

  // Helper function to get progress color classes
  const getProgressColors = (progress: number) => {
    if (progress >= 90) return { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500' };
    if (progress >= 50) return { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-500' };
    if (progress >= 25) return { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' };
    return { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600', gradient: 'from-rose-500 to-red-500' };
  };

  // Helper function to get priority color classes
  const getPriorityColors = (priority: string) => {
    if (priority === 'high') return { bg: 'bg-rose-100', text: 'text-rose-600' };
    if (priority === 'medium') return { bg: 'bg-amber-100', text: 'text-amber-600' };
    return { bg: 'bg-cyan-100', text: 'text-cyan-600' };
  };

  const progressColors = getProgressColors(progressPercentage);
  const priorityColors = getPriorityColors(goal.priority);
  const canEdit = !goal.is_family_goal || goal.user_id === user?.id;

  return (
    <div 
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate__animated animate__fadeIn"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {/* Progress header bar */}
      <div className={`h-1 bg-gradient-to-r ${progressColors.gradient}`} style={{ width: `${progressPercentage}%` }}></div>
      
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{goal.goal_name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              {goal.is_family_goal ? (
                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-600">
                  <i className="fas fa-users text-[7px] mr-0.5"></i>Family
                </span>
              ) : (
                <span className="text-[8px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                  <i className="fas fa-user text-[7px] mr-0.5"></i>Personal
                </span>
              )}
              <span className={`text-[8px] px-1 py-0.5 rounded ${priorityColors.bg} ${priorityColors.text}`}>
                {goal.priority.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* React-controlled Dropdown */}
          <div className="relative">
            <button
              className="dropdown-toggle-btn w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleDropdown?.(goal.id); }}
              aria-label="More actions"
              type="button"
            >
              <i className="fas fa-ellipsis-v text-[10px]"></i>
            </button>
            
            {/* Dropdown Menu */}
            {activeDropdown === goal.id && (
              <div 
                className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}
              >
                <Link
                  to={`/goals/${goal.id}`}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onCloseDropdown?.(); }}
                >
                  <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                  <span className="text-gray-700">View</span>
                </Link>
                {canEdit && (
                  <>
                    <Link
                      to={`/goals/${goal.id}/edit`}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onCloseDropdown?.(); }}
                    >
                      <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                      <span className="text-gray-700">Edit</span>
                    </Link>
                    <div className="border-t border-gray-200"></div>
                    <button
                      className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCloseDropdown?.(); onDeleteGoal(goal.id); }}
                      type="button"
                    >
                      <i className="fas fa-trash text-red-500 text-[10px]"></i>
                      <span className="text-red-600">Delete</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress circle and amount */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-10 h-10 rounded-full ${progressColors.light} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-[10px] font-bold ${progressColors.text}`}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 mb-0.5">Saved</p>
            <p className="text-xs font-bold text-gray-800 truncate">{formatCurrency(goal.current_amount)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1 mb-2">
          <div
            className={`${progressColors.bg} h-1 rounded-full transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-400">
            Target: {formatCurrency(goal.target_amount)}
          </span>
          <span className={`text-[9px] ${daysLeft > 0 ? 'text-gray-400' : 'text-rose-500 font-medium'}`}>
            {daysLeft > 0 ? `${daysLeft}d` : 'Overdue'}
          </span>
        </div>
      </div>

      {/* Quick action footer */}
      <Link 
        to={`/goals/${goal.id}`}
        className="block px-2.5 py-1.5 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-indigo-600 font-medium hover:bg-gray-100 transition-colors"
      >
        View Details <i className="fas fa-chevron-right text-[8px] ml-1"></i>
      </Link>
    </div>
  );
};

export default MobileGoalCard;
