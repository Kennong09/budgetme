import { useState, useEffect } from 'react';
import { Goal, FilterState, GoalSummary, FamilyState } from '../types';
import { applyGoalFilters, calculateGoalSummary } from '../utils/goalUtils';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { useNavigate } from 'react-router-dom';

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

  // Fetch goals data from Supabase
  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        showErrorToast("Please sign in to view your goals");
        navigate("/login");
        return;
      }
      
      // Fetch personal goals
      const { data: personalGoals, error: personalGoalsError } = await supabase
        .from('goal_details')
        .select('*')
        .eq('user_id', user.id);
        
      if (personalGoalsError) {
        throw new Error(`Error fetching personal goals: ${personalGoalsError.message}`);
      }
      
      // Mark personal goals, ensuring any with family_id are correctly marked as shared
      const formattedPersonalGoals = (personalGoals || []).map(goal => ({
        ...goal,
        is_shared: !!goal.family_id // Ensure goals with family_id are marked as shared
      }));
      
      let allGoals = [...formattedPersonalGoals];
      
      // If user is in a family, also fetch family's shared goals
      if (familyState.isFamilyMember && familyState.userFamilyId) {
        // Fetch shared goals from other family members
        const { data: sharedGoals, error: sharedGoalsError } = await supabase
          .from('goals')
          .select(`
            *,
            profiles:user_id (
              user_metadata
            )
          `)
          .eq('family_id', familyState.userFamilyId)
          .neq('user_id', user.id); // Only goals from other family members
          
        if (!sharedGoalsError && sharedGoals) {
          // Format shared goals with owner information
          const formattedSharedGoals = sharedGoals.map(goal => ({
            ...goal,
            is_shared: true,
            shared_by: goal.user_id,
            shared_by_name: goal.profiles?.user_metadata?.username || 
                           goal.profiles?.user_metadata?.full_name || 
                           "Family Member"
          }));
          
          allGoals = [...formattedPersonalGoals, ...formattedSharedGoals];
        }
      }
      
      console.log(`Retrieved ${allGoals.length} goals (${formattedPersonalGoals.length} personal, ${allGoals.length - formattedPersonalGoals.length} shared)`);
      
      setGoals(allGoals);
      setLoading(false);
    } catch (err) {
      console.error("Error loading goals:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to load goals: ${errorMessage}`);
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

    // Create new goal subscription with unique channel name
    const newGoalSubscription = supabase
      .channel(goalChannelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log("Goal update received:", payload);
        fetchGoals(); // Refresh data when changes occur
      })
      .subscribe((status) => {
        console.log(`Goal subscription status: ${status}`);
      });

    // Save subscription references
    setGoalSubscription(newGoalSubscription);

    // Clean up subscription on unmount or when dependencies change
    return () => {
      console.log("Cleaning up subscription");
      if (newGoalSubscription) {
        supabase.removeChannel(newGoalSubscription);
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