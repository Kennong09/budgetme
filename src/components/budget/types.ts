// Shared types for budget components

export interface BudgetItem {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  month: string;
  year: number;
  period: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense";
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
  category_id: string;
  amount: string;
  period: "month" | "quarter" | "year";
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
