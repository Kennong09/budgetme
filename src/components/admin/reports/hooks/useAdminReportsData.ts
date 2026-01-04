import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../utils/AuthContext';
import { useToast } from '../../../../utils/ToastContext';
import { supabase } from '../../../../utils/supabaseClient';

// Interfaces for admin-specific data
export interface SystemActivityData {
  activity_type: string;
  count: number;
  activity_date: string;
  severity?: string;
}

export interface UserEngagementData {
  total_users: number;
  new_users_today: number;
  active_users_week: number;
  active_users_month: number;
}

export interface FinancialSystemHealth {
  total_transactions: number;
  transactions_today: number;
  transactions_week: number;
  active_budgets: number;
  active_goals: number;
  total_families: number;
  avg_transaction_amount: number;
}

export interface AIMLAnalytics {
  total_predictions: number;
  predictions_today: number;
  predictions_week: number;
  avg_confidence_score: number;
  total_insights: number;
  insights_today: number;
  ai_service_distribution: { [key: string]: number };
}

export interface ChatbotAnalytics {
  total_sessions: number;
  active_sessions: number;
  total_messages: number;
  messages_today: number;
  avg_session_rating: number;
  session_type_distribution: { [key: string]: number };
  sentiment_distribution: { [key: string]: number };
}

export interface AdminDashboardSummary {
  total_users: number;
  new_users_today: number;
  active_users_week: number;
  activities_today: number;
  errors_today: number;
  transactions_today: number;
  active_budgets: number;
  active_goals: number;
  total_families: number;
  total_family_members: number;
  predictions_today: number;
  unread_notifications: number;
}

export interface AdminReportsData {
  dashboardSummary: AdminDashboardSummary | null;
  systemActivity: SystemActivityData[];
  userEngagement: UserEngagementData | null;
  financialHealth: FinancialSystemHealth | null;
  aimlAnalytics: AIMLAnalytics | null;
  chatbotAnalytics: ChatbotAnalytics | null;
  loading: boolean;
  error: string | null;
}

export const useAdminReportsData = (timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week') => {
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for different data types
  const [dashboardSummary, setDashboardSummary] = useState<AdminDashboardSummary | null>(null);
  const [systemActivity, setSystemActivity] = useState<SystemActivityData[]>([]);
  const [userEngagement, setUserEngagement] = useState<UserEngagementData | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialSystemHealth | null>(null);
  const [aimlAnalytics, setAIMLAnalytics] = useState<AIMLAnalytics | null>(null);
  const [chatbotAnalytics, setChatbotAnalytics] = useState<ChatbotAnalytics | null>(null);
  
  const subscriptionsRef = useRef<any[]>([]);

  // Calculate date range based on timeframe
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch(timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { startDate, endDate: now };
  };

  // Fetch dashboard summary
  const fetchDashboardSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_dashboard_summary')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching dashboard summary:', error);
        throw error;
      }
      
      setDashboardSummary(data);
    } catch (err) {
      console.error('Error in fetchDashboardSummary:', err);
      throw err;
    }
  };

  // Fetch system activity data
  const fetchSystemActivity = async () => {
    try {
      const { startDate } = getDateRange();
      
      const { data, error } = await supabase
        .from('system_activity_log')
        .select('activity_type, created_at, severity')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching system activity:', error);
        throw error;
      }
      
      // Process data by grouping by activity type and date
      const activityMap: { [key: string]: { [date: string]: number } } = {};
      
      (data || []).forEach(activity => {
        const date = new Date(activity.created_at).toDateString();
        const type = activity.activity_type;
        
        if (!activityMap[type]) {
          activityMap[type] = {};
        }
        
        if (!activityMap[type][date]) {
          activityMap[type][date] = 0;
        }
        
        activityMap[type][date]++;
      });
      
      // Convert to array format
      const activityData: SystemActivityData[] = [];
      Object.keys(activityMap).forEach(type => {
        Object.keys(activityMap[type]).forEach(date => {
          activityData.push({
            activity_type: type,
            count: activityMap[type][date],
            activity_date: date
          });
        });
      });
      
      setSystemActivity(activityData);
    } catch (err) {
      console.error('Error in fetchSystemActivity:', err);
      throw err;
    }
  };

  // Fetch user engagement metrics
  const fetchUserEngagement = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get new users today
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      
      // Get active users this week (based on last_login)
      const { count: activeUsersWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', weekStart.toISOString());
      
      // Get active users this month
      const { count: activeUsersMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', monthStart.toISOString());
      
      setUserEngagement({
        total_users: totalUsers || 0,
        new_users_today: newUsersToday || 0,
        active_users_week: activeUsersWeek || 0,
        active_users_month: activeUsersMonth || 0
      });
    } catch (err) {
      console.error('Error in fetchUserEngagement:', err);
      throw err;
    }
  };

  // Fetch financial system health
  const fetchFinancialHealth = async () => {
    try {
      const { startDate } = getDateRange();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get transaction counts
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      const { count: transactionsToday } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      
      const { count: transactionsWeek } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString());
      
      // Get budget and goal counts
      const { count: activeBudgets } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      const { count: activeGoals } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');
      
      const { count: totalFamilies } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true });
      
      // Get average transaction amount
      const { data: avgData } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', startDate.toISOString());
      
      const avgAmount = (avgData && avgData.length > 0) ? 
        (avgData || []).reduce((sum, t) => sum + Number(t.amount), 0) / avgData.length : 0;
      
      setFinancialHealth({
        total_transactions: totalTransactions || 0,
        transactions_today: transactionsToday || 0,
        transactions_week: transactionsWeek || 0,
        active_budgets: activeBudgets || 0,
        active_goals: activeGoals || 0,
        total_families: totalFamilies || 0,
        avg_transaction_amount: avgAmount
      });
    } catch (err) {
      console.error('Error in fetchFinancialHealth:', err);
      throw err;
    }
  };

  // Fetch AI/ML analytics
  const fetchAIMLAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get prediction analytics
      const { data: predictionData } = await supabase
        .from('prophet_predictions')
        .select('generated_at, confidence_score');
      
      const totalPredictions = predictionData?.length || 0;
      const predictionsToday = predictionData?.filter(p => 
        new Date(p.generated_at) >= todayStart).length || 0;
      const predictionsWeek = predictionData?.filter(p => 
        new Date(p.generated_at) >= weekStart).length || 0;
      const avgConfidence = totalPredictions > 0 ? 
        (predictionData || []).reduce((sum, p) => sum + Number(p.confidence_score), 0) / totalPredictions : 0;
      
      // Get AI insights analytics
      const { data: insightData } = await supabase
        .from('ai_insights')
        .select('generated_at, ai_service');
      
      const totalInsights = insightData?.length || 0;
      const insightsToday = insightData?.filter(i => 
        new Date(i.generated_at) >= todayStart).length || 0;
      
      // Get AI service distribution
      const serviceDistribution: { [key: string]: number } = {};
      (insightData || []).forEach(insight => {
        const service = insight.ai_service || 'unknown';
        serviceDistribution[service] = (serviceDistribution[service] || 0) + 1;
      });
      
      setAIMLAnalytics({
        total_predictions: totalPredictions,
        predictions_today: predictionsToday,
        predictions_week: predictionsWeek,
        avg_confidence_score: avgConfidence,
        total_insights: totalInsights,
        insights_today: insightsToday,
        ai_service_distribution: serviceDistribution
      });
    } catch (err) {
      console.error('Error in fetchAIMLAnalytics:', err);
      throw err;
    }
  };

  // Fetch chatbot analytics
  const fetchChatbotAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get session analytics
      const { count: totalSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true });
      
      const { count: activeSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Get message analytics
      const { count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });
      
      const { count: messagesToday } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      
      // Get session type distribution
      const { data: sessionTypeData } = await supabase
        .from('chat_sessions')
        .select('session_type');
      
      const sessionTypeDistribution: { [key: string]: number } = {};
      (sessionTypeData || []).forEach(session => {
        const type = session.session_type || 'general';
        sessionTypeDistribution[type] = (sessionTypeDistribution[type] || 0) + 1;
      });
      
      // Get sentiment distribution
      const { data: sentimentData } = await supabase
        .from('chat_messages')
        .select('message_sentiment')
        .not('message_sentiment', 'is', null);
      
      const sentimentDistribution: { [key: string]: number } = {};
      (sentimentData || []).forEach(message => {
        const sentiment = message.message_sentiment || 'neutral';
        sentimentDistribution[sentiment] = (sentimentDistribution[sentiment] || 0) + 1;
      });
      
      // Get average session rating
      const { data: ratingData } = await supabase
        .from('chat_sessions')
        .select('user_satisfaction_rating')
        .not('user_satisfaction_rating', 'is', null);
      
      const avgRating = (ratingData && ratingData.length > 0) ? 
        (ratingData || []).reduce((sum, s) => sum + Number(s.user_satisfaction_rating), 0) / ratingData.length : 0;
      
      setChatbotAnalytics({
        total_sessions: totalSessions || 0,
        active_sessions: activeSessions || 0,
        total_messages: totalMessages || 0,
        messages_today: messagesToday || 0,
        avg_session_rating: avgRating,
        session_type_distribution: sessionTypeDistribution,
        sentiment_distribution: sentimentDistribution
      });
    } catch (err) {
      console.error('Error in fetchChatbotAnalytics:', err);
      throw err;
    }
  };

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = () => {
    if (!user) return;
    
    // Clean up existing subscriptions
    if (subscriptionsRef.current.length > 0) {
      subscriptionsRef.current.forEach((subscription: any) => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
    }
    
    const timestamp = Date.now();
    
    // Subscribe to system activity changes
    const systemActivitySubscription = supabase
      .channel(`admin-system-activity-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_activity_log'
      }, () => {
        fetchSystemActivity();
        fetchDashboardSummary();
      })
      .subscribe();
    
    // Subscribe to user profile changes
    const profileSubscription = supabase
      .channel(`admin-profiles-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchUserEngagement();
        fetchDashboardSummary();
      })
      .subscribe();
    
    // Subscribe to transaction changes
    const transactionSubscription = supabase
      .channel(`admin-transactions-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, () => {
        fetchFinancialHealth();
        fetchDashboardSummary();
      })
      .subscribe();
    
    // Subscribe to prediction changes
    const predictionSubscription = supabase
      .channel(`admin-predictions-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prophet_predictions'
      }, () => {
        fetchAIMLAnalytics();
      })
      .subscribe();
    
    // Subscribe to AI insights changes
    const insightsSubscription = supabase
      .channel(`admin-insights-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_insights'
      }, () => {
        fetchAIMLAnalytics();
      })
      .subscribe();
    
    // Subscribe to chat session changes
    const chatSubscription = supabase
      .channel(`admin-chat-${timestamp}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions'
      }, () => {
        fetchChatbotAnalytics();
      })
      .subscribe();
    
    subscriptionsRef.current = [
      systemActivitySubscription,
      profileSubscription,
      transactionSubscription,
      predictionSubscription,
      insightsSubscription,
      chatSubscription
    ];
  };

  // Main data fetching function
  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchDashboardSummary(),
        fetchSystemActivity(),
        fetchUserEngagement(),
        fetchFinancialHealth(),
        fetchAIMLAnalytics(),
        fetchChatbotAnalytics()
      ]);
    } catch (err) {
      console.error('Error fetching admin reports data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
      showErrorToast('Failed to load admin reports data');
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data and setup subscriptions
  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
    
    return () => {
      if (subscriptionsRef.current.length > 0) {
        subscriptionsRef.current.forEach((subscription: any) => {
          supabase.removeChannel(subscription);
        });
        subscriptionsRef.current = [];
      }
    };
  }, [user, timeframe]);

  // Return all data and utilities
  return {
    dashboardSummary,
    systemActivity,
    userEngagement,
    financialHealth,
    aimlAnalytics,
    chatbotAnalytics,
    loading,
    error,
    refreshData: fetchAllData
  } as AdminReportsData & { refreshData: () => Promise<void> };
};
