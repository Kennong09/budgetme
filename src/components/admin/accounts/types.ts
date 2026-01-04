// Shared type definitions for admin account components

import { Account as BaseAccount } from '../../settings/types';

// Enhanced account interface for admin use with additional user and metadata fields
export interface AdminAccount extends BaseAccount {
  // User information
  user_name?: string;
  user_email: string;
  user_avatar?: string;
  user_full_name?: string;
  
  // Computed fields for admin display
  display_balance: string;
  balance_class: string;
  type_icon: string;
  
  // Metadata for tracking
  last_transaction_date?: string;
  transaction_count?: number;
  
  // Admin-specific fields
  created_by_admin?: boolean;
  modified_by_admin?: boolean;
  admin_notes?: string;
}

// Interface for account user (matching existing admin patterns)
export interface AccountUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  // Additional fields for account context
  account_count?: number;
  total_balance?: number;
  default_account_id?: string;
}

// Interface for account statistics
export interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  closedAccounts: number;
  totalUsers: number;
  usersWithAccounts: number;
  
  // Financial metrics
  totalBalance: number;
  positiveBalance: number;
  negativeBalance: number;
  
  // Account type distribution
  accountsByType: {[key: string]: number};
  accountsByStatus: {[key: string]: number};
  accountsByUser: {[key: string]: number};
  
  // Balance distribution by type
  balancesByType: {[key: string]: number};
  
  // Growth metrics
  newAccountsThisMonth: number;
  newAccountsLastMonth: number;
  growthPercentage: number;
}

// Interface for account filters
export interface AccountFilters {
  searchTerm: string;
  filterUser: string;
  filterType: string;
  filterStatus: string;
  filterDefault: string; // 'all', 'default', 'non-default'
  sortField: string;
  sortDirection: "asc" | "desc";
  currentPage: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  balanceMin?: number;
  balanceMax?: number;
}

// Interface for account form data
export interface AccountFormData {
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other';
  balance: number;
  initial_balance?: number;
  currency: string;
  status: 'active' | 'inactive' | 'closed';
  is_default: boolean;
  description?: string;
  institution_name?: string;
  account_number_masked?: string;
  color?: string;
  user_id: string;
  admin_notes?: string;
}

// Interface for bulk operations
export interface BulkAccountOperation {
  action: 'delete' | 'activate' | 'deactivate' | 'close' | 'change_user';
  accountIds: string[];
  newUserId?: string; // For change_user action
  confirmationRequired: boolean;
}

// Interface for account audit log entry
export interface AccountAuditEntry {
  id: string;
  account_id: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'balance_updated';
  old_values?: Partial<AdminAccount>;
  new_values?: Partial<AdminAccount>;
  admin_user_id: string;
  admin_user_email: string;
  timestamp: string;
  notes?: string;
}

// Account type configuration with icons and colors
export interface AccountTypeConfig {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  balanceValidation?: (balance: number) => boolean;
  balanceHint?: string;
}

// Pre-defined account type configurations
export const ACCOUNT_TYPE_CONFIGS: AccountTypeConfig[] = [
  {
    value: 'checking',
    label: 'Checking',
    icon: 'fas fa-university',
    color: '#4e73df',
    description: 'Primary spending account',
    balanceValidation: (balance) => true,
    balanceHint: 'Enter current account balance'
  },
  {
    value: 'savings',
    label: 'Savings',
    icon: 'fas fa-piggy-bank',
    color: '#1cc88a',
    description: 'Savings and emergency funds',
    balanceValidation: (balance) => balance >= 0,
    balanceHint: 'Savings accounts typically have positive balances'
  },
  {
    value: 'credit',
    label: 'Credit Card',
    icon: 'fas fa-credit-card',
    color: '#e74a3b',
    description: 'Credit card accounts',
    balanceValidation: (balance) => balance <= 0,
    balanceHint: 'Enter as negative amount (debt) or zero'
  },
  {
    value: 'investment',
    label: 'Investment',
    icon: 'fas fa-chart-line',
    color: '#f6c23e',
    description: 'Investment and retirement accounts',
    balanceValidation: (balance) => true,
    balanceHint: 'Enter current market value'
  },
  {
    value: 'cash',
    label: 'Cash',
    icon: 'fas fa-money-bill-wave',
    color: '#36b9cc',
    description: 'Physical cash on hand',
    balanceValidation: (balance) => balance >= 0,
    balanceHint: 'Physical cash amount'
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'fas fa-wallet',
    color: '#858796',
    description: 'Other financial accounts',
    balanceValidation: (balance) => true,
    balanceHint: 'Enter current balance'
  }
];

// Status configuration
export interface AccountStatusConfig {
  value: string;
  label: string;
  badge: string;
  icon: string;
  description: string;
}

export const ACCOUNT_STATUS_CONFIGS: AccountStatusConfig[] = [
  {
    value: 'active',
    label: 'Active',
    badge: 'badge-success',
    icon: 'fas fa-check-circle',
    description: 'Account is active and in use'
  },
  {
    value: 'inactive',
    label: 'Inactive',
    badge: 'badge-warning',
    icon: 'fas fa-pause-circle',
    description: 'Account is temporarily inactive'
  },
  {
    value: 'closed',
    label: 'Closed',
    badge: 'badge-danger',
    icon: 'fas fa-times-circle',
    description: 'Account has been closed'
  }
];

// Account color options for visual identification
export const ACCOUNT_COLORS = [
  '#4e73df', // Primary Blue
  '#1cc88a', // Success Green
  '#36b9cc', // Info Cyan
  '#f6c23e', // Warning Yellow
  '#e74a3b', // Danger Red
  '#858796', // Secondary Gray
  '#5a5c69', // Dark Gray
  '#60c39e', // Mint Green
];







