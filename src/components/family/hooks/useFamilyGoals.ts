import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { Goal } from '../types';
import { prepareSharedGoalPerformanceData, prepareSharedGoalBreakdownData } from '../utils/chartUtils';

interface UseFamilyGoalsReturn {
  familyGoals: Goal[];
  loadingFamilyGoals: boolean;
  sharedGoalPerformanceChartData: any | null;
  sharedGoalBreakdownChartData: any | null;
  setSharedGoalPerformanceChartData: (data: any) => void;
  setSharedGoalBreakdownChartData: (data: any) => void;
  fetchFamilyGoals: (familyId: string) => Promise<void>;
  setFamilyGoals: (goals: Goal[]) => void;
}

export const useFamilyGoals = (showErrorToast: (message: string) => void): UseFamilyGoalsReturn => {
  const [familyGoals, setFamilyGoals] = useState<Goal[]>([]);
  const [loadingFamilyGoals, setLoadingFamilyGoals] = useState<boolean>(false);
  const [sharedGoalPerformanceChartData, setSharedGoalPerformanceChartData] = useState<any | null>(null);
  const [sharedGoalBreakdownChartData, setSharedGoalBreakdownChartData] = useState<any | null>(null);

  // Memoize processed goals to prevent unnecessary re-renders
  const memoizedFamilyGoals = useMemo(() => {
    return familyGoals.map(goal => ({
      ...goal,
      current_amount: goal.current_amount || 0,
      target_amount: goal.target_amount || 0,
      status: goal.status || 'active',
      percentage: goal.target_amount > 0 ? Math.round((goal.current_amount || 0) / goal.target_amount * 100) : 0
    }));
  }, [familyGoals]);

  // Memoize chart data to prevent unnecessary recalculations
  const memoizedGoalPerformanceChartData = useMemo(() => {
    return sharedGoalPerformanceChartData;
  }, [sharedGoalPerformanceChartData]);

  const memoizedGoalBreakdownChartData = useMemo(() => {
    return sharedGoalBreakdownChartData;
  }, [sharedGoalBreakdownChartData]);

  const fetchFamilyGoals = useCallback(async (familyId: string) => {
    if (!familyId) return;
    
    setLoadingFamilyGoals(true);
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching family goals:", error);
        showErrorToast(`Error loading family goals: ${error.message}`);
        return;
      }
      
      const processedGoals = data?.map(goal => ({
        ...goal,
        current_amount: goal.current_amount || 0,
        target_amount: goal.target_amount || 0,
        status: goal.status || 'active'
      })) || [];
      
      setFamilyGoals(processedGoals);
      
      // Generate chart data for family goals
      setSharedGoalPerformanceChartData(prepareSharedGoalPerformanceData(processedGoals));
      setSharedGoalBreakdownChartData(prepareSharedGoalBreakdownData(processedGoals));
      
    } catch (err) {
      console.error("Error in fetchFamilyGoals:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Error loading family goals: ${errorMessage}`);
    } finally {
      setLoadingFamilyGoals(false);
    }
  }, [showErrorToast]);

  return {
    familyGoals: memoizedFamilyGoals,
    loadingFamilyGoals,
    sharedGoalPerformanceChartData: memoizedGoalPerformanceChartData,
    sharedGoalBreakdownChartData: memoizedGoalBreakdownChartData,
    setSharedGoalPerformanceChartData,
    setSharedGoalBreakdownChartData,
    fetchFamilyGoals,
    setFamilyGoals
  };
};
