import { supabase } from '../../utils/supabaseClient';

// =====================================================
// DATA TRANSFER OBJECTS & INTERFACES
// =====================================================

export interface AccountTemplate {
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other';
  initial_balance: number;
  status: 'active' | 'inactive' | 'closed';
  is_default: boolean;
  description?: string;
  color?: string;
}

export interface IncomeCategoryTemplate {
  category_name: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  description?: string;
}

export interface ExpenseCategoryTemplate {
  category_name: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  description?: string;
  monthly_budget?: number;
}

export interface InitializationResult {
  success: boolean;
  accounts_created: number;
  income_categories_created: number;
  expense_categories_created: number;
  errors?: string[];
}

export interface ValidationResult {
  has_accounts: boolean;
  has_income_categories: boolean;
  has_expense_categories: boolean;
  missing_defaults: string[];
}

export interface ResetResult {
  success: boolean;
  accounts_removed: number;
  income_categories_removed: number;
  expense_categories_removed: number;
  errors?: string[];
}

export interface MigrationResult {
  success: boolean;
  users_processed: number;
  accounts_created: number;
  income_categories_created: number;
  expense_categories_created: number;
  errors?: string[];
}

export type TemplateType = 'accounts' | 'income_categories' | 'expense_categories';

// =====================================================
// DEFAULT CONFIGURATION TEMPLATES
// =====================================================

export const DEFAULT_ACCOUNT_TEMPLATES: AccountTemplate[] = [
  {
    account_name: 'Primary Checking',
    account_type: 'checking',
    initial_balance: 0.00,
    status: 'active',
    is_default: true,
    description: 'Main checking account for daily transactions',
    color: '#4e73df'
  },
  {
    account_name: 'Savings Account',
    account_type: 'savings',
    initial_balance: 0.00,
    status: 'active',
    is_default: false,
    description: 'Primary savings account',
    color: '#1cc88a'
  },
  {
    account_name: 'Credit Card',
    account_type: 'credit',
    initial_balance: 0.00,
    status: 'active',
    is_default: false,
    description: 'Primary credit card account',
    color: '#e74a3b'
  }
];

export const DEFAULT_INCOME_CATEGORY_TEMPLATES: IncomeCategoryTemplate[] = [
  {
    category_name: 'Salary',
    icon: 'cash',
    color: '#4CAF50',
    is_default: true,
    is_active: true,
    description: 'Monthly salary income'
  },
  {
    category_name: 'Freelance',
    icon: 'briefcase',
    color: '#4CAF50',
    is_default: true,
    is_active: true,
    description: 'Freelance and contract work'
  },
  {
    category_name: 'Investments',
    icon: 'trending-up',
    color: '#4CAF50',
    is_default: true,
    is_active: true,
    description: 'Investment returns and dividends'
  },
  {
    category_name: 'Gifts',
    icon: 'gift',
    color: '#4CAF50',
    is_default: true,
    is_active: true,
    description: 'Money gifts and windfalls'
  },
  {
    category_name: 'Other Income',
    icon: 'plus-circle',
    color: '#4CAF50',
    is_default: true,
    is_active: true,
    description: 'Miscellaneous income sources'
  }
];

export const DEFAULT_EXPENSE_CATEGORY_TEMPLATES: ExpenseCategoryTemplate[] = [
  {
    category_name: 'Housing',
    icon: 'home',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Rent, mortgage, and housing expenses'
  },
  {
    category_name: 'Utilities',
    icon: 'zap',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Electricity, water, gas, internet'
  },
  {
    category_name: 'Groceries',
    icon: 'shopping-cart',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Food and grocery shopping'
  },
  {
    category_name: 'Transportation',
    icon: 'truck',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Gas, public transport, vehicle maintenance'
  },
  {
    category_name: 'Dining Out',
    icon: 'coffee',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Restaurants and food delivery'
  },
  {
    category_name: 'Entertainment',
    icon: 'film',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Movies, games, hobbies'
  },
  {
    category_name: 'Healthcare',
    icon: 'activity',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Medical expenses and insurance'
  },
  {
    category_name: 'Education',
    icon: 'book',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Learning and educational expenses'
  },
  {
    category_name: 'Shopping',
    icon: 'shopping-bag',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Clothing and general shopping'
  },
  {
    category_name: 'Personal Care',
    icon: 'user',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Haircuts, personal grooming'
  },
  {
    category_name: 'Travel',
    icon: 'map',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Travel and vacation expenses'
  },
  {
    category_name: 'Subscriptions',
    icon: 'repeat',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Monthly subscriptions and services'
  },
  {
    category_name: 'Contribution',
    icon: 'piggy-bank',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Goal contributions and savings'
  },
  {
    category_name: 'Other Expenses',
    icon: 'more-horizontal',
    color: '#F44336',
    is_default: true,
    is_active: true,
    description: 'Miscellaneous expenses'
  }
];

// =====================================================
// DEFAULT CONFIGURATION SERVICE
// =====================================================

export class DefaultConfigurationService {
  
  // =====================================================
  // PRIMARY SERVICE METHODS
  // =====================================================

  /**
   * Initialize default configuration for a new user
   * Creates accounts, income categories, and expense categories
   */
  static async initializeUserDefaults(userId: string): Promise<InitializationResult> {
    const result: InitializationResult = {
      success: false,
      accounts_created: 0,
      income_categories_created: 0,
      expense_categories_created: 0,
      errors: []
    };

    try {
      // Validate user doesn't already have defaults
      const validation = await this.validateUserHasDefaults(userId);
      if (validation.missing_defaults.length === 0) {
        // User already has all required defaults
        result.success = true;
        result.errors?.push('User already has complete default configurations');
        return result;
      }

      // Only create missing defaults to prevent duplicates
      console.log(`Creating missing defaults for user ${userId}: ${validation.missing_defaults.join(', ')}`);

      // Create default accounts only if missing
      if (validation.missing_defaults.includes('accounts')) {
        const accounts = await this.createDefaultAccounts(userId);
        result.accounts_created = accounts.length;
      }

      // Create default income categories only if missing
      if (validation.missing_defaults.includes('income_categories')) {
        const incomeCategories = await this.createDefaultIncomeCategories(userId);
        result.income_categories_created = incomeCategories.length;
      }

      // Create default expense categories only if missing
      if (validation.missing_defaults.includes('expense_categories')) {
        const expenseCategories = await this.createDefaultExpenseCategories(userId);
        result.expense_categories_created = expenseCategories.length;
      }

      result.success = true;
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors?.push(`Initialization failed: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Create default accounts for a user
   * Ensures only one primary account of each type (checking, savings, credit)
   */
  static async createDefaultAccounts(userId: string): Promise<any[]> {
    // Check existing accounts to avoid duplicates
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('account_type')
      .eq('user_id', userId);

    if (checkError) {
      console.error('Error checking existing accounts:', checkError);
    }

    const existingTypes = existingAccounts?.map(acc => acc.account_type) || [];
    console.log(`User ${userId} existing account types:`, existingTypes);

    // Filter templates to only include accounts that don't already exist
    const accountsToCreate = DEFAULT_ACCOUNT_TEMPLATES
      .filter(template => !existingTypes.includes(template.account_type))
      .map(template => ({
        user_id: userId,
        account_name: template.account_name,
        account_type: template.account_type,
        balance: template.initial_balance,
        initial_balance: template.initial_balance,
        currency: 'PHP', // Changed to PHP as per user preference
        status: template.status,
        is_default: template.is_default,
        description: template.description,
        color: template.color || '#4e73df'
      }));

    if (accountsToCreate.length === 0) {
      console.log(`No new accounts to create for user ${userId} - all types already exist`);
      return [];
    }

    console.log(`Creating ${accountsToCreate.length} accounts for user ${userId}:`, 
      accountsToCreate.map(acc => `${acc.account_type} (${acc.account_name})`));

    const { data, error } = await supabase
      .from('accounts')
      .insert(accountsToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create accounts: ${error.message}`);
    }

    console.log(`Successfully created ${data?.length || 0} accounts for user ${userId}`);
    return data || [];
  }

  /**
   * Create default income categories for a user
   * Avoids creating duplicate categories
   */
  static async createDefaultIncomeCategories(userId: string): Promise<any[]> {
    // Check existing categories to avoid duplicates
    const { data: existingCategories, error: checkError } = await supabase
      .from('income_categories')
      .select('category_name')
      .eq('user_id', userId);

    if (checkError) {
      console.error('Error checking existing income categories:', checkError);
    }

    const existingNames = existingCategories?.map(cat => cat.category_name) || [];
    
    // Filter templates to only include categories that don't already exist
    const categoriesToCreate = DEFAULT_INCOME_CATEGORY_TEMPLATES
      .filter(template => !existingNames.includes(template.category_name))
      .map(template => ({
        user_id: userId,
        category_name: template.category_name,
        icon: template.icon,
        color: template.color,
        is_default: template.is_default,
        is_active: template.is_active,
        description: template.description
      }));

    if (categoriesToCreate.length === 0) {
      console.log(`No new income categories to create for user ${userId}`);
      return [];
    }

    const { data, error } = await supabase
      .from('income_categories')
      .insert(categoriesToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create income categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create default expense categories for a user
   * Avoids creating duplicate categories
   */
  static async createDefaultExpenseCategories(userId: string): Promise<any[]> {
    // Check existing categories to avoid duplicates
    const { data: existingCategories, error: checkError } = await supabase
      .from('expense_categories')
      .select('category_name')
      .eq('user_id', userId);

    if (checkError) {
      console.error('Error checking existing expense categories:', checkError);
    }

    const existingNames = existingCategories?.map(cat => cat.category_name) || [];
    
    // Filter templates to only include categories that don't already exist
    const categoriesToCreate = DEFAULT_EXPENSE_CATEGORY_TEMPLATES
      .filter(template => !existingNames.includes(template.category_name))
      .map(template => ({
        user_id: userId,
        category_name: template.category_name,
        icon: template.icon,
        color: template.color,
        is_default: template.is_default,
        is_active: template.is_active,
        description: template.description,
        monthly_budget: template.monthly_budget
      }));

    if (categoriesToCreate.length === 0) {
      console.log(`No new expense categories to create for user ${userId}`);
      return [];
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert(categoriesToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create expense categories: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * Get account templates
   */
  static getAccountTemplate(): AccountTemplate[] {
    return [...DEFAULT_ACCOUNT_TEMPLATES];
  }

  /**
   * Get income category templates
   */
  static getIncomeCategoryTemplate(): IncomeCategoryTemplate[] {
    return [...DEFAULT_INCOME_CATEGORY_TEMPLATES];
  }

  /**
   * Get expense category templates
   */
  static getExpenseCategoryTemplate(): ExpenseCategoryTemplate[] {
    return [...DEFAULT_EXPENSE_CATEGORY_TEMPLATES];
  }

  // =====================================================
  // VALIDATION AND UTILITY METHODS
  // =====================================================

  /**
   * Validate if user has default configurations
   */
  static async validateUserHasDefaults(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      has_accounts: false,
      has_income_categories: false,
      has_expense_categories: false,
      missing_defaults: []
    };

    try {
      // Check accounts
      const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (accountError) {
        console.error('Error checking accounts:', accountError);
      } else {
        result.has_accounts = (accounts && accounts.length > 0);
      }

      // Check income categories
      const { data: incomeCategories, error: incomeError } = await supabase
        .from('income_categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (incomeError) {
        console.error('Error checking income categories:', incomeError);
      } else {
        result.has_income_categories = (incomeCategories && incomeCategories.length > 0);
      }

      // Check expense categories
      const { data: expenseCategories, error: expenseError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (expenseError) {
        console.error('Error checking expense categories:', expenseError);
      } else {
        result.has_expense_categories = (expenseCategories && expenseCategories.length > 0);
      }

      // Determine missing defaults
      if (!result.has_accounts) {
        result.missing_defaults.push('accounts');
      }
      if (!result.has_income_categories) {
        result.missing_defaults.push('income_categories');
      }
      if (!result.has_expense_categories) {
        result.missing_defaults.push('expense_categories');
      }

    } catch (error) {
      console.error('Error in validateUserHasDefaults:', error);
      result.missing_defaults = ['accounts', 'income_categories', 'expense_categories'];
    }

    return result;
  }

  /**
   * Reset user defaults (remove all default entries)
   */
  static async resetUserDefaults(userId: string): Promise<ResetResult> {
    const result: ResetResult = {
      success: false,
      accounts_removed: 0,
      income_categories_removed: 0,
      expense_categories_removed: 0,
      errors: []
    };

    try {
      // Remove default accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId)
        .eq('is_default', true)
        .select('id');

      if (accountsError) {
        result.errors?.push(`Error removing accounts: ${accountsError.message}`);
      } else {
        result.accounts_removed = accountsData?.length || 0;
      }

      // Remove default income categories
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_categories')
        .delete()
        .eq('user_id', userId)
        .eq('is_default', true)
        .select('id');

      if (incomeError) {
        result.errors?.push(`Error removing income categories: ${incomeError.message}`);
      } else {
        result.income_categories_removed = incomeData?.length || 0;
      }

      // Remove default expense categories
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('user_id', userId)
        .eq('is_default', true)
        .select('id');

      if (expenseError) {
        result.errors?.push(`Error removing expense categories: ${expenseError.message}`);
      } else {
        result.expense_categories_removed = expenseData?.length || 0;
      }

      result.success = (result.errors?.length || 0) === 0;
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors?.push(`Reset failed: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Migrate existing users without defaults
   */
  static async migrateExistingUser(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      users_processed: 0,
      accounts_created: 0,
      income_categories_created: 0,
      expense_categories_created: 0,
      errors: []
    };

    try {
      // Check if user exists in auth.users
      const { data: user, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        result.errors?.push(`User not found: ${userId}`);
        return result;
      }

      // Check what defaults are missing
      const validation = await this.validateUserHasDefaults(userId);
      
      if (validation.missing_defaults.length === 0) {
        result.success = true;
        result.users_processed = 1;
        return result; // User already has all defaults
      }

      // Initialize missing defaults
      const initResult = await this.initializeUserDefaults(userId);
      
      result.success = initResult.success;
      result.users_processed = initResult.success ? 1 : 0;
      result.accounts_created = initResult.accounts_created;
      result.income_categories_created = initResult.income_categories_created;
      result.expense_categories_created = initResult.expense_categories_created;
      
      if (initResult.errors) {
        result.errors?.push(...initResult.errors);
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors?.push(`Migration failed for user ${userId}: ${errorMsg}`);
      return result;
    }
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * Bulk migrate multiple users
   */
  static async bulkMigrateUsers(userIds: string[]): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      users_processed: 0,
      accounts_created: 0,
      income_categories_created: 0,
      expense_categories_created: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        const userResult = await this.migrateExistingUser(userId);
        
        result.users_processed += userResult.users_processed;
        result.accounts_created += userResult.accounts_created;
        result.income_categories_created += userResult.income_categories_created;
        result.expense_categories_created += userResult.expense_categories_created;
        
        if (userResult.errors) {
          result.errors?.push(...userResult.errors);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        result.errors?.push(`Bulk migration error for user ${userId}: ${errorMsg}`);
      }
    }

    result.success = result.users_processed > 0 && (result.errors?.length || 0) === 0;
    return result;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Get user's default accounts
   */
  static async getUserDefaultAccounts(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user default accounts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's default income categories
   */
  static async getUserDefaultIncomeCategories(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('income_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user default income categories:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's default expense categories
   */
  static async getUserDefaultExpenseCategories(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user default expense categories:', error);
      return [];
    }

    return data || [];
  }
}

export default DefaultConfigurationService;