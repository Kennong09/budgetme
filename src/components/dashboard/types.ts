// Dashboard Types and Interfaces

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category: string;
  category_id?: string;
  account_id: string;
  goal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  status: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  category_name: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
}

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

export interface BudgetItem {
  id: string | number;
  category: string;
  name?: string;
  amount: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success";
  budget?: number;
  month?: string;
  year?: number;
  period?: string;
  period_start?: string;
  period_end?: string;
}

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

export interface MonthlyDataPoint {
  data: number[];
  label: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface MonthlyData {
  labels: string[];
  datasets: MonthlyDataPoint[];
}

export interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

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

export interface InsightData {
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "danger";
  icon: string;
}

export interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}

export interface Invitation {
  id: number;
  family_id: number;
  family_name: string;
  inviter_user_id: string;
  inviter_email: string;
}

export type DateFilterType = 'all' | 'current-month' | 'last-3-months' | 'last-6-months' | 'last-year' | 'custom';
export type TypeFilterType = 'all' | 'income' | 'expense';

export interface BudgetData {
  id: string;
  amount?: number;
  spent?: number;
  percentage?: number;
  remaining?: number;
  category_name?: string;
  name?: string;
  expense_categories?: {
    category_name: string;
  };
  budget_categories?: {
    category_name: string;
  };
}

export interface FilterState {
  dateFilter: DateFilterType;
  typeFilter: TypeFilterType;
  categoryFilter: string;
  customStartDate: string;
  customEndDate: string;
}
