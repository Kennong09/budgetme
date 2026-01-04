// Shared type definitions for admin budget components

// Interface for budget from the database
export interface SupabaseBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
  period: string;
}

// Interface for budget view with additional calculated fields
export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  start_date: string;
  end_date: string;
  category: string;
  category_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  status: "active" | "completed" | "archived";
  month: string;
  year: number;
  period: string;
  remaining: number;
  percentage: number;
}

// Interface for expense categories
export interface Category {
  id: string;
  category_name: string;
  user_id: string;
}

// Interface for budget user (matching TransactionUser pattern)
export interface BudgetUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Interface for user profile (kept for backward compatibility)
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

// Interface for budget statistics
export interface BudgetStats {
  totalBudgets: number;
  activeBudgets: number;
  budgetCategories: number;
  usersWithBudgets: number;
  budgetsByCategory: {[key: string]: number};
  budgetsByStatus: {[key: string]: number};
  budgetsByUser: {[key: string]: number};
}

// Interface for budget filters
export interface BudgetFilters {
  searchTerm: string;
  filterCategory: string;
  filterStatus: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}