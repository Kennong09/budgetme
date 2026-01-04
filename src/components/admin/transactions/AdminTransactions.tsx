import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { formatCurrency, formatDate, truncateNumber, formatCurrencyTruncated } from "../../../utils/helpers";
import { 
  AdminTransaction, 
  TransactionSummary, 
  TransactionFilters,
  TransactionUser,
  TransactionAccount,
  TransactionCategory
} from "./types";
import AddTransactionModal from "./AddTransactionModal";
import ViewTransactionModal from "./ViewTransactionModal";
import EditTransactionModal from "./EditTransactionModal";
import DeleteTransactionModal from "./DeleteTransactionModal";

// Stats Card Detail Modal Component
interface StatsDetailModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  color: string;
  icon: string;
  data: {
    label: string;
    value: string | number;
    subLabel?: string;
  }[];
}

const StatsDetailModal: React.FC<StatsDetailModalProps> = ({ show, onClose, title, color, icon, data }) => {
  if (!show) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        style={{ zIndex: 1050 }}
        onClick={onClose}
      >
        <div 
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg">
            {/* Modal Header */}
            <div className="modal-header bg-gradient-danger text-white border-0">
              <h5 className="modal-title d-flex align-items-center">
                <div className="modal-icon-container mr-3">
                  <i className={`fas ${icon}`}></i>
                </div>
                <div>
                  <div className="modal-title-main">{title}</div>
                  <div className="modal-subtitle">Detailed breakdown</div>
                </div>
              </h5>
              <button 
                type="button" 
                className="close text-white" 
                onClick={onClose}
                style={{ textShadow: 'none', opacity: 0.9 }}
              >
                <span>&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <div className="stats-breakdown-list">
                {data.map((item, index) => (
                  <div key={index} className="stats-breakdown-item d-flex justify-content-between align-items-center py-3 border-bottom">
                    <div>
                      <div className="font-weight-medium text-gray-800">{item.label}</div>
                      {item.subLabel && <small className="text-muted">{item.subLabel}</small>}
                    </div>
                    <span className={`badge badge-${color} badge-pill px-3 py-2`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light border-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="modal-footer-info">
                  <small className="text-muted">
                    <i className="fas fa-info-circle mr-1"></i>
                    Data reflects current statistics
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times mr-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Emoji to Font Awesome icon mapping (common financial/category icons)
const emojiToFontAwesome: Record<string, string> = {
  // Money & Finance
  '💰': 'fa-money-bill-wave',
  '💵': 'fa-dollar-sign',
  '💸': 'fa-hand-holding-usd',
  '🏦': 'fa-university',
  '💳': 'fa-credit-card',
  '📈': 'fa-chart-line',
  '📊': 'fa-chart-bar',
  '💲': 'fa-dollar-sign',
  '💱': 'fa-exchange-alt',
  '🏧': 'fa-credit-card',
  
  // Work & Business
  '💼': 'fa-briefcase',
  '🏢': 'fa-building',
  '👔': 'fa-user-tie',
  '📝': 'fa-pen',
  '📋': 'fa-clipboard',
  
  // Home & Living
  '🏠': 'fa-home',
  '🛋️': 'fa-couch',
  '🛏️': 'fa-bed',
  '🚿': 'fa-shower',
  '💡': 'fa-lightbulb',
  '🔌': 'fa-plug',
  '🧹': 'fa-broom',
  
  // Transportation
  '🚗': 'fa-car',
  '✈️': 'fa-plane',
  '🚌': 'fa-bus',
  '🚇': 'fa-subway',
  '🚕': 'fa-taxi',
  '🚲': 'fa-bicycle',
  '⛽': 'fa-gas-pump',
  '🚀': 'fa-rocket',
  
  // Food & Dining
  '🍔': 'fa-utensils',
  '🍕': 'fa-pizza-slice',
  '☕': 'fa-coffee',
  '🍺': 'fa-beer',
  '🍷': 'fa-wine-glass',
  '🛒': 'fa-shopping-cart',
  '🧺': 'fa-shopping-basket',
  
  // Health & Fitness
  '🏥': 'fa-hospital',
  '💊': 'fa-pills',
  '🏋️': 'fa-dumbbell',
  '💉': 'fa-syringe',
  '🩺': 'fa-stethoscope',
  '❤️': 'fa-heart',
  
  // Education & Learning
  '🎓': 'fa-graduation-cap',
  '📚': 'fa-book',
  '🏫': 'fa-school',
  
  // Technology
  '💻': 'fa-laptop',
  '📱': 'fa-mobile-alt',
  '🖥️': 'fa-desktop',
  '📺': 'fa-tv',
  '🎧': 'fa-headphones',
  '📷': 'fa-camera',
  '🌐': 'fa-globe',
  '📞': 'fa-phone',
  
  // Entertainment
  '🎬': 'fa-film',
  '🎮': 'fa-gamepad',
  '🎵': 'fa-music',
  '🎭': 'fa-theater-masks',
  '🎪': 'fa-ticket-alt',
  '🎨': 'fa-palette',
  
  // Sports & Recreation
  '⚽': 'fa-futbol',
  '🏀': 'fa-basketball-ball',
  '🎾': 'fa-table-tennis',
  '🏊': 'fa-swimmer',
  '🎿': 'fa-skiing',
  '🏆': 'fa-trophy',
  
  // Shopping & Fashion
  '👕': 'fa-tshirt',
  '👗': 'fa-female',
  '👟': 'fa-shoe-prints',
  '💄': 'fa-spa',
  '💍': 'fa-ring',
  '💎': 'fa-gem',
  '🎁': 'fa-gift',
  
  // Pets
  '🐕': 'fa-dog',
  '🐈': 'fa-cat',
  
  // Travel & Vacation
  '🏕️': 'fa-campground',
  '🏖️': 'fa-umbrella-beach',
  '🏨': 'fa-hotel',
  
  // Family & Kids
  '👶': 'fa-baby',
  '🎂': 'fa-birthday-cake',
  '🎉': 'fa-birthday-cake',
  
  // Utilities & Services
  '🔧': 'fa-wrench',
  '⚙️': 'fa-cogs',
  '🧰': 'fa-toolbox',
  '📦': 'fa-box',
  '🔒': 'fa-lock',
  '🛡️': 'fa-shield-alt',
  
  // Nature & Weather
  '☀️': 'fa-sun',
  '🌙': 'fa-moon',
  '🌧️': 'fa-cloud-rain',
  '❄️': 'fa-snowflake',
  '🔥': 'fa-fire',
  '💧': 'fa-tint',
  '🌱': 'fa-seedling',
  '🌴': 'fa-tree',
  
  // Goals & Achievements
  '🎯': 'fa-bullseye',
  '⭐': 'fa-star',
  '✅': 'fa-check-circle',
  
  // Misc
  '⚡': 'fa-bolt',
  '🔔': 'fa-bell',
  '📌': 'fa-thumbtack',
  '🗑️': 'fa-trash',
  '⚖️': 'fa-balance-scale',
};

// Function to convert emoji to Font Awesome class
const getCategoryIcon = (icon: string | undefined, transactionType: string): string => {
  if (!icon) {
    // Default icons based on transaction type
    if (transactionType === 'income') return 'fa-plus-circle';
    if (transactionType === 'expense') return 'fa-minus-circle';
    if (transactionType === 'contribution') return 'fa-flag';
    return 'fa-tag';
  }
  
  // If it's already a Font Awesome class, return it
  if (icon.startsWith('fa-')) return icon;
  
  // Try to map emoji to Font Awesome
  return emojiToFontAwesome[icon] || 'fa-tag';
};

// Function to get icon color based on transaction type
const getCategoryIconColor = (transactionType: string): string => {
  switch (transactionType) {
    case 'income': return 'text-success';
    case 'expense': return 'text-danger';
    case 'contribution': return 'text-info';
    default: return 'text-secondary';
  }
};

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface EnrichedTransaction extends AdminTransaction {
  user_name: string;
  user_email: string;
  user_avatar: string;
  account_name: string;
  account_type: string;
  category_name: string;
  category_icon: string;
  goal_name: string;
}

const AdminTransactions: React.FC = () => {
  const { showSuccessToast, showErrorToast } = useToast();
  
  // Main data state
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<TransactionAccount[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    avgTransactionAmount: 0,
    transactionsByType: { income: 0, expense: 0, contribution: 0 },
    monthlyTrend: { income: 0, expenses: 0, net: 0 }
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filter state
  const [filters, setFilters] = useState<TransactionFilters>({
    type: '',
    user: '',
    account: '',
    category: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransaction | null>(null);
  
  // Mobile dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    color: string;
    icon: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', color: '', icon: '', data: [] });

  const isMounted = useRef(true);

  // Mobile dropdown functions
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = (transactionId: string) => {
    setActiveDropdown(activeDropdown === transactionId ? null : transactionId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  // Load data on component mount
  useEffect(() => {
    fetchInitialData();
    
    return () => {
      isMounted.current = false;
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  // Enhanced error handling
  const handleError = useCallback((error: any, operation: string) => {
    console.error(`Error during ${operation}:`, error);
    
    let errorMessage = `Failed to ${operation}`;
    
    if (error?.message) {
      errorMessage += `: ${error.message}`;
    } else if (error?.code) {
      switch (error.code) {
        case 'PGRST116':
          errorMessage = 'No data found or access denied';
          break;
        case 'PGRST301':
          errorMessage = 'Database connection error';
          break;
        case '42501':
          errorMessage = 'Insufficient permissions to access this data';
          break;
        default:
          errorMessage += ` (Error code: ${error.code})`;
      }
    }
    
    showErrorToast(errorMessage);
  }, [showErrorToast]);

  // Reload transactions when filters or pagination changes
  useEffect(() => {
    if (users.length > 0) {
      fetchTransactions();
    }
  }, [currentPage, filters, users.length]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (filters.search !== '') {
      const timeout = setTimeout(() => {
        setCurrentPage(1);
        fetchTransactions();
      }, 500);
      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [filters.search]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchAccounts(),
        fetchCategories()
      ]);
    } catch (error: any) {
      handleError(error, 'load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('accounts')
        .select('id, account_name, account_type, user_id, status, balance, currency')
        .eq('status', 'active')
        .order('account_name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      const [incomeResult, expenseResult] = await Promise.all([
        supabaseAdmin
          .from('income_categories')
          .select('id, category_name, icon, user_id')
          .order('category_name'),
        supabaseAdmin
          .from('expense_categories') 
          .select('id, category_name, icon, user_id')
          .order('category_name')
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const allCategories = [
        ...(incomeResult.data || []).map(cat => ({ ...cat, type: 'income' as const })),
        ...(expenseResult.data || []).map(cat => ({ ...cat, type: 'expense' as const }))
      ];

      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  };

  const fetchAllTransactionsSummary = useCallback(async () => {
    try {
      // Get summary data from all transactions (not paginated)
      let summaryQuery = supabaseAdmin
        .from('transactions')
        .select('type, amount', { count: 'exact' });

      // Apply same filters as main query for accurate filtered summary
      if (filters.type) {
        summaryQuery = summaryQuery.eq('type', filters.type);
      }

      if (filters.user) {
        summaryQuery = summaryQuery.eq('user_id', filters.user);
      }

      if (filters.account) {
        summaryQuery = summaryQuery.eq('account_id', filters.account);
      }

      if (filters.startDate) {
        summaryQuery = summaryQuery.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        summaryQuery = summaryQuery.lte('date', filters.endDate);
      }

      if (filters.minAmount) {
        summaryQuery = summaryQuery.gte('amount', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        summaryQuery = summaryQuery.lte('amount', parseFloat(filters.maxAmount));
      }

      if (filters.search) {
        summaryQuery = summaryQuery.or(`notes.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data: summaryData, error: summaryError, count } = await summaryQuery;

      if (summaryError) throw summaryError;

      // Calculate summary from all matching transactions
      const income = (summaryData || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = (summaryData || [])
        .filter(t => t.type === 'expense' || t.type === 'contribution')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const typeCount = (summaryData || []).reduce((acc, t) => {
        acc[t.type as keyof typeof acc] = (acc[t.type as keyof typeof acc] || 0) + 1;
        return acc;
      }, { income: 0, expense: 0, contribution: 0 });

      setSummary({
        totalTransactions: count || 0,
        totalIncome: income,
        totalExpenses: expenses,
        netAmount: income - expenses,
        avgTransactionAmount: count && count > 0 ? (income + expenses) / count : 0,
        transactionsByType: typeCount,
        monthlyTrend: { income: 0, expenses: 0, net: 0 } // Could be enhanced with actual monthly data
      });

      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error: any) {
      handleError(error, 'load transaction summary');
    }
  }, [filters, itemsPerPage, handleError]);

  const fetchTransactions = useCallback(async () => {
    try {
      setRefreshing(true);

      // First get summary data
      await fetchAllTransactionsSummary();

      // Build query with basic transaction data first, then enrich with related data
      let query = supabaseAdmin
        .from('transactions')
        .select(`
          *,
          income_categories(
            id,
            category_name,
            icon
          ),
          expense_categories(
            id,
            category_name,
            icon
          ),
          goals(
            id,
            goal_name,
            target_amount,
            current_amount
          )
        `);

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.user) {
        query = query.eq('user_id', filters.user);
      }

      if (filters.account) {
        query = query.eq('account_id', filters.account);
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters.minAmount) {
        query = query.gte('amount', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        query = query.lte('amount', parseFloat(filters.maxAmount));
      }

      if (filters.search) {
        query = query.or(`notes.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const isAsc = filters.sortOrder === 'asc';
      query = query.order(filters.sortBy, { ascending: isAsc });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data: transactionsData, error } = await query;

      if (error) throw error;

      // Enrich transactions with user and account data
      const enrichedTransactions: EnrichedTransaction[] = (transactionsData || []).map((transaction: any) => {
        const user = users.find(u => u.id === transaction.user_id);
        
        // Handle category data from joins
        const incomeCategory = transaction.income_categories;
        const expenseCategory = transaction.expense_categories;
        const category = incomeCategory || expenseCategory;
        
        // Find account data from the accounts array we fetched earlier
        const accountData = accounts.find(acc => acc.id === transaction.account_id);
        
        // Determine category name and icon based on transaction type
        let categoryName = 'Uncategorized';
        let categoryIcon = '';
        
        if (transaction.type === 'contribution') {
          // For goal contributions, show "Goal Contribution" as category
          categoryName = 'Goal Contribution';
          categoryIcon = 'fa-flag';
        } else if (category) {
          categoryName = category.category_name;
          categoryIcon = category.icon || '';
        }
        
        return {
          ...transaction,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User',
          user_email: user?.email || '',
          user_avatar: user?.user_metadata?.avatar_url || '',
          account_name: accountData?.account_name || '',
          account_type: accountData?.account_type || '',
          category_id: transaction.income_category_id || transaction.expense_category_id || '',
          category_name: categoryName,
          category_icon: categoryIcon,
          goal_name: transaction.goals?.goal_name || '',
          notes: transaction.notes || transaction.description || ''
        } as EnrichedTransaction;
      });

      setTransactions(enrichedTransactions);
      setLastUpdated(new Date());

    } catch (error: any) {
      handleError(error, 'load transactions');
    } finally {
      setRefreshing(false);
    }
  }, [currentPage, filters, itemsPerPage, users, handleError, fetchAllTransactionsSummary]);

  // Skeleton loading component matching dashboard design
  const TransactionsSkeleton = () => (
    <div className="modern-user-management">
      {/* Mobile Loading State */}
      <div className="block md:hidden py-12 animate__animated animate__fadeIn">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-3 text-xs text-gray-500 font-medium">Loading transactions...</p>
        </div>
      </div>

      {/* Desktop Loading State */}
      <div className="hidden md:block">
      {/* Header Skeleton */}
      <div className="user-management-header mb-5">
        <div className="skeleton-line skeleton-header-title mb-2"></div>
        <div className="skeleton-line skeleton-header-subtitle"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="stats-cards-container mb-5">
        <div className="row">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="col-xl-3 col-md-6 mb-3">
              <div className="user-stat-card admin-card-loading">
                <div className="stat-content">
                  <div className="skeleton-icon mr-3"></div>
                  <div className="stat-info">
                    <div className="skeleton-line skeleton-stat-value mb-2"></div>
                    <div className="skeleton-line skeleton-stat-title"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Skeleton */}
      <div className="controls-section mb-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="skeleton-line skeleton-section-title"></div>
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="table-section">
        <div className="card shadow">
          <div className="card-header py-3">
            <div className="skeleton-line skeleton-section-title"></div>
          </div>
          <div className="card-body p-0">
            <div className="skeleton-table">
              <div className="skeleton-table-header mb-3"></div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton-table-row mb-2">
                  <div className="skeleton-line skeleton-table-cell"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  const handleRefresh = async () => {
    await fetchTransactions();
    showSuccessToast('Transactions refreshed');
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      user: '',
      account: '',
      category: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const handleViewTransaction = (transaction: AdminTransaction) => {
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  };

  const handleEditTransaction = (transaction: AdminTransaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDeleteTransaction = (transaction: AdminTransaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
  };

  const handleTransactionUpdated = useCallback((updatedTransaction: AdminTransaction) => {
    // Optimistic update
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? { ...t, ...updatedTransaction } : t)
    );
    // Refresh to get accurate data and summary
    fetchTransactions();
    showSuccessToast('Transaction updated successfully');
  }, [fetchTransactions, showSuccessToast]);

  const handleTransactionDeleted = useCallback((transactionId: string) => {
    // Optimistic update
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    // Refresh summary and pagination
    fetchTransactions();
    showSuccessToast('Transaction deleted successfully');
  }, [fetchTransactions, showSuccessToast]);

  const handleTransactionAdded = useCallback(() => {
    // Refresh to get new transaction and updated summary
    fetchTransactions();
    showSuccessToast('Transaction added successfully');
  }, [fetchTransactions, showSuccessToast]);

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'income':
        return {
          label: 'Income',
          color: 'success',
          icon: 'fa-plus-circle',
          bgClass: 'bg-success'
        };
      case 'expense':
        return {
          label: 'Expense',
          color: 'danger',
          icon: 'fa-minus-circle',
          bgClass: 'bg-danger'
        };
      case 'contribution':
        return {
          label: 'Contribution',
          color: 'info',
          icon: 'fa-flag',
          bgClass: 'bg-info'
        };
      default:
        return {
          label: 'Unknown',
          color: 'secondary',
          icon: 'fa-question',
          bgClass: 'bg-secondary'
        };
    }
  };

  const formatUserName = (transaction: AdminTransaction) => {
    if (transaction.user_name) {
      return transaction.user_name;
    }
    if (transaction.user_email) {
      return transaction.user_email.split('@')[0];
    }
    return 'Unknown User';
  };

  // Memoized filtered options for dropdowns
  const filteredAccounts = useMemo(() => {
    if (!filters.user) return accounts;
    return accounts.filter(account => account.user_id === filters.user);
  }, [accounts, filters.user]);

  const filteredCategories = useMemo(() => {
    if (!filters.user && !filters.type) return categories;
    let filtered = categories;
    
    if (filters.user) {
      filtered = filtered.filter(cat => cat.user_id === filters.user);
    }
    
    if (filters.type && filters.type !== 'contribution') {
      filtered = filtered.filter(cat => cat.type === filters.type);
    }
    
    return filtered;
  }, [categories, filters.user, filters.type]);

  // Loading state
  if (loading) {
    return (
      <div className="modern-user-management">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading transactions...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
        {/* Header Skeleton */}
        <div className="user-management-header mb-5">
          <div className="skeleton-line skeleton-header-title mb-2"></div>
          <div className="skeleton-line skeleton-header-subtitle"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="stats-cards-container mb-5">
          <div className="row">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-xl-3 col-md-6 mb-3">
                <div className="user-stat-card admin-card-loading">
                  <div className="stat-content">
                    <div className="skeleton-icon mr-3"></div>
                    <div className="stat-info">
                      <div className="skeleton-line skeleton-stat-value mb-2"></div>
                      <div className="skeleton-line skeleton-stat-title"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="controls-section mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="skeleton-line skeleton-section-title"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="table-section">
          <div className="card shadow">
            <div className="card-header py-3">
              <div className="skeleton-line skeleton-section-title"></div>
            </div>
            <div className="card-body p-0">
              <div className="skeleton-table">
                <div className="skeleton-table-header mb-3"></div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="skeleton-table-row mb-2">
                    <div className="skeleton-line skeleton-table-cell"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Transactions</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${refreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Add transaction"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-exchange-alt"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Transaction Management</h1>
                <p className="header-subtitle mb-0">
                  Monitor and manage financial transactions across all user accounts
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Dashboard Style */}
      <div className="stats-section mb-5">
        {(() => {
          const incomeCount = summary.transactionsByType.income || 0;
          const expenseCount = summary.transactionsByType.expense || 0;
          const contributionCount = summary.transactionsByType.contribution || 0;
          const totalTxns = summary.totalTransactions || 0;
          const incomePercentage = totalTxns > 0 ? ((incomeCount / totalTxns) * 100).toFixed(1) : 0;
          const expensePercentage = totalTxns > 0 ? ((expenseCount / totalTxns) * 100).toFixed(1) : 0;
          const contributionPercentage = totalTxns > 0 ? ((contributionCount / totalTxns) * 100).toFixed(1) : 0;
          const avgAmount = summary.avgTransactionAmount || 0;

          const openTotalTransactionsModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Transactions Breakdown',
              color: 'danger',
              icon: 'fa-exchange-alt',
              data: [
                { label: 'Total Transactions', value: totalTxns.toLocaleString() },
                { label: 'Income Transactions', value: incomeCount.toLocaleString(), subLabel: `${incomePercentage}% of total` },
                { label: 'Expense Transactions', value: expenseCount.toLocaleString(), subLabel: `${expensePercentage}% of total` },
                { label: 'Goal Contributions', value: contributionCount.toLocaleString(), subLabel: `${contributionPercentage}% of total` },
                { label: 'Average Amount', value: formatCurrency(avgAmount) },
              ]
            });
          };

          const openIncomeModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Income Breakdown',
              color: 'success',
              icon: 'fa-plus-circle',
              data: [
                { label: 'Total Income', value: formatCurrency(summary.totalIncome) },
                { label: 'Income Transactions', value: incomeCount.toLocaleString() },
                { label: 'Percentage of Transactions', value: `${incomePercentage}%` },
                { label: 'Average Income', value: formatCurrency(incomeCount > 0 ? summary.totalIncome / incomeCount : 0) },
              ]
            });
          };

          const openExpensesModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Expenses Breakdown',
              color: 'warning',
              icon: 'fa-minus-circle',
              data: [
                { label: 'Total Expenses', value: formatCurrency(summary.totalExpenses) },
                { label: 'Expense Transactions', value: expenseCount.toLocaleString() },
                { label: 'Goal Contributions', value: contributionCount.toLocaleString() },
                { label: 'Percentage of Transactions', value: `${(Number(expensePercentage) + Number(contributionPercentage)).toFixed(1)}%` },
                { label: 'Average Expense', value: formatCurrency((expenseCount + contributionCount) > 0 ? summary.totalExpenses / (expenseCount + contributionCount) : 0) },
              ]
            });
          };

          const openNetAmountModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Net Amount Breakdown',
              color: 'info',
              icon: 'fa-balance-scale',
              data: [
                { label: 'Net Amount', value: formatCurrency(summary.netAmount) },
                { label: 'Total Income', value: formatCurrency(summary.totalIncome) },
                { label: 'Total Expenses', value: formatCurrency(summary.totalExpenses) },
                { label: 'Status', value: summary.netAmount >= 0 ? 'Surplus' : 'Deficit' },
                { label: 'Savings Rate', value: `${summary.totalIncome > 0 ? ((summary.netAmount / summary.totalIncome) * 100).toFixed(1) : 0}%` },
              ]
            });
          };

          return (
            <>
              {/* Mobile Stats Cards */}
              <div className="block md:hidden mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalTransactionsModal}>
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
                      <i className="fas fa-exchange-alt text-red-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Transactions</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(totalTxns)}</p>
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <i className="fas fa-chart-bar text-[8px]"></i>
                      <span className="text-[9px] font-medium">{incomeCount} income, {expenseCount} expense</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openIncomeModal}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                      <i className="fas fa-plus-circle text-emerald-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Income</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{formatCurrencyTruncated(summary.totalIncome)}</p>
                    <div className="flex items-center gap-1 mt-1 text-emerald-500">
                      <i className="fas fa-arrow-up text-[8px]"></i>
                      <span className="text-[9px] font-medium">{incomePercentage}% of transactions</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openExpensesModal}>
                    <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2">
                      <i className="fas fa-minus-circle text-rose-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Expenses</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{formatCurrencyTruncated(summary.totalExpenses)}</p>
                    <div className="flex items-center gap-1 mt-1 text-rose-500">
                      <i className="fas fa-arrow-down text-[8px]"></i>
                      <span className="text-[9px] font-medium">{expensePercentage}% of transactions</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openNetAmountModal}>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                      <i className="fas fa-balance-scale text-amber-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Net Amount</p>
                    <p className={`text-sm font-bold truncate ${summary.netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrencyTruncated(summary.netAmount)}</p>
                    <div className={`flex items-center gap-1 mt-1 ${summary.netAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <i className={`fas fa-${summary.netAmount >= 0 ? 'arrow-up' : 'arrow-down'} text-[8px]`}></i>
                      <span className="text-[9px] font-medium">{summary.netAmount >= 0 ? 'Surplus' : 'Deficit'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Stats Cards */}
              <div className="row d-none d-md-flex">
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalTransactionsModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-danger text-uppercase mb-2">Total Transactions</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(totalTxns)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-muted">
                            <i className="fas fa-chart-bar mr-1"></i>
                            <span className="font-weight-medium">{incomeCount} income, {expenseCount} expense</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-danger">
                            <i className="fas fa-exchange-alt stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-danger">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openIncomeModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-success text-uppercase mb-2">Total Income</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{formatCurrencyTruncated(summary.totalIncome)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-success">
                            <i className="fas fa-arrow-up mr-1"></i>
                            <span className="font-weight-medium">{incomePercentage}%</span>
                            <span className="ml-1 small">of transactions</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-success">
                            <i className="fas fa-plus-circle stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-success">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openExpensesModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-warning text-uppercase mb-2">Total Expenses</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{formatCurrencyTruncated(summary.totalExpenses)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-danger">
                            <i className="fas fa-arrow-down mr-1"></i>
                            <span className="font-weight-medium">{expensePercentage}%</span>
                            <span className="ml-1 small">of transactions</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-warning">
                            <i className="fas fa-minus-circle stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-warning">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openNetAmountModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-info text-uppercase mb-2">Net Amount</div>
                          <div className={`stat-value mb-0 font-weight-bold ${summary.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrencyTruncated(summary.netAmount)}</div>
                          <div className={`stat-change mt-2 d-flex align-items-center ${summary.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                            <i className={`fas fa-${summary.netAmount >= 0 ? 'arrow-up' : 'arrow-down'} mr-1`}></i>
                            <span className="font-weight-medium">{summary.netAmount >= 0 ? 'Surplus' : 'Deficit'}</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-info">
                            <i className="fas fa-balance-scale stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-info">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Mobile Controls & Transaction List */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-exchange-alt text-red-500 text-[10px]"></i>
              Transactions
              {totalCount > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalCount}
                </span>
              )}
            </h6>
            <button 
              className="text-[10px] text-gray-500 flex items-center gap-1"
              onClick={clearFilters}
            >
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          {/* Mobile Search & Filters */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="contribution">Contribution</option>
              </select>
              <select
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
              >
                <option value="">All Users</option>
                {users.slice(0, 20).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Mobile Transaction Cards List */}
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {refreshing ? (
              <div className="px-3 py-8 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-xs text-gray-500">Loading transactions...</p>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => {
                const typeInfo = getTransactionTypeInfo(transaction.type);
                return (
                  <div 
                    key={transaction.id} 
                    className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    <div className="flex items-center gap-3">
                      {/* User Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={transaction.user_avatar || "../images/placeholder.png"}
                          alt={formatUserName(transaction)}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          transaction.type === 'income' ? 'bg-emerald-500' : 
                          transaction.type === 'expense' ? 'bg-rose-500' : 'bg-blue-500'
                        }`}></div>
                      </div>
                      
                      {/* Transaction Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {formatUserName(transaction)}
                          </p>
                          <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-semibold ${
                            transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                            transaction.type === 'expense' ? 'bg-rose-100 text-rose-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {typeInfo.label.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{transaction.category_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold ${
                            transaction.type === 'income' ? 'text-emerald-600' :
                            transaction.type === 'expense' ? 'text-rose-600' :
                            'text-blue-600'
                          }`}>
                            {formatCurrency(transaction.amount)}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions - Mobile Dropdown */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative">
                          <button
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(transaction.id); }}
                            onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(transaction.id); }}
                            aria-label="More actions"
                          >
                            <i className="fas fa-ellipsis-v text-[10px]"></i>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {activeDropdown === transaction.id && (
                            <div className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}>
                              <button
                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); closeDropdown(); handleViewTransaction(transaction); }}
                                onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); handleViewTransaction(transaction); }}
                              >
                                <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                                <span className="text-gray-700">View</span>
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); closeDropdown(); handleEditTransaction(transaction); }}
                                onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); handleEditTransaction(transaction); }}
                              >
                                <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                                <span className="text-gray-700">Edit</span>
                              </button>
                              <div className="border-t border-gray-200"></div>
                              <button
                                className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                                onClick={(e) => { e.stopPropagation(); closeDropdown(); handleDeleteTransaction(transaction); }}
                                onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); handleDeleteTransaction(transaction); }}
                              >
                                <i className="fas fa-trash text-red-500 text-[10px]"></i>
                                <span className="text-red-600">Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-exchange-alt text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No transactions found</p>
                <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
          
          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[9px] text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded-lg min-w-[24px] text-center">
                  {currentPage}
                </span>
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Section - Desktop */}
      <div className="controls-section mb-4 hidden md:block">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-6 col-lg-4 mb-3 mb-md-0">
                <div className="search-container">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 modern-input"
                      placeholder="Search transactions by description..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="contribution">Contribution</option>
                </select>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  className="form-control modern-select"
                  value={filters.user}
                  onChange={(e) => handleFilterChange('user', e.target.value)}
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.user_metadata?.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-12 col-lg-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="page-size-selector">
                    <small className="text-muted mr-2">Show:</small>
                    <select
                      className="form-control form-control-sm d-inline-block w-auto"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing page size
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <small className="text-muted ml-2">per page</small>
                  </div>
                  
                  {(filters.search || filters.type || filters.user || filters.startDate || filters.endDate) && (
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={clearFilters}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Advanced Filters Row */}
            {showFilters && (
              <div className="row mt-3">
                <div className="col-md-3 mb-3">
                  <select
                    className="form-control modern-select"
                    value={filters.account}
                    onChange={(e) => handleFilterChange('account', e.target.value)}
                    disabled={!filters.user}
                  >
                    <option value="">All Accounts</option>
                    {filteredAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 mb-3">
                  <input
                    type="date"
                    className="form-control modern-input"
                    placeholder="Start Date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="col-md-2 mb-3">
                  <input
                    type="date"
                    className="form-control modern-input"
                    placeholder="End Date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
                <div className="col-md-2 mb-3">
                  <input
                    type="number"
                    className="form-control modern-input"
                    placeholder="Min Amount"
                    step="0.01"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  />
                </div>
                <div className="col-md-2 mb-3">
                  <input
                    type="number"
                    className="form-control modern-input"
                    placeholder="Max Amount"
                    step="0.01"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  />
                </div>
                <div className="col-md-1 mb-3">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowFilters(false)}
                  >
                    <i className="fas fa-chevron-up mr-1"></i>
                    Hide
                  </button>
                </div>
              </div>
            )}
            
            {!showFilters && (
              <div className="row mt-2">
                <div className="col-12">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowFilters(true)}
                  >
                    <i className="fas fa-filter mr-1"></i>
                    Advanced Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table - Desktop Only */}
      <div className="table-section hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-table mr-2"></i>
                Transactions ({totalCount})
              </h6>
              <div className="table-actions">
                <small className="text-muted">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
                </small>
              </div>
            </div>
          </div>
        
        <div className="card-body p-0">
          {refreshing ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <h6 className="text-muted mb-2">Refreshing transactions...</h6>
              <p className="text-sm text-muted">Fetching latest transaction data and statistics</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state-container">
                <i className="fas fa-exchange-alt fa-4x text-gray-300 mb-4"></i>
                <h4 className="text-gray-700 mb-3">
                  {Object.values(filters).some(f => f !== '' && f !== 'created_at' && f !== 'desc') 
                    ? 'No Matching Transactions' 
                    : 'No Transactions Yet'
                  }
                </h4>
                <p className="text-muted mb-4 max-width-sm mx-auto">
                  {Object.values(filters).some(f => f !== '' && f !== 'created_at' && f !== 'desc') 
                    ? 'Try adjusting your filters or search criteria to find the transactions you\'re looking for.' 
                    : 'Users haven\'t created any transactions yet. Once they start adding transactions, they will appear here.'
                  }
                </p>
                <div className="d-flex justify-content-center gap-2">
                  {Object.values(filters).some(f => f !== '' && f !== 'created_at' && f !== 'desc') && (
                    <button className="btn btn-outline-primary btn-sm mr-2" onClick={clearFilters}>
                      <i className="fas fa-filter mr-2"></i>
                      Clear Filters
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                    <i className="fas fa-plus mr-2"></i>
                    Add First Transaction
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover modern-table mb-0">
                <thead className="table-header">
                  <tr>
                    <th className="border-0">User</th>
                    <th className="border-0">Type</th>
                    <th className="border-0">Amount</th>
                    <th className="border-0">Account</th>
                    <th className="border-0">Category</th>
                    <th className="border-0">Date</th>
                    <th className="border-0">Description</th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    
                    return (
                      <tr key={transaction.id} className="table-row">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="user-avatar-container mr-3">
                              <img
                                src={transaction.user_avatar || "../images/placeholder.png"}
                                alt={formatUserName(transaction)}
                                className="user-table-avatar"
                                onError={(e) => {
                                  e.currentTarget.src = "../images/placeholder.png";
                                }}
                              />
                              <div className={`user-status-dot status-${transaction.type || 'inactive'}`}></div>
                            </div>
                            <div className="user-info">
                              <div className="user-name font-weight-medium">
                                {formatUserName(transaction)}
                              </div>
                              <div className="user-id text-muted small">
                                {transaction.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`status-badge status-${typeInfo.color}`}>
                            <i className={`fas ${typeInfo.icon} mr-1`}></i>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`font-weight-bold text-${typeInfo.color}`}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <div className="font-weight-medium text-sm">
                              {transaction.account_name}
                            </div>
                            <div className="text-xs text-muted">
                              {transaction.account_type}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <i className={`fas ${getCategoryIcon(transaction.category_icon, transaction.type)} ${getCategoryIconColor(transaction.type)} mr-2`}></i>
                            <span className="text-sm">
                              {transaction.category_name || 'Uncategorized'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            {formatDate(transaction.date)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-sm" style={{ maxWidth: '200px' }}>
                            {transaction.notes && transaction.notes.length > 50
                              ? `${transaction.notes.substring(0, 50)}...`
                              : transaction.notes || 'No description'
                            }
                            {transaction.goal_name && (
                              <div className="mt-1">
                                <span className="badge badge-info badge-sm">
                                  <i className="fas fa-flag mr-1"></i>
                                  {transaction.goal_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline-primary mr-1"
                              onClick={() => handleViewTransaction(transaction)}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning mr-1"
                              onClick={() => handleEditTransaction(transaction)}
                              title="Edit Transaction"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteTransaction(transaction)}
                              title="Delete Transaction"
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  Page {currentPage} of {totalPages} ({totalCount} total transactions)
                </small>
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (page <= totalPages) {
                      return (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    }
                    return null;
                  })}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onTransactionAdded={handleTransactionAdded}
      />

      <ViewTransactionModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      <EditTransactionModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onTransactionUpdated={handleTransactionUpdated}
      />

      <DeleteTransactionModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onTransactionDeleted={handleTransactionDeleted}
      />

      {/* Stats Detail Modal */}
      <StatsDetailModal
        show={statsDetailModal.show}
        onClose={() => setStatsDetailModal(prev => ({ ...prev, show: false }))}
        title={statsDetailModal.title}
        color={statsDetailModal.color}
        icon={statsDetailModal.icon}
        data={statsDetailModal.data}
      />
    </div>
  );
};

export default AdminTransactions;