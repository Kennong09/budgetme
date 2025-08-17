import { useState, useCallback } from 'react';
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
    familyGoals,
    loadingFamilyGoals,
    sharedGoalPerformanceChartData,
    sharedGoalBreakdownChartData,
    setSharedGoalPerformanceChartData,
    setSharedGoalBreakdownChartData,
    fetchFamilyGoals,
    setFamilyGoals
  };
};
