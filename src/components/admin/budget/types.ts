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

// Interface for user profile
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
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