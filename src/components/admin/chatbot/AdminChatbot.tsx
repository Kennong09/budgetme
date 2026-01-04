import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { truncateNumber } from "../../../utils/helpers";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import ViewSessionModal from "./ViewSessionModal";
import SystemPromptModal from "./SystemPromptModal";
import { 
  ChatSession, 
  ChatMessage, 
  SystemPromptSetting, 
  ChatbotAnalytics, 
  SessionFilters 
} from "./types";

// Stats Card Detail Modal Component
interface StatsDetailModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  color: string;
  icon: string;
  data: {
    label: string;
    value: string | number;
    subLabel?: string;
  }[];
}

const StatsDetailModal: FC<StatsDetailModalProps> = ({ show, onClose, title, color, icon, data }) => {
  if (!show) return null;

  // Header always uses red gradient with white font
  const getHeaderStyle = () => {
    return { background: 'linear-gradient(135deg, #e74a3b 0%, #be2617 100%)' };
  };

  // Get badge colors based on card color
  const getBadgeStyle = () => {
    const badgeColors: { [key: string]: { bg: string; text: string } } = {
      danger: { bg: '#e74a3b', text: '#ffffff' },
      success: { bg: '#1cc88a', text: '#ffffff' },
      info: { bg: '#36b9cc', text: '#ffffff' },
      warning: { bg: '#f6c23e', text: '#212529' },
      primary: { bg: '#4e73df', text: '#ffffff' },
    };
    return badgeColors[color] || badgeColors.danger;
  };

  const badgeStyle = getBadgeStyle();

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        style={{ zIndex: 1050 }}
        onClick={onClose}
      >
        <div 
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Modal Header - Red palette with white font */}
            <div 
              className="modal-header border-0 py-3 px-4" 
              style={{ 
                ...getHeaderStyle(),
                minHeight: '80px'
              }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'rgba(255,255,255,0.25)', 
                    borderRadius: '10px',
                    flexShrink: 0
                  }}
                >
                  <i className={`fas ${icon} text-white`} style={{ fontSize: '1.25rem' }}></i>
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-0 text-white font-weight-bold" style={{ fontSize: '1.1rem' }}>{title}</h5>
                  <small className="text-white" style={{ opacity: 0.9 }}>Detailed breakdown</small>
                </div>
                <button 
                  type="button" 
                  className="btn p-0 text-white"
                  onClick={onClose}
                  style={{ 
                    fontSize: '1.5rem', 
                    lineHeight: 1,
                    opacity: 0.9,
                    background: 'none',
                    border: 'none'
                  }}
                >
                  <span>&times;</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body px-4 py-3">
              <div className="stats-breakdown-list">
                {data.map((item, index) => (
                  <div 
                    key={index} 
                    className="d-flex justify-content-between align-items-center py-3"
                    style={{ borderBottom: index < data.length - 1 ? '1px solid #e9ecef' : 'none' }}
                  >
                    <div>
                      <div className="font-weight-medium" style={{ color: '#5a5c69', fontSize: '0.95rem' }}>{item.label}</div>
                      {item.subLabel && <small className="text-muted">{item.subLabel}</small>}
                    </div>
                    <span 
                      className="badge badge-pill px-3 py-2"
                      style={{ 
                        backgroundColor: badgeStyle.bg, 
                        color: badgeStyle.text,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        minWidth: '80px',
                        textAlign: 'center'
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light border-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="modal-footer-info">
                  <small className="text-muted">
                    <i className="fas fa-info-circle mr-1"></i>
                    Data reflects current statistics
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times mr-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const AdminChatbot: FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { showSuccessToast, showErrorToast } = useToast();

  // System prompt state
  const [systemPromptData, setSystemPromptData] = useState<SystemPromptSetting | null>(null);

  // Interactions data state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analytics, setAnalytics] = useState<ChatbotAnalytics>({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    averageMessagesPerSession: 0,
    averageSatisfactionRating: 0,
    sessionsByType: {},
    messagesByType: {},
    sentimentDistribution: {}
  });

  // Filters
  const [filters, setFilters] = useState<SessionFilters>({
    searchTerm: "",
    sessionType: "all",
    messageType: "all",
    dateFrom: "",
    dateTo: "",
    currentPage: 1,
    pageSize: 10
  });

  // Selected session for viewing messages
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState<boolean>(false);
  
  // System prompt modal
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);

  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    color: string;
    icon: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', color: '', icon: '', data: [] });

  // Pagination
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Mobile chart tabs
  const [mobileChartTab, setMobileChartTab] = useState<'sessions' | 'messages' | 'sentiment'>('sessions');

  // Fetch system prompt
  const fetchSystemPrompt = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'chatbot_system_prompt')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSystemPromptData(data as SystemPromptSetting);
      }
    } catch (error) {
      console.error('Error fetching system prompt:', error);
      showErrorToast('Failed to load system prompt');
    }
  };

  // Save system prompt
  const handleSavePrompt = async (promptData: SystemPromptSetting) => {
    try {
      // Check if prompt exists
      const { data: existingPrompt } = await supabaseAdmin
        .from('admin_settings')
        .select('id')
        .eq('setting_key', 'chatbot_system_prompt')
        .single();

      if (existingPrompt) {
        // Update existing prompt
        const { error } = await supabaseAdmin
          .from('admin_settings')
          .update({
            setting_value: promptData.setting_value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'chatbot_system_prompt');

        if (error) throw error;
      } else {
        // Insert new prompt
        const { error } = await supabaseAdmin
          .from('admin_settings')
          .insert([promptData]);

        if (error) throw error;
      }

      showSuccessToast('System prompt saved successfully');
      setShowPromptModal(false);
      await fetchSystemPrompt();
    } catch (error) {
      console.error('Error saving system prompt:', error);
      showErrorToast('Failed to save system prompt');
      throw error;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchAnalytics(),
        fetchSystemPrompt()
      ]);
      setLastUpdated(new Date());
      showSuccessToast('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showErrorToast('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch chat sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Build query - fetch sessions without join first
      let query = supabaseAdmin
        .from('chat_sessions')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.sessionType !== 'all') {
        query = query.eq('session_type', filters.sessionType);
      }

      if (filters.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('start_time', filters.dateTo + 'T23:59:59');
      }

      // Apply search
      if (filters.searchTerm) {
        query = query.or(`session_title.ilike.%${filters.searchTerm}%`);
      }

      // Apply pagination
      const from = (filters.currentPage - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      const { data, error, count } = await query
        .order('start_time', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch user profiles for sessions with user_id
      const userIds = (data || [])
        .map((session: any) => session.user_id)
        .filter((id: string | null) => id !== null);

      let profiles: any = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (profileData) {
          profileData.forEach((profile: any) => {
            profiles[profile.id] = profile;
          });
        }
      }

      // Format sessions with user info
      const formattedSessions: ChatSession[] = (data || []).map((session: any) => {
        if (!session.user_id) {
          // Anonymous user
          return {
            ...session,
            user_name: 'Anonymous User',
            user_email: 'anonymous@budgetme.local'
          };
        }
        
        // Authenticated user
        const profile = profiles[session.user_id];
        const userName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
        const userEmail = profile?.email || 'No Email';
        const userAvatar = profile?.avatar_url || undefined;
        
        return {
          ...session,
          user_name: userName,
          user_email: userEmail,
          user_avatar: userAvatar
        };
      });

      setSessions(formattedSessions);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / filters.pageSize));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showErrorToast('Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      // Get total sessions
      const { count: totalSessions } = await supabaseAdmin
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true });

      // Get active sessions
      const { count: activeSessions } = await supabaseAdmin
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total messages
      const { count: totalMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      // Get sessions by type
      const { data: sessionsByType } = await supabaseAdmin
        .from('chat_sessions')
        .select('session_type');

      const sessionTypeCount: { [key: string]: number } = {};
      sessionsByType?.forEach(session => {
        const type = session.session_type || 'general';
        sessionTypeCount[type] = (sessionTypeCount[type] || 0) + 1;
      });

      // Get messages by type
      const { data: messagesByType } = await supabaseAdmin
        .from('chat_messages')
        .select('message_type');

      const messageTypeCount: { [key: string]: number } = {};
      messagesByType?.forEach(message => {
        const type = message.message_type || 'user';
        messageTypeCount[type] = (messageTypeCount[type] || 0) + 1;
      });

      // Get sentiment distribution
      const { data: sentimentData } = await supabaseAdmin
        .from('chat_messages')
        .select('message_sentiment')
        .not('message_sentiment', 'is', null);

      const sentimentCount: { [key: string]: number } = {};
      sentimentData?.forEach(message => {
        const sentiment = message.message_sentiment || 'neutral';
        sentimentCount[sentiment] = (sentimentCount[sentiment] || 0) + 1;
      });

      // Get average satisfaction rating
      const { data: ratingsData } = await supabaseAdmin
        .from('chat_sessions')
        .select('user_satisfaction_rating')
        .not('user_satisfaction_rating', 'is', null);

      const avgRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, session) => sum + (session.user_satisfaction_rating || 0), 0) / ratingsData.length
        : 0;

      setAnalytics({
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        totalMessages: totalMessages || 0,
        averageMessagesPerSession: totalSessions ? (totalMessages || 0) / totalSessions : 0,
        averageSatisfactionRating: avgRating,
        sessionsByType: sessionTypeCount,
        messagesByType: messageTypeCount,
        sentimentDistribution: sentimentCount
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Fetch messages for selected session
  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_order', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showErrorToast('Failed to load messages');
    }
  };

  // Handle view session messages
  const handleViewMessages = async (session: ChatSession) => {
    setSelectedSession(session);
    await fetchSessionMessages(session.id);
    setShowMessagesModal(true);
  };

  // Handle close messages modal
  const handleCloseMessagesModal = () => {
    setShowMessagesModal(false);
    setSelectedSession(null);
    setMessages([]);
  };

  // Handle filter change
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'pageSize' ? Number(value) : value,
      currentPage: 1
    }));
  };

  // Handle search
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchSessions();
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, currentPage: page }));
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setFilters({
      searchTerm: "",
      sessionType: "all",
      messageType: "all",
      dateFrom: "",
      dateTo: "",
      currentPage: 1,
      pageSize: 10
    });
  };

  // Chart options for session types
  const getSessionTypeChartOptions = () => {
    const data = Object.entries(analytics.sessionsByType).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').toUpperCase(),
      y: value
    }));

    return {
      chart: { type: 'pie', height: 300 },
      credits: { enabled: false },
      title: { text: 'Sessions by Type' },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%'
          }
        }
      },
      series: [{
        name: 'Sessions',
        colorByPoint: true,
        data: data
      }]
    };
  };

  // Chart options for message types
  const getMessageTypeChartOptions = () => {
    const data = Object.entries(analytics.messagesByType).map(([name, value]) => ({
      name: name.toUpperCase(),
      y: value,
      color: name === 'user' ? '#4e73df' : name === 'assistant' ? '#1cc88a' : '#858796'
    }));

    return {
      chart: { type: 'column', height: 300 },
      credits: { enabled: false },
      title: { text: 'Messages by Type' },
      xAxis: {
        categories: data.map(d => d.name),
        title: { text: 'Message Type' }
      },
      yAxis: {
        title: { text: 'Count' }
      },
      series: [{
        name: 'Messages',
        data: data
      }]
    };
  };

  // Chart options for sentiment distribution
  const getSentimentChartOptions = () => {
    const data = Object.entries(analytics.sentimentDistribution).map(([name, value]) => ({
      name: name.toUpperCase(),
      y: value,
      color: name === 'positive' ? '#1cc88a' : name === 'negative' ? '#e74a3b' : '#858796'
    }));

    return {
      chart: { type: 'bar', height: 300 },
      credits: { enabled: false },
      title: { text: 'Message Sentiment Distribution' },
      xAxis: {
        categories: data.map(d => d.name),
        title: { text: 'Sentiment' }
      },
      yAxis: {
        title: { text: 'Count' }
      },
      series: [{
        name: 'Messages',
        data: data
      }]
    };
  };

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchSystemPrompt(),
        fetchSessions(),
        fetchAnalytics()
      ]);
    };

    initializeData();
  }, []);

  // Fetch sessions when filters change
  useEffect(() => {
    fetchSessions();
  }, [filters.sessionType, filters.dateFrom, filters.dateTo, filters.currentPage, filters.pageSize]);

  // Auto-refresh active sessions every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessions.some(s => s.is_active)) {
        fetchSessions();
        fetchAnalytics();
        setLastUpdated(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [sessions]);

  if (loading && sessions.length === 0) {
    return (
      <div className="modern-user-management">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading chatbot management...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="skeleton-line skeleton-header-title mb-2"></div>
            <div className="skeleton-line skeleton-header-subtitle"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="stats-section mb-5">
            <div className="row">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-3">
                  <div className="user-stat-card admin-card-loading">
                    <div className="stat-content">
                      <div className="skeleton-icon mr-3"></div>
                      <div className="stat-info">
                        <div className="skeleton-line skeleton-stat-value mb-2"></div>
                        <div className="skeleton-line skeleton-stat-title"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Charts Skeleton */}
          <div className="row mb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="col-lg-4 mb-4">
                <div className="card shadow">
                  <div className="card-header py-3">
                    <div className="skeleton-line skeleton-table-header"></div>
                  </div>
                  <div className="card-body">
                    <div className="skeleton-chart-container" style={{ height: '300px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls Skeleton */}
          <div className="controls-section mb-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="skeleton-line skeleton-search-bar"></div>
                  </div>
                  <div className="col-md-3">
                    <div className="skeleton-line skeleton-filter"></div>
                  </div>
                  <div className="col-md-3">
                    <div className="skeleton-line skeleton-filter"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="table-section">
            <div className="card shadow">
              <div className="card-header py-3">
                <div className="skeleton-line skeleton-table-header"></div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table modern-table">
                    <thead className="table-header">
                      <tr>
                        {Array.from({ length: 7 }).map((_, index) => (
                          <th key={index} className="border-0">
                            <div className="skeleton-line skeleton-th"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="table-row">
                          {Array.from({ length: 7 }).map((_, colIndex) => (
                            <td key={colIndex} className="py-3">
                              <div className="skeleton-line skeleton-td"></div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Chatbot Management</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${refreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={() => setShowPromptModal(true)}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Configure prompt"
            >
              <i className="fas fa-cog text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Enhanced Header */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-robot"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">Chatbot Management</h1>
                <p className="header-subtitle mb-0">
                  Monitor AI chatbot sessions, analytics, and system configurations
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={() => setShowPromptModal(true)}
            >
              <i className="fas fa-cog mr-1"></i>
              Configure Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Dashboard Style */}
      <div className="stats-section mb-5">
        {(() => {
          const avgMessagesPerSession = analytics.totalSessions > 0 
            ? (analytics.totalMessages / analytics.totalSessions).toFixed(1) 
            : '0';
          const activePercentage = analytics.totalSessions > 0 
            ? ((analytics.activeSessions / analytics.totalSessions) * 100).toFixed(1) 
            : '0';
          const inactiveSessions = analytics.totalSessions - analytics.activeSessions;
          const userMessages = analytics.messagesByType['user'] || 0;
          const assistantMessages = analytics.messagesByType['assistant'] || 0;

          const openTotalSessionsModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Sessions Breakdown',
              color: 'danger',
              icon: 'fa-comments',
              data: [
                { label: 'Total Sessions', value: analytics.totalSessions },
                { label: 'Active Sessions', value: analytics.activeSessions, subLabel: `${activePercentage}% of total` },
                { label: 'Ended Sessions', value: inactiveSessions, subLabel: `${(100 - Number(activePercentage)).toFixed(1)}% of total` },
                { label: 'Avg Messages/Session', value: avgMessagesPerSession },
              ]
            });
          };

          const openActiveSessionsModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Active Sessions Breakdown',
              color: 'success',
              icon: 'fa-circle',
              data: [
                { label: 'Active Sessions', value: analytics.activeSessions },
                { label: 'Percentage of Total', value: `${activePercentage}%` },
                { label: 'Ended Sessions', value: inactiveSessions },
                { label: 'Session Activity Rate', value: `${activePercentage}%` },
              ]
            });
          };

          const openTotalMessagesModal = () => {
            setStatsDetailModal({
              show: true,
              title: 'Total Messages Breakdown',
              color: 'info',
              icon: 'fa-envelope',
              data: [
                { label: 'Total Messages', value: analytics.totalMessages },
                { label: 'User Messages', value: userMessages, subLabel: `${analytics.totalMessages > 0 ? ((userMessages / analytics.totalMessages) * 100).toFixed(1) : 0}% of total` },
                { label: 'Assistant Messages', value: assistantMessages, subLabel: `${analytics.totalMessages > 0 ? ((assistantMessages / analytics.totalMessages) * 100).toFixed(1) : 0}% of total` },
                { label: 'Avg per Session', value: avgMessagesPerSession },
              ]
            });
          };

          const openSatisfactionModal = () => {
            const positiveCount = analytics.sentimentDistribution['positive'] || 0;
            const negativeCount = analytics.sentimentDistribution['negative'] || 0;
            const neutralCount = analytics.sentimentDistribution['neutral'] || 0;
            const totalSentiment = positiveCount + negativeCount + neutralCount;
            
            setStatsDetailModal({
              show: true,
              title: 'Satisfaction Breakdown',
              color: 'warning',
              icon: 'fa-star',
              data: [
                { label: 'Average Rating', value: `${analytics.averageSatisfactionRating.toFixed(1)}/5` },
                { label: 'Positive Sentiment', value: positiveCount, subLabel: totalSentiment > 0 ? `${((positiveCount / totalSentiment) * 100).toFixed(1)}% of messages` : 'No data' },
                { label: 'Neutral Sentiment', value: neutralCount, subLabel: totalSentiment > 0 ? `${((neutralCount / totalSentiment) * 100).toFixed(1)}% of messages` : 'No data' },
                { label: 'Negative Sentiment', value: negativeCount, subLabel: totalSentiment > 0 ? `${((negativeCount / totalSentiment) * 100).toFixed(1)}% of messages` : 'No data' },
              ]
            });
          };

          return (
            <>
              {/* Mobile Stats Cards */}
              <div className="block md:hidden mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalSessionsModal}>
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
                      <i className="fas fa-comments text-red-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Total Sessions</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(analytics.totalSessions)}</p>
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <i className="fas fa-comments text-[8px]"></i>
                      <span className="text-[9px] font-medium truncate">{inactiveSessions} ended</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveSessionsModal}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                      <i className="fas fa-circle text-emerald-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Active Sessions</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(analytics.activeSessions)}</p>
                    <div className="flex items-center gap-1 mt-1 text-emerald-500">
                      <i className="fas fa-arrow-up text-[8px]"></i>
                      <span className="text-[9px] font-medium truncate">{activePercentage}% of total</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalMessagesModal}>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                      <i className="fas fa-envelope text-blue-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Total Messages</p>
                    <p className="text-sm font-bold text-gray-800">{truncateNumber(analytics.totalMessages)}</p>
                    <div className="flex items-center gap-1 mt-1 text-blue-500">
                      <i className="fas fa-chart-line text-[8px]"></i>
                      <span className="text-[9px] font-medium truncate">{avgMessagesPerSession} avg/session</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openSatisfactionModal}>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                      <i className="fas fa-star text-amber-500 text-xs"></i>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Avg Satisfaction</p>
                    <p className="text-sm font-bold text-gray-800">{analytics.averageSatisfactionRating.toFixed(1)}/5</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      <i className="fas fa-smile text-[8px]"></i>
                      <span className="text-[9px] font-medium truncate">User rating</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Desktop Stats Cards */}
              <div className="row d-none d-md-flex">
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalSessionsModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-danger text-uppercase mb-2">Total Sessions</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(analytics.totalSessions)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-muted">
                            <i className="fas fa-comments mr-1"></i>
                            <span className="font-weight-medium text-truncate">{inactiveSessions} ended</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-danger">
                            <i className="fas fa-comments stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-danger">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveSessionsModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-success text-uppercase mb-2">Active Sessions</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(analytics.activeSessions)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-success">
                            <i className="fas fa-arrow-up mr-1"></i>
                            <span className="font-weight-medium">{activePercentage}%</span>
                            <span className="ml-1 small text-truncate">of total</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-success">
                            <i className="fas fa-circle stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-success">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openTotalMessagesModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-info text-uppercase mb-2">Total Messages</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(analytics.totalMessages)}</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-info">
                            <i className="fas fa-chart-line mr-1"></i>
                            <span className="font-weight-medium text-truncate">{avgMessagesPerSession} avg/session</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-info">
                            <i className="fas fa-envelope stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-info">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
                  <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openSatisfactionModal} style={{ cursor: 'pointer' }}>
                    <div className="card-bg-pattern"></div>
                    <div className="card-content">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="stat-title text-warning text-uppercase mb-2">Avg Satisfaction</div>
                          <div className="stat-value mb-0 font-weight-bold text-gray-800">{analytics.averageSatisfactionRating.toFixed(1)}/5</div>
                          <div className="stat-change mt-2 d-flex align-items-center text-warning">
                            <i className="fas fa-smile mr-1"></i>
                            <span className="font-weight-medium text-truncate">User rating</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="stat-icon-container stat-icon-warning">
                            <i className="fas fa-star stat-icon"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer-link bg-warning">
                      <div className="d-flex justify-content-between align-items-center py-2 px-4">
                        <span className="font-weight-medium">View Details</span>
                        <div className="footer-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                    <div className="card-hover-overlay"></div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Mobile Charts Section - 2 Row Tabbed Style with 3 Tabs */}
      <div className="block md:hidden mb-4 space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-chart-bar text-red-500 text-xs"></i>
            Analytics
          </h6>
        </div>

        {/* Row 1: Session & Message Analytics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <h6 className="text-xs font-bold text-gray-800 mb-1">Session & Message Analytics</h6>
          </div>
          {/* 3 Tabs */}
          <div className="flex" style={{ backgroundColor: '#f8f9fa' }}>
            <button
              onClick={() => setMobileChartTab('sessions')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                mobileChartTab === 'sessions'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-chart-pie mr-1" style={{ fontSize: '9px' }}></i>
              Sessions
              {mobileChartTab === 'sessions' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setMobileChartTab('messages')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                mobileChartTab === 'messages'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-chart-bar mr-1" style={{ fontSize: '9px' }}></i>
              Messages
              {mobileChartTab === 'messages' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
            <button
              onClick={() => setMobileChartTab('sentiment')}
              className={`flex-1 py-2 border-0 text-xs position-relative ${
                mobileChartTab === 'sentiment'
                  ? 'text-red-500 bg-white'
                  : 'text-gray-500 bg-transparent'
              }`}
            >
              <i className="fas fa-smile mr-1" style={{ fontSize: '9px' }}></i>
              Sentiment
              {mobileChartTab === 'sentiment' && (
                <div className="position-absolute bg-red-500" style={{ bottom: 0, left: 0, right: 0, height: '2px' }}></div>
              )}
            </button>
          </div>

          {/* Chart Content */}
          <div className="p-3">
            {mobileChartTab === 'sessions' && (
              Object.keys(analytics.sessionsByType).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{...getSessionTypeChartOptions(), chart: { ...getSessionTypeChartOptions().chart, height: 200 }, title: { text: null }}}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400 text-xs">No session data available</div>
              )
            )}
            {mobileChartTab === 'messages' && (
              Object.keys(analytics.messagesByType).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{...getMessageTypeChartOptions(), chart: { ...getMessageTypeChartOptions().chart, height: 200 }, title: { text: null }}}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400 text-xs">No message data available</div>
              )
            )}
            {mobileChartTab === 'sentiment' && (
              Object.keys(analytics.sentimentDistribution).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{...getSentimentChartOptions(), chart: { ...getSentimentChartOptions().chart, height: 200 }, title: { text: null }}}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400 text-xs">No sentiment data available</div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Desktop Analytics Charts */}
      <div className="row mb-4 d-none d-md-flex">
        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-danger">Sessions by Type</h6>
            </div>
            <div className="card-body">
              {Object.keys(analytics.sessionsByType).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={getSessionTypeChartOptions()}
                />
              ) : (
                <p className="text-center text-muted">No data available</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-danger">Messages by Type</h6>
            </div>
            <div className="card-body">
              {Object.keys(analytics.messagesByType).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={getMessageTypeChartOptions()}
                />
              ) : (
                <p className="text-center text-muted">No data available</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-danger">Sentiment Distribution</h6>
            </div>
            <div className="card-body">
              {Object.keys(analytics.sentimentDistribution).length > 0 ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={getSentimentChartOptions()}
                />
              ) : (
                <p className="text-center text-muted">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls & Session List */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-comments text-red-500 text-[10px]"></i>
              Chat Sessions
              {totalItems > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <button 
              className="text-[10px] text-gray-500 flex items-center gap-1"
              onClick={handleResetFilters}
            >
              <i className="fas fa-undo text-[8px]"></i>
              Reset
            </button>
          </div>
          
          {/* Mobile Search & Filters */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="relative mb-2">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              <input
                type="text"
                name="searchTerm"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Search sessions..."
                value={filters.searchTerm}
                onChange={handleFilterChange}
              />
            </div>
            <div className="flex gap-2">
              <select
                name="sessionType"
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.sessionType}
                onChange={handleFilterChange}
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="financial_advice">Financial Advice</option>
                <option value="budget_help">Budget Help</option>
                <option value="goal_planning">Goal Planning</option>
              </select>
              <input
                type="date"
                name="dateFrom"
                className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                value={filters.dateFrom}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          
          {/* Mobile Session Cards List */}
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {refreshing ? (
              <div className="px-3 py-8 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-xs text-gray-500">Loading sessions...</p>
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleViewMessages(session)}
                >
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      {session.user_avatar ? (
                        <img
                          src={session.user_avatar}
                          alt={session.user_name || "User"}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-200">
                          {(session.user_name || session.user_email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        session.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {session.user_name || "Anonymous User"}
                        </p>
                        <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-semibold ${
                          session.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.is_active ? 'ACTIVE' : 'ENDED'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{session.session_title || 'Untitled Session'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-red-500 font-medium">
                          <i className="fas fa-envelope mr-0.5"></i>{session.message_count} msgs
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(session.start_time).toLocaleDateString()}
                        </span>
                        <span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px]">
                          {session.session_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {/* View Action */}
                    <div className="flex-shrink-0">
                      <button
                        className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleViewMessages(session); }}
                        aria-label="View session"
                      >
                        <i className="fas fa-eye text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-comments text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No sessions found</p>
                <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
          
          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[9px] text-gray-500">
                Page {filters.currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(Math.max(filters.currentPage - 1, 1))}
                  disabled={filters.currentPage === 1}
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded-lg min-w-[24px] text-center">
                  {filters.currentPage}
                </span>
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(Math.min(filters.currentPage + 1, totalPages))}
                  disabled={filters.currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Controls Section */}
      <div className="controls-section mb-4 hidden md:block">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-6 col-lg-4 mb-3 mb-md-0">
                <div className="search-container">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      name="searchTerm"
                      className="form-control border-left-0 modern-input"
                      placeholder="Search sessions by title or user..."
                      value={filters.searchTerm}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <select
                  name="sessionType"
                  className="form-control modern-select"
                  value={filters.sessionType}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Types</option>
                  <option value="general">General</option>
                  <option value="financial_advice">Financial Advice</option>
                  <option value="budget_help">Budget Help</option>
                  <option value="goal_planning">Goal Planning</option>
                  <option value="transaction_query">Transaction Query</option>
                </select>
              </div>
              <div className="col-md-3 col-lg-2 mb-3 mb-md-0">
                <input
                  type="date"
                  name="dateFrom"
                  className="form-control modern-input"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  placeholder="From date"
                />
              </div>
              <div className="col-md-12 col-lg-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="page-size-selector">
                    <small className="text-muted mr-2">Show:</small>
                    <select
                      name="pageSize"
                      className="form-control form-control-sm d-inline-block w-auto"
                      value={filters.pageSize}
                      onChange={handleFilterChange}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <small className="text-muted ml-2">per page</small>
                  </div>
                  
                  {(filters.searchTerm || filters.sessionType !== "all" || filters.dateFrom || filters.dateTo) && (
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetFilters}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sessions Table */}
      <div className="table-section hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-table mr-2"></i>
                Chat Sessions ({totalItems})
              </h6>
              <div className="table-actions">
                <small className="text-muted">
                  Showing {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)} to {Math.min(filters.currentPage * filters.pageSize, totalItems)} of {totalItems} entries
                </small>
              </div>
            </div>
          </div>
          
          <div className="card-body p-0">
            {sessions.length === 0 ? (
              <div className="text-center py-5">
                <div className="empty-state-container">
                  <i className="fas fa-comments fa-4x text-gray-300 mb-4"></i>
                  <h4 className="text-gray-700 mb-3">
                    {filters.searchTerm || filters.sessionType !== 'all' || filters.dateFrom || filters.dateTo
                      ? 'No Matching Sessions' 
                      : 'No Chat Sessions Yet'
                    }
                  </h4>
                  <p className="text-muted mb-4 max-width-sm mx-auto">
                    {filters.searchTerm || filters.sessionType !== 'all' || filters.dateFrom || filters.dateTo
                      ? 'Try adjusting your filters or search criteria to find the sessions you\'re looking for.' 
                      : 'Chat sessions will appear here once users start interacting with the AI chatbot.'
                    }
                  </p>
                  {(filters.searchTerm || filters.sessionType !== 'all' || filters.dateFrom || filters.dateTo) && (
                    <button className="btn btn-outline-primary btn-sm" onClick={handleResetFilters}>
                      <i className="fas fa-filter mr-2"></i>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover modern-table mb-0">
                  <thead className="table-header">
                    <tr>
                      <th className="border-0">User</th>
                      <th className="border-0">Session Title</th>
                      <th className="border-0">Type</th>
                      <th className="border-0">Messages</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Started</th>
                      <th className="border-0 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id} className="table-row">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="user-avatar-container mr-3">
                              <img
                                src={session.user_avatar || "../images/placeholder.png"}
                                alt={session.user_name || "User"}
                                className="user-table-avatar"
                                onError={(e) => {
                                  e.currentTarget.src = "../images/placeholder.png";
                                }}
                              />
                              <div className={`user-status-dot status-${session.is_active ? 'active' : 'inactive'}`}></div>
                            </div>
                            <div className="user-info">
                              <div className="user-name font-weight-medium">
                                {session.user_name || "Anonymous User"}
                              </div>
                              <div className="user-id text-muted small">
                                {session.user_email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            {session.session_title || 'Untitled Session'}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="status-badge status-primary">
                            <i className="fas fa-tag mr-1"></i>
                            {session.session_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="badge badge-info">
                            {session.message_count}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`status-badge ${session.is_active ? 'status-success' : 'status-secondary'}`}>
                            <i className={`fas ${session.is_active ? 'fa-circle' : 'fa-check-circle'} mr-1`}></i>
                            {session.is_active ? 'Active' : 'Ended'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            <div className="login-date">
                              {new Date(session.start_time).toLocaleDateString()}
                            </div>
                            <div className="login-time text-muted small">
                              {new Date(session.start_time).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleViewMessages(session)}
                              title="View Messages"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div className="pagination-info">
                  <small className="text-muted">
                    Page {filters.currentPage} of {totalPages}
                  </small>
                </div>
                <nav aria-label="Sessions pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(1)}
                        disabled={filters.currentPage === 1}
                      >
                        <i className="fas fa-angle-double-left"></i>
                      </button>
                    </li>
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(filters.currentPage - 1)}
                        disabled={filters.currentPage === 1}
                      >
                        <i className="fas fa-angle-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                      let pageNumber: number;
                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (filters.currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (filters.currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = filters.currentPage - 2 + index;
                      }
                      if (pageNumber <= totalPages) {
                        return (
                          <li key={index} className={`page-item ${pageNumber === filters.currentPage ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => handlePageChange(pageNumber)}>
                              {pageNumber}
                            </button>
                          </li>
                        );
                      }
                      return null;
                    })}
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(filters.currentPage + 1)}
                        disabled={filters.currentPage === totalPages}
                      >
                        <i className="fas fa-angle-right"></i>
                      </button>
                    </li>
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={filters.currentPage === totalPages}
                      >
                        <i className="fas fa-angle-double-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Modal */}
      <ViewSessionModal
        show={showMessagesModal}
        onClose={handleCloseMessagesModal}
        session={selectedSession}
        messages={messages}
        loading={false}
      />

      {/* System Prompt Configuration Modal */}
      <SystemPromptModal
        show={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        prompt={systemPromptData}
        onSave={handleSavePrompt}
        loading={false}
      />

      {/* Stats Detail Modal */}
      <StatsDetailModal
        show={statsDetailModal.show}
        onClose={() => setStatsDetailModal(prev => ({ ...prev, show: false }))}
        title={statsDetailModal.title}
        color={statsDetailModal.color}
        icon={statsDetailModal.icon}
        data={statsDetailModal.data}
      />
    </div>
  );
};

export default AdminChatbot;

