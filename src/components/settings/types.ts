// Account Types
export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
  balance: number;
  currency: string;
  status: 'active' | 'inactive';
  is_default: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

// User Profile Types (without appearance settings)
export interface UserProfile {
  name: string;
  email: string;
  profilePicture: string;
  currency: string;
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

// Currency Options
export const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP (₱)', symbol: '₱' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'CAD', label: 'CAD ($)', symbol: '$' },
  { value: 'AUD', label: 'AUD ($)', symbol: '$' },
];

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
