import { Goal as GoalType } from "../../../../types";
import { Account } from "../../../settings/types";

// Modal step types
export type ModalStep = 'selection' | 'contribution' | 'review';

// Contribution data interface
export interface ContributionData {
  goalId: string;
  amount: string;
  account_id: string;
  notes: string;
}

// Modal state interface
export interface ContributionModalState {
  step: ModalStep;
  selectedGoal: GoalType | null;
  selectedAccount: Account | null;
  contributionData: ContributionData;
  error: string | null;
  activeTip: string | null;
  tooltipPosition: { top: number; left: number } | null;
  showGoalAnalytics: boolean;
  selectedGoalAnalytics: GoalAnalytics | null;
  isSubmitting: boolean;
  showPermissionError: boolean;
  permissionError: PermissionError | null;
}

// Goal analytics interface
export interface GoalAnalytics {
  progressPercentage: number;
  remainingAmount: number;
  remainingDays: number | null;
  dailyRequired: number;
  isOnTrack: boolean;
}

// Permission error interface
export interface PermissionError {
  title: string;
  message: string;
  suggestedActions?: string[];
}

export interface ContributionError {
  type: 'validation' | 'permission' | 'network' | 'balance' | 'family_restriction' | 'goal_limit';
  title: string;
  message: string;
  details?: string;
  suggestedActions?: string[];
  isRetryable?: boolean;
}

export interface ErrorState {
  hasError: boolean;
  error: ContributionError | null;
  showErrorModal: boolean;
}

// Tooltip content interface
export interface TooltipContent {
  title: string;
  description: string;
}

// Contribution modal props interface
export interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: GoalType[];
  onContributionSuccess: () => void;
  preSelectedGoal?: GoalType; // Optional pre-selected goal for auto-selection
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Quick amount button config
export interface QuickAmountButton {
  label: string;
  className: string;
  getValue: (goal: GoalType) => string;
}

// Goal card analytics
export interface GoalCardAnalytics {
  progressPercentage: number;
  remainingAmount: number;
  remainingDays: number | null;
  isUrgent: boolean;
  isNearComplete: boolean;
  dailyTarget?: number;
}

// Audit data for contribution tracking
export interface ContributionAuditData {
  id: string;
  goal_id: string;
  source_account_id: string;
  amount: number;
  contribution_type: 'manual' | 'automated';
  notes: string;
  contribution_date: string;
}
