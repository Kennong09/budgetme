import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercentage } from '../../utils/helpers';
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import HighchartsReact from 'highcharts-react-official';
import { refreshFamilyMembershipsView } from '../../utils/helpers';
import { useFamilyData, useFamilyMembers, useFamilyGoals, useJoinRequests } from './hooks';
import { familyService } from '../../services/database/familyService';
import { invitationService } from '../../services/database/invitationService';
import { joinRequestService } from '../../services/database/joinRequestService';

// Import tab components
import OverviewTab from './tabs/OverviewTab';
import MembersTab from './tabs/MembersTab';
import ActivityTab from './tabs/ActivityTab';
import GoalsTab from './tabs/GoalsTab';
import NoFamilyHandler from './NoFamilyHandler';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import shared dashboard styles
import "../dashboard/dashboard.css";

// Import types
import { Family, FamilyMember, Goal, Transaction, RecentActivity } from './types';


// --- COMPONENTS ---

// PendingJoinRequestsSection component has been extracted to './PendingJoinRequestsSection'
// JoinRequestsSection component has been extracted to './components/JoinRequestsSection'

const FamilyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { familyId: urlFamilyId } = useParams<{ familyId?: string }>();
  
  // Use custom hooks for family data 
  const {
    familyData,
    setFamilyData,
    isLoadingFamilyData: isLoadingFamily,
    fetchFamilyData
  } = useFamilyData(user?.id, showErrorToast);
  
  const { 
    members, 
    fetchFamilyMembers, 
    setMembers 
  } = useFamilyMembers(showErrorToast);
  
  const {
    familyGoals,
    sharedGoalPerformanceChartData,
    sharedGoalBreakdownChartData,
    setSharedGoalPerformanceChartData,
    setSharedGoalBreakdownChartData,
    fetchFamilyGoals: fetchGoals,
    setFamilyGoals
  } = useFamilyGoals(showErrorToast);
  
  const {
    fetchJoinRequests
  } = useJoinRequests(showErrorToast, showSuccessToast);
  const [summaryData, setSummaryData] = useState<any | null>(null);
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryChartData] = useState<any | null>(null);
  // Get initial tab from URL or use default
  const initialTab = searchParams.get('tab') as ('overview' | 'members' | 'activity' | 'goals') || "overview";
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity' | 'goals'>(initialTab);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Handle tab change with URL update
  const handleTabChange = (tab: 'overview' | 'members' | 'activity' | 'goals') => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
    setActiveTab(tab);
  };
  
  // Goal contribution data states
  const [goalContributions] = useState<any[]>([]);
  const [contributionChartData] = useState<any | null>(null);
  const [contributionPieChartData] = useState<any | null>(null);
  const [selectedGoalForContributions] = useState<string | null>(null);
  const [loadingContributions] = useState<boolean>(false);
  
  // Quick goal contribution modal state
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>("");
  
  // Budget-related state variables
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [budgetUtilization, setBudgetUtilization] = useState<number>(0);
  const [isContributing, setIsContributing] = useState<boolean>(false);
  const [isLoadingGoals] = useState(false);
  const [budgetPerformanceData] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  // Chart data states from hooks above, not duplicating

  // Chart refs
  const contributionBarChartRef = useRef<HighchartsReact.RefObject>(null);
  const contributionPieChartRef = useRef<HighchartsReact.RefObject>(null);
  const categoryChartRef = useRef<HighchartsReact.RefObject>(null);
  const budgetPerformanceChartRef = useRef<HighchartsReact.RefObject>(null);
  const goalPerformanceChartRef = useRef<HighchartsReact.RefObject>(null);
  const goalBreakdownChartRef = useRef<HighchartsReact.RefObject>(null);

  // Real-time subscription states
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  // Helper functions
  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      const rect = (event?.target as HTMLElement)?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
      }
    }
  };
  
  const getMemberRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'admin': 'badge-danger',
      'moderator': 'badge-warning',
      'member': 'badge-primary'
    };
    return `badge ${roleColors[role] || 'badge-secondary'}`;
  };
  
  const getRemainingDays = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const fetchGoalContributions = async (goalId: string) => {
    // This function is now handled by the GoalsTab component
    console.log('fetchGoalContributions called for:', goalId);
  };
  
  // Tooltip content
  const tooltipContent = {
    'family-visibility': {
      title: 'Family Visibility',
      description: 'Public families can be discovered by other users. Private families require an invite.'
    },
    'family-income': {
      title: 'Family Income',
      description: 'Total combined income from all family members for the current period.'
    },
    'family-expenses': {
      title: 'Family Expenses',
      description: 'Total combined expenses from all family members for the current period.'
    },
    'family-balance': {
      title: 'Family Balance',
      description: 'Net balance calculated as total income minus total expenses.'
    },
    'family-savings-rate': {
      title: 'Savings Rate',
      description: 'Percentage of income saved, calculated as (Income - Expenses) / Income × 100.'
    }
  };
  
  // Channel names for subscriptions
  const familyChannelName = `family-changes-${user?.id}`;
  const memberChannelName = `family-members-${user?.id}`;
  const goalChannelName = `family-goals-${familyData?.id}`;
  const transactionChannelName = `family-transactions-${familyData?.id}`;
  const activityChannelName = `family-activity-${familyData?.id}`;
  const userMembershipChannelName = `user-membership-${user?.id}`;
  

  // Memoize data update functions to use in subscriptions
  const updateTransactionData = useCallback(async (memberUserIds: string[]) => {
    try {
      // Get current month date range
      const currentDate = new Date();
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .in('user_id', memberUserIds)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (!txError && txData) {
        setTransactions(txData);
        
        // Recalculate summary data
        const income = txData
          .filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        const expenses = txData
          .filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        setTotalIncome(income);
        setTotalExpenses(expenses);
          
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
        const utilization = income > 0 ? (expenses / income) * 100 : 0;
        setBudgetUtilization(utilization);
        
        setSummaryData({
          totalBudget: 0,
          totalSpent: expenses,
          remainingBudget: income - expenses,
          savingsRate,
          upcomingBills: 0,
          familyGoalsProgress: 0,
        });

        // Update family goals
        if (familyData?.id) {
          fetchGoals(familyData.id);
        }
        
        // Update budget performance chart if needed
      }
    } catch (err) {
      console.error("Error updating transaction data:", err);
    }
  }, [familyData, fetchGoals]);
  
  // The fetchFamilyGoals function has been moved to the useFamilyGoals hook

  const updateRecentActivity = useCallback(async (familyId: string, memberUserIds: string[]) => {
    if (!familyId || !memberUserIds.length) return;
    
    try {
      // Initialize array to hold activity items
      const activities: RecentActivity[] = [];
      
      // 1. Recent member joins (up to 3)
      const { data: recentJoins, error: joinsError } = await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('family_id', familyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!joinsError && recentJoins && recentJoins.length > 0) {
        // Get user profiles separately
        const joinUserIds = recentJoins.map(join => join.user_id);
        const { data: joinProfiles, error: joinProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', joinUserIds);
          
        if (!joinProfilesError && joinProfiles) {
          recentJoins.forEach(join => {
            const profile = joinProfiles.find(p => p.id === join.user_id);
            if (profile) {
              activities.push({
                id: `join-${join.id}`,
                type: 'join',
                user: profile.user_metadata?.username || profile.user_metadata?.full_name || profile.email || "Family Member",
                description: "joined the family.",
                date: join.created_at,
                icon: "fa-user-plus"
              });
            }
          });
        }
      }
      
      // 2. Recent goals created (up to 3)
      const { data: recentGoals, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          created_at
        `)
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!goalsError && recentGoals && recentGoals.length > 0) {
        // Get user profiles separately
        const goalUserIds = recentGoals.map(goal => goal.user_id);
        const { data: goalProfiles, error: goalProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', goalUserIds);
          
        if (!goalProfilesError && goalProfiles) {
          recentGoals.forEach(goal => {
            const profile = goalProfiles.find(p => p.id === goal.user_id);
            if (profile) {
              activities.push({
                id: `goal-${goal.id}`,
                type: 'goal',
                user: profile.user_metadata?.username || profile.user_metadata?.full_name || profile.email || "Family Member",
                description: `created a new goal '${goal.goal_name}'.`,
                date: goal.created_at,
                icon: "fa-flag-checkered"
              });
            }
          });
        }
      }
      
      // 3. Recent transactions (up to 4)
      const { data: recentTransactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          amount,
          description,
          date,
          created_at,
          type
        `)
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(4);
        
      if (!txError && recentTransactions && recentTransactions.length > 0) {
        // Get user profiles separately
        const txUserIds = recentTransactions.map(tx => tx.user_id);
        const { data: txProfiles, error: txProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', txUserIds);
          
        if (!txProfilesError && txProfiles) {
          recentTransactions.forEach(tx => {
            const profile = txProfiles.find(p => p.id === tx.user_id);
            if (profile) {
              activities.push({
                id: `tx-${tx.id}`,
                type: 'transaction',
                user: profile.user_metadata?.username || profile.user_metadata?.full_name || profile.email || "Family Member",
                description: `${tx.type === 'expense' ? 'spent' : 'received'} ${formatCurrency(tx.amount)} ${tx.description ? `for ${tx.description}` : ''}.`,
                date: tx.created_at,
                icon: tx.type === 'expense' ? "fa-credit-card" : "fa-money-bill-alt"
              });
            }
          });
        }
      }
      
      // Sort all activities by date (newest first)
      const sortedActivities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
        
      setRecentActivity(sortedActivities);
    } catch (err) {
      console.error("Error updating activity feed:", err);
    }
  }, []);

  // --- Main data fetching function ---
  // Removed duplicate  // Fetch family data internal function (for retries and internal calls)
  const fetchFamilyDataInternal = useCallback(async (retryCount: number = 0, maxRetries: number = 3, forceFamilyId?: string) => {
    if (!user) return;
    
    // Prevent multiple simultaneous requests
    if (isLoadingFamily) return;
    
    try {
      // Enforce a maximum retry count to prevent infinite loops
      if (retryCount >= maxRetries) {
        showErrorToast("Could not load family data. Please refresh the page.");
        return;
      }
      
      // Use the family service to get user's family
      const family = await familyService.getUserFamily(user.id);
      
      if (!family) {
        // If we've just created a family, try a few times before giving up
        if (retryCount < maxRetries - 1) {
          setTimeout(() => {
            fetchFamilyDataInternal(retryCount + 1, maxRetries);
          }, 1500);
          return;
        }
        
        setFamilyData(null);
        return;
      }
      
      setFamilyData(family);
      setIsCreator(user.id === family.created_by);
      
      // Get family members using the service
      const members = await familyService.getFamilyMembers(family.id);
      setMembers(members);
      
      // Now that we have member IDs, fetch all relevant data
      if (members.length > 0) {
        try {
          // Use our callback functions to fetch and set all related data
          await Promise.all([
            updateTransactionData(members.map(member => member.user_id)),
            fetchGoals(family.id),
            updateRecentActivity(family.id, members.map(member => member.user_id))
          ]);
        } catch (err) {
          console.error("Error fetching related data:", err);
          // Continue with limited data
        }
      } else {
        // No members - set empty state
        setMembers([]);
        setTransactions([]);
        setFamilyGoals([]);
        setRecentActivity([]);
        setSummaryData({
          income: 0,
          expenses: 0,
          balance: 0,
          savingsRate: 0,
        });
        setSharedGoalPerformanceChartData(null);
        setSharedGoalBreakdownChartData(null);
      }
    } catch (err) {
      console.error("Error in fetchFamilyData:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      
      // If we've just created a family, try a few times before giving up
      if (retryCount < maxRetries - 1) {
        setTimeout(() => {
          fetchFamilyDataInternal(retryCount + 1, maxRetries);
        }, 1500);
        return;
      }
      
      showErrorToast(`Error loading family data: ${errorMessage}`);
    }
  }, [user, isLoadingFamily, fetchGoals, setFamilyData, setFamilyGoals, setMembers, setSharedGoalBreakdownChartData, setSharedGoalPerformanceChartData, showErrorToast, updateRecentActivity, updateTransactionData]);

  // --- DATA FETCHING & PROCESSING ---
  useEffect(() => {
    if (!user) {
      showErrorToast("Please sign in to view your family dashboard");
      // Navigation would be handled by auth redirect
      return;
    }

    // Handle URL parameters for direct linking
    const familyIdFromUrl = urlFamilyId || searchParams.get('familyId');
    
    // Initial data fetch - check if we've just created a family
    // or if we're directly accessing a specific family
    const queryParams = new URLSearchParams(window.location.search);
    const justCreated = queryParams.get('created') === 'true';
    
    // Use setTimeout to prevent immediate execution and allow component to fully mount
    const timer = setTimeout(() => {
      if (justCreated) {
        // Start with higher retry attempts for newly created families
        fetchFamilyDataInternal(0, 5); // Allow more retries for newly created families
      } else if (familyIdFromUrl) {
        // For direct access with family ID, attempt to fetch that specific family
        fetchFamilyDataInternal(0, 3, familyIdFromUrl);
      } else {
        fetchFamilyDataInternal(0, 3); // Standard number of retries
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, showErrorToast, urlFamilyId, searchParams, fetchFamilyDataInternal]);
  
  // Fetch family goals when component mounts or family data changes
  useEffect(() => {
    // Only proceed if we have family data and the user
    if (familyData?.id && user) {
      console.log('Fetching family goals on mount or family data change');
      // Add a slight delay to prevent immediate execution
      const timer = setTimeout(() => {
        fetchGoals(familyData.id);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [familyData?.id, user, fetchGoals]);
  
  // Set up user-specific subscription to detect when the user is added to a family
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up user membership subscription");
    
    // Subscribe to changes in the family_members table specific to this user
    const userMembershipSubscription = supabase
      .channel(userMembershipChannelName)
      .on('postgres_changes', {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'family_members',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('User membership changed:', payload);
        
        try {
          // When a new membership is created or updated
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'active')) {
            // Family data will be refreshed on next load
          } 
          // Handle case where user is removed from family
          else if (payload.eventType === 'DELETE' || 
                  (payload.eventType === 'UPDATE' && payload.new && payload.new.status !== 'active')) {
            // User was removed from family or deactivated
            setFamilyData(null);
            setMembers([]);
            // Reset all other related data
            setTransactions([]);
            setFamilyGoals([]);
            setRecentActivity([]);
            setSummaryData(null);
            setSharedGoalPerformanceChartData(null);
            setSharedGoalBreakdownChartData(null);
          }
        } catch (error) {
          console.error("Error handling membership change:", error);
          // Don't show toast here to avoid spamming the user
        }
      })
      .subscribe();
    // Clean up subscription on unmount  
    return () => {
      userMembershipSubscription.unsubscribe();
    };
  }, [user, userMembershipChannelName, setFamilyData, setMembers, setTransactions, setFamilyGoals, setRecentActivity, setSummaryData, setSharedGoalPerformanceChartData, setSharedGoalBreakdownChartData]);
  
  // Set up real-time subscriptions for existing family data
  useEffect(() => {
    if (!user || !familyData) return;
    
    // ... (rest of the code remains the same)
    // Array to hold all subscriptions
    const newSubscriptions: any[] = [];
    
    // Add a delay before setting up subscriptions to prevent immediate execution
    const setupTimer = setTimeout(() => {
      console.log(`Setting up real-time subscriptions for family ${familyData.id}`);
      
      try {
        // 1. Set up family details subscription
        const newFamilySubscription = supabase
          .channel(familyChannelName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'families',
            filter: `id=eq.${familyData.id}`
          }, (payload) => {
            console.log('Family update received:', payload);
            // Update family data when it changes
            if (payload.eventType === 'UPDATE' && payload.new) {
              setFamilyData(payload.new as Family);
            }
          })
          .subscribe();
          
        newSubscriptions.push(newFamilySubscription);
  
        // 2. Set up family members subscription with simplified approach
        const newMemberSubscription = supabase
          .channel(memberChannelName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'family_members',
            filter: `family_id=eq.${familyData.id}`
          }, async (payload) => {
            console.log('Family member update received:', payload);
            
            // Refresh all members when there's a change - using the separate queries approach
            const { data, error } = await supabase
              .from('family_members')
              .select(`
                id,
                family_id,
                user_id,
                role,
                status,
                created_at,
                updated_at
              `)
              .eq('family_id', familyData.id)
              .eq('status', 'active');
    
            if (!error && data) {
              // Fetch user profiles separately with minimal fields
              let processedMembers: FamilyMember[] = [];
              if (data && data.length > 0) {
                const memberUserIds = data.map(member => member.user_id);
                
                // Simplified query to avoid recursion
                const { data: userProfiles, error: profilesError } = await supabase
                  .from('profiles')
                  .select(`
                    id,
                    email,
                    created_at,
                    updated_at,
                    last_sign_in_at,
                    user_metadata
                  `)
                  .in('id', memberUserIds);
                  
                if (profilesError) {
                  console.error("Error fetching user profiles:", profilesError);
                  // Continue with limited data rather than failing
                }
                
                // Match profiles with members more explicitly
                processedMembers = data.map(member => {
                  const userProfile = userProfiles?.find(profile => profile.id === member.user_id);
                  return {
                    ...member,
                    user: userProfile ? {
                      id: userProfile.id,
                      email: userProfile.email,
                      created_at: userProfile.created_at,
                      updated_at: userProfile.updated_at,
                      last_sign_in_at: userProfile.last_sign_in_at,
                      user_metadata: userProfile.user_metadata || {}
                    } : undefined,
                    joined_at: member.created_at || ''
                  };
                });
              }
    
              setMembers(processedMembers);
              
              // Also update recent activity since membership has changed
              if (processedMembers.length > 0) {
                const memberUserIds = processedMembers.map(member => member.user_id);
                await updateRecentActivity(familyData.id, memberUserIds);
              }
            }
          })
          .subscribe();
          
        newSubscriptions.push(newMemberSubscription);
    
        // 3. Set up goals subscription - if members are available
        if (members.length > 0) {
          const memberUserIds = members.map(member => member.user_id);
          
          if (memberUserIds.length > 0) {
            // Create goal subscription channel - listen for family goals by family_id
            const newGoalSubscription = supabase
              .channel(goalChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'goals',
                filter: `family_id=eq.${familyData.id}`
              }, async (payload) => {
                console.log('Family goal update received:', payload);
                
                // Refresh goals data
                await fetchGoals(familyData.id);
                
                // Update activity feed since goals have changed
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            // Also listen for updates to any goals that might be shared with this family
            const goalSharingSubscription = supabase
              .channel(`${goalChannelName}-sharing`)
              .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'goals',
              }, async (payload) => {
                // Check if this update involves sharing with our family
                if (payload.new && payload.new.family_id === familyData.id) {
                  console.log('Goal shared with family:', payload);
                  await fetchGoals(familyData.id);
                  await updateRecentActivity(familyData.id, memberUserIds);
                }
              })
              .subscribe();
              
            newSubscriptions.push(goalSharingSubscription);
              
            // Add to subscriptions array
            newSubscriptions.push(newGoalSubscription);
            
            // Create transaction subscription channel
            const newTransactionSubscription = supabase
              .channel(transactionChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `user_id=in.(${memberUserIds.join(',')})`
              }, async (payload) => {
                console.log('Transaction update received:', payload);
                
                // Update transaction data, summary, and charts
                await updateTransactionData(memberUserIds);
                
                // Update activity feed since transactions have changed
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            // Add to subscriptions array  
            newSubscriptions.push(newTransactionSubscription);
            
            // Set up an activity-specific subscription for real-time updates to the activity feed
            const activitySubscription = supabase
              .channel(activityChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'family_members',
                filter: `family_id=eq.${familyData.id}`
              }, async (payload) => {
                // Update activity feed when family membership changes
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            newSubscriptions.push(activitySubscription);
          }
        }
        
        // Save subscription references
        setSubscriptions(newSubscriptions);
      } catch (err) {
        console.error("Error setting up subscriptions:", err);
      }
    }, 2000);
    
    // Clean up timer and subscriptions when component unmounts or familyData changes
    return () => {
      clearTimeout(setupTimer);
      subscriptions.forEach(subscription => supabase.removeChannel(subscription));
    };
  }, [user, familyData, members, familyChannelName, memberChannelName, goalChannelName, transactionChannelName, activityChannelName, updateTransactionData, fetchGoals, updateRecentActivity, setFamilyData, setMembers, subscriptions]);

  // --- NEW FUNCTIONS FOR FAMILY MANAGEMENT ---

  // State for account selection in contribution modal
  const [userAccounts, setUserAccounts] = useState<{id: string, account_name: string}[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("default");

  // Goal contribution functions
  const openContributeModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionAmount("");
    fetchUserAccounts();
    setShowContributeModal(true);
  };

  const closeContributeModal = () => {
    setShowContributeModal(false);
    setSelectedGoal(null);
  };
  
  // Function to fetch user accounts for contribution
  const fetchUserAccounts = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('user_id', user.id)
        .order('account_name');
        
      if (error) {
        console.error('Error fetching user accounts:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('User accounts fetched:', data);
        setUserAccounts(data);
        // Set first account as default selection if available
        setSelectedAccountId(data[0].id);
      } else {
        // If no accounts, use default
        setUserAccounts([{ id: 'default', account_name: 'Default Account' }]);
        setSelectedAccountId('default');
      }
    } catch (err) {
      console.error('Error in fetchUserAccounts:', err);
      // Set a default account if there's an error
      setUserAccounts([{ id: 'default', account_name: 'Default Account' }]);
      setSelectedAccountId('default');
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !user || !contributionAmount) return;
    
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }
    
    // Debug goal type and family information
    console.log('Selected goal details before contribution:', {
      id: selectedGoal.id,
      name: selectedGoal.goal_name,
      isShared: selectedGoal.is_shared,
      familyId: selectedGoal.family_id,
      currentAmount: selectedGoal.current_amount,
      owner: selectedGoal.user_id,
      currentUser: user.id
    });
    
    setIsContributing(true);
    try {
      // Create contribution data - note: goal_contributions table doesn't have family_id column
      const contributionData = {
        goal_id: selectedGoal.id,
        user_id: user.id,
        amount: amount,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // Note: We don't include family_id in contribution data as that column doesn't exist
      // We'll only add family_id to the transaction record
      
      console.log('Creating contribution with data:', contributionData);
      
      // Create a contribution record
      const { data: contribution, error: contribError } = await supabase
        .from('goal_contributions')
        .insert(contributionData)
        .select();
        
      if (contribError) {
        console.error('Contribution insert error:', contribError);
        throw contribError;
      }
      
      console.log('Contribution created successfully:', contribution);
      
      // Update goal progress
      const newAmount = selectedGoal.current_amount + amount;
      const newStatus = newAmount >= selectedGoal.target_amount ? 'completed' : 'in_progress';
      
      console.log(`Updating goal ${selectedGoal.id} with new amount: ${newAmount}, new status: ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: newStatus
        })
        .eq('id', selectedGoal.id);
        
      if (updateError) {
        console.error('Goal update error:', updateError);
        throw updateError;
      }
      
      console.log('Goal updated successfully');
      
      // Also create a transaction record to ensure it appears in transaction history
      const transactionData: any = {
        user_id: user.id,
        goal_id: selectedGoal.id,
        amount: amount,
        date: new Date().toISOString(),
        type: 'expense',
        account_id: selectedAccountId, // Use selected account
        notes: `Contribution to goal: ${selectedGoal.goal_name}`,
        category: 'Contribution', // Explicitly set as "Contribution"
        category_id: 'contribution', // Set category_id for proper categorization
        created_at: new Date().toISOString()
      };
      
      // Add family_id for family goals
      if (selectedGoal.family_id) {
        transactionData.family_id = selectedGoal.family_id;
        console.log('This is a family goal, adding family_id:', selectedGoal.family_id);
      }
      
      console.log('Creating transaction record:', transactionData);
      
      // Create the transaction record
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select();
        
      if (txError) {
        console.error('Transaction insert error:', txError);
        // Don't throw error here, as the contribution itself succeeded
        console.warn('Warning: Transaction record creation failed but contribution was successful');
      } else {
        console.log('Transaction record created successfully:', txData);
      }
      
      showSuccessToast(`Successfully contributed ${formatCurrency(amount)} to ${selectedGoal.goal_name}`);
      
      // Manually refresh family data to show updated values
      if (familyData?.id) {
        fetchFamilyMembers(familyData.id);
        fetchGoals(familyData.id);
        fetchJoinRequests(familyData.id);
      }
      
      // The subscription will update the UI automatically too
      closeContributeModal();
    } catch (error) {
      console.error("Error contributing to goal:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showErrorToast(`Failed to contribute to goal: ${errorMessage}`);
    } finally {
      setIsContributing(false);
    }
  };

  // Delete family confirmation modal
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  // Leave family function for regular members (not creators)
  const handleLeaveFamily = async () => {
    if (!familyData || !user) return;
    
    setIsDeleting(true);
    try {
      // Verify user is not the creator - they can't leave, only delete
      if (user.id === familyData.created_by) {
        showErrorToast("As the family creator, you must delete the family instead of leaving it.");
        setIsDeleting(false);
        closeDeleteModal();
        return;
      }

      // Remove the user's membership
      const { error: memberDeleteError } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyData.id)
        .eq('user_id', user.id);
        
      if (memberDeleteError) {
        throw new Error(`Error leaving family: ${memberDeleteError.message}`);
      }
      
      // Try to refresh the materialized view, but don't block on failure
      try {
        await refreshFamilyMembershipsView();
      } catch (refreshError) {
        console.warn("Failed to refresh materialized view (non-critical):", refreshError);
        // Continue anyway as this isn't critical
      }
      
      // Success - navigate to create family page
      showSuccessToast("You've successfully left the family group");
      
      // Add a short timeout to ensure Supabase events have time to propagate
      // before redirecting the user
      setTimeout(() => {
        navigate('/family/create');
      }, 300);
      
    } catch (err) {
      console.error("Error leaving family:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      
      showErrorToast(`Failed to leave family: ${errorMessage}`);
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  // Edit family function
  const navigateToEdit = () => {
    if (!familyData) return;
    navigate(`/family/${familyData.id}/edit`);
  };

  // Handle successful family join
  const handleJoinSuccess = useCallback(async () => {
    // Refresh family data after successful join
    if (user) {
      // Add a small delay to allow the backend to process the join
      setTimeout(() => {
        fetchFamilyDataInternal(0, 3);
      }, 1000);
    }
  }, [user, fetchFamilyDataInternal]);


  return (
    <div className="container-fluid">
      {/* Show loading state while fetching family data */}
      {isLoadingFamily ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="text-gray-600">Loading family information...</h5>
        </div>
      ) : (
        <>
          {/* Render no family state when user doesn't belong to any family */}
          {!familyData ? (
            <NoFamilyHandler onJoinSuccess={handleJoinSuccess} />
          ) : (
            <>
      {/* Delete/Leave Modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isCreator ? "Confirm Deletion" : "Confirm Leave Family"}</h5>
                <button type="button" className="close" onClick={closeDeleteModal} disabled={isDeleting}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                    style={{ width: "80px", height: "80px", backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                    <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
                  </div>
                </div>
                {isCreator ? (
                  <>
                    <p>Are you sure you want to delete your family group "{familyData?.family_name}"?</p>
                    <p className="text-muted small">This will remove all family member associations. Individual user data like transactions and goals will remain intact, but will no longer be associated with this family.</p>
                  </>
                ) : (
                  <>
                    <p>Are you sure you want to leave the family group "{familyData?.family_name}"?</p>
                    <p className="text-muted small">You will no longer have access to family financial data or shared goals. Your personal data will remain intact.</p>
                  </>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleLeaveFamily}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Leaving...
                    </>
                  ) : "Leave"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Goal Contribution Modal */}
      {showContributeModal && selectedGoal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Contribute to {selectedGoal.goal_name}</h5>
                  <button type="button" className="close" onClick={closeContributeModal}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="progress mb-3" style={{height: '10px'}}>
                    <div 
                      className={`progress-bar ${
                        selectedGoal.percentage >= 90 ? "bg-success" : 
                        selectedGoal.percentage >= 50 ? "bg-info" : 
                        selectedGoal.percentage >= 25 ? "bg-warning" : 
                        "bg-danger"
                      }`}
                      role="progressbar" 
                      style={{ width: `${selectedGoal.percentage}%` }}
                      aria-valuenow={selectedGoal.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <div>Current: {formatCurrency(selectedGoal.current_amount)}</div>
                    <div>Target: {formatCurrency(selectedGoal.target_amount)}</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contributionAmount">Contribution Amount</label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text">$</span>
                      </div>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="contributionAmount" 
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="accountSelect">Select Account</label>
                    <select
                      className="form-control"
                      id="accountSelect"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      disabled={isContributing}
                    >
                      {userAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Choose the account from which to make this contribution.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeContributeModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={isContributing || !contributionAmount}
                    onClick={handleContribute}
                  >
                    {isContributing ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Contributing...
                      </>
                    ) : (
                      'Contribute Now'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
          {familyData?.family_name || "Family Dashboard"}
          {isCreator && (
            <span className="badge badge-primary ml-2">Creator</span>
          )}
          {familyData && (
            <span 
              className={`badge ml-2 ${familyData.is_public ? 'badge-success' : 'badge-secondary'}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => toggleTip('family-visibility', e)}
            >
              <i className={`fas ${familyData.is_public ? 'fa-globe' : 'fa-lock'} mr-1`}></i> 
              {familyData.is_public ? 'Public' : 'Private'}
            </span>
          )}
        </h1>
        <div className="animate__animated animate__fadeIn">
          {!familyData ? (
            <Link to="/family/create" className="btn btn-success shadow-sm mr-2" style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}>
              <i className="fas fa-home mr-2"></i>Create Family
            </Link>
          ) : (
            <>
              {isCreator ? (
                // Creator can delete and edit family
                <>
                  <button 
                    onClick={openDeleteModal} 
                    className="btn btn-danger shadow-sm mr-2"
                    style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                  >
                    <i className="fas fa-trash mr-2"></i> Delete Family
                  </button>
                  <button 
                    onClick={navigateToEdit} 
                    className="btn btn-primary mr-2 shadow-sm"
                    style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                  >
                    <i className="fas fa-edit mr-2"></i> Edit Family
                  </button>
                </>
              ) : (
                // Regular members can leave family
                <button 
                  onClick={openDeleteModal} 
                  className="btn btn-warning shadow-sm mr-2"
                  style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i> Leave Family
                </button>
              )}
              <Link to={`/family/${familyData.id}/invite`} className="btn btn-success shadow-sm" style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}>
                <i className="fas fa-user-plus mr-2"></i> Invite Member
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Family Income
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-income', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.income) : formatCurrency(0)}
                  </div>
                  {!summaryData || summaryData.income === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> No income recorded this month
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-calendar fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Family Expenses
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-expenses', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.expenses) : formatCurrency(0)}
                  </div>
                  {!summaryData || summaryData.expenses === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> No expenses recorded this month
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fa-solid fa-people-roof fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Family Balance
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-balance', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.balance) : formatCurrency(0)}
                  </div>
                  {!summaryData ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Add transactions to calculate balance
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-clipboard-list fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Family Savings Rate
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-savings-rate', e)}
                    ></i>
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto"><div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">{summaryData ? formatPercentage(summaryData.savingsRate) : "0%"}</div></div>
                    <div className="col"><div className="progress progress-sm mr-2"><div className="progress-bar bg-success" role="progressbar" style={{ width: `${summaryData ? summaryData.savingsRate : 0}%` }}></div></div></div>
                  </div>
                  {!summaryData || summaryData.savingsRate === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Record income to calculate savings rate
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-percentage fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {activeTip && tooltipPosition && tooltipContent[activeTip as keyof typeof tooltipContent] && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "12px 15px",
            borderRadius: "8px",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            maxWidth: "300px",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          <div className="font-weight-bold mb-2">{tooltipContent[activeTip as keyof typeof tooltipContent].title}</div>
          <p className="mb-0">{tooltipContent[activeTip as keyof typeof tooltipContent].description}</p>
        </div>
      )}
      
      {/* Tabs */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button className={`nav-link btn btn-link ${activeTab === "overview" ? "active" : ""}`} onClick={() => handleTabChange("overview")}>
                <i className="fas fa-chart-pie mr-1"></i> Overview
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn btn-link ${activeTab === "goals" ? "active" : ""}`} onClick={() => handleTabChange("goals")}>
                <i className="fas fa-flag-checkered mr-1"></i> Family Goals
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn btn-link ${activeTab === "members" ? "active" : ""}`} onClick={() => handleTabChange("members")}>
                <i className="fas fa-users mr-1"></i> Members ({members.length})
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn btn-link ${activeTab === "activity" ? "active" : ""}`} onClick={() => handleTabChange("activity")}>
                <i className="fas fa-history mr-1"></i> Recent Activity
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === "overview" && (
            <OverviewTab
              totalExpenses={totalExpenses}
              totalIncome={totalIncome}
              budgetUtilization={budgetUtilization}
              familyGoalsCount={familyGoals.length}
              categoryChartData={categoryChartData}
              budgetPerformanceData={budgetPerformanceData}
              goalPerformanceData={sharedGoalPerformanceChartData}
              goalBreakdownData={sharedGoalBreakdownChartData}
              expenseChartRef={categoryChartRef}
              budgetChartRef={budgetPerformanceChartRef}
              goalChartRef={goalPerformanceChartRef}
              goalBreakdownChartRef={goalBreakdownChartRef}
              toggleTip={toggleTip}
            />
          )}

          {activeTab === "members" && (
            <MembersTab
              isCreator={isCreator}
              familyData={familyData}
              members={members}
              getMemberRoleBadge={getMemberRoleBadge}
              familyId={familyData?.id}
            />
          )}

          {activeTab === "activity" && (
            <ActivityTab recentActivity={recentActivity} />
          )}


          {activeTab === "goals" && (
            <GoalsTab
              familyGoals={familyGoals}
              isCreator={isCreator}
              loadingFamilyGoals={isLoadingGoals}
              selectedGoalForContributions={selectedGoalForContributions}
              loadingContributions={loadingContributions}
              goalContributions={goalContributions}
              contributionChartData={contributionChartData}
              contributionPieChartData={contributionPieChartData || []}
              contributionBarChartRef={contributionBarChartRef}
              contributionPieChartRef={contributionPieChartRef}
              openContributeModal={openContributeModal}
              fetchGoalContributions={fetchGoalContributions}
              toggleTip={toggleTip}
              getRemainingDays={getRemainingDays}
            />
          )}
        </div>
      </div>

            </>
          )}
        </>
      )}
    </div>
  );
};

export default FamilyDashboard;
