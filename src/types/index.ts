// User related types
export interface User {
  id: string | number;
  name?: string;
  email: string;
  username?: string;
  created_at: string;
  last_login?: string;
  password_hash?: string;
  user_role?: string;
  is_active?: boolean;
}

// Transaction related types
export interface Transaction {
  id: string | number;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense";
  category_id?: number;
  category?: string;
  description?: string;
  account_id: number | string;
  goal_id?: string | number | null;
  created_at: string;
  user_id?: string | number;
}

// Budget related types
export interface Budget {
  id: string | number;
  category_id: number;
  category?: string;
  name?: string;
  amount: number;
  spent: number;
  period: "month" | "quarter" | "year";
  start_date: string;
  end_date: string;
  user_id: string | number;
  budget?: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success" | string;
}

// Goal related types
export interface Goal {
  id: string | number;
  goal_name: string;
  name?: string;
  target_amount: number;
  targetAmount?: number;
  current_amount: number;
  currentAmount?: number;
  target_date: string;
  deadline?: string;
  priority: "high" | "medium" | "low" | string;
  category?: string;
  description?: string;
  status?: string;
  created_at?: string;
  user_id?: string | number;
  family_id?: string | number;
  percentage?: number;
  remaining?: number;
  is_shared?: boolean;
  shared_by?: string | number;
  shared_by_name?: string;
  is_overdue?: boolean;
}

// Account related types
export interface Account {
  id: number;
  account_name: string;
  account_type: string;
  balance: number;
  user_id: string | number;
  created_at?: string;
  status?: string;
}

// Category related types
export interface Category {
  id: number;
  category_name: string;
}

// Family related types
export interface Family {
  id: string | number;
  family_name: string;
  created_at: string;
  created_by_user_id: string;
  owner_user_id?: number;
}

export interface FamilyMember {
  id: string;
  family_id: string | number;
  member_user_id: string | number;
  role: "admin" | "viewer";
  join_date: string;
  user?: User;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Prediction types
export interface Prediction {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: number;
}

// Component props types
export interface SidebarProps {
  isOpen: boolean;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

export interface HeaderProps {
  toggleSidebar: () => void;
}

export interface UserData {
  user: {
    id: string | number;
    name?: string;
    username?: string;
    email: string;
    password_hash?: string;
    created_at?: string;
    last_login?: string;
    user_role?: string;
    is_active?: boolean;
  };
  accounts?: any[];
  transactions?: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  categories?: Category[];
  expenseCategories?: any[];
}

export interface BudgetItem {
  id: string | number;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: string;
}

export interface RouteParams {
  [key: string]: string | undefined;
}

export interface ExtendedTransaction extends Transaction {
  // No need to redefine account_id since Transaction now has it as string | number
}

// Add other types here as needed

// Types for goal contribution results
export interface GoalContributionResult {
  success: boolean;
  error?: string;
  transaction?: Transaction;
  updatedGoal?: Goal;
  updatedAccount?: Account;
}

// Types for goal summary
export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalRemainingAmount: number;
  overallProgress: number;
  goalsByPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

// Types for budget-goal relationship
export interface BudgetGoalRelationship {
  totalBudgetAllocated: number;
  totalSpentOnGoals: number;
  percentageBudgetToGoals: number;
  goalTransactionsCount: number;
}