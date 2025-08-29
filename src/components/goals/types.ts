export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percentage: number;
  progress_status: string;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  is_shared?: boolean;  // Indicates if goal is shared with family
  family_id?: string;   // ID of the family if shared
  shared_by?: string;   // User who shared the goal
  shared_by_name?: string; // Name of user who shared the goal
}

export interface FilterState {
  priority: "all" | "high" | "medium" | "low";
  category: "all" | "not_started" | "in_progress" | "completed" | "cancelled";
  sortBy: "name" | "target_date" | "progress" | "amount";
  search: string;
  scope: "all" | "personal" | "family"; // Filter for personal or family goals
}

export interface GoalSummary {
  totalCurrentAmount: number;
  totalTargetAmount: number;
  overallProgress: number;
}

export interface TooltipPosition {
  top: number;
  left: number;
}

export type ViewMode = "table" | "grid";

export type GoalHealthStatus = "Healthy" | "On Track" | "Getting Started" | "Just Beginning";

export type ProgressStatusColor = "success" | "info" | "warning" | "danger";

export interface DeleteModalState {
  showDeleteModal: boolean;
  goalToDelete: string | null;
  isDeleting: boolean;
  deleteError: string | null;
  hasLinkedTransactions: boolean;
}

export interface FamilyState {
  isFamilyMember: boolean;
  userFamilyId: string | null;
  familyRole: "admin" | "viewer" | null;
}