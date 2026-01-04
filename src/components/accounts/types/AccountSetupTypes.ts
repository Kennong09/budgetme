// Account Setup Modal Types
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ModalStep = 
  | 'workflow_choice'
  | 'account_type_choice'
  | 'account_config' 
  | 'cash_in_setup'
  | 'review_confirmation';

export interface AccountTypeChoiceData {
  account_type: AccountType;
  user_experience_level: ExperienceLevel;
  choice_reason?: string;
}

export interface AccountFormData {
  account_name: string;
  account_type: AccountType;
  initial_balance: number;
  description?: string;
  institution_name?: string;
  color?: string;
  is_default: boolean;
  // Budget planning information
  initial_budget_plan?: {
    monthly_income_expectation?: number;
    primary_use_case?: string;
    spending_categories?: string[];
  };
}

export interface CashInFormData {
  amount: number;
  description: string;
  date: string;
  source?: string;
  category?: string;
  // Optional budget allocation
  budget_allocation?: {
    category_name: string;
    allocated_amount: number;
    notes?: string;
  }[];
}

export interface ValidationErrors {
  account_name?: string;
  account_type?: string;
  initial_balance?: string;
  cash_in_amount?: string;
  cash_in_description?: string;
  [key: string]: string | undefined;
}

export interface ModalState {
  currentStep: ModalStep;
  accountTypeChoice: AccountTypeChoiceData | null;
  accountData: AccountFormData;
  cashInData: CashInFormData;
  validationErrors: ValidationErrors;
  isSubmitting: boolean;
  allowAccountTypeChange: boolean;
  progressPercentage: number;
}

// Navigation handlers interface
export interface NavigationHandlers {
  onPrevious?: () => void;
  onNext?: () => void;
  isValid?: boolean;
}

// Enhanced error handling types
export interface AccountSetupError {
  type: 'validation' | 'network' | 'permission' | 'bank_connection' | 'duplicate_account' | 'system_error';
  title: string;
  message: string;
  details?: string;
  suggestedActions?: string[];
  isRetryable?: boolean;
  fieldErrors?: Record<string, string>;
}

export interface AccountErrorState {
  hasError: boolean;
  error: AccountSetupError | null;
  showErrorModal: boolean;
}

// Account setup result interface
export interface AccountSetupResult {
  success: boolean;
  error?: AccountSetupError;
  account?: any;
  cashInTransaction?: any;
  auditRecord?: any;
}

// Audit record interface
export interface AccountAuditRecord {
  id?: string;
  user_id: string;
  activity_type: 'account_created' | 'account_updated' | 'account_cash_in' | 'account_deleted';
  activity_description: string;
  ip_address?: string;
  user_agent?: string;
  metadata: {
    account_id?: string;
    account_name?: string;
    account_type?: AccountType;
    amount?: number;
    old_values?: any;
    new_values?: any;
    cash_in_details?: CashInFormData;
    initial_budget_plan?: any;
  };
  created_at: string;
}

// Cash-in transaction interface
export interface CashInTransaction {
  user_id: string;
  account_id: string;
  type: 'cash_in';
  amount: number;
  date: string;
  description: string;
  notes?: string;  // Stores source and category information
}
