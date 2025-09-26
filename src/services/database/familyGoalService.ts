import { supabase } from '../../utils/supabaseClient';
import { GoalService } from './goalService';
import { familyService } from './familyService';

// Types for family goal operations
export interface FamilyGoalData {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  family_contributions: FamilyContribution[];
  days_remaining: number | null;
  status: string;
  priority: string;
  category?: string;
  contribution_velocity: number;
  is_family_goal: boolean;
  owner_name: string;
  target_date?: string;
  created_at: string;
}

export interface FamilyContribution {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  amount: number;
  percentage: number;
  last_contribution_date?: string;
}

export interface GoalStatusData {
  status_category: string;
  goal_count: number;
  total_target_value: number;
  total_current_value: number;
  average_progress: number;
  status_color: string;
  commitment_insights: GoalCommitmentInsights;
}

export interface GoalCommitmentInsights {
  total_goals: number;
  active_goal_count: number;
  commitment_level: string;
  goal_commitment_score: number;
  goal_diversity: number;
  completion_rate: number;
  average_days_to_completion: number | null;
  planning_discipline_score: number;
}

export interface GoalCommitmentData {
  overall_score: number;
  commitment_level: string;
  active_goals: number;
  completed_goals: number;
  total_goals: number;
  goal_categories: number;
  average_completion_days: number | null;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

export interface GoalDiversityData {
  total_categories: number;
  category_distribution: CategoryDistribution[];
  diversification_score: number;
  recommended_categories: string[];
}

export interface CategoryDistribution {
  category: string;
  goal_count: number;
  total_target: number;
  total_current: number;
  average_progress: number;
}

export interface ContributionData {
  contribution_id: string;
  user_id: string;
  full_name: string;
  amount: number;
  contribution_date: string;
  goal_progress_before: number;
  goal_progress_after: number;
  notes?: string;
}

/**
 * Enhanced Family Goal Service
 * 
 * Extends the existing GoalService with family goal collaboration features
 * and comprehensive goal commitment analysis.
 */
export class FamilyGoalService {
  private static instance: FamilyGoalService;

  public static getInstance(): FamilyGoalService {
    if (!FamilyGoalService.instance) {
      FamilyGoalService.instance = new FamilyGoalService();
    }
    return FamilyGoalService.instance;
  }

  /**
   * Get all family goals with progress and contribution data
   */
  async getFamilyGoalProgress(familyId: string): Promise<FamilyGoalData[]> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      if (!familyMembers || familyMembers.length === 0) {
        throw new Error('No family members found');
      }

      const memberUserIds = familyMembers.map(member => member.user_id);

      // Get only family-shared goals (exclude personal goals from family members)
      const { data: goals, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_family_goal', true)
        .order('created_at', { ascending: false });

      if (goalError) throw goalError;

      if (!goals || goals.length === 0) {
        return [];
      }

      const enhancedGoals: FamilyGoalData[] = [];

      for (const goal of goals) {
        const progressPercentage = goal.target_amount > 0 
          ? (goal.current_amount / goal.target_amount) * 100 
          : 0;

        const daysRemaining = goal.target_date 
          ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Get contributions for this goal
        const { data: contributions, error: contribError } = await supabase
          .from('goal_contributions')
          .select('user_id, amount, contribution_date')
          .eq('goal_id', goal.id)
          .order('contribution_date', { ascending: false });

        if (contribError) {
          console.warn(`Error fetching contributions for goal ${goal.id}:`, contribError);
        }

        const contributionVelocity = this.calculateContributionVelocity(contributions || [], goal.created_at);
        const familyContributions = this.mapContributionsToMembers(
          contributions || [], 
          familyMembers, 
          goal.current_amount
        );

        const owner = familyMembers.find(m => m.user_id === goal.user_id);

        enhancedGoals.push({
          goal_id: goal.id,
          goal_name: goal.goal_name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          progress_percentage: progressPercentage,
          family_contributions: familyContributions,
          days_remaining: daysRemaining,
          status: goal.status || 'in_progress',
          priority: goal.priority || 'medium',
          category: goal.category,
          contribution_velocity: contributionVelocity,
          is_family_goal: true, // All goals returned are family goals
          owner_name: owner?.full_name || 'Unknown Member',
          target_date: goal.target_date,
          created_at: goal.created_at
        });
      }

      return enhancedGoals.sort((a, b) => {
        const statusPriority = { 'in_progress': 1, 'not_started': 2, 'completed': 3, 'cancelled': 4 };
        const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 5;
        const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 5;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return b.progress_percentage - a.progress_percentage;
      });
    } catch (error) {
      console.error('Error in getFamilyGoalProgress:', error);
      throw error;
    }
  }

  /**
   * Get family goals breakdown by status with commitment insights
   */
  async getFamilyGoalsByStatus(familyId: string): Promise<GoalStatusData[]> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return [];
      }

      // Try RPC function first
      const { data: statusData, error: rpcError } = await supabase.rpc('get_family_goals_by_status', {
        p_family_id: familyId,
        p_user_ids: memberUserIds
      });

      if (!rpcError && statusData) {
        return statusData.map((status: any) => ({
          ...status,
          commitment_insights: this.calculateCommitmentInsights(statusData)
        }));
      }

      // Fallback to manual calculation
      return await this.getFamilyGoalsByStatusFallback(familyId, memberUserIds);
    } catch (error) {
      console.error('Error in getFamilyGoalsByStatus:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive goal commitment analysis
   */
  async calculateGoalCommitment(familyId: string): Promise<GoalCommitmentData> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return this.getEmptyCommitmentData();
      }

      // Get only family-shared goals for commitment analysis (exclude personal goals)
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_family_goal', true);

      if (error) {
        console.warn('Error fetching family goals for commitment analysis:', error);
        return this.getEmptyCommitmentData();
      }

      if (!goals || goals.length === 0) {
        return this.getEmptyCommitmentData();
      }

      const totalGoals = goals.length;
      const activeGoals = goals.filter(g => g.status === 'in_progress' || g.status === 'not_started').length;
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const goalCategories = new Set(goals.map(g => g.category).filter(Boolean)).size;
      
      const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

      // Calculate commitment score (0-100) with safe values
      let commitmentScore = 0;
      commitmentScore += Math.min(25, activeGoals * 8);
      commitmentScore += Math.min(25, goalCategories * 8);
      commitmentScore += (completionRate / 100) * 30;
      commitmentScore += Math.min(20, totalGoals * 4);

      // Determine commitment level
      let commitmentLevel = '';
      if (totalGoals === 0) {
        commitmentLevel = 'Set family goals to improve financial planning';
      } else if (totalGoals <= 2) {
        commitmentLevel = 'Good start - consider adding more goals for better diversification';
      } else {
        commitmentLevel = 'Excellent goal planning and commitment';
      }

      // Generate insights
      const { strengths, improvements, recommendations } = this.generateCommitmentInsights({
        totalGoals,
        activeGoals,
        completedGoals,
        goalCategories,
        completionRate,
        commitmentScore
      });

      return {
        overall_score: Math.round(commitmentScore),
        commitment_level: commitmentLevel,
        active_goals: activeGoals,
        completed_goals: completedGoals,
        total_goals: totalGoals,
        goal_categories: goalCategories,
        average_completion_days: null, // Could be calculated from completed goals
        strengths,
        improvements,
        recommendations
      };
    } catch (error) {
      console.error('Error in calculateGoalCommitment:', error);
      return this.getEmptyCommitmentData();
    }
  }

  /**
   * Get family goal diversity analysis
   */
  async getFamilyGoalDiversity(familyId: string): Promise<GoalDiversityData> {
    try {
      const familyMembers = await familyService.getFamilyMembers(familyId);
      const memberUserIds = familyMembers.map(member => member.user_id);

      if (memberUserIds.length === 0) {
        return {
          total_categories: 0,
          category_distribution: [],
          diversification_score: 0,
          recommended_categories: this.getRecommendedCategories([])
        };
      }

      // Get only family-shared goals for diversity analysis (exclude personal goals)
      const { data: goals, error } = await supabase
        .from('goals')
        .select('category, target_amount, current_amount, status')
        .eq('family_id', familyId)
        .eq('is_family_goal', true)
        .not('category', 'is', null);

      if (error) throw error;

      if (!goals || goals.length === 0) {
        return {
          total_categories: 0,
          category_distribution: [],
          diversification_score: 0,
          recommended_categories: this.getRecommendedCategories([])
        };
      }

      // Group by category
      const categoryMap = new Map<string, CategoryDistribution>();

      goals.forEach(goal => {
        const category = goal.category || 'Other';
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            goal_count: 0,
            total_target: 0,
            total_current: 0,
            average_progress: 0
          });
        }

        const categoryData = categoryMap.get(category)!;
        categoryData.goal_count += 1;
        categoryData.total_target += goal.target_amount;
        categoryData.total_current += goal.current_amount;
      });

      const categoryDistribution = Array.from(categoryMap.values()).map(category => ({
        ...category,
        average_progress: category.total_target > 0 
          ? (category.total_current / category.total_target) * 100 
          : 0
      })).sort((a, b) => b.total_target - a.total_target);

      const totalCategories = categoryDistribution.length;
      const diversificationScore = Math.min(100, totalCategories * 20);
      const existingCategories = categoryDistribution.map(c => c.category);

      return {
        total_categories: totalCategories,
        category_distribution: categoryDistribution,
        diversification_score: diversificationScore,
        recommended_categories: this.getRecommendedCategories(existingCategories)
      };
    } catch (error) {
      console.error('Error in getFamilyGoalDiversity:', error);
      throw error;
    }
  }

  // Helper methods
  private calculateContributionVelocity(contributions: any[], goalCreatedAt: string): number {
    if (!contributions || contributions.length === 0) return 0;

    const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
    const goalStartDate = new Date(goalCreatedAt);
    const currentDate = new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((currentDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24)));

    return totalContributions / daysSinceCreation;
  }

  private mapContributionsToMembers(
    contributions: any[],
    familyMembers: any[],
    totalGoalAmount: number
  ): FamilyContribution[] {
    const memberContributions = new Map<string, { amount: number; lastDate?: string }>();

    contributions.forEach(contribution => {
      const existing = memberContributions.get(contribution.user_id) || { amount: 0 };
      existing.amount += contribution.amount;
      
      if (!existing.lastDate || new Date(contribution.contribution_date) > new Date(existing.lastDate)) {
        existing.lastDate = contribution.contribution_date;
      }
      
      memberContributions.set(contribution.user_id, existing);
    });

    return Array.from(memberContributions.entries())
      .map(([userId, data]) => {
        const member = familyMembers.find(m => m.user_id === userId);
        return {
          user_id: userId,
          full_name: member?.full_name || 'Unknown Member',
          avatar_url: member?.avatar_url,
          amount: data.amount,
          percentage: totalGoalAmount > 0 ? (data.amount / totalGoalAmount) * 100 : 0,
          last_contribution_date: data.lastDate
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  private async enhanceGoalDataWithContributions(
    goalData: any[],
    familyMembers: any[]
  ): Promise<FamilyGoalData[]> {
    const enhancedGoals: FamilyGoalData[] = [];

    for (const goal of goalData) {
      const { data: contributions, error } = await supabase
        .from('goal_contributions')
        .select('user_id, amount, contribution_date')
        .eq('goal_id', goal.goal_id);

      if (error) {
        console.warn(`Error fetching contributions for goal ${goal.goal_id}:`, error);
      }

      const familyContributions = this.mapContributionsToMembers(
        contributions || [], 
        familyMembers, 
        goal.current_amount
      );

      enhancedGoals.push({
        ...goal,
        family_contributions: familyContributions
      });
    }

    return enhancedGoals;
  }

  private getFamilyGoalsByStatusFallback(familyId: string, memberUserIds: string[]): Promise<GoalStatusData[]> {
    // Simplified fallback implementation
    return Promise.resolve([]);
  }

  private calculateCommitmentInsights(statusData: any[]): GoalCommitmentInsights {
    const totalGoals = statusData.reduce((sum, status) => sum + status.goal_count, 0);
    const activeGoals = statusData.filter(s => 
      s.status_category === 'in_progress' || s.status_category === 'not_started'
    ).reduce((sum, status) => sum + status.goal_count, 0);
    
    const completedGoals = statusData.find(s => s.status_category === 'completed')?.goal_count || 0;
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    
    let commitmentScore = 0;
    commitmentScore += Math.min(25, activeGoals * 8);
    commitmentScore += (completionRate / 100) * 30;
    commitmentScore += Math.min(20, totalGoals * 4);
    
    let commitmentLevel = '';
    if (totalGoals === 0) {
      commitmentLevel = 'Set family goals to improve financial planning';
    } else if (totalGoals <= 2) {
      commitmentLevel = 'Good start - consider adding more goals for better diversification';
    } else {
      commitmentLevel = 'Excellent goal planning and commitment';
    }

    return {
      total_goals: totalGoals,
      active_goal_count: activeGoals,
      commitment_level: commitmentLevel,
      goal_commitment_score: Math.round(commitmentScore),
      goal_diversity: 0,
      completion_rate: completionRate,
      average_days_to_completion: null,
      planning_discipline_score: Math.min(100, totalGoals * 20)
    };
  }

  private generateCommitmentInsights(data: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    goalCategories: number;
    completionRate: number;
    commitmentScore: number;
  }): { strengths: string[]; improvements: string[]; recommendations: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    if (data.activeGoals > 0) {
      strengths.push(`${data.activeGoals} active goals showing commitment to financial planning`);
    }
    if (data.completionRate > 50) {
      strengths.push(`Strong goal completion rate of ${data.completionRate.toFixed(1)}%`);
    }
    if (data.goalCategories > 2) {
      strengths.push(`Good goal diversification across ${data.goalCategories} categories`);
    }

    if (data.totalGoals === 0) {
      improvements.push('No financial goals currently set');
      recommendations.push('Start with 1-2 achievable short-term family goals');
    }
    if (data.goalCategories <= 1) {
      improvements.push('Limited goal diversity - consider goals in different areas');
      recommendations.push('Consider goals for: emergency fund, education, home improvement, vacation');
    }

    return { strengths, improvements, recommendations };
  }

  private getRecommendedCategories(existingCategories: string[]): string[] {
    const allRecommendedCategories = [
      'Emergency Fund',
      'Vacation',
      'Home Improvement',
      'Education',
      'Retirement',
      'Vehicle',
      'Health & Wellness',
      'Technology',
      'Investment',
      'Debt Payoff'
    ];

    return allRecommendedCategories
      .filter(category => !existingCategories.includes(category))
      .slice(0, 3);
  }

  private getEmptyCommitmentData(): GoalCommitmentData {
    return {
      overall_score: 0,
      commitment_level: 'Set family goals to improve financial planning',
      active_goals: 0,
      completed_goals: 0,
      total_goals: 0,
      goal_categories: 0,
      average_completion_days: null,
      strengths: [],
      improvements: ['No financial goals currently set'],
      recommendations: ['Start with 1-2 achievable short-term family goals', 'Consider emergency fund and vacation savings goals']
    };
  }
}

// Export singleton instance
export const familyGoalService = FamilyGoalService.getInstance();
export default familyGoalService;