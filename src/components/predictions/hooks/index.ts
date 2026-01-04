import { useState, useEffect, useCallback } from 'react';
import { 
  TimeframeType, 
  DataType, 
  CategoryPrediction, 
  ModelAccuracy, 
  ModelDetail, 
  TooltipPosition,
  PredictionDataPoint,
  PredictionInsights,
  AIInsightResponse,
  PredictionError,
  EnhancedPredictionData
} from '../types';
import { 
  generateModelMetadata, 
  generateCategoryPredictions, 
  generatePredictionData,
  calculateInsights
} from '../utils';
import { PredictionService } from '../../../services/database/predictionService';
import { AIInsightsService } from '../../../services/database/aiInsightsService';
import { useAuth } from '../../../utils/AuthContext';

/**
 * Hook for managing tooltip state and positioning
 */
export const useTooltips = () => {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  return {
    activeTip,
    tooltipPosition,
    toggleTip
  };
};

/**
 * Hook for managing prediction filters (timeframe and data type)
 */
export const usePredictionFilters = () => {
  const [timeframe, setTimeframe] = useState<TimeframeType>("3months");
  const [dataType, setDataType] = useState<DataType>("all");

  return {
    timeframe,
    dataType,
    setTimeframe,
    setDataType
  };
};

/**
 * Hook for managing model details visibility
 */
export const useModelDetailsToggle = () => {
  const [showModelDetails, setShowModelDetails] = useState<boolean>(false);
  const [showAccuracyReport, setShowAccuracyReport] = useState<boolean>(false);

  return {
    showModelDetails,
    showAccuracyReport,
    setShowModelDetails,
    setShowAccuracyReport
  };
};

/**
 * Main hook for managing all prediction data and state with real Supabase integration
 */
export const usePredictionData = (timeframe: TimeframeType) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<PredictionError | null>(null);
  const [categoryPredictions, setCategoryPredictions] = useState<CategoryPrediction[]>([]);
  const [modelAccuracy, setModelAccuracy] = useState<ModelAccuracy[]>([]);
  const [modelDetails, setModelDetails] = useState<ModelDetail[]>([]);
  const [predictionData, setPredictionData] = useState<Record<TimeframeType, PredictionDataPoint[]>>({
    "3months": [],
    "6months": [],
    "1year": []
  });
  const [insights, setInsights] = useState<PredictionInsights>({
    incomeGrowth: 0,
    expenseGrowth: 0,
    savingsGrowth: 0
  });
  const [aiInsights, setAiInsights] = useState<AIInsightResponse | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'expired'>('miss');

  // Real-time subscription cleanup
  const [realtimeCleanup, setRealtimeCleanup] = useState<(() => void) | null>(null);

  const fetchPredictionData = useCallback(async () => {
    if (!user?.id) {
      setError({
        code: 'AUTH_ERROR',
        message: 'User not authenticated',
        context: {},
        recoverable: true,
        timestamp: new Date()
      });
      setLoading(false);
      return;
    }

    console.log('usePredictionData: Starting data fetch for user:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      // Add timeout wrapper for the entire operation
      const dataFetchPromise = (async () => {
        setCacheStatus('miss');
        
        console.log('usePredictionData: Fetching fresh data from database');
        
        // Fetch all data in parallel with individual timeouts
        const [metadata, categoryData, predictionDataResult] = await Promise.all([
          Promise.resolve(generateModelMetadata()),
          Promise.race([
            generateCategoryPredictions(user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Category predictions timeout')), 8000)
            )
          ]).catch(error => {
            console.warn('Category predictions failed, using empty state:', error);
            return [{
              category: "Data Loading Error",
              current: 0,
              predicted: 0,
              change: 0,
              changePercent: 0,
              isEmptyState: true
            }];
          }),
          Promise.race([
            generatePredictionData(user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Prediction data timeout')), 8000)
            )
          ]).catch(error => {
            console.warn('Prediction data generation failed, using defaults:', error);
            return {
              "3months": [],
              "6months": [],
              "1year": []
            };
          })
        ]);

        console.log('usePredictionData: Data fetched successfully', {
          metadata: !!metadata,
          categoryDataLength: Array.isArray(categoryData) ? categoryData.length : 0,
          predictionDataKeys: predictionDataResult ? Object.keys(predictionDataResult as object) : []
        });

        return {
          metadata,
          categoryData,
          predictionDataResult
        };
      })();
      
      // Apply overall timeout to the entire operation
      const fetchedData = await Promise.race([
        dataFetchPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Overall data fetch timeout')), 12000)
        )
      ]) as { metadata: any; categoryData: any; predictionDataResult: any };

      setCacheStatus('hit');
      
      const { metadata, categoryData, predictionDataResult } = fetchedData;
      const { modelDetails: newModelDetails, modelAccuracy: newModelAccuracy } = metadata;
      
      setModelDetails(newModelDetails);
      setModelAccuracy(newModelAccuracy);
      setCategoryPredictions(categoryData);
      setPredictionData(predictionDataResult);
      
      // Calculate insights for current timeframe
      const currentInsights = await calculateInsights(predictionDataResult[timeframe], user.id);
      setInsights(currentInsights);

      // Generate AI insights (optional, don't let it block the main flow)
      // Skip AI insights for now to prevent CORS errors and database issues
      console.log('Skipping AI insights generation to prevent external API errors');
      setAiInsights(null);
      
      /*
      setTimeout(async () => {
        try {
          const userProfile = await PredictionService.buildUserFinancialProfile(user.id);
          const aiResponse = await AIInsightsService.generateInsights({
            predictionData: [], // Convert to ProphetPrediction format if needed
            categoryForecasts: await PredictionService.generateCategoryForecasts(user.id),
            userContext: { userId: user.id, user_id: user.id, ...userProfile },
            timeframe: timeframe === '3months' ? 'months_3' : timeframe === '6months' ? 'months_6' : 'year_1'
          });
          setAiInsights(aiResponse);
        } catch (aiError) {
          console.warn('AI insights failed, continuing without them:', aiError);
          setAiInsights(null);
        }
      }, 100); // Run AI insights generation asynchronously
      */
      
    } catch (fetchError) {
      console.error('Error loading prediction data:', fetchError);
      
      // If timeout or other error, set empty state data
      setCategoryPredictions([{
        category: "Loading Failed",
        current: 0,
        predicted: 0,
        change: 0,
        changePercent: 0,
        isEmptyState: true
      }]);
      
      setError({
        code: 'FETCH_ERROR',
        message: fetchError instanceof Error ? fetchError.message : 'Failed to load prediction data',
        context: { timeframe, userId: user.id },
        recoverable: true,
        timestamp: new Date()
      });
    } finally {
      console.log('usePredictionData: Setting loading to false');
      setLoading(false);
    }
  }, [user?.id, timeframe]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Clean up previous subscription
    if (realtimeCleanup) {
      realtimeCleanup();
    }

    // Setup new subscription
    const cleanup = PredictionService.subscribeToRealtimeUpdates(
      user.id,
      () => {
        console.log('Real-time update received, refreshing prediction data');
        // Refetch data from database
        fetchPredictionData();
      }
    );

    setRealtimeCleanup(() => cleanup);

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
    };
  }, [user?.id, fetchPredictionData]);

  // Initial data fetch
  useEffect(() => {
    fetchPredictionData();
  }, [fetchPredictionData]);

  // Update insights when timeframe changes
  useEffect(() => {
    if (predictionData[timeframe]?.length > 0) {
      calculateInsights(predictionData[timeframe], user?.id).then(setInsights);
    }
  }, [timeframe, predictionData, user?.id]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    if (user?.id) {
      fetchPredictionData();
    }
  }, [user?.id, fetchPredictionData]);

  return {
    loading,
    error,
    categoryPredictions,
    modelAccuracy,
    modelDetails,
    predictionData,
    insights,
    aiInsights,
    cacheStatus,
    refreshData
  };
};