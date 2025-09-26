// Shared types for BudgetSetup components following the comprehensive plan specification

export type WorkflowType = 'budget_first' | 'transaction_first';
export type ModalStep = 'workflow_choice' | 'budget_config' | 'transaction_setup' | 'transaction_create' | 'transaction_review' | 'final_confirmation';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TransactionType = 'income' | 'expense' | 'contribution';
export type BudgetPeriod = 'month' | 'quarter' | 'year';

export interface WorkflowChoiceData {
  workflow_type: WorkflowType;
  choice_reason?: string;
  user_experience_level?: ExperienceLevel;
}

export interface BudgetFormData {
  budget_name: string;
  category_id: string;
  category_name: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  description?: string;
  alert_threshold: number;
  goal_id?: string;
  goal_name?: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  account_id: string;
  account_name: string;
  category_id: string;
  category_name: string;
  date: string;
  description: string;
  goal_id?: string;
  goal_name?: string;
}

export interface ValidationErrors {
  budgetName?: string;
  budgetAmount?: string;
  budgetCategory?: string;
  budgetPeriod?: string;
  budgetStartDate?: string;
  transactionType?: string;
  transactionAmount?: string;
  transactionDate?: string;
  transactionAccount?: string;
  transactionCategory?: string;
  transactionDescription?: string;
  transactionGoal?: string;
}

export interface ModalState {
  currentStep: ModalStep;
  workflowChoice: WorkflowChoiceData | null;
  budgetData: BudgetFormData;
  transactionData: TransactionFormData;
  validationErrors: ValidationErrors;
  isSubmitting: boolean;
  allowWorkflowChange: boolean;
  progressPercentage: number;
}

// Step component props interfaces
export interface StepComponentProps {
  modalState: ModalState;
  updateModalState: (updates: Partial<ModalState>) => void;
  updateBudgetData: (updates: Partial<BudgetFormData>) => void;
  updateTransactionData: (updates: Partial<TransactionFormData>) => void;
  updateValidationErrors: (errors: Partial<ValidationErrors>) => void;
  navigateToStep: (step: ModalStep) => void;
  onSkip?: () => void;
}

// Navigation handler interface
export interface NavigationHandlers {
  onPrevious?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onSubmit?: () => void;
  isValid?: boolean;
  isSubmitting?: boolean;
}