// Shared type definitions for admin dashboard components

export interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  link: string;
}

export interface ChartData {
  users: { date: string; count: number }[];
  transactions: { date: string; count: number }[];
  budgets: { date: string; count: number }[];
  goals: { date: string; count: number }[];
}

export interface RecentUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  banned: boolean;
  email_confirmed_at?: string;
}

export interface SystemStatus {
  dbStorage: number;
  apiRequestRate: number;
  errorRate: number;
  serverLoad: number;
  logs: string[];
}

export interface DashboardData {
  statCards: StatCard[];
  chartData: ChartData;
  recentUsers: RecentUser[];
  systemStatus: SystemStatus;
  loading: boolean;
}