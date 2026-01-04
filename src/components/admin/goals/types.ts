export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "paused" | "cancelled";
  category?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  family_id?: string;
  
  // Calculated fields
  remaining?: number;
  percentage?: number;
  progress_status?: string;
  is_overdue?: boolean;
  is_family_goal?: boolean;
  
  // User information (joined data)
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  cancelledGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalRemainingAmount: number;
  overallProgress: number;
  goalsByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  goalsByStatus: {
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
  };
  goalsByUser: Record<string, number>;
  overdueGoals: number;
  goalsCompletedThisMonth: number;
  averageProgress: number;
}

export interface GoalFilters {
  priority: string;
  status: string;
  user: string;
  category: string;
  search: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  minProgress: string;
  maxProgress: string;
  isOverdue: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}

export interface GoalUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

export interface GoalCategory {
  id: string;
  category_name: string;
  icon?: string;
  color?: string;
  user_id: string;
  is_default: boolean;
  is_active: boolean;
}

export interface GoalTransaction {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  type: "contribution" | "withdrawal";
  date: string;
  notes?: string;
  created_at: string;
}

export interface GoalFormData {
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "paused" | "cancelled";
  category: string;
  notes: string;
  user_id: string;
  family_id: string;
}

export interface GoalModalProps {
  show: boolean;
  onClose: () => void;
}

export interface AddGoalModalProps extends GoalModalProps {
  onGoalAdded: () => void;
  users: GoalUser[];
  categories: GoalCategory[];
}

export interface ViewGoalModalProps extends GoalModalProps {
  goal: Goal | null;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  transactions?: GoalTransaction[];
}

export interface EditGoalModalProps extends GoalModalProps {
  goal: Goal | null;
  onGoalUpdated: (updatedGoal: Goal) => void;
  users: GoalUser[];
  categories: GoalCategory[];
}

export interface DeleteGoalModalProps extends GoalModalProps {
  goal: Goal | null;
  onGoalDeleted: (goalId: string) => void;
}

export interface GoalStatsCardsProps {
  summary: GoalSummary;
  loading?: boolean;
}

export interface GoalFiltersProps {
  filters: GoalFilters;
  users: GoalUser[];
  categories: GoalCategory[];
  onFiltersChange: (filters: Partial<GoalFilters>) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export interface GoalTableProps {
  goals: Goal[];
  filters: GoalFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onGoalSelect: (goal: Goal) => void;
  onGoalEdit: (goal: Goal) => void;
  onGoalDelete: (goal: Goal) => void;
}

export interface ProgressBarProps {
  percentage: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "success" | "info" | "warning" | "danger";
}

export interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
  size?: "sm" | "md" | "lg";
}

export interface StatusBadgeProps {
  status: "active" | "completed" | "paused" | "cancelled";
  size?: "sm" | "md" | "lg";
}
