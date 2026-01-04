// Shared types for budget components

export interface BudgetItem {
  id: string;
  user_id: string;
  budget_name: string;
  description?: string;
  amount: number;
  spent: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  category_id?: string;
  category_name?: string;
  status: string;
  alert_threshold?: number;
  alert_enabled?: boolean;
  created_at: string;
  updated_at: string;
  
  // Calculated fields (from view or computed)
  remaining?: number;
  percentage_used?: number;
  status_indicator?: string;
  display_category?: string;
  category_icon?: string;
  category_color?: string;
  formatted_amount?: string;
  formatted_spent?: string;
  formatted_remaining?: string;
  period_status?: string;
  days_remaining?: number;
  unread_alerts?: number;
  
  // Legacy compatibility fields
  percentage?: number;
  month?: string;
  year?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense" | "contribution";
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

export interface FilterState {
  categoryId: string;
  status: "all" | "success" | "warning" | "danger";
  search: string;
  month: string;
  year: string;
  scope: "all" | "personal" | "family";
}

export interface BudgetFormData {
  budget_name: string;
  category_id: string;
  category_name?: string; // Optional category name for display purposes
  amount: number; // Changed from string to number for centavo precision
  period: "day" | "week" | "month" | "quarter" | "year";
  startDate: string;
}

export interface ExpenseCategory {
  id: number;
  category_name: string;
}

export interface ChartConfig {
  chart: {
    type: string;
    style: {
      fontFamily: string;
    };
    backgroundColor: string;
    animation?: {
      duration: number;
    };
    height: number;
  };
  title: {
    text: string | null;
  };
  subtitle?: {
    text: string;
    style?: {
      fontSize: string;
      color: string;
    };
  };
  credits: {
    enabled: boolean;
  };
  series: any[];
}

export interface TooltipPosition {
  top: number;
  left: number;
}
