import { useState, useEffect } from 'react';
import { Goal, FilterState, GoalSummary, FamilyState } from '../types';
import { applyGoalFilters, calculateGoalSummary } from '../utils/goalUtils';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { useNavigate } from 'react-router-dom';
import { goalsDataService } from '../services/goalsDataService';

/**
 * Custom hook for managing goals data and real-time subscriptions
 */
export const useGoalsData = (familyState: FamilyState) => {
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [goalSubscription, setGoalSubscription] = useState<any>(null);
  const [goalChannelName] = useState<string>(`goals_updates_${user?.id || 'anonymous'}`);

  // Fetch goals data with robust error handling and fallback
  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        showErrorToast("Please sign in to view your goals");
        navigate("/login");
        return;
      }
      
      // Use robust data service with automatic fallback
      const { data: personalGoals, error: personalGoalsError } = await goalsDataService.fetchGoals(user.id);
        
      if (personalGoalsError) {
        throw personalGoalsError;
      }
      
      if (!personalGoals) {
        console.warn('No personal goals data received');
        setGoals([]);
        setLoading(false);
        return;
      }
      
      // Mark personal goals, ensuring any with family_id are correctly marked as shared
      const formattedPersonalGoals = personalGoals.map(goal => {
        const processed = {
          ...goal,
          is_family_goal: !!goal.family_id || !!goal.is_family_goal, // Ensure goals with family_id are marked as shared
          // Ensure percentage field is available for display components
          percentage: goal.percentage || (goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0),
          remaining: goal.remaining || Math.max(0, goal.target_amount - goal.current_amount)
        };
        
        // Log only if this goal has family data
        if (processed.family_id || processed.is_family_goal) {
          console.log('Family goal found:', {
            id: processed.id,
            name: processed.goal_name,
            family_id: processed.family_id,
            is_family_goal: processed.is_family_goal
          });
        }
        
        return processed;
      });
      
      let allGoals = [...formattedPersonalGoals];
      
      // If user is in a family, also fetch family's shared goals
      if (familyState.isFamilyMember && familyState.userFamilyId) {
        // Fetch shared goals from other family members using robust service
        const { data: sharedGoals, error: sharedGoalsError } = await supabase
          .from('goals')
          .select(`
            *,
            profiles!user_id (
              full_name,
              email
            )
          `)
          .eq('family_id', familyState.userFamilyId)
          .eq('is_family_goal', true)
          .neq('user_id', user.id);
          
        if (!sharedGoalsError && sharedGoals) {
          // Format shared goals with owner information
          const formattedSharedGoals = sharedGoals.map(goal => ({
            ...goal,
            is_family_goal: true,
            shared_by: goal.user_id,
            shared_by_name: goal.profiles?.full_name || 
                           goal.profiles?.email?.split('@')[0] || 
                           "Family Member"
          }));
          
          allGoals = [...formattedPersonalGoals, ...formattedSharedGoals];
        }
      }
      
      console.log(`Retrieved ${allGoals.length} goals (${formattedPersonalGoals.length} personal, ${allGoals.length - formattedPersonalGoals.length} shared)`);
      
      setGoals(allGoals);
      setLoading(false);
      
      // Log service state for debugging
      const serviceState = goalsDataService.getServiceState();
      if (serviceState.fallbackMode) {
        console.warn('Goals loaded in fallback mode - enhanced features may be limited');
      }
      
    } catch (err) {
      console.error("Error loading goals:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      
      // Provide user-friendly error messages based on error type
      if (errorMessage.includes('schema cache') || errorMessage.includes('does not exist')) {
        showErrorToast('Goals system is being updated. Please try again in a moment.');
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
        showErrorToast('Session expired. Please sign in again.');
        navigate('/login');
      } else {
        showErrorToast(`Failed to load goals: ${errorMessage}`);
      }
      
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Clean up any existing subscriptions first
    if (goalSubscription) {
      console.log("Removing existing goal subscription");
      supabase.removeChannel(goalSubscription);
    }

    console.log(`Setting up new subscription for user ${user.id}`);

    // Create new goal subscription with unique channel name and error handling
    const newGoalSubscription = supabase
      .channel(goalChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Goals data changed:', payload.eventType);
        // Add a small delay to ensure database consistency
        setTimeout(() => fetchGoals(), 500);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goal_contributions'
      }, (payload) => {
        console.log('Goal contributions changed:', payload.eventType);
        setTimeout(() => fetchGoals(), 500);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Goal subscription active for user ${user.id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Goal subscription error - continuing without real-time updates');
          // Don't fail completely if subscriptions don't work
        } else if (status === 'TIMED_OUT') {
          console.warn('Goal subscription timed out - will retry on next data fetch');
        }
      });

    // Save subscription references
    setGoalSubscription(newGoalSubscription);

    // Clean up subscription on unmount or when dependencies change
    return () => {
      console.log("Cleaning up subscription");
      if (newGoalSubscription) {
        try {
          supabase.removeChannel(newGoalSubscription);
        } catch (error) {
          console.warn('Error cleaning up goal subscription:', error);
          // Continue cleanup despite subscription cleanup errors
        }
      }
    };
  }, [user, goalChannelName]);

  // Initial fetch when family status is available
  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, familyState.isFamilyMember, familyState.userFamilyId]);

  return {
    goals,
    loading,
    refetchGoals: fetchGoals,
    setGoals
  };
};

/**
 * Custom hook for managing goal filters
 */
export const useGoalFilters = (goals: Goal[]) => {
  const navigate = useNavigate();
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  // Get URL parameters
  const location = window.location;
  const queryParams = new URLSearchParams(location.search);
  
  // Set up filter state with URL parameters or defaults
  const [filter, setFilter] = useState<FilterState>({
    priority: (queryParams.get('priority') as "all" | "high" | "medium" | "low") || "all",
    category: (queryParams.get('category') as "all" | "not_started" | "in_progress" | "completed" | "cancelled") || "all",
    sortBy: (queryParams.get('sortBy') as "name" | "target_date" | "progress" | "amount") || "name",
    search: queryParams.get('search') || "",
    scope: (queryParams.get('scope') as "all" | "personal" | "family") || "all",
  });

  // Apply filters with loading indicator
  const applyFilters = (dataToFilter = goals) => {
    if (dataToFilter.length === 0) return;
    
    // Show loading state
    setIsFiltering(true);
    
    setTimeout(() => {
      const result = applyGoalFilters(dataToFilter, filter);
      setFilteredGoals(result);
      setIsFiltering(false);
    }, 300);
  };

  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      priority: "all",
      category: "all",
      sortBy: "name",
      search: "",
      scope: "all",
    });
    
    // Update URL to remove all query parameters
    navigate('', { replace: true });
  };

  // Update URL when filters change
  useEffect(() => {
    if (goals.length === 0) return;
    
    // Create URL search params from filters
    const params = new URLSearchParams();
    
    // Only add parameters that are not default values
    if (filter.priority !== "all") params.set("priority", filter.priority);
    if (filter.category !== "all") params.set("category", filter.category);
    if (filter.sortBy !== "name") params.set("sortBy", filter.sortBy);
    if (filter.search !== "") params.set("search", filter.search);
    
    // Update URL without refreshing the page
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    navigate(newUrl, { replace: true });
    
    // Apply filters with loader
    applyFilters();
  }, [filter, goals, navigate]);

  // Initialize filtered goals
  useEffect(() => {
    setFilteredGoals(goals);
  }, [goals]);

  return {
    filter,
    setFilter,
    filteredGoals,
    isFiltering,
    applyFilters,
    resetFilters
  };
};

/**
 * Custom hook for managing family state
 */
export const useFamilyState = () => {
  const { user } = useAuth();
  const [familyState, setFamilyState] = useState<FamilyState>({
    isFamilyMember: false,
    userFamilyId: null,
    familyRole: null
  });

  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user) return;
      
      try {
        // First try to query the family_members directly
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select(`
            id,
            family_id,
            role,
            status,
            families:family_id (
              id,
              family_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (!memberError && memberData && memberData.length > 0) {
          setFamilyState({
            isFamilyMember: true,
            userFamilyId: memberData[0].family_id,
            familyRole: memberData[0].role as "admin" | "viewer"
          });
        } else {
          // Fallback to the function
          const { data: familyStatus, error: statusError } = await supabase.rpc(
            'check_user_family',
            { p_user_id: user.id }
          );
          
          if (!statusError && familyStatus && 
              ((Array.isArray(familyStatus) && familyStatus.length > 0 && familyStatus[0].is_member) || 
              (familyStatus.is_member))) {
            // Extract the family ID from the response based on format
            const familyId = Array.isArray(familyStatus) 
              ? familyStatus[0].family_id 
              : familyStatus.family_id;
              
            setFamilyState(prev => ({
              ...prev,
              isFamilyMember: true,
              userFamilyId: familyId
            }));
            
            // Fetch role
            const { data: roleData, error: roleError } = await supabase
              .from('family_members')
              .select('role')
              .eq('user_id', user.id)
              .eq('family_id', familyId)
              .single();
              
            if (!roleError && roleData) {
              setFamilyState(prev => ({
                ...prev,
                familyRole: roleData.role as "admin" | "viewer"
              }));
            }
          } else {
            setFamilyState({
              isFamilyMember: false,
              userFamilyId: null,
              familyRole: null
            });
          }
        }
      } catch (err) {
        console.error("Error checking family status:", err);
        setFamilyState({
          isFamilyMember: false,
          userFamilyId: null,
          familyRole: null
        });
      }
    };
    
    checkFamilyStatus();
  }, [user]);

  return familyState;
};

/**
 * Custom hook for managing goal summary
 */
export const useGoalSummary = (goals: Goal[]): GoalSummary => {
  const [goalSummary, setGoalSummary] = useState<GoalSummary>({
    totalCurrentAmount: 0,
    totalTargetAmount: 0,
    overallProgress: 0
  });

  useEffect(() => {
    if (goals.length > 0) {
      const summary = calculateGoalSummary(goals);
      setGoalSummary(summary);
    } else {
      setGoalSummary({
        totalCurrentAmount: 0,
        totalTargetAmount: 0,
        overallProgress: 0
      });
    }
  }, [goals]);

  return goalSummary;
};