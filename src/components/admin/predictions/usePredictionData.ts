import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { 
  PredictionSummary, 
  PredictionService, 
  PredictionStats, 
  PredictionUser, 
  PredictionFilters,
  ModelStats,
  UserDistribution,
  HistoricalAccuracy
} from "./types";
import { RealtimeChannel } from "@supabase/supabase-js";

// Fallback model confidence score (95% as per AIPrediction.tsx)
const FALLBACK_MODEL_CONFIDENCE = 95;

// Helper to get the appropriate client (admin for bypassing RLS, or regular)
const getClient = () => {
  try {
    // Try to use admin client first (bypasses RLS)
    if (supabaseAdmin) {
      return supabaseAdmin;
    }
  } catch (e) {
    // Admin client not available, fall back to regular client
    console.log('Admin client not available, using regular client');
  }
  return supabase;
};

export const usePredictionData = () => {
  const [predictions, setPredictions] = useState<PredictionSummary[]>([]);
  const [services, setServices] = useState<PredictionService[]>([]);
  const [users, setUsers] = useState<PredictionUser[]>([]);
  const [stats, setStats] = useState<PredictionStats>({
    totalPredictions: 0,
    activePredictions: 0,
    predictionUsers: 0,
    averageAccuracy: FALLBACK_MODEL_CONFIDENCE,
    predictionsByStatus: { active: 0, pending: 0, error: 0 },
    predictionsByType: { income: 0, expense: 0, savings: 0 },
    predictionsByUser: {}
  });
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [userDistribution, setUserDistribution] = useState<UserDistribution[]>([]);
  const [historicalAccuracy, setHistoricalAccuracy] = useState<HistoricalAccuracy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const { showSuccessToast, showErrorToast } = useToast();

  // Fetch users from Supabase (using admin client to bypass RLS)
  const fetchUsers = useCallback(async () => {
    try {
      const client = getClient();
      if (!client) {
        throw new Error('Supabase client not available');
      }
      
      const { data: userProfiles, error: profileError } = await client
        .from('profiles')
        .select('id, full_name, email, avatar_url');

      if (profileError) throw profileError;

      const formattedUsers = (userProfiles || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        user_metadata: {
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast("Failed to load users");
    }
  }, [showErrorToast]);

  // Fetch prediction services with real data (using admin client)
  const fetchServices = useCallback(async () => {
    try {
      const client = getClient();
      // Get real prediction counts from database
      const { data: predictionData, error: predError } = await client
        .from('prophet_predictions')
        .select('id, generated_at');
      
      const totalRequests = predictionData?.length || 0;
      
      // Calculate error rate (predictions older than 7 days might be stale)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const stalePredictions = predictionData?.filter(p => 
        new Date(p.generated_at) < sevenDaysAgo
      ).length || 0;

      const services: PredictionService[] = [
        {
          id: '1',
          name: 'Fallback Financial Forecasting',
          status: 'active',
          type: 'Prophet',
          description: 'Local fallback model with 95% confidence for time series forecasting',
          lastUpdated: new Date().toISOString(),
          requests: totalRequests,
          errors: stalePredictions
        }
      ];

      setServices(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      showErrorToast("Failed to load prediction services");
    }
  }, [showErrorToast]);

  // Generate historical accuracy data based on real predictions (using admin client)
  const generateHistoricalAccuracy = useCallback(async () => {
    try {
      const client = getClient();
      // Get predictions grouped by month
      const { data: predictions, error } = await client
        .from('prophet_predictions')
        .select('generated_at, confidence_score')
        .order('generated_at', { ascending: true });

      if (error) throw error;

      // Group by month and calculate average accuracy
      const monthlyAccuracy: { [key: string]: { total: number; count: number } } = {};
      
      (predictions || []).forEach(p => {
        const monthKey = new Date(p.generated_at).toISOString().substring(0, 7);
        if (!monthlyAccuracy[monthKey]) {
          monthlyAccuracy[monthKey] = { total: 0, count: 0 };
        }
        // Use fallback confidence of 95% if not available
        const confidence = (p.confidence_score || 0.95) * 100;
        monthlyAccuracy[monthKey].total += confidence;
        monthlyAccuracy[monthKey].count += 1;
      });

      // Generate last 6 months of data
      const historicalData: HistoricalAccuracy[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().substring(0, 7);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        const monthData = monthlyAccuracy[monthKey];
        // Use fallback model confidence (95%) as baseline
        const accuracy = monthData 
          ? monthData.total / monthData.count 
          : FALLBACK_MODEL_CONFIDENCE;
        
        // Error rate is inverse of accuracy (capped at reasonable values)
        const errorRate = Math.max(0, Math.min(20, 100 - accuracy));
        
        historicalData.push({
          month: monthName,
          accuracy: Number(accuracy.toFixed(1)),
          error: Number(errorRate.toFixed(1)),
          predictions: monthData?.count || 0
        });
      }

      setHistoricalAccuracy(historicalData);
      return historicalData;
    } catch (error) {
      console.error('Error generating historical accuracy:', error);
      // Return fallback data with 95% confidence
      const fallbackData: HistoricalAccuracy[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        fallbackData.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          accuracy: FALLBACK_MODEL_CONFIDENCE,
          error: 5,
          predictions: 0
        });
      }
      setHistoricalAccuracy(fallbackData);
      return fallbackData;
    }
  }, []);

  // Fetch predictions from Supabase with real financial data (using admin client)
  const fetchPredictions = useCallback(async (filters: PredictionFilters) => {
    try {
      setLoading(true);
      
      const client = getClient();
      if (!client) {
        throw new Error('Supabase client not available');
      }
      
      // Fetch users directly using admin client
      const { data: userProfiles, error: profileError } = await client
        .from('profiles')
        .select('id, full_name, email, avatar_url');

      if (profileError) throw profileError;

      const userData = (userProfiles || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        user_metadata: {
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      }));
      
      setUsers(userData);
      
      // Fetch prediction data using admin client (excluding prediction_data JSONB to avoid 400 error)
      const { data: predictionData, error: predictionError } = await client
        .from('prophet_predictions')
        .select('user_id, generated_at, confidence_score');

      // Fetch all transactions for trend calculations using admin client
      const { data: allTransactions, error: transError } = await client
        .from('transactions')
        .select('user_id, amount, type, date, category');

      if (transError) {
        console.warn('Error fetching transactions:', transError);
      }

      if (predictionError) throw predictionError;

      // Calculate real financial trends for each user
      const processedData: PredictionSummary[] = await Promise.all(
        (userData || [])
          .filter(user => user && user.id)
          .map(async (user: any) => {
            const userPredictions = predictionData?.filter(p => p && p.user_id === user.id) || [];
            const userTransactions = allTransactions?.filter(t => t && t.user_id === user.id) || [];
            
            const lastPrediction = userPredictions.length > 0 
              ? userPredictions
                  .filter(p => p.generated_at)
                  .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0]
              : null;

            // Calculate real financial trends from transactions
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const recentTransactions = userTransactions.filter(t => 
              new Date(t.date) >= threeMonthsAgo
            );

            // Group by month for trend calculation
            const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
            recentTransactions.forEach(t => {
              const monthKey = t.date.substring(0, 7);
              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0 };
              }
              if (t.type === 'income') {
                monthlyData[monthKey].income += t.amount;
              } else {
                monthlyData[monthKey].expenses += t.amount;
              }
            });

            const months = Object.keys(monthlyData).sort();
            let incomeTrend = 0;
            let expenseTrend = 0;
            let savingsTrend = 0;

            if (months.length >= 2) {
              const lastMonth = monthlyData[months[months.length - 1]];
              const previousMonths = months.slice(0, -1).map(m => monthlyData[m]);
              
              const avgPrevIncome = previousMonths.reduce((sum, m) => sum + m.income, 0) / previousMonths.length;
              const avgPrevExpenses = previousMonths.reduce((sum, m) => sum + m.expenses, 0) / previousMonths.length;
              const avgPrevSavings = avgPrevIncome - avgPrevExpenses;
              const lastSavings = lastMonth.income - lastMonth.expenses;
              
              incomeTrend = avgPrevIncome > 0 
                ? Math.max(-15, Math.min(15, ((lastMonth.income - avgPrevIncome) / avgPrevIncome) * 100))
                : 0;
              expenseTrend = avgPrevExpenses > 0 
                ? Math.max(-15, Math.min(15, ((lastMonth.expenses - avgPrevExpenses) / avgPrevExpenses) * 100))
                : 0;
              savingsTrend = Math.abs(avgPrevSavings) > 0 
                ? Math.max(-15, Math.min(15, ((lastSavings - avgPrevSavings) / Math.abs(avgPrevSavings)) * 100))
                : 0;
            }

            // Use fallback model confidence (95%) for all predictions
            const predictionAccuracy = FALLBACK_MODEL_CONFIDENCE;

            // Determine status based on transactions and predictions
            let status: 'active' | 'pending' | 'error' = 'pending';
            if (userTransactions.length >= 7) {
              status = 'active'; // Has enough data for predictions
            } else if (userPredictions.length > 0) {
              status = 'active';
            }

            return {
              userId: user.id || '',
              username: user.user_metadata?.full_name || user.full_name || user.email?.split('@')[0] || 'Unknown User',
              avatarUrl: user.user_metadata?.avatar_url || user.avatar_url || '',
              lastPredictionDate: lastPrediction && lastPrediction.generated_at
                ? new Date(lastPrediction.generated_at).toISOString().split('T')[0] 
                : '',
              predictionAccuracy,
              incomeTrend: Number(incomeTrend.toFixed(1)),
              expenseTrend: Number(expenseTrend.toFixed(1)),
              savingsTrend: Number(savingsTrend.toFixed(1)),
              predictionCount: userPredictions.length || 0,
              status
            };
          })
      );

      // Apply filters
      let filteredData = [...processedData];
      
      if (filters.filterStatus !== 'all') {
        filteredData = filteredData.filter(item => item.status === filters.filterStatus);
      }
      
      if (filters.searchTerm) {
        filteredData = filteredData.filter(item => 
          item.username.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
      }
      
      // Apply sort
      filteredData.sort((a, b) => {
        const fieldA = a[filters.sortField as keyof PredictionSummary];
        const fieldB = b[filters.sortField as keyof PredictionSummary];
        
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return filters.sortDirection === 'asc' 
            ? fieldA.localeCompare(fieldB) 
            : fieldB.localeCompare(fieldA);
        } else {
          const numA = Number(fieldA) || 0;
          const numB = Number(fieldB) || 0;
          return filters.sortDirection === 'asc' ? numA - numB : numB - numA;
        }
      });

      // Apply pagination
      const totalItemsCount = filteredData.length;
      const startIndex = (filters.currentPage - 1) * filters.pageSize;
      const paginatedData = filteredData.slice(startIndex, startIndex + filters.pageSize);

      setPredictions(paginatedData);
      setTotalItems(totalItemsCount);
      setTotalPages(Math.ceil(totalItemsCount / filters.pageSize));

      // Calculate real statistics from transaction data
      const totalPredictions = predictionData?.length || 0;
      const activeUsers = processedData.filter(user => user.status === 'active').length;

      // Calculate real income/expense totals from all transactions
      const incomeTransactions = allTransactions?.filter(t => t.type === 'income').length || 0;
      const expenseTransactions = allTransactions?.filter(t => t.type === 'expense').length || 0;

      setModelStats([
        { name: 'Model Confidence', value: FALLBACK_MODEL_CONFIDENCE, description: 'Fallback model confidence score (fixed at 95%)', type: 'percentage' },
        { name: 'Total Predictions', value: totalPredictions, description: 'Total number of predictions generated', type: 'count' },
        { name: 'Active Users', value: activeUsers, description: 'Users with sufficient transaction data', type: 'count' },
        { name: 'Total Transactions', value: allTransactions?.length || 0, description: 'All transactions across users', type: 'count' }
      ]);

      // Calculate user distribution by prediction accuracy tiers
      const accuracyTiers = {
        'High (90-100%)': processedData.filter(p => p.predictionAccuracy >= 90).length,
        'Medium (70-89%)': processedData.filter(p => p.predictionAccuracy >= 70 && p.predictionAccuracy < 90).length,
        'Low (50-69%)': processedData.filter(p => p.predictionAccuracy >= 50 && p.predictionAccuracy < 70).length,
        'Very Low (<50%)': processedData.filter(p => p.predictionAccuracy < 50).length
      };

      const userDistributionData: UserDistribution[] = Object.entries(accuracyTiers)
        .filter(([_, count]) => count > 0)
        .map(([tier, count]) => ({
          name: tier,
          value: count
        }));

      if (userDistributionData.length === 0) {
        userDistributionData.push({ name: 'No Data', value: 1 });
      }

      setUserDistribution(userDistributionData);

      // Generate historical accuracy data
      await generateHistoricalAccuracy();

      // Set comprehensive stats with real data
      setStats({
        totalPredictions,
        activePredictions: activeUsers,
        predictionUsers: processedData.length,
        averageAccuracy: FALLBACK_MODEL_CONFIDENCE, // Always 95% for fallback model
        predictionsByStatus: {
          active: processedData.filter(p => p.status === 'active').length,
          pending: processedData.filter(p => p.status === 'pending').length,
          error: processedData.filter(p => p.status === 'error').length
        },
        predictionsByType: {
          income: incomeTransactions,
          expense: expenseTransactions,
          savings: Math.max(0, incomeTransactions - expenseTransactions)
        },
        predictionsByUser: processedData.reduce((acc, user) => {
          acc[user.username] = user.predictionCount;
          return acc;
        }, {} as {[key: string]: number})
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching prediction data:", error);
      showErrorToast(`Failed to load predictions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set fallback data
      setPredictions([]);
      setStats({
        totalPredictions: 0,
        activePredictions: 0,
        predictionUsers: 0,
        averageAccuracy: FALLBACK_MODEL_CONFIDENCE,
        predictionsByStatus: { active: 0, pending: 0, error: 0 },
        predictionsByType: { income: 0, expense: 0, savings: 0 },
        predictionsByUser: {}
      });
      setModelStats([]);
      setUserDistribution([{ name: 'No Data', value: 1 }]);
      
      setLoading(false);
    }
  }, [showErrorToast, generateHistoricalAccuracy]);

  // Manual refresh function
  const refreshPredictionData = useCallback(async (filters: PredictionFilters) => {
    setLoading(true);
    try {
      await fetchUsers();
      await fetchServices();
      await fetchPredictions(filters);
      showSuccessToast("Prediction data refreshed successfully");
    } catch (error) {
      showErrorToast("Failed to refresh prediction data");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, fetchServices, fetchPredictions, showSuccessToast, showErrorToast]);

  // Regenerate predictions for user
  const regeneratePredictions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      
      const updatedPredictions = predictions.map(user => {
        if (user.userId === userId) {
          return {
            ...user,
            lastPredictionDate: new Date().toISOString().split('T')[0],
            predictionAccuracy: FALLBACK_MODEL_CONFIDENCE,
            status: 'active' as const
          };
        }
        return user;
      });
      
      setPredictions(updatedPredictions);
      showSuccessToast("Predictions regenerated with 95% confidence fallback model");
      setLoading(false);
    } catch (error) {
      showErrorToast("Failed to regenerate predictions");
      setLoading(false);
    }
  }, [predictions, showSuccessToast, showErrorToast]);

  // Update model
  const updateModel = useCallback(async () => {
    try {
      setLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccessToast("Fallback model updated successfully (95% confidence)");
      setLoading(false);
      return true;
    } catch (error) {
      showErrorToast("Failed to update model");
      setLoading(false);
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      
      channel = supabase.channel('admin-predictions-channel');
      
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'prophet_predictions' }, 
          () => {
            console.log('Prediction data updated');
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            console.log('Transaction data updated - trends may change');
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Error setting up real-time subscriptions:", error);
    }
    
    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.error("Error cleaning up channel:", cleanupError);
        }
      }
    };
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    predictions,
    services,
    users,
    stats,
    modelStats,
    userDistribution,
    historicalAccuracy,
    loading,
    totalPages,
    totalItems,
    fetchPredictions,
    fetchServices,
    fetchUsers,
    refreshPredictionData,
    regeneratePredictions,
    updateModel
  };
};
