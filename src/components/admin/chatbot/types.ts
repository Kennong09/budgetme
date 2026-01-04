// Shared interfaces for admin chatbot components

export interface ChatSession {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_avatar?: string;
  session_title: string | null;
  session_type: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  message_count: number;
  user_satisfaction_rating: number | null;
  ai_model_version: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_text: string;
  message_type: string; // 'user', 'assistant', 'system'
  message_order: number;
  response_time_ms: number | null;
  confidence_score: number | null;
  intent_classification: string | null;
  message_sentiment: string | null; // 'positive', 'negative', 'neutral'
  user_feedback: string | null; // 'helpful', 'not_helpful'
  created_at: string;
}

export interface SystemPromptSetting {
  id?: string;
  setting_key: string;
  setting_value: {
    prompt: string;
    version: string;
    last_updated: string;
  };
  setting_type: string;
  description: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatbotAnalytics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  averageSatisfactionRating: number;
  sessionsByType: { [key: string]: number };
  messagesByType: { [key: string]: number };
  sentimentDistribution: { [key: string]: number };
}

export interface SessionFilters {
  searchTerm: string;
  sessionType: string;
  messageType: string;
  dateFrom: string;
  dateTo: string;
  currentPage: number;
  pageSize: number;
}

// Modal Props Interfaces
export interface ViewSessionModalProps {
  show: boolean;
  onClose: () => void;
  session: ChatSession | null;
  messages: ChatMessage[];
  loading?: boolean;
}

export interface SystemPromptModalProps {
  show: boolean;
  onClose: () => void;
  prompt: SystemPromptSetting | null;
  onSave: (data: SystemPromptSetting) => Promise<void>;
  loading?: boolean;
}
