// Account Types (currency forced to PHP)
export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
  balance: number;
  // currency removed - always PHP
  status: 'active' | 'inactive';
  is_default: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

// User Profile Types (currency forced to PHP)
export interface UserProfile {
  name: string;
  email: string;
  profilePicture: string;
  // currency removed - always PHP
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  accounts: Account[];
}

// Settings Tab Type
export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}

// CURRENCY FORCED TO PHP ONLY - Options removed
// All currency selection has been disabled
// Only PHP is supported in the application now

// Language Options
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

// Account Type Options
export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

// Account Colors
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
