// Chart related types and interfaces

export interface MonthlyData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface BudgetPerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}
