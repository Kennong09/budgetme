import React, { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { 
  Goal, 
  GoalSummary, 
  GoalFilters, 
  GoalUser, 
  GoalCategory 
} from "./types";
import GoalStatsCards from "./GoalStatsCards";
import GoalFiltersComponent from "./GoalFilters";
import GoalTable from "./GoalTable";
import AddGoalModal from "./AddGoalModal";
import ViewGoalModal from "./ViewGoalModal";
import EditGoalModal from "./EditGoalModal";
import DeleteGoalModal from "./DeleteGoalModal";

const AdminGoals: React.FC = () => {
  // Main data state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<GoalUser[]>([]);
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Summary state
  const [summary, setSummary] = useState<GoalSummary>({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    pausedGoals: 0,
    cancelledGoals: 0,
    totalTargetAmount: 0,
    totalCurrentAmount: 0,
    totalRemainingAmount: 0,
    overallProgress: 0,
    goalsByPriority: { high: 0, medium: 0, low: 0 },
    goalsByStatus: { active: 0, completed: 0, paused: 0, cancelled: 0 },
    goalsByUser: {},
    overdueGoals: 0,
    goalsCompletedThisMonth: 0,
    averageProgress: 0
  });

  // Pagination state
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<GoalFilters>({
    priority: '',
    status: '',
    user: '',
    category: '',
    search: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    minProgress: '',
    maxProgress: '',
    isOverdue: false,
    sortBy: 'goal_name',
    sortOrder: 'asc',
    currentPage: 1,
    pageSize: 10
  });

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { showSuccessToast, showErrorToast } = useToast();

  // Load data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reload goals when filters change
  useEffect(() => {
    if (users.length > 0) {
      fetchGoals();
    }
  }, [filters, users.length]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchCategories()
      ]);
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      showErrorToast('Failed to load initial data');
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
        user_metadata: user.user_metadata || {},
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      // In a real implementation, you might have a categories table
      // For now, we'll set an empty array
      setCategories([]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  };

  const fetchGoals = useCallback(async () => {
    try {
      setRefreshing(true);

      // Build query
      let query = supabaseAdmin
        .from('goals')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.user) {
        query = query.eq('user_id', filters.user);
      }

      if (filters.category) {
        query = query.ilike('category', `%${filters.category}%`);
      }

      if (filters.search) {
        query = query.or(`goal_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      if (filters.startDate) {
        query = query.gte('target_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('target_date', filters.endDate);
      }

      if (filters.minAmount) {
        query = query.gte('target_amount', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        query = query.lte('target_amount', parseFloat(filters.maxAmount));
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      // Apply pagination
      const from = (filters.currentPage - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);

      const { data: goalsData, error, count } = await query;

      if (error) throw error;

      // Enrich goals with user data
      const enrichedGoals: Goal[] = (goalsData || []).map((goal: any) => {
        const user = users.find(u => u.id === goal.user_id);
        const progressPercentage = goal.target_amount > 0 
          ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
          : 0;

        return {
          ...goal,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User',
          user_email: user?.email || '',
          user_avatar: user?.user_metadata?.avatar_url || '',
          percentage: progressPercentage,
          remaining: goal.target_amount - goal.current_amount,
          is_overdue: new Date(goal.target_date) < new Date() && goal.status !== 'completed',
          is_family_goal: !!goal.family_id
        };
      });

      // Apply additional filters that need calculated values
      let filteredGoals = enrichedGoals;

      if (filters.minProgress) {
        const minProgress = parseFloat(filters.minProgress);
        filteredGoals = filteredGoals.filter(goal => {
          const percentage = goal.percentage ?? 0;
          return percentage >= minProgress;
        });
      }

      if (filters.maxProgress) {
        const maxProgress = parseFloat(filters.maxProgress);
        filteredGoals = filteredGoals.filter(goal => {
          const percentage = goal.percentage ?? 0;
          return percentage <= maxProgress;
        });
      }

      if (filters.isOverdue) {
        filteredGoals = filteredGoals.filter(goal => goal.is_overdue === true);
      }

      setGoals(filteredGoals);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / filters.pageSize));

      // Calculate summary
      calculateSummary(enrichedGoals);
      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error fetching goals:', error);
      showErrorToast('Failed to load goals');
    } finally {
      setRefreshing(false);
    }
  }, [filters, users, showErrorToast]);

  const calculateSummary = (goalsList: Goal[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate status based on progress percentage (100% or above = completed)
    const goalsWithCalculatedStatus = goalsList.map(g => {
      const progressPercent = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      return {
        ...g,
        calculatedStatus: progressPercent >= 100 ? 'completed' : 'active'
      };
    });

    const activeGoalsCount = goalsWithCalculatedStatus.filter(g => g.calculatedStatus === 'active').length;
    const completedGoalsCount = goalsWithCalculatedStatus.filter(g => g.calculatedStatus === 'completed').length;

    const newSummary: GoalSummary = {
      totalGoals: goalsList.length,
      activeGoals: activeGoalsCount,
      completedGoals: completedGoalsCount,
      pausedGoals: 0, // No longer used
      cancelledGoals: 0, // No longer used
      totalTargetAmount: goalsList.reduce((sum, g) => sum + g.target_amount, 0),
      totalCurrentAmount: goalsList.reduce((sum, g) => sum + g.current_amount, 0),
      totalRemainingAmount: goalsList.reduce((sum, g) => sum + Math.max(0, g.target_amount - g.current_amount), 0),
      overallProgress: goalsList.length > 0 
        ? (goalsList.reduce((sum, g) => sum + g.current_amount, 0) / goalsList.reduce((sum, g) => sum + g.target_amount, 0)) * 100
        : 0,
      goalsByPriority: {
        high: goalsList.filter(g => g.priority === 'high').length,
        medium: goalsList.filter(g => g.priority === 'medium').length,
        low: goalsList.filter(g => g.priority === 'low').length,
      },
      goalsByStatus: {
        active: activeGoalsCount,
        completed: completedGoalsCount,
        paused: 0,
        cancelled: 0,
      },
      goalsByUser: goalsList.reduce((acc, goal) => {
        acc[goal.user_id] = (acc[goal.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      overdueGoals: goalsList.filter(g => g.is_overdue).length,
      goalsCompletedThisMonth: goalsWithCalculatedStatus.filter(g => 
        g.calculatedStatus === 'completed' && 
        g.updated_at && 
        new Date(g.updated_at) >= startOfMonth
      ).length,
      averageProgress: goalsList.length > 0 
        ? goalsList.reduce((sum, g) => sum + (g.percentage || 0), 0) / goalsList.length
        : 0
    };

    setSummary(newSummary);
  };

  // Event handlers
  const handleRefresh = async () => {
    await fetchGoals();
    showSuccessToast('Goals refreshed successfully');
  };

  const handleFiltersChange = (newFilters: Partial<GoalFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      currentPage: newFilters.currentPage || 1
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      priority: '',
      status: '',
      user: '',
      category: '',
      search: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      minProgress: '',
      maxProgress: '',
      isOverdue: false,
      sortBy: 'goal_name',
      sortOrder: 'asc',
      currentPage: 1,
      pageSize: 10
    });
  };

  const handleSort = (field: string) => {
    const newOrder = filters.sortBy === field && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: newOrder
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, currentPage: page }));
  };

  // Modal handlers
  const handleGoalSelect = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowViewModal(true);
  };

  const handleGoalEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowEditModal(true);
  };

  const handleGoalDelete = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteModal(true);
  };

  const handleGoalAdded = () => {
    fetchGoals();
    setShowAddModal(false);
    showSuccessToast('Goal added successfully');
  };

  const handleGoalUpdated = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
    setSelectedGoal(null);
    setShowEditModal(false);
    fetchGoals(); // Refresh to get accurate summary
  };

  const handleGoalDeleted = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    setSelectedGoal(null);
    setShowDeleteModal(false);
    fetchGoals(); // Refresh to get accurate summary
  };

  // Close modals
  const closeModals = () => {
    setSelectedGoal(null);
    setShowAddModal(false);
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
  };

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
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading goals...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Enhanced Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div className="header-content">
                <div className="d-flex align-items-center mb-2">
                  <div className="header-icon-container mr-3">
                    <div className="skeleton-icon"></div>
                  </div>
                  <div>
                    <div className="skeleton-line skeleton-header-title mb-1"></div>
                    <div className="skeleton-line skeleton-header-subtitle"></div>
                  </div>
                </div>
              </div>
              
              <div className="header-actions d-flex align-items-center">
                <div className="last-updated-info mr-3">
                  <div className="skeleton-line skeleton-date"></div>
                </div>
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <GoalStatsCards summary={summary} loading={true} />
          
          {/* Controls Section Skeleton */}
          <GoalFiltersComponent
            filters={filters}
            users={[]}
            categories={[]}
            onFiltersChange={() => {}}
            onClearFilters={() => {}}
            loading={true}
          />

          {/* Goals Table Skeleton */}
          <GoalTable
            goals={[]}
            filters={filters}
            totalPages={1}
            totalItems={0}
            loading={true}
            onSort={() => {}}
            onPageChange={() => {}}
            onGoalSelect={() => {}}
            onGoalEdit={() => {}}
            onGoalDelete={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Goals</h1>
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
              aria-label="Add goal"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop Only */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-bullseye"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Goal Management</h1>
                <p className="header-subtitle mb-0">
                  Manage financial goals, track progress, and monitor achievement across all users
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
              Add Goal
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <GoalStatsCards summary={summary} loading={refreshing} />

      {/* Controls Section */}
      <GoalFiltersComponent
        filters={filters}
        users={users}
        categories={categories}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        loading={refreshing}
      />

      {/* Goals Table */}
      <GoalTable
        goals={goals}
        filters={filters}
        totalPages={totalPages}
        totalItems={totalItems}
        loading={refreshing}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onGoalSelect={handleGoalSelect}
        onGoalEdit={handleGoalEdit}
        onGoalDelete={handleGoalDelete}
      />

      {/* Modals */}
      <AddGoalModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onGoalAdded={handleGoalAdded}
        users={users}
        categories={categories}
      />

      <ViewGoalModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onEdit={handleGoalEdit}
        onDelete={handleGoalDelete}
      />

      <EditGoalModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onGoalUpdated={handleGoalUpdated}
        users={users}
        categories={categories}
      />

      <DeleteGoalModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onGoalDeleted={handleGoalDeleted}
      />
    </div>
  );
};

export default AdminGoals;