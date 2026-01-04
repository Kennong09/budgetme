// Shared interfaces for admin transaction components

export interface AdminTransaction {
  id: string;
  user_id: string;
  account_id: string;
  income_category_id?: string;
  expense_category_id?: string;
  goal_id?: string;
  type: "income" | "expense" | "contribution";
  amount: number;
  date: string;
  notes: string;
  description?: string; // Alternative field name for compatibility
  created_at: string;
  updated_at?: string;
  
  // Computed/mapped fields for UI display
  category_id?: string; // Unified category field
  category_name?: string;
  category_icon?: string;
  account_name?: string;
  account_type?: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  goal_name?: string;
}

export interface TransactionUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface TransactionAccount {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
  user_id: string;
  status: string;
  currency?: string;
  is_default?: boolean;
}

export interface TransactionCategory {
  id: string;
  category_name: string;
  icon?: string;
  user_id: string;
  type?: "income" | "expense";
}

export interface TransactionGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed" | "paused";
  is_family_goal: boolean;
  user_id: string;
}

export interface TransactionFormData {
  type: "income" | "expense" | "contribution";
  user_id: string;
  account_id: string;
  category_id: string;
  goal_id?: string;
  amount: number;
  date: string;
  description: string;
}

export interface TransactionFilters {
  type: string;
  user: string;
  account: string;
  category: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface TransactionSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  avgTransactionAmount: number;
  transactionsByType: {
    income: number;
    expense: number;
    contribution: number;
  };
  monthlyTrend: {
    income: number;
    expenses: number;
    net: number;
  };
}

export interface TransactionModalProps {
  show: boolean;
  onClose: () => void;
  onTransactionUpdated?: (transaction: AdminTransaction) => void;
  onTransactionDeleted?: (transactionId: string) => void;
  onTransactionAdded?: () => void;
}

export interface ViewTransactionModalProps extends TransactionModalProps {
  transaction: AdminTransaction | null;
  onEdit?: (transaction: AdminTransaction) => void;
  onDelete?: (transaction: AdminTransaction) => void;
}

export interface EditTransactionModalProps extends TransactionModalProps {
  transaction: AdminTransaction | null;
}

export interface DeleteTransactionModalProps extends TransactionModalProps {
  transaction: AdminTransaction | null;
}

export interface AddTransactionModalProps extends TransactionModalProps {
  // Inherits base props
}
