import { Goal, FilterState, ProgressStatusColor } from '../types';

/**
 * Helper function to format status names for display
 */
export const formatStatusName = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Function to determine progress status color
 */
export const getProgressStatusColor = (percentage: number): ProgressStatusColor => {
  if (percentage >= 90) return "success";
  if (percentage >= 50) return "info";
  if (percentage >= 25) return "warning";
  return "danger";
};

/**
 * Function to sort goals based on sortBy criteria
 */
export const sortGoals = (goalsToSort: Goal[], sortBy: string): Goal[] => {
  switch (sortBy) {
    case "name":
      return [...goalsToSort].sort((a, b) => a.goal_name.localeCompare(b.goal_name));
    case "target_date":
      return [...goalsToSort].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
    case "progress":
      return [...goalsToSort].sort((a, b) => {
        const progressA = a.current_amount / a.target_amount;
        const progressB = b.current_amount / b.target_amount;
        return progressB - progressA; // Higher progress first
      });
    case "amount":
      return [...goalsToSort].sort((a, b) => b.target_amount - a.target_amount); // Higher amount first
    default:
      return goalsToSort;
  }
};

/**
 * Function to apply filters to goals array
 */
export const applyGoalFilters = (goals: Goal[], filter: FilterState): Goal[] => {
  let result = [...goals];

  // Filter by priority
  if (filter.priority !== "all") {
    result = result.filter(goal => goal.priority === filter.priority);
  }

  // Filter by category (status)
  if (filter.category !== "all") {
    result = result.filter(goal => goal.status === filter.category);
  }

  // Filter by scope (personal vs family)
  if (filter.scope !== "all") {
    if (filter.scope === "personal") {
      result = result.filter(goal => !goal.is_shared);
    } else if (filter.scope === "family") {
      result = result.filter(goal => goal.is_shared);
    }
  }

  // Filter by search term
  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    result = result.filter(goal => 
      goal.goal_name.toLowerCase().includes(searchTerm) ||
      (goal.notes && goal.notes.toLowerCase().includes(searchTerm)) ||
      (goal.shared_by_name && goal.shared_by_name.toLowerCase().includes(searchTerm))
    );
  }

  // Apply sorting
  result = sortGoals(result, filter.sortBy);

  return result;
};

/**
 * Get goal health status based on overall progress
 */
export const getGoalHealthStatus = (overallProgress: number) => {
  const goalHealthStatus = overallProgress >= 90 ? "Healthy" : 
                         overallProgress >= 75 ? "On Track" : 
                         overallProgress >= 50 ? "Getting Started" : 
                         "Just Beginning";
                         
  const goalHealthIcon = overallProgress >= 90 ? "check-circle" :
                       overallProgress >= 75 ? "thumbs-up" :
                       overallProgress >= 50 ? "exclamation-circle" :
                       "exclamation-triangle";
                       
  const goalHealthColor = overallProgress >= 90 ? "#1cc88a" : 
                        overallProgress >= 75 ? "#36b9cc" :
                        overallProgress >= 50 ? "#f6c23e" :
                        "#e74a3b";

  return { goalHealthStatus, goalHealthIcon, goalHealthColor };
};

/**
 * Calculate goal summary from goals array
 */
export const calculateGoalSummary = (goals: Goal[]) => {
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const overallProgress = totalTargetAmount > 0 
    ? Math.min((totalCurrentAmount / totalTargetAmount) * 100, 100) 
    : 0;
    
  return {
    totalCurrentAmount,
    totalTargetAmount,
    overallProgress
  };
};