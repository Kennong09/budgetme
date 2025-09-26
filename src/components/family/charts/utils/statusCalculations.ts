// Status calculation utilities for family charts

export interface HealthMetrics {
  score: number;
  status: string;
  color: string;
  description: string;
}

export interface GoalMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  progressPercentage: number;
  allocationRate: number;
}

// Calculate overall health score from multiple metrics
export const calculateHealthScore = (metrics: {
  goalCommitmentScore?: number;
  financialHealthScore?: number;
  expenseControlScore?: number;
  savingsDisciplineScore?: number;
  budgetPlanningScore?: number;
}): HealthMetrics => {
  const {
    goalCommitmentScore = 0,
    financialHealthScore = 0,
    expenseControlScore = 0,
    savingsDisciplineScore = 0,
    budgetPlanningScore = 0
  } = metrics;

  // Weighted calculation
  const overallScore = Math.round(
    (goalCommitmentScore * 0.3) + 
    (financialHealthScore * 0.25) + 
    (expenseControlScore * 0.2) + 
    (savingsDisciplineScore * 0.15) + 
    (budgetPlanningScore * 0.1)
  );

  return getHealthStatus(overallScore);
};

// Get health status based on score
export const getHealthStatus = (score: number): HealthMetrics => {
  if (score >= 90) {
    return {
      score,
      status: 'Excellent',
      color: '#1cc88a',
      description: 'Your family financial health is excellent'
    };
  } else if (score >= 75) {
    return {
      score,
      status: 'Good',
      color: '#4e73df',
      description: 'Your family financial health is good'
    };
  } else if (score >= 50) {
    return {
      score,
      status: 'Fair',
      color: '#f6c23e',
      description: 'Your family financial health needs attention'
    };
  } else {
    return {
      score,
      status: 'Needs Improvement',
      color: '#e74a3b',
      description: 'Your family financial health needs significant improvement'
    };
  }
};

// Calculate goal progress metrics
export const calculateGoalMetrics = (goalData: any[]): GoalMetrics => {
  if (!goalData || goalData.length === 0) {
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      progressPercentage: 0,
      allocationRate: 0
    };
  }

  const totalGoals = goalData.length;
  const activeGoals = goalData.filter(goal => 
    goal.status === 'in_progress' || goal.status === 'not_started'
  ).length;
  const completedGoals = goalData.filter(goal => goal.status === 'completed').length;
  
  const totalTargetAmount = goalData.reduce((sum, goal) => sum + (goal.target_amount || 0), 0);
  const totalCurrentAmount = goalData.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  
  const progressPercentage = totalTargetAmount > 0 
    ? (totalCurrentAmount / totalTargetAmount) * 100 
    : 0;

  // Calculate allocation rate (this would need family income data)
  const totalContributions = goalData.reduce((sum, goal) => {
    if (goal.family_contributions && Array.isArray(goal.family_contributions)) {
      return sum + goal.family_contributions.reduce((contribSum: number, contrib: any) => 
        contribSum + (contrib.amount || 0), 0
      );
    }
    return sum;
  }, 0);

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    allocationRate: totalContributions // This would be calculated as percentage of income
  };
};

// Calculate commitment level based on goal metrics
export const calculateCommitmentLevel = (goalMetrics: GoalMetrics): {
  level: string;
  score: number;
  color: string;
} => {
  const { totalGoals, activeGoals, progressPercentage } = goalMetrics;
  
  let score = 0;
  
  // Score based on number of goals (max 30 points)
  if (totalGoals >= 5) score += 30;
  else if (totalGoals >= 3) score += 20;
  else if (totalGoals >= 1) score += 10;
  
  // Score based on active goals (max 30 points)
  if (activeGoals >= 3) score += 30;
  else if (activeGoals >= 2) score += 20;
  else if (activeGoals >= 1) score += 10;
  
  // Score based on progress (max 40 points)
  if (progressPercentage >= 75) score += 40;
  else if (progressPercentage >= 50) score += 30;
  else if (progressPercentage >= 25) score += 20;
  else if (progressPercentage > 0) score += 10;

  // Determine level and color
  if (score >= 80) {
    return { level: 'Excellent', score, color: '#1cc88a' };
  } else if (score >= 60) {
    return { level: 'Good', score, color: '#4e73df' };
  } else if (score >= 40) {
    return { level: 'Fair', score, color: '#f6c23e' };
  } else {
    return { level: 'Needs Improvement', score, color: '#e74a3b' };
  }
};

// Calculate efficiency metrics
export const calculateEfficiencyMetrics = (
  currentAmount: number,
  targetAmount: number,
  timeElapsed: number,
  totalTimeframe: number
): {
  efficiency: number;
  onTrack: boolean;
  projectedCompletion: number;
} => {
  const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const timePercentage = totalTimeframe > 0 ? (timeElapsed / totalTimeframe) * 100 : 0;
  
  const efficiency = timePercentage > 0 ? (progressPercentage / timePercentage) * 100 : 0;
  const onTrack = efficiency >= 90; // 90% efficiency is considered on track
  
  const currentRate = timeElapsed > 0 ? currentAmount / timeElapsed : 0;
  const projectedCompletion = currentRate > 0 ? targetAmount / currentRate : Infinity;
  
  return {
    efficiency: Math.round(efficiency),
    onTrack,
    projectedCompletion: Math.round(projectedCompletion)
  };
};

export default {
  calculateHealthScore,
  getHealthStatus,
  calculateGoalMetrics,
  calculateCommitmentLevel,
  calculateEfficiencyMetrics
};