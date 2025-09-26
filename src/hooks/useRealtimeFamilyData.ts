import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { familyDataAggregationService } from '../services/database/familyDataAggregationService';
import { familyBudgetService } from '../services/database/familyBudgetService';
import { familyGoalService } from '../services/database/familyGoalService';

export interface FamilyRealtimeData {
  financialSummary: any;
  categoryExpenses: any[];
  budgetPerformance: any;
  goalProgress: any[];
  goalCommitment: any;
  lastUpdated: Date;
}

export interface UseRealtimeFamilyDataOptions {
  familyId: string;
  enableCategories?: boolean;
  enableBudgets?: boolean;
  enableGoals?: boolean;
  refreshInterval?: number; // fallback refresh interval in ms
}

/**
 * Custom hook for managing real-time family data subscriptions
 * 
 * This hook establishes WebSocket subscriptions to monitor changes in:
 * - Transactions (affects categories and financial summary)
 * - Budget updates (affects budget performance)
 * - Goal contributions (affects goal progress)
 * - Family member changes
 * 
 * It provides automatic data refresh and graceful fallback mechanisms.
 */
export const useRealtimeFamilyData = (options: UseRealtimeFamilyDataOptions) => {
  const {
    familyId,
    enableCategories = true,
    enableBudgets = true,
    enableGoals = true,
    refreshInterval = 30000 // 30 seconds fallback
  } = options;

  const [data, setData] = useState<FamilyRealtimeData>({
    financialSummary: null,
    categoryExpenses: [],
    budgetPerformance: null,
    goalProgress: [],
    goalCommitment: null,
    lastUpdated: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const subscriptionsRef = useRef<any[]>([]);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date>(new Date());

  /**
   * Refresh all enabled data sources
   */
  const refreshData = useCallback(async () => {
    if (!familyId) return;

    try {
      setError(null);
      const refreshPromises: Promise<any>[] = [];

      // Always fetch financial summary as it's core to most charts
      refreshPromises.push(
        familyDataAggregationService.getFamilyFinancialSummary(familyId, 'current')
      );

      // Category expenses data
      if (enableCategories) {
        const currentMonth = {
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        };
        refreshPromises.push(
          familyDataAggregationService.getFamilyExpenseByCategory(familyId, currentMonth)
        );
      }

      // Budget performance data
      if (enableBudgets) {
        refreshPromises.push(
          familyBudgetService.getFamilyBudgetPerformance(familyId, 'monthly')
        );
      }

      // Goal progress and commitment data
      if (enableGoals) {
        refreshPromises.push(
          familyGoalService.getFamilyGoalProgress(familyId),
          familyGoalService.calculateGoalCommitment(familyId)
        );
      }

      const results = await Promise.allSettled(refreshPromises);
      
      const newData: FamilyRealtimeData = {
        financialSummary: results[0].status === 'fulfilled' ? results[0].value : null,
        categoryExpenses: enableCategories && results[1].status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<any>).value : [],
        budgetPerformance: enableBudgets && results[enableCategories ? 2 : 1].status === 'fulfilled' 
          ? (results[enableCategories ? 2 : 1] as PromiseFulfilledResult<any>).value : null,
        goalProgress: enableGoals && results[enableCategories && enableBudgets ? 3 : enableCategories || enableBudgets ? 2 : 1].status === 'fulfilled' 
          ? (results[enableCategories && enableBudgets ? 3 : enableCategories || enableBudgets ? 2 : 1] as PromiseFulfilledResult<any>).value : [],
        goalCommitment: enableGoals && results[enableCategories && enableBudgets ? 4 : enableCategories || enableBudgets ? 3 : 2].status === 'fulfilled' 
          ? (results[enableCategories && enableBudgets ? 4 : enableCategories || enableBudgets ? 3 : 2] as PromiseFulfilledResult<any>).value : null,
        lastUpdated: new Date()
      };

      setData(newData);
      lastRefreshRef.current = new Date();
      setLoading(false);

      console.log('Family data refreshed successfully:', {
        familyId,
        timestamp: newData.lastUpdated,
        enabledFeatures: { enableCategories, enableBudgets, enableGoals }
      });

    } catch (err) {
      console.error('Error refreshing family data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      setLoading(false);
    }
  }, [familyId, enableCategories, enableBudgets, enableGoals]);

  /**
   * Setup WebSocket subscriptions for real-time updates
   */
  const setupSubscriptions = useCallback(() => {
    if (!familyId) return;

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    subscriptionsRef.current = [];

    console.log('Setting up real-time subscriptions for family:', familyId);

    // Subscribe to transaction changes (affects categories and financial summary)
    const transactionChannel = supabase
      .channel(`family-transactions-${familyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, (payload) => {
        console.log('Transaction change detected:', payload.eventType);
        refreshData();
      })
      .subscribe((status) => {
        console.log('Transaction subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    subscriptionsRef.current.push(transactionChannel);

    // Subscribe to budget changes
    if (enableBudgets) {
      const budgetChannel = supabase
        .channel(`family-budgets-${familyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'budgets'
        }, (payload) => {
          console.log('Budget change detected:', payload.eventType);
          refreshData();
        })
        .subscribe();

      subscriptionsRef.current.push(budgetChannel);
    }

    // Subscribe to goal and goal contribution changes
    if (enableGoals) {
      const goalChannel = supabase
        .channel(`family-goals-${familyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'goals'
        }, (payload) => {
          console.log('Goal change detected:', payload.eventType);
          refreshData();
        })
        .subscribe();

      const goalContribChannel = supabase
        .channel(`family-goal-contributions-${familyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'goal_contributions'
        }, (payload) => {
          console.log('Goal contribution change detected:', payload.eventType);
          refreshData();
        })
        .subscribe();

      subscriptionsRef.current.push(goalChannel, goalContribChannel);
    }

    // Subscribe to family member changes
    const familyMemberChannel = supabase
      .channel(`family-members-${familyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'family_members',
        filter: `family_id=eq.${familyId}`
      }, (payload) => {
        console.log('Family member change detected:', payload.eventType);
        refreshData();
      })
      .subscribe();

    subscriptionsRef.current.push(familyMemberChannel);

  }, [familyId, enableBudgets, enableGoals, refreshData]);

  /**
   * Setup fallback timer for periodic refresh
   */
  const setupFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
    }

    fallbackTimerRef.current = setInterval(() => {
      const timeSinceLastRefresh = new Date().getTime() - lastRefreshRef.current.getTime();
      
      // Only refresh if we haven't refreshed recently and we're not getting real-time updates
      if (timeSinceLastRefresh > refreshInterval && !isConnected) {
        console.log('Fallback refresh triggered');
        refreshData();
      }
    }, refreshInterval);
  }, [refreshInterval, refreshData, isConnected]);

  /**
   * Manual refresh function for user-triggered updates
   */
  const manualRefresh = useCallback(async () => {
    setLoading(true);
    await refreshData();
  }, [refreshData]);

  /**
   * Check connection status
   */
  const checkConnection = useCallback(() => {
    return {
      isConnected,
      subscriptionCount: subscriptionsRef.current.length,
      lastRefresh: lastRefreshRef.current,
      timeSinceLastRefresh: new Date().getTime() - lastRefreshRef.current.getTime()
    };
  }, [isConnected]);

  // Initialize subscriptions and data loading
  useEffect(() => {
    if (!familyId) {
      setError('Family ID is required');
      setLoading(false);
      return;
    }

    console.log('Initializing real-time family data for:', familyId);
    
    // Initial data load
    refreshData();
    
    // Setup real-time subscriptions
    setupSubscriptions();
    
    // Setup fallback timer
    setupFallbackTimer();

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions');
      
      subscriptionsRef.current.forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = [];

      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [familyId]);

  // Update fallback timer when connection status changes
  useEffect(() => {
    setupFallbackTimer();
  }, [setupFallbackTimer]);

  return {
    data,
    loading,
    error,
    isConnected,
    manualRefresh,
    checkConnection
  };
};

export default useRealtimeFamilyData;