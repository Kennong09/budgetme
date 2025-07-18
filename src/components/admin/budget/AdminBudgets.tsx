import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "../../../utils/highchartsInit";
import { RealtimeChannel } from "@supabase/supabase-js";

// Interface for budget from the database
interface SupabaseBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
  period: string;
}

// Interface for budget view with additional calculated fields
interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  start_date: string;
  end_date: string;
  category: string;
  category_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: "active" | "completed" | "archived";
  month: string;
  year: number;
  period: string;
  remaining: number;
  percentage: number;
}

// Interface for expense categories
interface Category {
  id: string;
  category_name: string;
  user_id: string;
}

// Interface for user profile
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const AdminBudgets: FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { showSuccessToast, showErrorToast } = useToast();

  // New state variables for real-time data
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [budgetsByCategory, setBudgetsByCategory] = useState<{[key: string]: number}>({});
  const [budgetsByStatus, setBudgetsByStatus] = useState<{[key: string]: number}>({});
  const [budgetsByUser, setBudgetsByUser] = useState<{[key: string]: number}>({});
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});

  const ITEMS_PER_PAGE = pageSize;
  const categoriesList = [
    "Housing", "Transportation", "Food", "Utilities", 
    "Insurance", "Healthcare", "Savings", "Personal", 
    "Entertainment", "Other"
  ];

  // Fetch budgets on component mount and when filters change
  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [currentPage, searchTerm, filterCategory, filterStatus, sortField, sortDirection, pageSize]);

  // Set up real-time subscription
  useEffect(() => {
    // Create channel reference outside to ensure we can clean it up
    let channel: RealtimeChannel | undefined;
    
    try {
      // Set up the subscription
      channel = supabaseAdmin.channel('admin-budgets-channel');
      
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'budgets' }, 
          () => {
            // Refresh budget data when budgets table changes
            fetchBudgets();
          }
        )
        .subscribe();
      
      // Store subscription reference
      setSubscription(channel);
    } catch (error) {
      console.error("Error setting up real-time subscriptions:", error);
    }
    
    // Cleanup function
    return () => {
      if (channel) {
        try {
          supabaseAdmin.removeChannel(channel);
        } catch (cleanupError) {
          console.error("Error cleaning up channel:", cleanupError);
        }
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Clean up any explicit subscriptions when component unmounts
  useEffect(() => {
    return () => {
      if (subscription) {
        try {
          supabaseAdmin.removeChannel(subscription);
        } catch (error) {
          console.error("Error removing channel on unmount:", error);
        }
      }
    };
  }, [subscription]);

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    try {
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
  };

  // Fetch budgets from Supabase
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      
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
      
      setUserProfiles(profilesMap);
      
      // First let's check what fields actually exist in the budgets table
      let validSortField = "created_at"; // Default to created_at
      
      try {
        const { data: sampleBudget, error: sampleError } = await supabaseAdmin
          .from('budgets')
          .select('*')
          .limit(1)
          .single();
          
                  if (!sampleError && sampleBudget) {
          const availableFields = Object.keys(sampleBudget);
          
          // Check if current sort field exists in the budget table
          if (availableFields.includes(sortField)) {
            validSortField = sortField;
          }
        }
      } catch (err) {
      }
      
      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('budgets')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      if (filterCategory !== 'all') {
        countQuery = countQuery.eq('category_id', filterCategory);
      }
      
      if (filterStatus !== 'all') {
        // We need a more complex query for status since it's calculated
        // This is simplified and would need to be improved in a real app
        if (filterStatus === 'active') {
          const today = new Date().toISOString().split('T')[0];
          countQuery = countQuery
            .lte('start_date', today)
            .gte('end_date', today);
        } else if (filterStatus === 'completed') {
          const today = new Date().toISOString().split('T')[0];
          countQuery = countQuery.lt('end_date', today);
        } else if (filterStatus === 'archived') {
          const today = new Date().toISOString().split('T')[0];
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
      
      // Apply sorting - ensure we use valid database columns
      dataQuery = dataQuery.order(validSortField, { ascending: sortDirection === 'asc' });
      
      // Apply same filters to main query
      if (filterCategory !== 'all') {
        dataQuery = dataQuery.eq('category_id', filterCategory);
      }
      
      if (filterStatus !== 'all') {
        // Same status logic as above
        if (filterStatus === 'active') {
          const today = new Date().toISOString().split('T')[0];
          dataQuery = dataQuery
            .lte('start_date', today)
            .gte('end_date', today);
        } else if (filterStatus === 'completed') {
          const today = new Date().toISOString().split('T')[0];
          dataQuery = dataQuery.lt('end_date', today);
        } else if (filterStatus === 'archived') {
          const today = new Date().toISOString().split('T')[0];
          dataQuery = dataQuery.gt('start_date', today);
        }
      }
      
      if (searchTerm) {
        // We need to fetch user profiles that match the search term
        const { data: matchingProfiles, error: searchProfileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
          
        if (searchProfileError) {
          throw searchProfileError;
        }
        
        if (matchingProfiles && matchingProfiles.length > 0) {
          const userIds = matchingProfiles.map(p => p.id);
          dataQuery = dataQuery.in('user_id', userIds);
        } else {
          // Try to find categories that match the search term
          const { data: matchingCategories, error: categorySearchError } = await supabaseAdmin
            .from('expense_categories')
            .select('id')
            .ilike('category_name', `%${searchTerm}%`);
            
          if (categorySearchError) {
            throw categorySearchError;
      }
      
          if (matchingCategories && matchingCategories.length > 0) {
            const categoryIds = matchingCategories.map(c => c.id);
            dataQuery = dataQuery.in('category_id', categoryIds);
          } else {
            // No matches, return empty result
            setBudgets([]);
            setBudgetsByCategory({});
            setBudgetsByStatus({ active: 0, completed: 0, archived: 0 });
            setBudgetsByUser({});
            setTotalItems(0);
            setTotalPages(1);
            setLoading(false);
            return;
          }
        }
      }
      
      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
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
        .select('amount, category_id, type, date')
        .eq('type', 'expense');
        
      if (transactionsError) {
        throw transactionsError;
      }
      
      for (const budget of budgetData || []) {
        const categoryName = budget.expense_categories?.category_name || 'Uncategorized';
        const userProfile = profilesMap[budget.user_id] || {
          id: budget.user_id,
          full_name: 'Unknown User',
          email: 'No Email'
        };
        
        // Calculate spent amount from transactions
        const startDate = new Date(budget.start_date);
        const endDate = new Date(budget.end_date);
        
        // Filter transactions that match this budget's category and date range
        const budgetTransactions = transactions?.filter(tx => 
          tx.category_id === budget.category_id && 
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
        
        // Create processed budget object
        const processedBudget: Budget = {
          id: budget.id,
          name: `${categoryName} Budget`, // Use category name for budget name
          amount: budget.amount,
          spent,
          start_date: budget.start_date,
          end_date: budget.end_date,
          category: categoryName,
          category_id: budget.category_id,
          user_id: budget.user_id,
          user_name: userProfile.full_name,
          user_email: userProfile.email,
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
        
        if (userProfile.full_name in userStats) {
          userStats[userProfile.full_name] += 1;
        } else {
          userStats[userProfile.full_name] = 1;
        }
      }
      
      // Set state with processed data
      setBudgets(processedBudgets);
      setBudgetsByCategory(categoryStats);
      setBudgetsByStatus(statusStats);
      setBudgetsByUser(userStats);
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.ceil((totalCount || 0) / ITEMS_PER_PAGE));
      
      setLoading(false);
    } catch (error) {
      showErrorToast(`Failed to load budgets: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      setLoading(false);
    }
  };
  
  // Manual refresh function
  const refreshBudgetData = async () => {
    setLoading(true);
    try {
      await fetchBudgets();
      await fetchCategories();
      showSuccessToast("Budget data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh budget data");
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle sort
  const handleSort = (field: string) => {
    // Map display fields to actual database columns
    const fieldMapping: {[key: string]: string} = {
      "name": "category_id", // Sort by category_id since name is computed from category
      "user_name": "user_id", // Sort by user_id since user_name is computed
      "category": "category_id",
      "amount": "amount",
      "spent": "amount", // We don't have spent in DB directly, use amount as fallback
      "status": "end_date", // Status is computed based on dates
      "created_at": "created_at"
    };
    
    const dbField = fieldMapping[field] || field;
    
    if (dbField === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(dbField);
      setSortDirection("asc");
    }
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Handle budget status change
  const changeBudgetStatus = async (budget: Budget, newStatus: "active" | "completed" | "archived") => {
    try {
      setLoading(true);
      
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
      
      // Refresh data
      await fetchBudgets();
    } catch (error) {
      showErrorToast("Failed to update budget status");
      setLoading(false);
    }
  };

  // Open budget details modal
  const openBudgetModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedBudget(null);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Get budget analytics chart options
  const getBudgetCategoryChartOptions = () => {
    // Use the pre-calculated category data from state
    const categoryData = Object.entries(budgetsByCategory).map(([name, count]) => ({
      name,
      y: count
    })).filter(item => item.y > 0);
    
    return {
      chart: {
        type: "pie",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budgets by Category"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f} %",
            style: {
              color: "black"
            }
          }
        }
      },
      series: [
        {
          name: "Budgets",
          colorByPoint: true,
          data: categoryData
        }
      ]
    };
  };

  // Get budget status chart options
  const getBudgetStatusChartOptions = () => {
    // Use pre-calculated status data from state
    const completedCount = budgetsByStatus['completed'] || 0;
    const activeCount = budgetsByStatus['active'] || 0;
    const archivedCount = budgetsByStatus['archived'] || 0;
    
    return {
      chart: {
        type: "column",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budget Status Distribution"
      },
      xAxis: {
        categories: ["Active", "Completed", "Archived"]
      },
      yAxis: {
        title: {
          text: "Number of Budgets"
        }
      },
      series: [
        {
          name: "Budgets",
          data: [
            { y: activeCount, color: "#36b9cc" },  // Blue for active
            { y: completedCount, color: "#1cc88a" },  // Green for completed
            { y: archivedCount, color: "#858796" }   // Gray for archived
          ]
        }
      ]
    };
  };

  // Get budget progress for selected budget
  const getBudgetProgressChartOptions = (budget: Budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    const remaining = budget.amount - budget.spent;
    
    return {
      chart: {
        type: "pie",
        height: 200
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budget Utilization"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>${point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: ${point.y}"
          }
        }
      },
      series: [
        {
          name: "Amount",
          colorByPoint: true,
          data: [
            { name: "Spent", y: budget.spent, color: "#e74a3b" },
            { name: "Remaining", y: remaining > 0 ? remaining : 0, color: "#1cc88a" }
          ]
        }
      ]
    };
  };
  
  // Loading state
  if (loading && budgets.length === 0) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Budgets</h2>
        <p className="admin-loader-subtitle">Please wait while we gather budget information...</p>
      </div>
    );
  }

  return (
    <div className="admin-budgets">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Budget Management</h1>
      </div>
      
      {/* Summary Stats Cards Row */}
      <div className="row">
        {/* Total Budgets Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Budgets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {totalItems}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Budgets Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Budgets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {budgetsByStatus['active'] || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Categories Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Budget Categories
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {Object.keys(budgetsByCategory).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-tags fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Count Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Users with Budgets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {Object.keys(budgetsByUser).length}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Analytics Cards */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Categories</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getBudgetCategoryChartOptions()} />
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Budget Status</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getBudgetStatusChartOptions()} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">Budget Filters</h6>
        </div>
        <div className="card-body">
          <div className="row align-items-center">
            {/* Search */}
            <div className="col-md-5 mb-3">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-light border-0 small"
                    placeholder="Search budgets or users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <div className="input-group-append">
                    <button className="btn btn-danger" type="submit">
                      <i className="fas fa-search fa-sm"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Category Filter */}
            <div className="col-md-3 mb-3">
              <select
                className="form-control"
                value={filterCategory}
                onChange={e => {
                  setFilterCategory(e.target.value);
                  handleFilterChange();
                }}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="col-md-3 mb-3">
              <select
                className="form-control"
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  handleFilterChange();
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            {/* Reset Filters */}
            <div className="col-md-1 mb-3 text-right">
              <button
                className="btn btn-light"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-undo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Budgets Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-danger d-flex align-items-center">
            All Budgets 
            {loading && (
              <span className="ml-2">
                <i className="fas fa-spinner fa-spin fa-sm"></i>
              </span>
            )}
          </h6>
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
                onClick={refreshBudgetData}
                disabled={loading}
                title="Refresh Budget Data"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered admin-table" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                    Budget Name
                    {sortField === "category_id" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("user_name")} style={{ cursor: "pointer" }}>
                    User
                    {sortField === "user_id" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>
                    Category
                    {sortField === "category_id" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                    Amount
                    {sortField === "amount" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th onClick={() => handleSort("spent")} style={{ cursor: "pointer" }}>
                    Spent
                    {sortField === "amount" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th>Progress</th>
                  <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                    Status
                    {sortField === "end_date" && (
                      <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No budgets found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  budgets.map(budget => {
                    const percentage = Math.round((budget.spent / budget.amount) * 100);
                    let progressClass = "bg-success";
                    
                    if (percentage >= 90) {
                      progressClass = "bg-danger";
                    } else if (percentage >= 70) {
                      progressClass = "bg-warning";
                    } else if (percentage >= 50) {
                      progressClass = "bg-info";
                    }
                    
                    return (
                      <tr key={budget.id}>
                        <td>{budget.name}</td>
                        <td>{budget.user_name}</td>
                        <td>{budget.category}</td>
                        <td>${budget.amount.toLocaleString()}</td>
                        <td>${budget.spent.toLocaleString()}</td>
                        <td>
                          <div className="progress">
                            <div
                              className={`progress-bar ${progressClass}`}
                              role="progressbar"
                              style={{ width: `${percentage}%` }}
                              aria-valuenow={percentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${
                            budget.status === "active" ? "primary" :
                            budget.status === "completed" ? "success" : "secondary"
                          }`}>
                            {budget.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group admin-actions">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openBudgetModal(budget)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <span className="text-muted">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of{" "}
                  {totalItems} entries
                </span>
              </div>
              <nav>
                <ul className="pagination admin-pagination">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
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
                      disabled={currentPage === totalPages}
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

      {/* Budget Detail Modal */}
      {showModal && selectedBudget && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            backgroundColor: "rgba(0, 0, 0, 0.5)"
          }}
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Budget Details: {selectedBudget.name}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeModal}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="font-weight-bold mb-3">Budget Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="font-weight-bold">Budget ID:</td>
                          <td>{selectedBudget.id}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Name:</td>
                          <td>{selectedBudget.name}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Category:</td>
                          <td>{selectedBudget.category}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Amount:</td>
                          <td>${selectedBudget.amount.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Spent:</td>
                          <td>${selectedBudget.spent.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Remaining:</td>
                          <td>${(selectedBudget.amount - selectedBudget.spent).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Start Date:</td>
                          <td>{new Date(selectedBudget.start_date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">End Date:</td>
                          <td>{new Date(selectedBudget.end_date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Status:</td>
                          <td>
                            <span className={`badge badge-${
                              selectedBudget.status === "active" ? "primary" :
                              selectedBudget.status === "completed" ? "success" : "secondary"
                            }`}>
                              {selectedBudget.status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h6 className="font-weight-bold mb-3 mt-4">User Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="font-weight-bold">User ID:</td>
                          <td>{selectedBudget.user_id}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Name:</td>
                          <td>{selectedBudget.user_name}</td>
                        </tr>
                        <tr>
                          <td className="font-weight-bold">Email:</td>
                          <td>{selectedBudget.user_email}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h6 className="border-bottom pb-2 mb-3 mt-4">Change Status</h6>
                    <div className="btn-group">
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "active" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "active")}
                      >
                        <i className="fas fa-play-circle mr-1"></i> Active
                      </button>
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "completed" ? "btn-success" : "btn-outline-success"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "completed")}
                      >
                        <i className="fas fa-check-circle mr-1"></i> Completed
                      </button>
                      <button 
                        className={`btn btn-sm ${selectedBudget.status === "archived" ? "btn-secondary" : "btn-outline-secondary"}`}
                        onClick={() => changeBudgetStatus(selectedBudget, "archived")}
                      >
                        <i className="fas fa-archive mr-1"></i> Archived
                      </button>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card mb-4">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Budget Progress</h6>
                      </div>
                      <div className="card-body">
                        <HighchartsReact 
                          highcharts={Highcharts} 
                          options={getBudgetProgressChartOptions(selectedBudget)} 
                        />
                        
                        <div className="text-center mt-3">
                          <h4 className="small font-weight-bold">
                            Overall Progress <span className="float-right">
                              {Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}%
                            </span>
                          </h4>
                          <div className="progress mb-4">
                            <div
                              className="progress-bar bg-danger"
                              role="progressbar"
                              style={{ width: `${Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}%` }}
                              aria-valuenow={Math.round((selectedBudget.spent / selectedBudget.amount) * 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Actions</h6>
                      </div>
                      <div className="card-body">
                        <div className="btn-group w-100 mb-3">
                          <button className="btn btn-outline-primary">
                            <i className="fas fa-edit mr-1"></i> Edit Budget
                          </button>
                          <button className="btn btn-outline-danger">
                            <i className="fas fa-trash mr-1"></i> Delete Budget
                          </button>
                        </div>
                        
                        <Link to={`/admin/users/${selectedBudget.user_id}`} className="btn btn-info w-100">
                          <i className="fas fa-user mr-1"></i> View User Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBudgets; 