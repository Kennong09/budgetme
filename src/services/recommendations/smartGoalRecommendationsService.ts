import { supabase } from '../../utils/supabaseClient';

export interface GoalRecommendation {
  id: string;
  type: 'goal_suggestion' | 'optimization' | 'milestone' | 'strategy';
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  estimatedImpact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  suggestedAction?: string;
  relatedGoalId?: string;
  data?: any;
}

export interface RecommendationContext {
  userId: string;
  goals: any[];
  transactions: any[];
  analytics: any;
  userProfile?: any;
}

class SmartGoalRecommendationsService {
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  async generateRecommendations(userId: string): Promise<GoalRecommendation[]> {
    this.setUserId(userId);
    
    try {
      // Gather context data
      const context = await this.gatherContext(userId);
      
      // Generate different types of recommendations
      const recommendations: GoalRecommendation[] = [];
      
      // Goal creation suggestions
      recommendations.push(...await this.generateGoalSuggestions(context));
      
      // Optimization recommendations
      recommendations.push(...await this.generateOptimizationRecommendations(context));
      
      // Milestone recommendations
      recommendations.push(...await this.generateMilestoneRecommendations(context));
      
      // Strategy recommendations
      recommendations.push(...await this.generateStrategyRecommendations(context));
      
      // Sort by priority and impact
      return recommendations
        .sort((a, b) => {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          const impactWeight = { high: 3, medium: 2, low: 1 };
          
          const scoreA = priorityWeight[a.priority] + impactWeight[a.estimatedImpact];
          const scoreB = priorityWeight[b.priority] + impactWeight[b.estimatedImpact];
          
          return scoreB - scoreA;
        })
        .slice(0, 10); // Return top 10 recommendations
        
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async gatherContext(userId: string): Promise<RecommendationContext> {
    const [goals, transactions] = await Promise.all([
      this.fetchUserGoals(userId),
      this.fetchUserTransactions(userId)
    ]);

    const userProfile = await this.fetchUserProfile(userId);

    return {
      userId,
      goals: goals || [],
      transactions: transactions || [],
      analytics: null, // Analytics service removed
      userProfile
    };
  }

  private async fetchUserGoals(userId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  private async fetchUserTransactions(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      console.warn('Could not fetch transactions for recommendations');
      return [];
    }
    return data;
  }

  private async fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('Could not fetch user profile');
      return null;
    }
    return data;
  }

  private async generateGoalSuggestions(context: RecommendationContext): Promise<GoalRecommendation[]> {
    const recommendations: GoalRecommendation[] = [];
    const { goals, transactions, analytics } = context;

    // Emergency fund recommendation
    const hasEmergencyFund = goals.some(g => 
      g.goal_name.toLowerCase().includes('emergency') ||
      g.goal_name.toLowerCase().includes('fund')
    );
    
    if (!hasEmergencyFund) {
      recommendations.push({
        id: `rec-emergency-${Date.now()}`,
        type: 'goal_suggestion',
        title: 'Create an Emergency Fund',
        description: 'Build a safety net for unexpected expenses',
        reasoning: 'You don\'t have an emergency fund goal yet. Financial experts recommend 3-6 months of expenses.',
        priority: 'high',
        actionable: true,
        estimatedImpact: 'high',
        difficulty: 'medium',
        suggestedAction: 'Create a goal to save 3-6 months of your monthly expenses',
        data: {
          suggestedAmount: this.calculateEmergencyFundAmount(transactions),
          timeframe: '12 months'
        }
      });
    }

    // Retirement savings recommendation
    const hasRetirementGoal = goals.some(g => 
      g.goal_name.toLowerCase().includes('retirement') ||
      g.goal_name.toLowerCase().includes('pension')
    );
    
    if (!hasRetirementGoal && goals.length > 0) {
      recommendations.push({
        id: `rec-retirement-${Date.now()}`,
        type: 'goal_suggestion',
        title: 'Start Retirement Planning',
        description: 'Begin saving for your future retirement',
        reasoning: 'The earlier you start saving for retirement, the more time your money has to grow.',
        priority: 'medium',
        actionable: true,
        estimatedImpact: 'high',
        difficulty: 'easy',
        suggestedAction: 'Create a long-term retirement savings goal',
        data: {
          suggestedMonthlyAmount: this.calculateRetirementSavingsAmount(transactions),
          timeframe: '30+ years'
        }
      });
    }

    // Debt payoff recommendation
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const potentialDebtPayments = expenseTransactions.filter(t => 
      t.notes && (
        t.notes.toLowerCase().includes('loan') ||
        t.notes.toLowerCase().includes('credit') ||
        t.notes.toLowerCase().includes('debt')
      )
    );
    
    if (potentialDebtPayments.length > 0 && !goals.some(g => g.goal_name.toLowerCase().includes('debt'))) {
      recommendations.push({
        id: `rec-debt-${Date.now()}`,
        type: 'goal_suggestion',
        title: 'Create a Debt Payoff Goal',
        description: 'Systematically eliminate your debts',
        reasoning: 'Your transactions suggest you have debt payments. A structured payoff plan can save you money.',
        priority: 'high',
        actionable: true,
        estimatedImpact: 'high',
        difficulty: 'medium',
        suggestedAction: 'List all debts and create a payoff strategy (debt snowball or avalanche)',
        data: {
          estimatedMonthlyPayments: potentialDebtPayments.reduce((sum, t) => sum + t.amount, 0) / potentialDebtPayments.length
        }
      });
    }

    return recommendations;
  }

  private async generateOptimizationRecommendations(context: RecommendationContext): Promise<GoalRecommendation[]> {
    const recommendations: GoalRecommendation[] = [];
    const { goals, analytics } = context;

    if (!analytics) return recommendations;

    // Struggling goals optimization
    if (analytics.strugglingGoals && analytics.strugglingGoals.length > 0) {
      const mostStrugglingGoal = analytics.strugglingGoals[0];
      
      recommendations.push({
        id: `rec-optimize-${mostStrugglingGoal.id}`,
        type: 'optimization',
        title: `Optimize \"${mostStrugglingGoal.goal_name}\"`,
        description: 'This goal needs attention to get back on track',
        reasoning: `This goal has low progress (${mostStrugglingGoal.progress.toFixed(1)}%) for the time invested.`,
        priority: 'high',
        actionable: true,
        estimatedImpact: 'medium',
        difficulty: 'easy',
        suggestedAction: 'Consider increasing monthly contributions or breaking into smaller milestones',
        relatedGoalId: mostStrugglingGoal.id,
        data: {
          currentProgress: mostStrugglingGoal.progress,
          suggestedIncrease: mostStrugglingGoal.monthlyVelocity * 1.5
        }
      });
    }

    // Goal amount optimization
    const highAmountGoals = goals.filter(g => g.target_amount > 50000 && g.status !== 'completed');
    if (highAmountGoals.length > 0) {
      recommendations.push({
        id: `rec-breakdown-${Date.now()}`,
        type: 'optimization',
        title: 'Break Down Large Goals',
        description: 'Consider splitting large goals into smaller, achievable milestones',
        reasoning: 'Large goals can feel overwhelming. Smaller milestones provide more frequent wins.',
        priority: 'medium',
        actionable: true,
        estimatedImpact: 'medium',
        difficulty: 'easy',
        suggestedAction: 'Create intermediate milestones for your largest goals',
        data: {
          affectedGoals: highAmountGoals.length
        }
      });
    }

    return recommendations;
  }

  private async generateMilestoneRecommendations(context: RecommendationContext): Promise<GoalRecommendation[]> {
    const recommendations: GoalRecommendation[] = [];
    const { goals } = context;

    // Goals that are close to milestones
    goals.forEach(goal => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      
      // Approaching 25%, 50%, 75% milestones
      const milestones = [25, 50, 75];
      const nextMilestone = milestones.find(m => progress < m && progress > m - 10);
      
      if (nextMilestone) {
        const amountNeeded = (goal.target_amount * nextMilestone / 100) - goal.current_amount;
        
        recommendations.push({
          id: `rec-milestone-${goal.id}-${nextMilestone}`,
          type: 'milestone',
          title: `Reach ${nextMilestone}% of \"${goal.goal_name}\"`,
          description: `You're close to a major milestone!`,
          reasoning: `You're ${progress.toFixed(1)}% of the way to your goal. Push for the ${nextMilestone}% mark!`,
          priority: 'medium',
          actionable: true,
          estimatedImpact: 'medium',
          difficulty: 'easy',
          suggestedAction: `Save just ${this.formatCurrency(amountNeeded)} more to reach ${nextMilestone}%`,
          relatedGoalId: goal.id,
          data: {
            currentProgress: progress,
            targetMilestone: nextMilestone,
            amountNeeded
          }
        });
      }
    });

    return recommendations;
  }

  private async generateStrategyRecommendations(context: RecommendationContext): Promise<GoalRecommendation[]> {
    const recommendations: GoalRecommendation[] = [];
    const { goals, transactions, analytics } = context;

    // Automation recommendation
    const manualContributions = transactions.filter(t => 
      t.goal_id && !t.notes?.toLowerCase().includes('automatic')
    );
    
    if (manualContributions.length > 5) {
      recommendations.push({
        id: `rec-automate-${Date.now()}`,
        type: 'strategy',
        title: 'Automate Your Goal Contributions',
        description: 'Set up automatic transfers to stay consistent',
        reasoning: 'You\'ve been making manual contributions regularly. Automation can improve consistency.',
        priority: 'medium',
        actionable: true,
        estimatedImpact: 'medium',
        difficulty: 'easy',
        suggestedAction: 'Set up automatic transfers from your checking account to goal savings',
        data: {
          averageContribution: manualContributions.reduce((sum, t) => sum + t.amount, 0) / manualContributions.length
        }
      });
    }

    // Seasonal savings recommendation
    const monthlySpending = this.analyzeMonthlySpending(transactions);
    const hasSeasonalVariation = this.detectSeasonalPatterns(monthlySpending);
    
    if (hasSeasonalVariation) {
      recommendations.push({
        id: `rec-seasonal-${Date.now()}`,
        type: 'strategy',
        title: 'Adjust for Seasonal Spending',
        description: 'Plan for months with higher or lower expenses',
        reasoning: 'Your spending patterns show seasonal variation. Adjust goal contributions accordingly.',
        priority: 'low',
        actionable: true,
        estimatedImpact: 'low',
        difficulty: 'medium',
        suggestedAction: 'Increase goal contributions during low-spending months, reduce during high-spending months',
        data: {
          seasonalPattern: hasSeasonalVariation
        }
      });
    }

    return recommendations;
  }

  private calculateEmergencyFundAmount(transactions: any[]): number {
    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, this.getMonthsOfData(transactions));
    
    return monthlyExpenses * 6; // 6 months of expenses
  }

  private calculateRetirementSavingsAmount(transactions: any[]): number {
    const monthlyIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, this.getMonthsOfData(transactions));
    
    return monthlyIncome * 0.15; // 15% of income
  }

  private getMonthsOfData(transactions: any[]): number {
    if (transactions.length === 0) return 1;
    
    const dates = transactions.map(t => new Date(t.date));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const diffTime = Math.abs(latest.getTime() - earliest.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    return Math.max(1, diffMonths);
  }

  private analyzeMonthlySpending(transactions: any[]): { [month: string]: number } {
    const monthlyTotals: { [month: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const month = new Date(t.date).toISOString().slice(0, 7);
        monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount;
      });
    
    return monthlyTotals;
  }

  private detectSeasonalPatterns(monthlySpending: { [month: string]: number }): boolean {
    const amounts = Object.values(monthlySpending);
    if (amounts.length < 6) return false;
    
    const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const highVariation = amounts.some(amt => Math.abs(amt - average) > average * 0.3);
    
    return highVariation;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

export const smartGoalRecommendationsService = new SmartGoalRecommendationsService();