// Dashboard Type Definitions
// All TypeScript interfaces and types for the dashboard components

// Transaction type
export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  notes: string;
  description?: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category?: string;
  category_id?: string;
  account_id?: string;
  goal_id?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  
  // Additional fields from transaction_details view
  account_name?: string;
  account_type?: string;
  income_category_name?: string;
  expense_category_name?: string;
  transfer_account_id?: string;
}

// Account type
export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  status: string;
  created_at: string;
}

// Category type
export interface Category {
  id: string;
  user_id: string;
  category_name: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
}

// Goal type
export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: string;
  status: string;
  created_at: string;
}

// Budget item type
export interface BudgetItem {
  id: string;
  category: string;
  name?: string;
  amount: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success";
}

// User data aggregate type
export interface UserData {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
  transactions: Transaction[];
  summaryData: {
    income: number;
    expenses: number;
    balance: number;
    savingsRate: number;
  };
}

// Monthly data point type
export interface MonthlyDataPoint {
  data: number[];
  label: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

// Monthly data type
export interface MonthlyData {
  labels: string[];
  datasets: MonthlyDataPoint[];
}

// Category data type
export interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

// Highcharts configuration types
export interface HighchartsConfig {
  chart: {
    type: string;
    style: {
      fontFamily: string;
    };
    backgroundColor: string;
    animation: {
      duration: number;
    };
    height: number;
  };
  title: {
    text: string | null;
  };
  xAxis: {
    categories: string[];
    crosshair: boolean;
    labels: {
      style: {
        color: string;
      };
    };
  };
  yAxis: {
    min: number;
    title: {
      text: string | null;
    };
    gridLineColor: string;
    gridLineDashStyle: string;
    labels: {
      formatter: () => string;
      style: {
        color: string;
      };
    };
  };
  tooltip: {
    headerFormat: string;
    pointFormat: string;
    footerFormat: string;
    shared: boolean;
    useHTML: boolean;
    style: {
      fontSize: string;
      fontFamily: string;
    };
    valuePrefix: string;
  };
  plotOptions: {
    column: {
      pointPadding: number;
      borderWidth: number;
      borderRadius: number;
    };
    series: {
      animation: {
        duration: number;
      };
    };
  };
  credits: {
    enabled: boolean;
  };
  series: Array<{
    name: string;
    data: number[];
    color: string;
    type: string;
  }>;
}

export interface PieChartConfig {
  chart: {
    type: string;
    backgroundColor: string;
    style: {
      fontFamily: string;
    };
    height: number;
  };
  title: {
    text: string | null;
  };
  tooltip: {
    pointFormat: string;
    valuePrefix: string;
    useHTML?: boolean;
  };
  plotOptions: {
    pie: {
      allowPointSelect: boolean;
      cursor: string;
      dataLabels: {
        enabled: boolean;
        format: string;
        style: {
          fontWeight: string;
        };
        connectorWidth?: number;
        distance?: number;
      };
      showInLegend: boolean;
      size: string;
      point?: {
        events: {
          click: Function;
        };
      };
    };
  };
  legend: {
    enabled?: boolean;
    align?: string;
    verticalAlign?: string;
    layout?: string;
    itemStyle?: {
      fontWeight: string;
    };
  };
  series: Array<{
    name: string;
    colorByPoint: boolean;
    data: Array<{
      name: string;
      y: number;
      sliced?: boolean;
      selected?: boolean;
    }>;
  }>;
  credits: {
    enabled: boolean;
  };
}

// Insight data type
export interface InsightData {
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "danger";
  icon: string;
}

// Trend data type
export interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}

// Family invitation type
export interface Invitation {
  id: number;
  family_id: number;
  family_name: string;
  inviter_user_id: string;
  inviter_email: string;
}

// Filter types
export type DateFilterType = 'all' | 'current-month' | 'last-3-months' | 'last-6-months' | 'last-year' | 'custom';
export type TypeFilterType = 'all' | 'income' | 'expense';

// Dashboard props type (if needed)
export interface DashboardProps {
  // Add any props if Dashboard receives them
}

// Export type for filter state
export interface FilterState {
  dateFilter: DateFilterType;
  categoryFilter: string;
  typeFilter: TypeFilterType;
  customStartDate: string;
  customEndDate: string;
}

// Tooltip position type
export interface TooltipPosition {
  top: number;
  left: number;
}

// Budget data from Supabase (raw data structure)
export interface BudgetData {
  id: string;
  user_id: string;
  category_id?: string;
  name?: string;
  amount: number;
  spent?: number;
  remaining?: number;
  percentage?: number;
  category_name?: string;
  expense_categories?: {
    category_name: string;
  };
  budget_categories?: {
    category_name: string;
  };
}
