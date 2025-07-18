import React, { useState, useEffect, ChangeEvent, useTransition, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
} from "../../../utils/helpers";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { Transaction } from "../../../types";

// Import any necessary CSS
import "../admin.css";

// Interface for Supabase transaction data
interface SupabaseTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  goal_id?: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

// Interface for user profile
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

// Interface for account
interface Account {
  id: string;
  account_name: string;
  account_type: string;
  user_id: string;
}

// Interface for category
interface Category {
  id: string;
  category_name: string;
  type: "income" | "expense";
  user_id: string;
}

const AdminTransactions: React.FC = () => {
  // Add useTransition hook
  const [isPending, startTransition] = useTransition();
  
  // State for transactions data
  const [transactions, setTransactions] = useState<SupabaseTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SupabaseTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false); // Add state to track initial data load
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const { showSuccessToast, showErrorToast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  // Real-time subscription state
  const [subscription, setSubscription] = useState<any>(null);
  
  // Data for lookup tables
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<{
    income: Category[],
    expense: Category[]
  }>({
    income: [],
    expense: []
  });

  // State for summary data
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    avgTransactionAmount: 0,
    transactionsByType: {
      income: 0,
      expense: 0
    }
  });

  // Set up filter state
  const [filter, setFilter] = useState({
    type: "all",
    user: "all",
    account: "all",
    category: "all",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    search: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc"
  });

  // Initial data loading
  useEffect(() => {
    // Use a function to initialize data that doesn't cause suspension
    const initializeData = async () => {
      setLoading(true);
      try {
        // First load the lookup data
        await fetchLookupData();
        // Then load transactions
        await fetchTransactions();
        // Mark data as loaded when both operations complete
        setDataLoaded(true);
      } catch (error) {
        console.error("Error initializing data:", error);
        showErrorToast("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    // Start the data loading process
    initializeData();

    // Set up subscription
    const channel = supabaseAdmin.channel('admin-transactions-channel');
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        () => {
          // Use startTransition for real-time updates
          startTransition(() => {
            fetchTransactions();
          });
        }
      )
      .subscribe();
    
    setSubscription(channel);
    
    // Cleanup on unmount
    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, []);

  // Handle filter/pagination changes
  useEffect(() => {
    // Skip this effect on initial render
    if (!dataLoaded) return;
    
    // Use startTransition for subsequent filter/pagination updates
    startTransition(() => {
      fetchTransactions();
    });
  }, [dataLoaded, currentPage, pageSize, filter]);

  // Apply filters when filter state changes
  useEffect(() => {
    if (!transactions.length || !dataLoaded) return;
    
    setIsFiltering(true);
    
    startTransition(() => {
      let result = [...transactions];
      
      // Filter by type
      if (filter.type !== "all") {
        result = result.filter(tx => tx.type === filter.type);
      }
      
      // Filter by user
      if (filter.user !== "all") {
        result = result.filter(tx => tx.user_id === filter.user);
      }
      
      // Filter by account
      if (filter.account !== "all") {
        result = result.filter(tx => tx.account_id.toString() === filter.account);
      }
      
      // Filter by category
      if (filter.category !== "all") {
        result = result.filter(tx => tx.category_id?.toString() === filter.category);
      }
      
      // Filter by date range
      if (filter.startDate) {
        result = result.filter(tx => new Date(tx.date) >= new Date(filter.startDate));
      }
      
      if (filter.endDate) {
        result = result.filter(tx => new Date(tx.date) <= new Date(filter.endDate));
      }
      
      // Filter by amount range
      if (filter.minAmount) {
        result = result.filter(tx => tx.amount >= parseFloat(filter.minAmount));
      }
      
      if (filter.maxAmount) {
        result = result.filter(tx => tx.amount <= parseFloat(filter.maxAmount));
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(tx => 
          tx.notes.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort results
      result = sortTransactions(result, filter.sortBy);
      
      setFilteredTransactions(result);
      calculateSummary(result);
      setIsFiltering(false);
    });
  }, [filter, transactions, dataLoaded]);

  // Fetch lookup data (users, accounts, categories)
  const fetchLookupData = async () => {
    try {
      // Fetch all user profiles for displaying names
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email');
      
      if (profilesError) {
        throw profilesError;
      }
      
      // Create a map of user profiles by ID for quick access
      const profilesMap: {[key: string]: UserProfile} = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || 'No Email'
        };
      });
      
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select('id, account_name, account_type, user_id');
      
      if (accountsError) {
        throw accountsError;
      }
      
      // Fetch income categories
      const { data: incomeData, error: incomeError } = await supabaseAdmin
        .from('income_categories')
        .select('id, category_name, user_id');
      
      if (incomeError) {
        throw incomeError;
      }
      
      // Fetch expense categories
      const { data: expenseData, error: expenseError } = await supabaseAdmin
        .from('expense_categories')
        .select('id, category_name, user_id');
      
      if (expenseError) {
        throw expenseError;
      }
      
      // Update all states at once to avoid multiple re-renders
      setUserProfiles(profilesMap);
      setAccounts(accountsData || []);
      setCategories({
        income: incomeData?.map(cat => ({...cat, type: 'income' as const})) || [],
        expense: expenseData?.map(cat => ({...cat, type: 'expense' as const})) || []
      });
      
    } catch (error) {
      console.error("Error fetching lookup data:", error);
      throw error; // Propagate error to be handled by caller
    }
  };

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      applyFiltersToQuery(countQuery);
      
      // Get total count with filters applied
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }
      
      // Construct query for transactions with all data
      let dataQuery = supabaseAdmin
        .from('transactions')
        .select('*');
      
      // Apply sorting
      dataQuery = dataQuery.order(filter.sortBy, { ascending: filter.sortOrder === 'asc' });
      
      // Apply same filters to main query
      applyFiltersToQuery(dataQuery);
      
      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Final query with pagination
      const { data: transactionData, error: transactionError } = await dataQuery
        .range(from, to);
      
      if (transactionError) {
        throw transactionError;
      }
      
      // Store data
      const txData = transactionData || [];
      
      // Update state
      setTransactions(txData);
      setFilteredTransactions(txData);
      
      // Calculate summary data
      calculateSummary(txData);
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.max(1, Math.ceil((totalCount || 0) / pageSize)));
      
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error; // Propagate error to be handled by caller
    }
  };
  
  // Helper function to apply filters to a query
  const applyFiltersToQuery = (query: any) => {
    // Filter by type
    if (filter.type !== "all") {
      query = query.eq('type', filter.type);
    }
    
    // Filter by user
    if (filter.user !== "all") {
      query = query.eq('user_id', filter.user);
    }
    
    // Filter by account
    if (filter.account !== "all") {
      query = query.eq('account_id', filter.account);
    }
    
    // Filter by category
    if (filter.category !== "all") {
      query = query.eq('category_id', filter.category);
    }
    
    // Filter by date range
    if (filter.startDate) {
      query = query.gte('date', filter.startDate);
    }
    
    if (filter.endDate) {
      query = query.lte('date', filter.endDate);
    }
    
    // Filter by amount range
    if (filter.minAmount) {
      query = query.gte('amount', parseFloat(filter.minAmount));
    }
    
    if (filter.maxAmount) {
      query = query.lte('amount', parseFloat(filter.maxAmount));
    }
    
    // Filter by search term
    if (filter.search) {
      query = query.ilike('notes', `%${filter.search}%`);
    }
    
    return query;
  };

  // Function to calculate transaction summary
  const calculateSummary = (txList: SupabaseTransaction[]) => {
    if (!txList || txList.length === 0) {
      setSummary({
        totalTransactions: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0,
        avgTransactionAmount: 0,
        transactionsByType: {
          income: 0,
          expense: 0
        }
      });
      return;
    }
    
    const totalIncome = txList.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = txList.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const incomeCount = txList.filter(tx => tx.type === 'income').length;
    const expenseCount = txList.filter(tx => tx.type === 'expense').length;
    
    setSummary({
      totalTransactions: txList.length,
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      avgTransactionAmount: txList.length > 0 ? txList.reduce((sum, tx) => sum + tx.amount, 0) / txList.length : 0,
      transactionsByType: {
        income: incomeCount,
        expense: expenseCount
      }
    });
  };

  // Function to sort transactions
  const sortTransactions = (txToSort: SupabaseTransaction[], sortBy: string): SupabaseTransaction[] => {
    switch(sortBy) {
      case "date":
        return [...txToSort].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "date-asc":
        return [...txToSort].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "amount":
        return [...txToSort].sort((a, b) => b.amount - a.amount);
      case "amount-asc":
        return [...txToSort].sort((a, b) => a.amount - b.amount);
      default:
        return txToSort;
    }
  };

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    // Use startTransition to avoid suspense during synchronous updates
    startTransition(() => {
      setFilter((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    });
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    startTransition(() => {
      setFilter({
        type: "all",
        user: "all",
        account: "all",
        category: "all",
        startDate: "",
        endDate: "",
        minAmount: "",
        maxAmount: "",
        search: "",
        sortBy: "date",
        sortOrder: "desc"
      });
    });
  };

  // Handle transaction deletion
  const handleDeleteClick = (transactionId: string): void => {
    setSelectedTransactionId(transactionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (selectedTransactionId) {
      try {
        setLoading(true);
        
        // Get transaction details before deleting
        const { data: transactionData, error: fetchError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('id', selectedTransactionId)
          .single();
          
        if (fetchError) throw fetchError;
        
        if (!transactionData) {
          throw new Error("Transaction not found");
        }
        
        // Delete the transaction
        const { error: deleteError } = await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('id', selectedTransactionId);
        
        if (deleteError) throw deleteError;
        
        // Update account balance if needed
        // For income, subtract from balance; for expenses, add to balance
        const balanceChange = transactionData.type === 'income' ? -transactionData.amount : transactionData.amount;
        
        // Update account balance
        const { error: accountError } = await supabaseAdmin.rpc('update_account_balance', { 
          p_account_id: transactionData.account_id,
          p_amount_change: balanceChange
        });
        
        if (accountError) {
          console.warn("Error updating account balance:", accountError);
          // Continue anyway as this is a secondary operation
        }
      
        // Close modal
        setShowDeleteModal(false);
        setSelectedTransactionId(null);
        
        // Show success message
        showSuccessToast("Transaction deleted successfully");
        
        // Refresh data
        startTransition(() => {
          fetchTransactions();
        });
      } catch (error: any) {
        console.error("Error deleting transaction:", error);
        showErrorToast(`Failed to delete transaction: ${error.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Get user name by ID
  const getUserNameById = (userId: string | number | undefined): string => {
    if (!userId) return 'Unknown User';
    
    // Check if we have user profiles loaded
    if (Object.keys(userProfiles).length > 0) {
      const profile = userProfiles[userId.toString()];
      return profile ? profile.full_name : 'Unknown User';
    }
    
    return 'Unknown User';
  };

  // Get account name by ID
  const getAccountNameById = (accountId: string | undefined): string => {
    if (!accountId) return 'Unknown Account';
    
    // Check if we have accounts loaded
    if (accounts.length > 0) {
      const account = accounts.find(a => a.id === accountId);
      return account ? account.account_name : 'Unknown Account';
    }
    
    return 'Unknown Account';
  };

  // Get category name by ID
  const getCategoryNameById = (categoryId: string | undefined, type: string): string => {
    if (!categoryId) return 'Uncategorized';
    
    // Check if we have categories loaded
    if (categories.income.length > 0 || categories.expense.length > 0) {
      if (type === 'income') {
        const category = categories.income.find(c => c.id === categoryId);
        return category ? category.category_name : 'Uncategorized';
      } else {
        const category = categories.expense.find(c => c.id === categoryId);
        return category ? category.category_name : 'Uncategorized';
      }
    }
    
    return 'Uncategorized';
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    startTransition(() => {
      setCurrentPage(page);
    });
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    startTransition(() => {
      setPageSize(newSize);
      setCurrentPage(1); // Reset to first page when changing page size
    });
  };

  // Manual refresh function
  const refreshTransactionData = async () => {
    setLoading(true);
    try {
      await fetchTransactions();
      await fetchLookupData();
      showSuccessToast("Transaction data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh transaction data");
      console.error("Error refreshing transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  // If still loading initial data, show a loading indicator
  if (loading) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Transactions</h2>
        <p className="admin-loader-subtitle">Please wait while we prepare your transaction history...</p>
      </div>
    );
  }

  // Return the component UI - wrap in Suspense
  return (
    <Suspense fallback={
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Transactions</h2>
        <p className="admin-loader-subtitle">Please wait while we prepare your transaction history...</p>
      </div>
    }>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Transaction Management</h1>
          <div>
            <button className="btn btn-sm btn-primary shadow-sm mr-2">
              <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Transactions
            </button>
            <Link to="/admin/transactions/add" className="btn btn-sm btn-success shadow-sm">
              <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Add Transaction
            </Link>
          </div>
        </div>

        {/* Show transition indicator */}
        {isPending && (
          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm mr-2" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <span>Updating data...</span>
            </div>
          </div>
        )}

        {/* Summary Stats Cards Row */}
        <div className="row">
          {/* Total Transactions Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Total Transactions
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {summary.totalTransactions}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-calendar fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Income Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-success shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                      Total Income
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {formatCurrency(summary.totalIncome)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Expenses Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-danger shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                      Total Expenses
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {formatCurrency(summary.totalExpenses)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Amount Card */}
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                      Net Amount
                    </div>
                    <div className={`h5 mb-0 font-weight-bold ${summary.netAmount >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(summary.netAmount)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-balance-scale fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Distribution Card */}
        <div className="row mb-4">
          <div className="col-lg-6">
            <div className="card shadow">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Transaction Type Distribution</h6>
              </div>
              <div className="card-body">
                {/* Income Distribution */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h4 className="small font-weight-bold">Income <span className="float-right">({summary.transactionsByType.income} transactions)</span></h4>
                    <span className="text-xs">{((summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress mb-4">
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${(summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100}%` }}
                      aria-valuenow={Number((summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                
                {/* Expense Distribution */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h4 className="small font-weight-bold">Expenses <span className="float-right">({summary.transactionsByType.expense} transactions)</span></h4>
                    <span className="text-xs">{((summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress mb-4">
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{ width: `${(summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100}%` }}
                      aria-valuenow={Number((summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>

                {/* Additional summary information */}
                <div className="mt-4">
                  <div className="row">
                    <div className="col-6">
                      <div className="small text-gray-500">Average Transaction Amount</div>
                      <div className="font-weight-bold">{formatCurrency(summary.avgTransactionAmount)}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-gray-500">Income to Expense Ratio</div>
                      <div className="font-weight-bold">
                        {summary.totalExpenses > 0 
                          ? formatPercentage(summary.totalIncome / summary.totalExpenses * 100) 
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Health Card */}
          <div className="col-lg-6">
            <div className="card shadow">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Financial Analysis</h6>
              </div>
              <div className="card-body">
                <div className="text-center mb-4">
                  <div className="position-relative" style={{ width: "160px", height: "160px", margin: "0 auto" }}>
                    {/* This would be a chart in a real implementation */}
                    <div 
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: `conic-gradient(#1cc88a ${summary.totalIncome > 0 ? (summary.netAmount / summary.totalIncome) * 100 : 0}%, #e74a3b 0%)`
                      }}
                    ></div>
                    <div 
                      style={{
                        position: "absolute",
                        top: "20%",
                        left: "20%",
                        width: "60%",
                        height: "60%",
                        borderRadius: "50%",
                        background: "white",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column"
                      }}
                    >
                      <div className="font-weight-bold text-gray-800" style={{ fontSize: "1.2rem" }}>
                        {summary.totalIncome > 0 
                          ? formatPercentage((summary.totalIncome - summary.totalExpenses) / summary.totalIncome * 100) 
                          : '0%'}
                      </div>
                      <div className="small text-gray-600">Savings Rate</div>
                    </div>
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-6 text-center">
                    <h4 className="small font-weight-bold">Income</h4>
                    <div className="h5 mb-0 font-weight-bold text-success">{formatCurrency(summary.totalIncome)}</div>
                  </div>
                  <div className="col-6 text-center">
                    <h4 className="small font-weight-bold">Expenses</h4>
                    <div className="h5 mb-0 font-weight-bold text-danger">{formatCurrency(summary.totalExpenses)}</div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <div className={`p-3 rounded ${summary.netAmount >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                    <h6 className="font-weight-bold mb-0">
                      {summary.netAmount >= 0 
                        ? `Net Positive: ${formatCurrency(summary.netAmount)}` 
                        : `Net Negative: ${formatCurrency(summary.netAmount)}`}
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary">Filter Transactions</h6>
            <button 
              onClick={resetFilters} 
              className="btn btn-sm btn-outline-primary"
              disabled={isPending}
            >
              <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
            </button>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3 mb-3">
                <label htmlFor="type" className="font-weight-bold text-gray-800">Type</label>
                <select
                  id="type"
                  name="type"
                  value={filter.type}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="user" className="font-weight-bold text-gray-800">User</label>
                <select
                  id="user"
                  name="user"
                  value={filter.user}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Users</option>
                  {Object.values(userProfiles).map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="account" className="font-weight-bold text-gray-800">Account</label>
                <select
                  id="account"
                  name="account"
                  value={filter.account}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.account_name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="category" className="font-weight-bold text-gray-800">Category</label>
                <select
                  id="category"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="all">All Categories</option>
                  <optgroup label="Income Categories">
                    {categories.income.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Expense Categories">
                    {categories.expense.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3 mb-3">
                <label htmlFor="startDate" className="font-weight-bold text-gray-800">From Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filter.startDate}
                  onChange={handleFilterChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="endDate" className="font-weight-bold text-gray-800">To Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filter.endDate}
                  onChange={handleFilterChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="minAmount" className="font-weight-bold text-gray-800">Min Amount</label>
                <input
                  type="number"
                  id="minAmount"
                  name="minAmount"
                  value={filter.minAmount}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="0"
                />
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="maxAmount" className="font-weight-bold text-gray-800">Max Amount</label>
                <input
                  type="number"
                  id="maxAmount"
                  name="maxAmount"
                  value={filter.maxAmount}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="0"
                />
              </div>

              <div className="col-md-9 mb-3">
                <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
                <div className="input-group">
                <input
                  type="text"
                  id="search"
                  name="search"
                  value={filter.search}
                  onChange={handleFilterChange}
                  placeholder="Search by description..."
                  className="form-control"
                />
                  <div className="input-group-append">
                    <button type="button" className="btn btn-primary" onClick={() => fetchTransactions()}>
                      <i className="fas fa-search"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-3 mb-3">
                <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
                <select
                  id="sortBy"
                  name="sortBy"
                  value={filter.sortBy}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="date">Date (newest first)</option>
                  <option value="date-asc">Date (oldest first)</option>
                  <option value="amount">Amount (highest first)</option>
                  <option value="amount-asc">Amount (lowest first)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card shadow mb-4">
              <div className="card-header py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-primary">All Transactions</h6>
              <div className="d-flex align-items-center">
                <div className="input-group input-group-sm mr-3" style={{ width: "auto" }}>
                  <div className="input-group-prepend">
                    <span 
                      className="input-group-text border-right-0" 
                      style={{
                        backgroundColor: "#e74a3b", 
                        color: "white", 
                        borderColor: "#e74a3b"
                      }}
                    >Show</span>
                  </div>
                  <select 
                    className="form-control form-control-sm border-left-0 border-right-0" 
                    style={{ width: "70px" }}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={isPending}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <div className="input-group-append">
                    <span 
                      className="input-group-text border-left-0" 
                      style={{
                        backgroundColor: "#e74a3b", 
                        color: "white", 
                        borderColor: "#e74a3b" 
                      }}
                    >entries</span>
                      </div>
                    </div>
                <button 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={refreshTransactionData}
                  disabled={isPending || loading}
                  title="Refresh Transaction Data"
                >
                  <i className={`fas ${isPending ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                </button>
                  </div>
                </div>
        </div>
        <div className="card-body">
          {isFiltering || isPending ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <p className="text-gray-600 mb-0">No transactions found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    return (
                      <tr key={transaction.id} className={transaction.type === 'income' ? 'table-success' : 'table-danger'}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{getUserNameById(transaction.user_id)}</td>
                        <td>
                          <span className={`badge badge-${transaction.type === 'income' ? 'success' : 'danger'} p-2`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="font-weight-bold">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>{getCategoryNameById(transaction.category_id, transaction.type)}</td>
                        <td>{getAccountNameById(transaction.account_id)}</td>
                        <td>
                          <Link to={`/admin/transactions/${transaction.id}`} className="text-primary">
                            {transaction.notes}
                          </Link>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link to={`/admin/transactions/${transaction.id}`} className="btn btn-sm btn-outline-primary mr-1" title="View">
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link to={`/admin/transactions/${transaction.id}/edit`} className="btn btn-sm btn-outline-warning mr-1" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(transaction.id.toString())} 
                              className="btn btn-sm btn-outline-danger" 
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
                <span className="text-muted">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalItems)} of{" "}
                  {totalItems} entries
                </span>
            </div>
              <nav>
                <ul className="pagination admin-pagination">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isPending}
                    >
                      <i className="fas fa-chevron-left"></i>
              </button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                    // Show pages around current page
                    let pageNumber: number;
                    if (totalPages <= 5) {
                      pageNumber = index + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + index;
                    } else {
                      pageNumber = currentPage - 2 + index;
                    }
                    
                    if (pageNumber <= totalPages) {
                    return (
                      <li
                        key={index}
                        className={`page-item ${pageNumber === currentPage ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    );
                    }
                    return null;
                  })}
                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isPending}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
                <p className="text-danger font-weight-bold">Note: This will also affect account balances and budgets.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete Transaction"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </Suspense>
  );
};

export default AdminTransactions; 