import { supabase } from '../../utils/supabaseClient';
import { BudgetService } from './budgetService';
import { GoalService } from './goalService';

// Search result types
export interface SearchResult {
  id: string;
  type: 'transaction' | 'budget' | 'goal';
  title: string;
  subtitle?: string;
  description?: string;
  amount?: number;
  currency?: string;
  icon?: string;
  color?: string;
  status?: string;
  metadata?: any;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
  totalFound: number;
}

export class SearchService {
  private static instance: SearchService;
  
  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Unified search across transactions, budgets, and goals
   * @param query - Search query string
   * @param userId - User ID to filter results
   * @param filters - Optional filters for result types
   * @returns Promise<SearchResponse>
   */
  async search(
    query: string, 
    userId: string, 
    filters?: {
      includeTransactions?: boolean;
      includeBudgets?: boolean;
      includeGoals?: boolean;
      limit?: number;
    }
  ): Promise<SearchResponse> {
    try {
      const {
        includeTransactions = true,
        includeBudgets = true,
        includeGoals = true,
        limit = 10
      } = filters || {};

      const searchPromises: Promise<SearchResult[]>[] = [];

      if (includeTransactions) {
        searchPromises.push(this.searchTransactions(query, userId, Math.ceil(limit / 3)));
      }

      if (includeBudgets) {
        searchPromises.push(this.searchBudgets(query, userId, Math.ceil(limit / 3)));
      }

      if (includeGoals) {
        searchPromises.push(this.searchGoals(query, userId, Math.ceil(limit / 3)));
      }

      const results = await Promise.all(searchPromises);
      const allResults = results.flat();

      // Sort by relevance (exact matches first, then partial matches)
      const sortedResults = this.sortByRelevance(allResults, query);
      const limitedResults = sortedResults.slice(0, limit);

      return {
        success: true,
        results: limitedResults,
        totalFound: allResults.length
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        results: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Search transactions
   */
  private async searchTransactions(query: string, userId: string, limit: number): Promise<SearchResult[]> {
    try {
      const lowerQuery = query.toLowerCase();
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          type,
          notes,
          date,
          created_at
        `)
        .eq('user_id', userId)
        .or(`description.ilike.%${query}%,notes.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Transaction search error:', error);
        return [];
      }

      return (data || []).map(transaction => ({
        id: transaction.id,
        type: 'transaction' as const,
        title: transaction.description || 'Untitled Transaction',
        subtitle: transaction.notes || `${transaction.type} transaction`,
        description: `${transaction.type} • ${new Date(transaction.date || transaction.created_at).toLocaleDateString()}`,
        amount: transaction.amount,
        currency: 'PHP', // Default currency, could be fetched from user preferences
        icon: this.getTransactionIcon(transaction.type),
        color: this.getTransactionColor(transaction.type),
        status: transaction.type,
        metadata: transaction
      }));
    } catch (error) {
      console.error('Transaction search exception:', error);
      return [];
    }
  }

  /**
   * Search budgets
   */
  private async searchBudgets(query: string, userId: string, limit: number): Promise<SearchResult[]> {
    try {
      const budgetService = BudgetService.getInstance();
      const budgetData = await budgetService.getBudgets(userId);
      
      if (!budgetData.data) {
        return [];
      }

      const lowerQuery = query.toLowerCase();
      const filteredBudgets = budgetData.data.filter(budget => 
        budget.budget_name?.toLowerCase().includes(lowerQuery) ||
        budget.description?.toLowerCase().includes(lowerQuery) ||
        budget.category_name?.toLowerCase().includes(lowerQuery)
      ).slice(0, limit);

      return filteredBudgets.map(budget => ({
        id: budget.id,
        type: 'budget' as const,
        title: budget.budget_name,
        subtitle: budget.category_name || 'No Category',
        description: `${budget.period} • ${budget.status}`,
        amount: budget.amount,
        currency: budget.currency,
        icon: 'fas fa-wallet',
        color: this.getBudgetColor(budget.status),
        status: budget.status,
        metadata: budget
      }));
    } catch (error) {
      console.error('Budget search exception:', error);
      return [];
    }
  }

  /**
   * Search goals
   */
  private async searchGoals(query: string, userId: string, limit: number): Promise<SearchResult[]> {
    try {
      const lowerQuery = query.toLowerCase();
      
      const { data, error } = await supabase
        .from('goals')
        .select(`
          id,
          goal_name,
          description,
          target_amount,
          current_amount,
          currency,
          status,
          target_date,
          created_at
        `)
        .eq('user_id', userId)
        .or(`goal_name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Goal search error:', error);
        return [];
      }

      return (data || []).map(goal => {
        const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
        
        return {
          id: goal.id,
          type: 'goal' as const,
          title: goal.goal_name,
          subtitle: `${Math.round(progress)}% complete`,
          description: `${goal.status} • Target: ${new Date(goal.target_date).toLocaleDateString()}`,
          amount: goal.target_amount,
          currency: goal.currency,
          icon: 'fas fa-bullseye',
          color: this.getGoalColor(goal.status),
          status: goal.status,
          metadata: goal
        };
      });
    } catch (error) {
      console.error('Goal search exception:', error);
      return [];
    }
  }

  /**
   * Sort results by relevance to search query
   */
  private sortByRelevance(results: SearchResult[], query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Exact title match gets highest priority
      const aExactTitle = a.title.toLowerCase() === lowerQuery ? 3 : 0;
      const bExactTitle = b.title.toLowerCase() === lowerQuery ? 3 : 0;
      
      // Title starts with query gets second priority
      const aTitleStarts = a.title.toLowerCase().startsWith(lowerQuery) ? 2 : 0;
      const bTitleStarts = b.title.toLowerCase().startsWith(lowerQuery) ? 2 : 0;
      
      // Title contains query gets third priority
      const aTitleContains = a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      const bTitleContains = b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      
      const aScore = aExactTitle + aTitleStarts + aTitleContains;
      const bScore = bExactTitle + bTitleStarts + bTitleContains;
      
      return bScore - aScore;
    });
  }

  /**
   * Get icon for transaction type
   */
  private getTransactionIcon(type: string): string {
    switch (type) {
      case 'income':
        return 'fas fa-arrow-up';
      case 'expense':
        return 'fas fa-arrow-down';
      case 'contribution':
        return 'fas fa-piggy-bank';
      default:
        return 'fas fa-exchange-alt';
    }
  }

  /**
   * Get color for transaction type
   */
  private getTransactionColor(type: string): string {
    switch (type) {
      case 'income':
        return 'text-success';
      case 'expense':
        return 'text-danger';
      case 'contribution':
        return 'text-info';
      default:
        return 'text-secondary';
    }
  }

  /**
   * Get color for budget status
   */
  private getBudgetColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-success';
      case 'exceeded':
        return 'text-danger';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-secondary';
    }
  }

  /**
   * Get color for goal status
   */
  private getGoalColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-primary';
      case 'completed':
        return 'text-success';
      case 'cancelled':
        return 'text-secondary';
      default:
        return 'text-info';
    }
  }

  /**
   * Get navigation path for search result
   */
  static getNavigationPath(result: SearchResult): string {
    switch (result.type) {
      case 'transaction':
        return `/transactions/${result.id}`;
      case 'budget':
        return `/budgets/${result.id}`;
      case 'goal':
        return `/goals/${result.id}`;
      default:
        return '/';
    }
  }
}

export default SearchService;