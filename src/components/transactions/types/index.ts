// Transaction-related types and interfaces

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense" | "contribution";
  category_id?: string;
  account_id: string;
  created_at: string;
  goal_id?: string;
  user_id: string;
}

export interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

export interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

export interface Goal {
  id: string;
  goal_name: string;
  current_amount: number;
  target_amount: number;
}

export interface UserData {
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
  transactions: Transaction[];
}

export interface FilterState {
  categoryId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  type: "all" | "income" | "expense" | "contribution";
  sortBy: "date" | "amount" | "category";
  sortOrder: "asc" | "desc";
  accountId: string;
  month: string;
  year: string;
  search: string;
  scope: "all" | "personal" | "family";
  goal_id?: string;
}

// Highcharts interfaces
export interface LineChartConfig {
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
    labels: {
      style: {
        color: string;
      };
    };
  };
  yAxis: {
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
    shared: boolean;
    useHTML: boolean;
    formatter?: () => string;
    style: {
      fontSize: string;
      fontFamily: string;
    };
    valuePrefix: string;
  };
  plotOptions: {
    line: {
      marker: {
        radius: number;
        symbol: string;
      };
      lineWidth: number;
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
    };
  };
  legend: {
    enabled?: boolean;
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

// Component prop interfaces
export interface TransactionSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface TransactionChartsProps {
  lineChartOptions: LineChartConfig | null;
  pieChartOptions: PieChartConfig | null;
  filteredTransactions: Transaction[];
  periodTitle: string;
  expensesRatio: number;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface TransactionFiltersProps {
  filter: FilterState;
  userData: UserData | null;
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onResetFilters: () => void;
  isFiltering: boolean;
}

export interface TransactionTableProps {
  filteredTransactions: Transaction[];
  userData: UserData | null;
  isFiltering: boolean;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export interface DeleteConfirmationModalProps {
  show: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface TooltipSystemProps {
  activeTip: string | null;
  tooltipPosition: { top: number; left: number } | null;
}

export interface GoalFilterBannerProps {
  goalId?: string;
  goalName?: string;
  onClearFilter: () => void;
}

// Utility type for tooltip content
export type TooltipContent = {
  [key: string]: {
    title: string;
    description: string;
  };
};