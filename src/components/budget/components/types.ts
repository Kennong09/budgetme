// Enhanced types for refactored BudgetSetupModal components
import { ModalStep, WorkflowType, ModalState } from '../types/BudgetSetupTypes';

// Enhanced tooltip system
export interface TooltipPosition {
  top: number;
  left: number;
}

export interface TooltipState {
  isVisible: boolean;
  position: TooltipPosition | null;
  title: string;
  description: string;
  category?: 'workflow' | 'form' | 'process' | 'analytics';
}

// Enhanced sidebar communication
export interface SidebarTipContent {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: 'workflow' | 'form' | 'process' | 'analytics';
}

export interface SidebarQuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  disabled?: boolean;
}

export interface BudgetAnalytics {
  budgetAmount: number;
  transactionAmount: number;
  utilization: number;
  remaining: number;
}

// Enhanced step card types
export type StepCardType = 'selection' | 'form' | 'review' | 'analytics';

export interface StepCardNavigation {
  onPrevious?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onSubmit?: () => void;
  isValid?: boolean;
  isSubmitting?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  showSkip?: boolean;
}

// Enhanced modal events
export interface ModalEventHandlers {
  onTooltipShow?: (event: React.MouseEvent, title: string, description: string, category?: 'workflow' | 'form' | 'process' | 'analytics') => void;
  onTooltipHide?: () => void;
  onTipClick?: (tipId: string) => void;
  onQuickAction?: (actionId: string) => void;
  onStepValidation?: (stepId: ModalStep, isValid: boolean) => void;
}

// Enhanced progress tracking
export interface ProgressMapping {
  workflow_choice: number;
  budget_config: number;
  transaction_setup: number;
  transaction_create: number;
  transaction_review: number;
  final_confirmation: number;
}

export interface ProgressIndicator {
  step: ModalStep;
  label: string;
  title: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isUpcoming?: boolean;
}

// Enhanced validation feedback
export interface ValidationFeedback {
  isValid: boolean;
  errorCount: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}