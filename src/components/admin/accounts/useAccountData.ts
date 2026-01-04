import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { 
  AdminAccount, 
  AccountUser, 
  AccountStats, 
  AccountFilters, 
  AccountFormData,
  ACCOUNT_TYPE_CONFIGS 
} from "./types";
import { AccountService } from "../../../services/database/accountService";
import { getCurrencySymbol } from "../../settings/utils/currencyHelpers";

/**
 * Custom hook for managing account data in admin interface
 * Provides comprehensive CRUD operations, real-time updates, and statistics
 */
export const useAccountData = () => {
  // State management
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [stats, setStats] = useState<AccountStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    inactiveAccounts: 0,
    closedAccounts: 0,
    totalUsers: 0,
    usersWithAccounts: 0,
    totalBalance: 0,
    positiveBalance: 0,
    negativeBalance: 0,
    accountsByType: {},
    accountsByStatus: {},
    accountsByUser: {},
    balancesByType: {},
    newAccountsThisMonth: 0,
    newAccountsLastMonth: 0,
    growthPercentage: 0
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  // Real-time subscription
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  /**
   * Helper function to get account type icon
   */
  const getAccountTypeIcon = useCallback((type: string): string => {
    const config = ACCOUNT_TYPE_CONFIGS.find(c => c.value === type);
    return config?.icon || 'fas fa-wallet';
  }, []);

  /**
   * Helper function to format balance with proper styling
   */
  const formatAccountBalance = useCallback((balance: number, type: string): { display: string; class: string } => {
    const currencySymbol = getCurrencySymbol('PHP');
    const formattedAmount = `${currencySymbol}${Math.abs(balance).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
    
    if (type === 'credit') {
      if (balance < 0) {
        return {
          display: `-${formattedAmount}`,
          class: 'text-danger font-weight-bold'
        };
      } else if (balance === 0) {
        return {
          display: formattedAmount,
          class: 'text-success font-weight-bold'
        };
      } else {
        return {
          display: `+${formattedAmount}`,
          class: 'text-warning font-weight-bold'
        };
      }
    } else {
      return {
        display: `${balance >= 0 ? '' : '-'}${formattedAmount}`,
        class: `font-weight-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`
      };
    }
  }, []);

  /**
   * Transform database account to admin account with computed fields
   */
  const transformToAdminAccount = useCallback((dbAccount: any, userMap: Map<string, AccountUser>): AdminAccount => {
    const user = userMap.get(dbAccount.user_id);
    const balanceInfo = formatAccountBalance(dbAccount.balance, dbAccount.account_type);
    
    return {
      ...dbAccount,
      user_email: user?.email || '',
      user_name: user?.full_name || user?.user_metadata?.full_name || 'Unknown User',
      user_avatar: user?.avatar_url || user?.user_metadata?.avatar_url,
      user_full_name: user?.full_name || user?.user_metadata?.full_name,
      display_balance: balanceInfo.display,
      balance_class: balanceInfo.class,
      type_icon: getAccountTypeIcon(dbAccount.account_type),
      currency: dbAccount.currency || 'PHP'
    };
  }, [formatAccountBalance, getAccountTypeIcon]);

  /**
   * Fetch all users for account assignment
   */
  const fetchUsers = useCallback(async (): Promise<AccountUser[]> => {
    try {
      // Fetch all users from auth (exactly like transaction management)
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (error) throw error;

      // Transform to AccountUser format (matching transaction pattern)
      const transformedUsers: AccountUser[] = (data?.users || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        user_metadata: user.user_metadata || {},
        account_count: 0, // Will be calculated later if needed
        total_balance: 0,
        default_account_id: undefined
      }));

      return transformedUsers;

    } catch (error) {
      console.error("Error fetching users:", error);
      showErrorToast("Failed to fetch users");
      return [];
    }
  }, [showErrorToast]);

  /**
   * Calculate comprehensive account statistics
   */
  const calculateStats = useCallback((accountsData: AdminAccount[]): AccountStats => {
    const stats: AccountStats = {
      totalAccounts: accountsData.length,
      activeAccounts: 0,
      inactiveAccounts: 0,
      closedAccounts: 0,
      totalUsers: 0,
      usersWithAccounts: 0,
      totalBalance: 0,
      positiveBalance: 0,
      negativeBalance: 0,
      accountsByType: {},
      accountsByStatus: {},
      accountsByUser: {},
      balancesByType: {},
      newAccountsThisMonth: 0,
      newAccountsLastMonth: 0,
      growthPercentage: 0
    };

    const uniqueUsers = new Set<string>();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    accountsData.forEach(account => {
      // Basic counts
      uniqueUsers.add(account.user_id);
      
      // Status counts
      switch (account.status) {
        case 'active':
          stats.activeAccounts++;
          break;
        case 'inactive':
          stats.inactiveAccounts++;
          break;
        case 'closed':
          stats.closedAccounts++;
          break;
      }

      // Type distribution
      stats.accountsByType[account.account_type] = (stats.accountsByType[account.account_type] || 0) + 1;
      stats.accountsByStatus[account.status] = (stats.accountsByStatus[account.status] || 0) + 1;
      stats.accountsByUser[account.user_email] = (stats.accountsByUser[account.user_email] || 0) + 1;

      // Balance calculations (only for non-closed accounts)
      if (account.status !== 'closed') {
        stats.totalBalance += account.balance;
        stats.balancesByType[account.account_type] = (stats.balancesByType[account.account_type] || 0) + account.balance;
        
        if (account.balance >= 0) {
          stats.positiveBalance += account.balance;
        } else {
          stats.negativeBalance += Math.abs(account.balance);
        }
      }

      // Growth calculations
      if (account.created_at) {
        const createdDate = new Date(account.created_at);
        const createdMonth = createdDate.getMonth();
        const createdYear = createdDate.getFullYear();

        if (createdYear === currentYear && createdMonth === currentMonth) {
          stats.newAccountsThisMonth++;
        } else if (createdYear === lastMonthYear && createdMonth === lastMonth) {
          stats.newAccountsLastMonth++;
        }
      }
    });

    stats.totalUsers = uniqueUsers.size;
    stats.usersWithAccounts = uniqueUsers.size;

    // Calculate growth percentage
    if (stats.newAccountsLastMonth > 0) {
      stats.growthPercentage = ((stats.newAccountsThisMonth - stats.newAccountsLastMonth) / stats.newAccountsLastMonth) * 100;
    } else if (stats.newAccountsThisMonth > 0) {
      stats.growthPercentage = 100;
    }

    return stats;
  }, []);

  /**
   * Fetch accounts with filtering and pagination
   */
  const fetchAccounts = useCallback(async (filters: AccountFilters, usersData?: AccountUser[]) => {
    try {
      setLoading(true);
      setError(null);

      // Ensure we have users data
      const currentUsers = usersData || users;
      if (currentUsers.length === 0) {
        const freshUsers = await fetchUsers();
        setUsers(freshUsers);
      }

      // Build query for accounts (no join to avoid foreign key issues)
      let query = supabaseAdmin
        .from("accounts")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.searchTerm) {
        query = query.or(`account_name.ilike.%${filters.searchTerm}%,institution_name.ilike.%${filters.searchTerm}%`);
      }

      if (filters.filterUser && filters.filterUser !== "all") {
        query = query.eq("user_id", filters.filterUser);
      }

      if (filters.filterType && filters.filterType !== "all") {
        query = query.eq("account_type", filters.filterType);
      }

      if (filters.filterStatus && filters.filterStatus !== "all") {
        query = query.eq("status", filters.filterStatus);
      }

      if (filters.filterDefault && filters.filterDefault !== "all") {
        query = query.eq("is_default", filters.filterDefault === "default");
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      if (filters.balanceMin !== undefined) {
        query = query.gte("balance", filters.balanceMin);
      }

      if (filters.balanceMax !== undefined) {
        query = query.lte("balance", filters.balanceMax);
      }

      // Apply sorting
      const sortBy = filters.sortField || "created_at";
      const sortOrder = filters.sortDirection || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Apply pagination
      const currentPage = filters.currentPage || 1;
      const pageSize = filters.pageSize || 10;
      const startIndex = (currentPage - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Use transaction management pattern - fetch all users via auth
      let allUsers: AccountUser[] = [];
      if (usersData && usersData.length > 0) {
        allUsers = usersData;
      } else {
        allUsers = await fetchUsers();
        setUsers(allUsers);
      }

      // Create user map for efficient lookup (simple approach like transactions)
      const userMap = new Map<string, AccountUser>();
      allUsers.forEach(user => {
        userMap.set(user.id, user);
      });

      // Transform accounts with user data
      const transformedAccounts: AdminAccount[] = (data || []).map(account => {
        return transformToAdminAccount(account, userMap);
      });

      setAccounts(transformedAccounts);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));

      // Calculate and update statistics
      const allAccountsStats = calculateStats(transformedAccounts);
      setStats(allAccountsStats);

    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch accounts");
      showErrorToast("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, transformToAdminAccount, calculateStats, showErrorToast]);

  /**
   * Create a new account
   */
  const createAccount = useCallback(async (accountData: AccountFormData): Promise<boolean> => {
    try {
      const result = await AccountService.createAccount({
        user_id: accountData.user_id,
        account_name: accountData.account_name,
        account_type: accountData.account_type,
        balance: accountData.balance,
        initial_balance: accountData.initial_balance || accountData.balance,
        currency: accountData.currency || 'PHP',
        status: accountData.status,
        is_default: accountData.is_default,
        description: accountData.description,
        institution_name: accountData.institution_name,
        account_number_masked: accountData.account_number_masked,
        color: accountData.color
      });

      if (result.success) {
        showSuccessToast("Account created successfully");
        return true;
      } else {
        showErrorToast(result.error || "Failed to create account");
        return false;
      }
    } catch (error) {
      console.error("Error creating account:", error);
      showErrorToast("Failed to create account");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  /**
   * Update an existing account
   */
  const updateAccount = useCallback(async (accountId: string, accountData: Partial<AccountFormData>): Promise<boolean> => {
    try {
      const result = await AccountService.updateAccount(accountId, {
        ...accountData,
        currency: accountData.currency || 'PHP'
      } as any, accountData.user_id || '');

      if (result.success) {
        showSuccessToast("Account updated successfully");
        return true;
      } else {
        showErrorToast(result.error || "Failed to update account");
        return false;
      }
    } catch (error) {
      console.error("Error updating account:", error);
      showErrorToast("Failed to update account");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  /**
   * Delete an account
   */
  const deleteAccount = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      const result = await AccountService.deleteAccount(accountId, 'admin');

      if (result.success) {
        showSuccessToast("Account deleted successfully");
        return true;
      } else {
        showErrorToast(result.error || "Failed to delete account");
        return false;
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      showErrorToast("Failed to delete account");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  /**
   * Set an account as default
   */
  const setDefaultAccount = useCallback(async (accountId: string, userId: string): Promise<boolean> => {
    try {
      const result = await AccountService.setDefaultAccount(accountId, userId);

      if (result.success) {
        showSuccessToast("Default account updated successfully");
        return true;
      } else {
        showErrorToast(result.error || "Failed to update default account");
        return false;
      }
    } catch (error) {
      console.error("Error setting default account:", error);
      showErrorToast("Failed to update default account");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async (filters?: AccountFilters) => {
    const freshUsers = await fetchUsers();
    setUsers(freshUsers);
    
    if (filters) {
      await fetchAccounts(filters, freshUsers);
    }
  }, [fetchUsers, fetchAccounts]);

  /**
   * Initialize real-time subscriptions
   */
  useEffect(() => {
    // Subscribe to account changes
    channelRef.current = supabaseAdmin
      .channel('admin-accounts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'accounts'
      }, (payload) => {
        console.log('Account change detected:', payload);
        // Refresh data when changes occur
        // This will be triggered by the parent component
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
      }
    };
  }, []);

  /**
   * Load initial data on mount
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        // First load users
        const usersData = await fetchUsers();
        setUsers(usersData);
        
        // Then load accounts with initial filters
        const initialFilters: AccountFilters = {
          searchTerm: "",
          filterUser: "all",
          filterType: "all",
          filterStatus: "all",
          filterDefault: "all",
          sortField: "created_at",
          sortDirection: "desc",
          currentPage: 1,
          pageSize: 10
        };
        
        await fetchAccounts(initialFilters, usersData);
      } catch (error) {
        console.error('Error initializing account data:', error);
        setError(error instanceof Error ? error.message : "Failed to initialize data");
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchUsers, fetchAccounts]);

  // Memoize users array to prevent unnecessary re-renders
  const memoizedUsers = useMemo(() => users, [users.length, JSON.stringify(users.map(u => u.id))]);

  return {
    // Data
    accounts,
    users: memoizedUsers,
    stats,
    
    // State
    loading,
    error,
    totalPages,
    totalItems,
    
    // Actions
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    refreshData,
    
    // Utilities
    getAccountTypeIcon,
    formatAccountBalance
  };
};
