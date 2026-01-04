import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { Budget, Category, BudgetStats, BudgetUser, SupabaseBudget, BudgetFilters } from "./types";
import { RealtimeChannel } from "@supabase/supabase-js";

export const useBudgetData = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<BudgetUser[]>([]);
  const [stats, setStats] = useState<BudgetStats>({
    totalBudgets: 0,
    activeBudgets: 0,
    budgetCategories: 0,
    usersWithBudgets: 0,
    budgetsByCategory: {},
    budgetsByStatus: { active: 0, completed: 0, archived: 0 },
    budgetsByUser: {}
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  // Fetch users from Supabase (matching transaction pattern)
  const fetchUsers = useCallback(async (): Promise<BudgetUser[]> => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (error) throw error;

      const formattedUsers = (data?.users || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata || {}
      }));

      setUsers(formattedUsers);
      return formattedUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast("Failed to load users");
      return [];
    }
  }, [showErrorToast]);

  // Fetch categories from Supabase
  const fetchCategories = useCallback(async () => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      const { data: categoryData, error: categoryError } = await supabaseAdmin
        .from('expense_categories')
        .select('id, category_name, user_id')
        .order('category_name', { ascending: true });
        
      if (categoryError) {
        throw categoryError;
      }
      
      setCategories(categoryData || []);
    } catch (error) {
      showErrorToast("Failed to load categories");
    }
  }, [showErrorToast]);

  // Fetch budgets from Supabase
  const fetchBudgets = useCallback(async (filters: BudgetFilters) => {
    try {
      setLoading(true);
      
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      // Fetch users first and get the returned data directly
      const fetchedUsers = await fetchUsers();
      
      // Determine valid sort field
      let validSortField = "created_at";
      
      try {
        const { data: sampleBudget, error: sampleError } = await supabaseAdmin
          .from('budgets')
          .select('*')
          .limit(1)
          .single();
          
        if (!sampleError && sampleBudget) {
          const availableFields = Object.keys(sampleBudget);
          if (availableFields.includes(filters.sortField)) {
            validSortField = filters.sortField;
          }
        }
      } catch (err) {
        // Continue with default sort field
      }
      
      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('budgets')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      if (filters.filterCategory !== 'all') {
        countQuery = countQuery.eq('category_id', filters.filterCategory);
      }
      
      if (filters.filterStatus !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        if (filters.filterStatus === 'active') {
          countQuery = countQuery
            .lte('start_date', today)
            .gte('end_date', today);
        } else if (filters.filterStatus === 'completed') {
          countQuery = countQuery.lt('end_date', today);
        } else if (filters.filterStatus === 'archived') {
          countQuery = countQuery.gt('start_date', today);
        }
      }
      
      // Get total count with filters applied
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }
      
      // Construct query for budgets with all data
      let dataQuery = supabaseAdmin
        .from('budgets')
        .select('*, expense_categories(category_name)');
      
      // Apply sorting
      dataQuery = dataQuery.order(validSortField, { ascending: filters.sortDirection === 'asc' });
      
      // Apply same filters to main query
      if (filters.filterCategory !== 'all') {
        dataQuery = dataQuery.eq('category_id', filters.filterCategory);
      }
      
      if (filters.filterStatus !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        if (filters.filterStatus === 'active') {
          dataQuery = dataQuery
            .lte('start_date', today)
            .gte('end_date', today);
        } else if (filters.filterStatus === 'completed') {
          dataQuery = dataQuery.lt('end_date', today);
        } else if (filters.filterStatus === 'archived') {
          dataQuery = dataQuery.gt('start_date', today);
        }
      }
      
      if (filters.searchTerm) {
        // Search in multiple places: user profiles, categories, and budget names
        const searchTerm = filters.searchTerm.toLowerCase().trim();
        
        // Find matching user IDs from fetchedUsers array
        const matchingUserIds: string[] = [];
        fetchedUsers.forEach(user => {
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
          if (
            fullName.toLowerCase().includes(searchTerm) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
          ) {
            matchingUserIds.push(user.id);
          }
        });
        
        // Find matching categories
        const { data: matchingCategories, error: categorySearchError } = await supabaseAdmin
          .from('expense_categories')
          .select('id')
          .ilike('category_name', `%${searchTerm}%`);
          
        if (categorySearchError) {
          throw categorySearchError;
        }
        
        const matchingCategoryIds = matchingCategories?.map(c => c.id) || [];
        
        // Apply search filter using OR conditions
        if (matchingUserIds.length > 0 || matchingCategoryIds.length > 0) {
          if (matchingUserIds.length > 0) {
            dataQuery = dataQuery.in('user_id', matchingUserIds);
          } else if (matchingCategoryIds.length > 0) {
            dataQuery = dataQuery.in('category_id', matchingCategoryIds);
          } else {
            // No matches found, return empty result
            setBudgets([]);
            setStats({
              totalBudgets: 0,
              activeBudgets: 0,
              budgetCategories: 0,
              usersWithBudgets: 0,
              budgetsByCategory: {},
              budgetsByStatus: { active: 0, completed: 0, archived: 0 },
              budgetsByUser: {}
            });
            setTotalItems(0);
            setTotalPages(1);
            setLoading(false);
            return;
          }
        } else {
          // No matches found, return empty result
          setBudgets([]);
          setStats({
            totalBudgets: 0,
            activeBudgets: 0,
            budgetCategories: 0,
            usersWithBudgets: 0,
            budgetsByCategory: {},
            budgetsByStatus: { active: 0, completed: 0, archived: 0 },
            budgetsByUser: {}
          });
          setTotalItems(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }
      }
      
      // Apply pagination
      const from = (filters.currentPage - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      
      // Final query with pagination
      const { data: budgetData, error: budgetError } = await dataQuery
        .range(from, to);
      
      if (budgetError) {
        throw budgetError;
      }
      
      // Calculate statistics for charts
      const categoryStats: {[key: string]: number} = {};
      const statusStats: {[key: string]: number} = {
        active: 0,
        completed: 0,
        archived: 0
      };
      const userStats: {[key: string]: number} = {};
      
      // Process budget data to calculate spent amounts, status, etc.
      const processedBudgets: Budget[] = [];
      
      // Fetch all related transactions to calculate spent amounts
      const { data: transactions, error: transactionsError } = await supabaseAdmin
        .from('transactions')
        .select('amount, expense_category_id, type, date')
        .eq('type', 'expense');
        
      if (transactionsError) {
        throw transactionsError;
      }
      
      for (const budget of budgetData || []) {
        const categoryName = budget.expense_categories?.category_name || 'Uncategorized';
        const user = fetchedUsers.find(u => u.id === budget.user_id);
        
        // Calculate spent amount from transactions
        const startDate = new Date(budget.start_date);
        const endDate = new Date(budget.end_date);
        
        // Filter transactions that match this budget's category and date range
        const budgetTransactions = transactions?.filter(tx => 
          tx.expense_category_id === budget.category_id && 
          tx.type === 'expense' &&
          new Date(tx.date) >= startDate && 
          new Date(tx.date) <= endDate
        ) || [];
        
        // Sum up transactions
        const spent = budgetTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        
        // Determine budget status
        let status: "active" | "completed" | "archived";
        const today = new Date();
        
        if (today < startDate) {
          status = "archived"; // Future budget
        } else if (today > endDate) {
          status = "completed"; // Past budget
        } else {
          status = "active"; // Current budget
        }
        
        // Extract month and year for display
        const month = new Date(budget.start_date).toLocaleString('default', { month: 'long' });
        const year = new Date(budget.start_date).getFullYear();
        
        // Create processed budget object (using transaction pattern for user data)
        const processedBudget: Budget = {
          id: budget.id,
          name: `${categoryName} Budget`,
          amount: budget.amount,
          spent,
          start_date: budget.start_date,
          end_date: budget.end_date,
          category: categoryName,
          category_id: budget.category_id,
          user_id: budget.user_id,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User',
          user_email: user?.email || '',
          user_avatar: user?.user_metadata?.avatar_url || '',
          status,
          month,
          year,
          period: budget.period || 'month',
          remaining,
          percentage
        };
        
        processedBudgets.push(processedBudget);
      
        // Update statistics
        if (categoryName in categoryStats) {
          categoryStats[categoryName] += 1;
        } else {
          categoryStats[categoryName] = 1;
        }
        
        statusStats[status] += 1;
        
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User';
        if (userName in userStats) {
          userStats[userName] += 1;
        } else {
          userStats[userName] = 1;
        }
      }
      
      // Set state with processed data
      setBudgets(processedBudgets);
      setStats({
        totalBudgets: totalCount || 0,
        activeBudgets: statusStats.active,
        budgetCategories: Object.keys(categoryStats).length,
        usersWithBudgets: Object.keys(userStats).length,
        budgetsByCategory: categoryStats,
        budgetsByStatus: statusStats,
        budgetsByUser: userStats
      });
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.ceil((totalCount || 0) / filters.pageSize));
      
      setLoading(false);
    } catch (error) {
      showErrorToast(`Failed to load budgets: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      setLoading(false);
    }
  }, [showErrorToast]);

  // Manual refresh function
  const refreshBudgetData = useCallback(async (filters: BudgetFilters) => {
    setLoading(true);
    try {
      await fetchUsers();
      await fetchBudgets(filters);
      await fetchCategories();
      showSuccessToast("Budget data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh budget data");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, fetchBudgets, fetchCategories, showSuccessToast, showErrorToast]);

  // Handle budget status change
  const changeBudgetStatus = useCallback(async (budget: Budget, newStatus: "active" | "completed" | "archived") => {
    try {
      setLoading(true);
      
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      // Update budget status in Supabase
      const { error } = await supabaseAdmin
        .from('budgets')
        .update({ status: newStatus })
        .eq('id', budget.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setBudgets(prevBudgets => 
        prevBudgets.map(b => 
          b.id === budget.id ? { ...b, status: newStatus } : b
        )
      );
      
      showSuccessToast(`Budget status updated to ${newStatus}`);
      setLoading(false);
    } catch (error) {
      showErrorToast("Failed to update budget status");
      setLoading(false);
    }
  }, [showSuccessToast, showErrorToast]);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        return;
      }
      
      channel = supabaseAdmin.channel('admin-budgets-channel');
      
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'budgets' }, 
          () => {
            // Note: We can't call fetchBudgets here without filters
            // This will be handled by the component that uses this hook
          }
        )
        .subscribe();
      
      setSubscription(channel);
    } catch (error) {
      console.error("Error setting up real-time subscriptions:", error);
    }
    
    // Cleanup function
    return () => {
      if (channel && supabaseAdmin) {
        try {
          supabaseAdmin.removeChannel(channel);
        } catch (cleanupError) {
          console.error("Error cleaning up channel:", cleanupError);
        }
      }
    };
  }, []);

  // Clean up subscription when component unmounts
  useEffect(() => {
    return () => {
      if (subscription && supabaseAdmin) {
        try {
          supabaseAdmin.removeChannel(subscription);
        } catch (error) {
          console.error("Error removing channel on unmount:", error);
        }
      }
    };
  }, [subscription]);

  return {
    budgets,
    categories,
    users,
    stats,
    loading,
    totalPages,
    totalItems,
    fetchBudgets,
    fetchCategories,
    fetchUsers,
    refreshBudgetData,
    changeBudgetStatus
  };
};