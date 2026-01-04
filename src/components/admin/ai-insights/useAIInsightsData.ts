// AI Insights Data Management Hook
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../utils/ToastContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  AIInsight,
  AIInsightSummary,
  AIInsightStats,
  AIInsightFilters,
  AIInsightDetail,
  UserProfile,
  AIService,
  DEFAULT_FILTERS
} from './types';

interface UseAIInsightsDataReturn {
  // Data state
  insights: AIInsightSummary[];
  stats: AIInsightStats;
  users: UserProfile[];
  services: AIService[];
  totalPages: number;
  totalItems: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchInsights: (filters: AIInsightFilters, usersList?: UserProfile[]) => Promise<void>;
  getInsightDetail: (id: string) => Promise<AIInsightDetail | null>;
  createInsight: (data: Partial<AIInsight>) => Promise<boolean>;
  deleteInsight: (id: string) => Promise<boolean>;
  regenerateInsight: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  
  // Service management
  fetchServices: () => Promise<void>;
}

export const useAIInsightsData = (): UseAIInsightsDataReturn => {
  // State management
  const [insights, setInsights] = useState<AIInsightSummary[]>([]);
  const [stats, setStats] = useState<AIInsightStats>({
    totalInsights: 0,
    activeServices: 0,
    averageConfidence: 0,
    totalUsers: 0,
    riskDistribution: { high: 0, medium: 0, low: 0, unknown: 0 },
    serviceUsage: { openrouter: 0, chatbot: 0, prophet: 0, fallback: 0 },
    processingMetrics: { averageTime: 0, totalTokens: 0, successRate: 0 },
    usageToday: 0,
    rateLimitedToday: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<AIService[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const { showSuccessToast, showErrorToast } = useToast();

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, created_at, last_login, is_active')
        .order('full_name', { ascending: true });

      if (profileError) throw profileError;

      const userData = (userProfiles || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role || 'user',
        created_at: user.created_at,
        last_login: user.last_login,
        is_active: user.is_active ?? true
      }));

      setUsers(userData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
    }
  }, []);

  // Fetch AI insights with filters - remove users dependency to prevent loops
  const fetchInsights = useCallback(async (filters: AIInsightFilters, usersList?: UserProfile[]) => {
    try {
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Build query with filters
      let query = supabase
        .from('ai_insights')
        .select(`
          id,
          user_id,
          prediction_id,
          ai_service,
          model_used,
          insights,
          risk_assessment,
          recommendations,
          opportunity_areas,
          confidence_level,
          daily_usage_count,
          rate_limited,
          generated_at,
          expires_at,
          access_count,
          last_accessed_at,
          model_version,
          processing_status,
          generation_time_ms,
          token_usage
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        // Simplified search - only search in summary for now to avoid dependency issues
        query = query.or(`insights->>'summary'.ilike.%${filters.search}%`);
      }

      if (filters.aiService !== 'all') {
        query = query.eq('ai_service', filters.aiService);
      }

      if (filters.riskLevel !== 'all') {
        query = query.or(`insights->'riskAssessment'->>'level'.eq.${filters.riskLevel},risk_assessment->>'level'.eq.${filters.riskLevel}`);
      }

      if (filters.confidenceRange.min > 0) {
        query = query.gte('confidence_level', filters.confidenceRange.min / 100);
      }

      if (filters.confidenceRange.max < 100) {
        query = query.lte('confidence_level', filters.confidenceRange.max / 100);
      }

      if (filters.dateRange.startDate) {
        query = query.gte('generated_at', filters.dateRange.startDate);
      }

      if (filters.dateRange.endDate) {
        query = query.lte('generated_at', filters.dateRange.endDate);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      // Apply sorting - map special cases to database column names
      const sortByMapping: { [key: string]: string } = {
        'processing_time': 'generation_time_ms', // Map to correct column name
        'username': 'user_id', // Sort by user_id since we can't join here
        'riskLevel': 'risk_assessment', // Map camelCase to snake_case
        'aiService': 'ai_service', // Map camelCase to snake_case
        'status': 'processing_status' // Map to correct column name
      };
      
      const dbColumnName = sortByMapping[filters.sortBy] || filters.sortBy;
      query = query.order(dbColumnName, { ascending: filters.sortOrder === 'asc' });

      // Apply pagination
      const startIndex = (filters.currentPage - 1) * filters.pageSize;
      query = query.range(startIndex, startIndex + filters.pageSize - 1);

      const { data: insightsData, error: insightsError, count } = await query;

      if (insightsError) throw insightsError;

      // Use provided users list or fall back to state
      const usersToUse = usersList || users;

      // Process insights data
      const processedInsights: AIInsightSummary[] = (insightsData || []).map((insight: any) => {
        // Find user data
        const user = usersToUse.find(u => u.id === insight.user_id);
        const riskLevel = insight.insights?.riskAssessment?.level || 
                         insight.risk_assessment?.level || 
                         'unknown';

        // Determine status
        let status: 'active' | 'expired' | 'error' = 'active';
        if (new Date(insight.expires_at) < new Date()) {
          status = 'expired';
        }
        if (insight.processing_status === 'failed') {
          status = 'error';
        }

        return {
          insightId: insight.id,
          userId: insight.user_id,
          username: user?.full_name || user?.email?.split('@')[0] || `User ${insight.user_id.substring(0, 8)}`,
          avatarUrl: user?.avatar_url || undefined,
          aiService: insight.ai_service,
          modelUsed: insight.model_used,
          confidenceLevel: Math.round((insight.confidence_level || 0) * 100),
          riskLevel: riskLevel as 'high' | 'medium' | 'low' | 'unknown',
          generatedDate: insight.generated_at,
          processingTime: insight.generation_time_ms || 0,
          tokenUsage: insight.token_usage?.total_tokens || 0,
          accessCount: insight.access_count || 0,
          status,
          lastAccessed: insight.last_accessed_at
        };
      });

      setInsights(processedInsights);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / filters.pageSize));

    } catch (err: any) {
      console.error('Error fetching insights:', err);
      setError(err.message);
      showErrorToast(`Failed to load insights: ${err.message}`);
    }
  }, [showErrorToast]);

  // Calculate statistics
  const calculateStats = useCallback(async () => {
    try {
      if (!supabase) return;

      // Get total insights count with error handling
      const { count: totalCount, error: countError } = await supabase
        .from('ai_insights')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.warn('Error getting insights count:', countError);
        return;
      }

      // Get insights data for calculations with error handling
      const { data: allInsights, error: dataError } = await supabase
        .from('ai_insights')
        .select('ai_service, confidence_level, risk_assessment, insights, generated_at, rate_limited, generation_time_ms, token_usage');

      if (dataError) {
        console.warn('Error getting insights data:', dataError);
        return;
      }

      if (!allInsights) return;

      // Calculate risk distribution
      const riskDistribution = { high: 0, medium: 0, low: 0, unknown: 0 };
      allInsights.forEach((insight: any) => {
        const riskLevel = insight.insights?.riskAssessment?.level || 
                         insight.risk_assessment?.level || 
                         'unknown';
        riskDistribution[riskLevel as keyof typeof riskDistribution]++;
      });

      // Calculate service usage
      const serviceUsage = { openrouter: 0, chatbot: 0, prophet: 0, fallback: 0 };
      allInsights.forEach((insight: any) => {
        serviceUsage[insight.ai_service as keyof typeof serviceUsage]++;
      });

      // Calculate processing metrics
      const processingTimes = allInsights
        .filter((insight: any) => insight.generation_time_ms)
        .map((insight: any) => insight.generation_time_ms);
      
      const totalTokens = allInsights
        .filter((insight: any) => insight.token_usage?.total_tokens)
        .reduce((sum: number, insight: any) => sum + insight.token_usage.total_tokens, 0);

      const averageConfidence = allInsights.length > 0
        ? allInsights.reduce((sum: number, insight: any) => sum + (insight.confidence_level || 0), 0) / allInsights.length * 100
        : 0;

      const averageTime = processingTimes.length > 0
        ? processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length
        : 0;

      // Get today's usage and rate limiting with error handling
      const today = new Date().toISOString().split('T')[0];
      const [usageTodayResult, rateLimitedTodayResult, uniqueUsersResult] = await Promise.allSettled([
        supabase
          .from('ai_insights')
          .select('*', { count: 'exact', head: true })
          .gte('generated_at', today),
        supabase
          .from('ai_insights')
          .select('*', { count: 'exact', head: true })
          .eq('rate_limited', true)
          .gte('generated_at', today),
        supabase
          .from('ai_insights')
          .select('user_id', { count: 'exact' })
          .not('user_id', 'is', null)
      ]);

      const usageToday = usageTodayResult.status === 'fulfilled' ? usageTodayResult.value.count : 0;
      const rateLimitedToday = rateLimitedTodayResult.status === 'fulfilled' ? rateLimitedTodayResult.value.count : 0;
      const uniqueUsers = uniqueUsersResult.status === 'fulfilled' ? uniqueUsersResult.value.data : [];

      const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id) || []);

      const newStats: AIInsightStats = {
        totalInsights: totalCount || 0,
        activeServices: uniqueUserIds.size, // Active users with insights
        averageConfidence: Math.round(averageConfidence),
        totalUsers: uniqueUserIds.size,
        riskDistribution,
        serviceUsage,
        processingMetrics: {
          averageTime: Math.round(averageTime),
          totalTokens,
          successRate: allInsights.length > 0 
            ? Math.round((allInsights.filter((i: any) => i.processing_status !== 'failed').length / allInsights.length) * 100)
            : 0
        },
        usageToday: usageToday || 0,
        rateLimitedToday: rateLimitedToday || 0
      };

      setStats(newStats);

    } catch (err: any) {
      console.error('Error calculating stats:', err);
    }
  }, [services]);

  // Get detailed insight
  const getInsightDetail = useCallback(async (id: string): Promise<AIInsightDetail | null> => {
    try {
      if (!supabase) return null;

      // First get the insight without the problematic join
      const { data: insight, error } = await supabase
        .from('ai_insights')
        .select(`
          *
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Separately fetch related predictions if prediction_id exists
      let relatedPredictions: any[] = [];
      if (insight.prediction_id) {
        const { data: predictionData } = await supabase
          .from('prophet_predictions')
          .select('id, timeframe, confidence_score, generated_at')
          .eq('id', insight.prediction_id);
        
        if (predictionData) {
          relatedPredictions = predictionData;
        }
      }

      // Get user profile
      const user = users.find(u => u.id === insight.user_id);
      if (user) {
        insight.profiles = {
          id: user.id,
          full_name: user.full_name,
          email: user.email
        };
      }

      // Get usage history (mock data for now)
      const usageHistory = [
        { date: new Date().toISOString().split('T')[0], access_count: insight.access_count || 0 }
      ];

      // Get service metrics (mock data for now)
      const serviceMetrics = {
        total_requests: 1,
        average_processing_time: insight.generation_time_ms || 0,
        success_rate: insight.processing_status === 'completed' ? 100 : 0
      };

      return {
        ...insight,
        relatedPredictions,
        usageHistory,
        serviceMetrics
      } as AIInsightDetail;

    } catch (err: any) {
      console.error('Error fetching insight detail:', err);
      showErrorToast(`Failed to load insight details: ${err.message}`);
      return null;
    }
  }, [users, showErrorToast]);

  // Create insight
  const createInsight = useCallback(async (data: Partial<AIInsight>): Promise<boolean> => {
    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('ai_insights')
        .insert([{
          ...data,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          access_count: 0,
          daily_usage_count: 1,
          rate_limited: false,
          processing_status: 'completed'
        }]);

      if (error) throw error;

      showSuccessToast('AI insight created successfully');
      return true;

    } catch (err: any) {
      console.error('Error creating insight:', err);
      showErrorToast(`Failed to create insight: ${err.message}`);
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Delete insight
  const deleteInsight = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('ai_insights')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showSuccessToast('AI insight deleted successfully');
      return true;

    } catch (err: any) {
      console.error('Error deleting insight:', err);
      showErrorToast(`Failed to delete insight: ${err.message}`);
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Regenerate insight (placeholder for API call)
  const regenerateInsight = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (!supabase) return false;

      // This would typically call an API endpoint to regenerate the insight
      // For now, we'll just update the generated_at timestamp
      const { error } = await supabase
        .from('ai_insights')
        .update({
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          processing_status: 'completed'
        })
        .eq('id', id);

      if (error) throw error;

      showSuccessToast('AI insight regenerated successfully');
      return true;

    } catch (err: any) {
      console.error('Error regenerating insight:', err);
      showErrorToast(`Failed to regenerate insight: ${err.message}`);
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Fetch services (mock data for now)
  const fetchServices = useCallback(async () => {
    try {
      // Mock service data - in real implementation this would come from a services table
      const mockServices: AIService[] = [
        {
          id: '1',
          service_name: 'openrouter',
          display_name: 'OpenRouter',
          description: 'AI insights via OpenRouter API',
          model_options: ['openai/gpt-oss-120b:free', 'openai/gpt-4o-mini', 'anthropic/claude-3-haiku'],
          default_model: 'openai/gpt-oss-120b:free',
          is_enabled: true,
          rate_limit_per_hour: 60,
          rate_limit_per_day: 1000,
          max_tokens: 4000,
          temperature: 0.7,
          confidence_threshold: 0.8,
          timeout_seconds: 30,
          fallback_service: 'fallback',
          api_endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          api_key_required: true,
          cost_per_token: 0.0001,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          service_name: 'chatbot',
          display_name: 'ChatBot',
          description: 'Internal chatbot service',
          model_options: ['internal-v1'],
          default_model: 'internal-v1',
          is_enabled: true,
          rate_limit_per_hour: 120,
          rate_limit_per_day: 2000,
          max_tokens: 2000,
          temperature: 0.5,
          confidence_threshold: 0.7,
          timeout_seconds: 20,
          api_key_required: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          service_name: 'prophet',
          display_name: 'Prophet',
          description: 'Prophet model integration',
          model_options: ['prophet-v1'],
          default_model: 'prophet-v1',
          is_enabled: true,
          rate_limit_per_hour: 30,
          rate_limit_per_day: 500,
          max_tokens: 1000,
          temperature: 0.3,
          confidence_threshold: 0.9,
          timeout_seconds: 60,
          api_key_required: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          service_name: 'fallback',
          display_name: 'Fallback',
          description: 'Fallback service for failed requests',
          model_options: ['basic-v1'],
          default_model: 'basic-v1',
          is_enabled: true,
          rate_limit_per_hour: 1000,
          rate_limit_per_day: 10000,
          max_tokens: 500,
          temperature: 0.1,
          confidence_threshold: 0.5,
          timeout_seconds: 10,
          api_key_required: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setServices(mockServices);

    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message);
    }
  }, []);

  // Refresh all data - separate from initial load to avoid dependency issues
  const refreshData = useCallback(async () => {
    try {
      const [newUsers] = await Promise.all([
        fetchUsers(),
        fetchServices()
      ]);
      // Calculate stats after users and services are updated
      await calculateStats();
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data');
    }
  }, [fetchUsers, fetchServices, calculateStats]);

  // Initial data load - run once on mount
  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const initData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Set a timeout to prevent infinite loading states
        loadingTimeout = setTimeout(() => {
          if (isMounted) {
            setLoading(false);
            setError('Loading timeout - please refresh the page');
          }
        }, 30000); // 30 second timeout
        
        // Fetch users and services first
        await Promise.all([fetchUsers(), fetchServices()]);
        
        // Then calculate stats
        await calculateStats();
        
        // Clear timeout on successful load
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
        
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load data');
        }
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initData();

    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []); // Empty dependency array - run only once

  // Setup realtime subscription - disabled to prevent glitching
  useEffect(() => {
    if (!supabase || loading) return;

    // Realtime subscription disabled to prevent frontend glitching
    // Can be re-enabled later with proper debouncing if needed
    
    // const channel = supabase
    //   .channel('ai_insights_changes')
    //   .on('postgres_changes', {
    //     event: '*',
    //     schema: 'public',
    //     table: 'ai_insights'
    //   }, () => {
    //     // Refresh data when insights change (but not during initial load)
    //     if (!loading) {
    //       refreshData();
    //     }
    //   })
    //   .subscribe();

    // setRealtimeChannel(channel);

    // return () => {
    //   if (channel) {
    //     supabase.removeChannel(channel);
    //   }
    // };
  }, [loading]);

  return {
    // Data state
    insights,
    stats,
    users,
    services,
    totalPages,
    totalItems,
    loading,
    error,
    
    // Actions
    fetchInsights,
    getInsightDetail,
    createInsight,
    deleteInsight,
    regenerateInsight,
    refreshData,
    
    // Service management
    fetchServices
  };
};
