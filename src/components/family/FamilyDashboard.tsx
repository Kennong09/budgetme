import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import ContributionModal from '../goals/components/ContributionModal';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Dashboard CSS imported at app level to avoid lazy loading issues

// Import types
import { Family, FamilyMember, Goal, Transaction, RecentActivity, FamilySummaryData } from './types';
import { Goal as MainGoalType } from '../../types';


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
    loadingFamilyGoals,
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
  const [summaryData, setSummaryData] = useState<FamilySummaryData | null>(null);
  
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
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>("");
  
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
  const [goalContributions, setGoalContributions] = useState<any[]>([]);
  const [contributionChartData, setContributionChartData] = useState<any | null>(null);
  const [contributionPieChartData, setContributionPieChartData] = useState<any | null>(null);
  const [selectedGoalForContributions, setSelectedGoalForContributions] = useState<string | null>(null);
  const [loadingContributions, setLoadingContributions] = useState<boolean>(false);
  
  // Quick goal contribution modal state
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [preSelectedGoal, setPreSelectedGoal] = useState<Goal | undefined>(undefined);
  
  // Budget-related state variables
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [budgetUtilization, setBudgetUtilization] = useState<number>(0);
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingFamily, setIsFetchingFamily] = useState<boolean>(false);
  
  // Add throttling for subscription refresh calls
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const REFRESH_THROTTLE_MS = 2000; // Minimum 2 seconds between subscription refreshes
  
  // Use refs to avoid dependency issues in useEffect
  const fetchGoalsRef = useRef(fetchGoals);
  fetchGoalsRef.current = fetchGoals;
  
  // Throttled fetchGoals function for subscriptions
  const throttledFetchGoals = useCallback(async (familyId: string) => {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
      console.log('Subscription refresh throttled - too frequent');
      return;
    }
    setLastRefreshTime(now);
    await fetchGoals(familyId);
  }, [fetchGoals, lastRefreshTime]);
  
  // Memoize chart data to prevent infinite re-renders
  const chartData = useMemo(() => {
    // Use toFixed to ensure consistent number comparison and prevent floating point precision issues
    const stabilizedExpenses = Number(totalExpenses.toFixed(2));
    const stabilizedIncome = Number(totalIncome.toFixed(2));
    const stabilizedUtilization = Number(budgetUtilization.toFixed(2));
    const stabilizedGoalsCount = familyGoals.length;
    
    return {
      totalExpenses: stabilizedExpenses,
      totalIncome: stabilizedIncome,
      budgetUtilization: stabilizedUtilization,
      familyGoalsCount: stabilizedGoalsCount
    };
  }, [totalExpenses, totalIncome, budgetUtilization, familyGoals.length]);
  
  // Add a refresh key to force chart re-render only when refresh button is clicked
  const [chartRefreshKey, setChartRefreshKey] = useState<number>(0);
  
  // Helper functions - using useCallback to prevent unnecessary re-renders
  const toggleTip = useCallback((tipId: string, event?: React.MouseEvent) => {
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
  }, [activeTip]);
  
  const getMemberRoleBadge = (role: string, isOwner: boolean = false) => {
    const roleColors: { [key: string]: string } = {
      'admin': 'badge-danger',
      'member': 'badge-primary',
      'viewer': 'badge-info'
    };
    const badgeClass = `badge ${roleColors[role] || 'badge-secondary'}`;
    const displayRole = isOwner ? 'Owner' : role.charAt(0).toUpperCase() + role.slice(1);
    
    return (
      <span className={badgeClass}>
        {displayRole}
      </span>
    );
  };
  
  const getRemainingDays = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  /**
   * Fetches goal contributions with contributor profiles and formats data for charts
   * @param goalId - The ID of the goal to fetch contributions for
   */
  const fetchGoalContributions = async (goalId: string) => {
    console.log('fetchGoalContributions called for:', goalId);
    
    try {
      setLoadingContributions(true);
      setSelectedGoalForContributions(goalId);
      
      // Fetch contributions first
      const { data: contributions, error: contribError } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('contribution_date', { ascending: false });
      
      if (contribError) {
        console.error('Error fetching contributions:', contribError);
        showErrorToast('Failed to load contribution data');
        setGoalContributions([]);
        setContributionChartData(null);
        setContributionPieChartData(null);
        return;
      }
      
      // If we have contributions, fetch the user profiles
      let enrichedContributions = contributions || [];
      if (contributions && contributions.length > 0) {
        const userIds = [...new Set(contributions.map(c => c.user_id))];
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        if (!profileError && profiles) {
          // Merge profiles data into contributions
          enrichedContributions = contributions.map(contrib => ({
            ...contrib,
            profiles: profiles.find(p => p.id === contrib.user_id)
          }));
        }
      }
      
      setGoalContributions(enrichedContributions);
      
      // Aggregate contributions by user for charts
      if (enrichedContributions && enrichedContributions.length > 0) {
        const aggregated = enrichedContributions.reduce((acc: any, contrib: any) => {
          const userId = contrib.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              userName: contrib.profiles?.full_name || 'Unknown',
              userAvatar: contrib.profiles?.avatar_url,
              totalAmount: 0,
              contributionCount: 0,
              contributions: []
            };
          }
          acc[userId].totalAmount += contrib.amount;
          acc[userId].contributionCount += 1;
          acc[userId].contributions.push(contrib);
          return acc;
        }, {});
        
        const aggregatedArray = Object.values(aggregated);
        
        // Format for bar chart (Highcharts column format)
        setContributionChartData({
          chart: { type: 'column' },
          title: { text: '' },
          xAxis: {
            categories: aggregatedArray.map((item: any) => item.userName),
            crosshair: true
          },
          yAxis: {
            min: 0,
            title: { text: 'Amount (₱)' }
          },
          tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
              '<td style="padding:0"><b>₱{point.y:.2f}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
          },
          plotOptions: {
            column: {
              pointPadding: 0.2,
              borderWidth: 0
            }
          },
          series: [{
            name: 'Total Contributions',
            data: aggregatedArray.map((item: any) => item.totalAmount),
            color: '#4e73df'
          }],
          credits: { enabled: false }
        });
        
        // Format for pie chart
        setContributionPieChartData({
          chart: { type: 'pie' },
          title: { text: '' },
          tooltip: {
            pointFormat: '{series.name}: <b>₱{point.y:.2f}</b> ({point.percentage:.1f}%)'
          },
          accessibility: {
            point: {
              valueSuffix: '%'
            }
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
              }
            }
          },
          series: [{
            name: 'Contribution',
            colorByPoint: true,
            data: aggregatedArray.map((item: any) => ({
              name: item.userName,
              y: item.totalAmount
            }))
          }],
          credits: { enabled: false }
        });
      } else {
        // No contributions - clear chart data
        setContributionChartData(null);
        setContributionPieChartData(null);
      }
      
    } catch (error) {
      console.error('Error in fetchGoalContributions:', error);
      showErrorToast('An error occurred while loading contributions');
      setGoalContributions([]);
      setContributionChartData(null);
      setContributionPieChartData(null);
    } finally {
      setLoadingContributions(false);
    }
  };
  
  // Manual refresh function for charts
  const handleRefreshCharts = async () => {
    if (!familyData?.id || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Refresh family goals and metrics
      await fetchGoals(familyData.id);
      await updateFamilyGoalsMetrics(familyData.id);
      
      showSuccessToast('Charts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing charts:', error);
      showErrorToast('Failed to refresh charts');
    } finally {
      setIsRefreshing(false);
    }
  };
  

  
  // Tooltip content
  const tooltipContent = {
    'family-visibility': {
      title: 'Family Visibility',
      description: 'Public families can be discovered by other users. Private families require an invite.'
    },
    'family-income': {
      title: 'Family Savings Target',
      description: 'Total target amount for all active family goals. This represents your family\'s collective savings objectives.'
    },
    'family-expenses': {
      title: 'Family Goals Progress',
      description: 'Total amount currently saved toward all family goals. This shows your family\'s progress toward your shared objectives.'
    },
    'family-balance': {
      title: 'Remaining to Save',
      description: 'Amount still needed to reach all family goals. This is the difference between your targets and current progress.'
    },
    'family-savings-rate': {
      title: 'Goals Progress Rate',
      description: 'Percentage of family goals completed, calculated as (Current Progress / Total Targets) × 100.'
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
  const updateFamilyGoalsMetrics = useCallback(async (familyId: string) => {
    try {
      if (!familyId) return;
      
      // Fetch family goals to calculate metrics
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'in_progress');

      if (!goalsError && goalsData) {
        // Calculate family goals-based financial metrics
        const totalTargetAmount = goalsData.reduce((sum, goal) => sum + (goal.target_amount || 0), 0);
        const totalCurrentAmount = goalsData.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
        const remainingAmount = totalTargetAmount - totalCurrentAmount;
        const progressRate = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
        
        // Set individual totals for compatibility with existing components
        setTotalIncome(totalTargetAmount); // Family's total savings targets
        setTotalExpenses(totalCurrentAmount); // Family's current progress
        
        // Calculate budget utilization based on goals progress
        const utilization = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
        setBudgetUtilization(utilization);
        
        setSummaryData({
          income: totalTargetAmount,     // Total family savings targets
          expenses: totalCurrentAmount, // Current progress toward goals
          balance: remainingAmount,     // Remaining amount needed
          savingsRate: progressRate,    // Progress percentage
        });

        // Don't call fetchGoals here to prevent infinite loop
        // The goals data will be refreshed through real-time subscriptions or manual refresh
        
      } else {
        // No goals found - set zero state
        setTotalIncome(0);
        setTotalExpenses(0);
        setBudgetUtilization(0);
        
        setSummaryData({
          income: 0,
          expenses: 0,
          balance: 0,
          savingsRate: 0,
        });
      }
    } catch (err) {
      console.error("Error updating family goals metrics:", err);
    }
  }, [familyData]); // Removed fetchGoals from dependency array to prevent infinite loop
  
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
          .select('id, email, full_name')
          .in('id', joinUserIds);
          
        if (!joinProfilesError && joinProfiles) {
          recentJoins.forEach(join => {
            const profile = joinProfiles.find(p => p.id === join.user_id);
            if (profile) {
              activities.push({
                id: `join-${join.id}`,
                type: 'join',
                user: profile.full_name || profile.email || "Family Member",
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
          .select('id, email, full_name')
          .in('id', goalUserIds);
          
        if (!goalProfilesError && goalProfiles) {
          recentGoals.forEach(goal => {
            const profile = goalProfiles.find(p => p.id === goal.user_id);
            if (profile) {
              activities.push({
                id: `goal-${goal.id}`,
                type: 'goal',
                user: profile.full_name || profile.email || "Family Member",
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
          .select('id, email, full_name')
          .in('id', txUserIds);
          
        if (!txProfilesError && txProfiles) {
          recentTransactions.forEach(tx => {
            const profile = txProfiles.find(p => p.id === tx.user_id);
            if (profile) {
              activities.push({
                id: `tx-${tx.id}`,
                type: 'transaction',
                user: profile.full_name || profile.email || "Family Member",
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

  // Comprehensive refresh function for active tab - using useCallback to prevent unnecessary re-renders
  const handleRefreshActiveTab = useCallback(async () => {
    if (!familyData?.id || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      switch (activeTab) {
        case 'overview':
          // Refresh goals and metrics for charts
          await fetchGoals(familyData.id);
          await updateFamilyGoalsMetrics(familyData.id);
          // Force chart refresh by updating key
          setChartRefreshKey(prev => prev + 1);
          break;
        case 'members':
          // Refresh family members
          await fetchFamilyMembers(familyData.id);
          break;
        case 'activity':
          // Refresh recent activity
          if (members.length > 0) {
            const memberUserIds = members.map(member => member.user_id);
            await updateRecentActivity(familyData.id, memberUserIds);
          }
          break;
        case 'goals':
          // Refresh family goals
          await fetchGoals(familyData.id);
          break;
        default:
          break;
      }
      
      showSuccessToast('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showErrorToast('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [familyData?.id, isRefreshing, activeTab, fetchGoals, updateFamilyGoalsMetrics, fetchFamilyMembers, members, updateRecentActivity, showSuccessToast, showErrorToast]);

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
      
      // Use the family service to get user's family with error handling
      let family;
      try {
        family = await familyService.getUserFamily(user.id);
      } catch (error) {
        console.error('Error getting user family:', error);
        // If it's a 400 error or RPC error, stop retrying to prevent infinite loops
        if (error instanceof Error && (
          error.message.includes('400') || 
          error.message.includes('Bad Request') ||
          error.message.includes('RPC') ||
          error.message.includes('get_family_membership')
        )) {
          showErrorToast("Error connecting to family data. Please try refreshing the page.");
          setFamilyData(null);
          return;
        }
        throw error; // Re-throw for other errors to continue retry logic
      }
      
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
            updateFamilyGoalsMetrics(family.id),
            fetchGoalsRef.current(family.id),
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
      
      // Check if it's a database/RPC error that could cause infinite loops
      if (errorMessage.includes('400') || 
          errorMessage.includes('Bad Request') ||
          errorMessage.includes('RPC') ||
          errorMessage.includes('get_family_membership')) {
        showErrorToast("Database connection error. Please try refreshing the page.");
        setFamilyData(null);
        return;
      }
      
      // If we've just created a family, try a few times before giving up
      if (retryCount < maxRetries - 1) {
        setTimeout(() => {
          fetchFamilyDataInternal(retryCount + 1, maxRetries);
        }, 1500);
        return;
      }
      
      showErrorToast(`Error loading family data: ${errorMessage}`);
    }
  }, [user, isLoadingFamily, setFamilyData, setFamilyGoals, setMembers, setSharedGoalBreakdownChartData, setSharedGoalPerformanceChartData, showErrorToast, updateRecentActivity, updateFamilyGoalsMetrics]); // Removed fetchGoals from dependency array to prevent infinite loop

  // --- DATA FETCHING & PROCESSING ---
  useEffect(() => {
    if (!user) {
      showErrorToast("Please sign in to view your family dashboard");
      // Navigation would be handled by auth redirect
      return;
    }

    // Prevent multiple simultaneous fetch operations
    if (isFetchingFamily) {
      console.log('Family data fetch already in progress, skipping...');
      return;
    }

    // Handle URL parameters for direct linking
    const familyIdFromUrl = urlFamilyId || searchParams.get('familyId');
    
    // Initial data fetch - check if we've just created a family
    // or if we're directly accessing a specific family
    const queryParams = new URLSearchParams(window.location.search);
    const justCreated = queryParams.get('created') === 'true';
    
    // Set flag to prevent concurrent fetches
    setIsFetchingFamily(true);
    
    // Use setTimeout to prevent immediate execution and allow component to fully mount
    const timer = setTimeout(async () => {
      try {
        if (justCreated) {
          // Start with higher retry attempts for newly created families
          await fetchFamilyDataInternal(0, 5); // Allow more retries for newly created families
        } else if (familyIdFromUrl) {
          // For direct access with family ID, attempt to fetch that specific family
          await fetchFamilyDataInternal(0, 3, familyIdFromUrl);
        } else {
          await fetchFamilyDataInternal(0, 3); // Standard number of retries
        }
      } finally {
        // Reset flag when done
        setIsFetchingFamily(false);
      }
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      // Reset flag on cleanup
      setIsFetchingFamily(false);
    };
  }, [user, showErrorToast, urlFamilyId, searchParams, fetchFamilyDataInternal]); // Removed isFetchingFamily to prevent infinite loop
  
  // Fetch family goals when component mounts or family data changes - with controlled refresh
  useEffect(() => {
    // Only proceed if we have family data and the user, and we're not currently fetching family data
    if (familyData?.id && user && !isFetchingFamily && !isRefreshing) {
      console.log('Fetching family goals on mount or family data change');
      // Use a ref to track if we've already fetched for this family
      const familyIdRef = familyData.id;
      
      // Add a longer delay to prevent immediate execution and reduce frequency
      const timer = setTimeout(() => {
        // Only fetch if we still have the same family and haven't refreshed recently
        if (familyData?.id === familyIdRef && !isFetchingFamily && !isRefreshing) {
          fetchGoalsRef.current(familyData.id).catch(error => {
            console.error('Error fetching goals in useEffect:', error);
            // Don't retry automatically to prevent loops
          });
        }
      }, 3000); // Increased delay to 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [familyData?.id, user]); // Removed isFetchingFamily and isRefreshing to prevent infinite loop
  
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
  }, [user, userMembershipChannelName]); // Removed setter functions to prevent infinite loop
  
  // Set up real-time subscriptions for existing family data
  useEffect(() => {
    if (!user || !familyData) return;
    
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
                    full_name,
                    avatar_url,
                    created_at,
                    updated_at
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
                      full_name: userProfile.full_name,
                      avatar_url: userProfile.avatar_url
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
                
                // Use throttled refresh to prevent rapid-fire calls
                await throttledFetchGoals(familyData.id);
                
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
                  await throttledFetchGoals(familyData.id);
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
                
                // Update family goals metrics and charts
                await updateFamilyGoalsMetrics(familyData.id);
                
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
  }, [user, familyData, members]); // Removed function references and channel names to prevent infinite loop

  // --- NEW FUNCTIONS FOR FAMILY MANAGEMENT ---

  // Goal contribution functions
  const openContributeModal = (goal: Goal) => {
    setPreSelectedGoal(goal);
    setShowContributeModal(true);
  };

  // Delete family confirmation modal
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
    setDeleteConfirmationInput("");
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

  // Delete family function for owners only
  const handleDeleteFamily = async () => {
    if (!familyData || !user) return;
    
    setIsDeleting(true);
    try {
      // Verify user is the creator/owner
      if (user.id !== familyData.created_by) {
        showErrorToast("Only the family owner can permanently delete the family.");
        setIsDeleting(false);
        closeDeleteModal();
        return;
      }

      // Verify confirmation input matches family name exactly
      if (deleteConfirmationInput !== familyData.family_name) {
        showErrorToast("Family name confirmation does not match. Please type the exact family name.");
        setIsDeleting(false);
        return;
      }

      // Use the enhanced deleteFamily service with owner validation
      await familyService.deleteFamily(familyData.id, user.id);
      
      // Try to refresh the materialized view, but don't block on failure
      try {
        await refreshFamilyMembershipsView();
      } catch (refreshError) {
        console.warn("Failed to refresh materialized view (non-critical):", refreshError);
        // Continue anyway as this isn't critical
      }
      
      // Success - navigate to create family page
      showSuccessToast(`Family "${familyData.family_name}" has been permanently deleted`);
      
      // Add a short timeout to ensure Supabase events have time to propagate
      // before redirecting the user
      setTimeout(() => {
        navigate('/family/create');
      }, 300);
      
    } catch (err) {
      console.error("Error deleting family:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      
      showErrorToast(`Failed to delete family: ${errorMessage}`);
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
        <>
          {/* Mobile Loading State */}
          <div className="block md:hidden py-12 animate__animated animate__fadeIn">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="mt-3 text-xs text-gray-500 font-medium">Loading family data...</p>
            </div>
          </div>

          {/* Desktop Loading State */}
          <div className="hidden md:block text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <h5 className="text-gray-600">Loading family information...</h5>
          </div>
        </>
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
                    style={{ width: "80px", height: "80px", backgroundColor: "rgba(220, 53, 69, 0.2)" }}>
                    <i className="fas fa-exclamation-triangle fa-3x text-danger"></i>
                  </div>
                </div>
                {isCreator ? (
                  <>
                    <h5 className="text-danger mb-3">⚠️ Permanent Family Deletion ⚠️</h5>
                    <p className="mb-3">You are about to <strong>permanently delete</strong> your family group <strong>"{familyData?.family_name}"</strong>.</p>
                    <div className="alert alert-danger text-left mb-4">
                      <h6 className="text-danger mb-2"><i className="fas fa-exclamation-triangle mr-2"></i>This action cannot be undone!</h6>
                      <ul className="mb-0">
                        <li>All family member associations will be permanently removed</li>
                        <li>All shared family goals and progress will be deleted</li>
                        <li>All family activity history will be lost</li>
                        <li>All pending invitations will be cancelled</li>
                      </ul>
                    </div>
                    <p className="mb-3">To confirm deletion, please type the exact name of your family:</p>
                    <div className="form-group">
                      <label className="font-weight-bold mb-2">Type "{familyData?.family_name}" to confirm:</label>
                      <input 
                        type="text" 
                        className="form-control text-center"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder={familyData?.family_name}
                        disabled={isDeleting}
                        style={{ fontSize: "16px", padding: "12px" }}
                      />
                    </div>
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
                {isCreator ? (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteFamily}
                    disabled={isDeleting || deleteConfirmationInput !== familyData?.family_name}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-trash mr-2"></i>
                        Permanently Delete Family
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-warning" 
                    onClick={handleLeaveFamily}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Leaving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        Leave Family
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Goal Contribution Modal */}
      <ContributionModal
        isOpen={showContributeModal}
        goals={familyGoals.map(g => ({ ...g, target_date: g.target_date || g.deadline })) as MainGoalType[]}
        preSelectedGoal={preSelectedGoal ? { ...preSelectedGoal, target_date: preSelectedGoal.target_date || preSelectedGoal.deadline } as MainGoalType : undefined}
        onClose={() => {
          setShowContributeModal(false);
          setPreSelectedGoal(undefined);
        }}
        onContributionSuccess={async () => {
          if (familyData?.id) {
            await fetchGoals(familyData.id);
          }
          setShowContributeModal(false);
          setPreSelectedGoal(undefined);
        }}
      />

      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 truncate">
              {familyData?.family_name || "Family"}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isCreator && (
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-semibold rounded-full">Creator</span>
              )}
              {familyData && (
                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${familyData.is_public ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                  <i className={`fas ${familyData.is_public ? 'fa-globe' : 'fa-lock'} mr-0.5 text-[8px]`}></i>
                  {familyData.is_public ? 'Public' : 'Private'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefreshActiveTab}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              aria-label="Refresh"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            {/* More Actions Dropdown */}
            <div className="dropdown">
              <button
                className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                type="button"
                id="mobileActionsDropdown"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                aria-label="More actions"
              >
                <i className="fas fa-ellipsis-v text-xs"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="mobileActionsDropdown">
                {familyData && (
                  <>
                    <Link to={`/family/${familyData.id}/invite`} className="dropdown-item text-sm">
                      <i className="fas fa-user-plus fa-sm fa-fw mr-2 text-success"></i>Invite Member
                    </Link>
                    {isCreator ? (
                      <>
                        <button className="dropdown-item text-sm" onClick={navigateToEdit}>
                          <i className="fas fa-edit fa-sm fa-fw mr-2 text-primary"></i>Edit Family
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item text-sm text-danger" onClick={openDeleteModal}>
                          <i className="fas fa-trash fa-sm fa-fw mr-2"></i>Delete Family
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item text-sm text-warning" onClick={openDeleteModal}>
                          <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2"></i>Leave Family
                        </button>
                      </>
                    )}
                  </>
                )}
                {!familyData && (
                  <Link to="/family/create" className="dropdown-item text-sm">
                    <i className="fas fa-home fa-sm fa-fw mr-2 text-success"></i>Create Family
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-4">
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

      {/* Mobile Summary Cards - Modern stacked design */}
      <div className="block md:hidden mb-4">
        {/* Main family overview card */}
        <div className={`bg-gradient-to-br ${(summaryData?.savingsRate || 0) >= 75 ? 'from-emerald-500 via-teal-500 to-cyan-500' : (summaryData?.savingsRate || 0) >= 50 ? 'from-blue-500 via-indigo-500 to-purple-500' : 'from-amber-500 via-orange-500 to-rose-500'} rounded-2xl p-4 mb-3 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Goals Progress</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className={`fas fa-${(summaryData?.savingsRate || 0) >= 75 ? 'trophy' : (summaryData?.savingsRate || 0) >= 50 ? 'chart-line' : 'flag'} text-white text-sm`}></i>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mb-1">
            {summaryData ? formatPercentage(summaryData.savingsRate) : "0%"}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${(summaryData?.savingsRate || 0) >= 75 ? 'text-green-200' : (summaryData?.savingsRate || 0) >= 50 ? 'text-blue-200' : 'text-amber-200'}`}>
              <i className={`fas fa-${(summaryData?.savingsRate || 0) >= 75 ? 'check-circle' : (summaryData?.savingsRate || 0) >= 50 ? 'arrow-up' : 'info-circle'} text-[10px] mr-1`}></i>
              {(summaryData?.savingsRate || 0) >= 75 ? 'Excellent Progress' : (summaryData?.savingsRate || 0) >= 50 ? 'Good Progress' : 'Getting Started'}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
            <div
              className="bg-white h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(summaryData?.savingsRate || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Secondary cards grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Savings Target */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-bullseye text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Target</p>
            <p className="text-sm font-bold text-gray-800 truncate">{summaryData ? formatCurrency(summaryData.income) : formatCurrency(0)}</p>
          </div>

          {/* Current Progress */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-piggy-bank text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Saved</p>
            <p className="text-sm font-bold text-gray-800 truncate">{summaryData ? formatCurrency(summaryData.expenses) : formatCurrency(0)}</p>
          </div>

          {/* Remaining */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-hourglass-half text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Left</p>
            <p className={`text-sm font-bold truncate ${(summaryData?.balance || 0) < 0 ? 'text-rose-600' : 'text-gray-800'}`}>{summaryData ? formatCurrency(summaryData.balance) : formatCurrency(0)}</p>
          </div>
        </div>
      </div>

      {/* Desktop Summary Cards */}
      <div className="d-none d-md-block">
        <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Family Savings Target
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
                      <i className="fas fa-info-circle mr-1"></i> No family goals set yet
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
                    Family Goals Progress
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
                      <i className="fas fa-info-circle mr-1"></i> No progress recorded yet
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
                    Remaining to Save
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
                      <i className="fas fa-info-circle mr-1"></i> Create family goals to track progress
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
                    Goals Progress Rate
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
                      <i className="fas fa-info-circle mr-1"></i> Set family goals to track progress
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-percentage fa-2x text-gray-300"></i></div>
              </div>
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
      
      {/* Mobile Tabs - Horizontal scrollable pills */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab header */}
          <div className="flex bg-slate-50 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex-shrink-0 flex-1 min-w-[80px] py-3 text-[11px] font-semibold transition-all relative ${
                activeTab === 'overview'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-pie mr-1 text-[10px]"></i>
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange("goals")}
              className={`flex-shrink-0 flex-1 min-w-[80px] py-3 text-[11px] font-semibold transition-all relative ${
                activeTab === 'goals'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-flag-checkered mr-1 text-[10px]"></i>
              Goals
              {activeTab === 'goals' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange("members")}
              className={`flex-shrink-0 flex-1 min-w-[80px] py-3 text-[11px] font-semibold transition-all relative ${
                activeTab === 'members'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-users mr-1 text-[10px]"></i>
              Members
              <span className="ml-1 bg-gray-200 text-gray-600 px-1 py-0.5 rounded-full text-[9px]">{members.length}</span>
              {activeTab === 'members' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange("activity")}
              className={`flex-shrink-0 flex-1 min-w-[80px] py-3 text-[11px] font-semibold transition-all relative ${
                activeTab === 'activity'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-history mr-1 text-[10px]"></i>
              Activity
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-3">
            {activeTab === "overview" && (
              <OverviewTab
                chartData={chartData}
                familyId={familyData?.id!}
                expenseChartRef={categoryChartRef}
                budgetChartRef={budgetPerformanceChartRef}
                goalChartRef={goalPerformanceChartRef}
                goalBreakdownChartRef={goalBreakdownChartRef}
                toggleTip={toggleTip}
                refreshKey={chartRefreshKey}
              />
            )}

            {activeTab === "members" && (
              <MembersTab
                isCreator={isCreator}
                familyData={familyData}
                members={members}
                getMemberRoleBadge={getMemberRoleBadge}
                familyId={familyData?.id}
                onMembersUpdate={() => {
                  if (familyData?.id) {
                    fetchFamilyMembers(familyData.id);
                  }
                }}
              />
            )}

            {activeTab === "activity" && (
              <ActivityTab recentActivity={recentActivity} />
            )}

            {activeTab === "goals" && (
              <GoalsTab
                familyGoals={familyGoals}
                isCreator={isCreator}
                loadingFamilyGoals={loadingFamilyGoals}
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
                onRefresh={handleRefreshActiveTab}
              />
            )}
          </div>
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="d-none d-md-block">
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <ul className="nav nav-tabs card-header-tabs mb-0">
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
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefreshActiveTab}
              disabled={isRefreshing}
              className="btn btn-primary shadow-sm mr-2 d-inline-flex align-items-center"
              style={{ minWidth: "100px" }}
            >
              {isRefreshing ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt mr-2"></i>
                  Refresh
                </>
              )}
            </button>
          </div>
          <div className="card-body">
            {activeTab === "overview" && (
              <OverviewTab
                chartData={chartData}
                familyId={familyData?.id!}
                expenseChartRef={categoryChartRef}
                budgetChartRef={budgetPerformanceChartRef}
                goalChartRef={goalPerformanceChartRef}
                goalBreakdownChartRef={goalBreakdownChartRef}
                toggleTip={toggleTip}
                refreshKey={chartRefreshKey}
              />
            )}

            {activeTab === "members" && (
              <MembersTab
                isCreator={isCreator}
                familyData={familyData}
                members={members}
                getMemberRoleBadge={getMemberRoleBadge}
                familyId={familyData?.id}
                onMembersUpdate={() => {
                  if (familyData?.id) {
                    fetchFamilyMembers(familyData.id);
                  }
                }}
              />
            )}

            {activeTab === "activity" && (
              <ActivityTab recentActivity={recentActivity} />
            )}

            {activeTab === "goals" && (
              <GoalsTab
                familyGoals={familyGoals}
                isCreator={isCreator}
                loadingFamilyGoals={loadingFamilyGoals}
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
                onRefresh={handleRefreshActiveTab}
              />
            )}
          </div>
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
