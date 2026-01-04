// AI Insights Management Types
// Based on the ai_insights table schema and related data structures

export interface AIInsight {
  id: string;
  user_id: string;
  prediction_id?: string;
  ai_service: 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  model_used: string;
  insights: {
    summary: string;
    timestamp: string;
    riskAssessment?: {
      level: 'high' | 'medium' | 'low';
      factors: string[];
      mitigationSuggestions: string[];
    };
    recommendations?: string[];
    opportunityAreas?: string[];
    confidenceLevel?: number;
  };
  risk_assessment?: {
    level: 'high' | 'medium' | 'low';
    factors: string[];
    mitigationSuggestions: string[];
  };
  recommendations?: string[];
  opportunity_areas?: string[];
  prompt_template?: string;
  generation_time_ms?: number;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  confidence_level: number;
  daily_usage_count: number;
  rate_limited: boolean;
  retry_after?: number;
  generated_at: string;
  expires_at: string;
  cache_key?: string;
  model_version: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  access_count?: number;
  last_accessed_at?: string;
  // Related data
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  prophet_predictions?: {
    id: string;
    timeframe: string;
    confidence_score: number;
  };
}

export interface AIInsightSummary {
  insightId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  aiService: 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  modelUsed: string;
  confidenceLevel: number;
  riskLevel: 'high' | 'medium' | 'low' | 'unknown';
  generatedDate: string;
  processingTime: number; // in ms
  tokenUsage: number;
  status: 'active' | 'expired' | 'error';
}

export interface AIService {
  id: string;
  service_name: 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  display_name: string;
  description: string;
  model_options: string[];
  default_model: string;
  is_enabled: boolean;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_tokens: number;
  temperature: number;
  confidence_threshold: number;
  timeout_seconds: number;
  fallback_service?: string;
  api_endpoint?: string;
  api_key_required: boolean;
  cost_per_token?: number;
  created_at: string;
  updated_at: string;
}

export interface AIInsightStats {
  totalInsights: number;
  activeServices: number;
  averageConfidence: number;
  totalUsers: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  serviceUsage: {
    openrouter: number;
    chatbot: number;
    prophet: number;
    fallback: number;
  };
  processingMetrics: {
    averageTime: number;
    totalTokens: number;
    successRate: number;
  };
  usageToday: number,
  rateLimitedToday: number;
}

export interface AIInsightFilters {
  search: string;
  aiService: 'all' | 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  riskLevel: 'all' | 'high' | 'medium' | 'low';
  confidenceRange: {
    min: number;
    max: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  status: 'all' | 'active' | 'expired' | 'error';
  userId: string;
  pageSize: number;
  currentPage: number;
  sortBy: 'generated_at' | 'confidence_level' | 'access_count' | 'processing_time' | 'username' | 'riskLevel' | 'aiService' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface AIInsightFormData {
  user_id: string;
  ai_service: 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  model_used: string;
  insights: {
    summary: string;
    riskAssessment?: {
      level: 'high' | 'medium' | 'low';
      factors: string[];
      mitigationSuggestions: string[];
    };
    recommendations?: string[];
    opportunityAreas?: string[];
  };
  confidence_level?: number;
  prediction_id?: string;
}

export interface AIInsightDetail extends AIInsight {
  // Extended details for view modal
  relatedPredictions: {
    id: string;
    timeframe: string;
    confidence_score: number;
    generated_at: string;
  }[];
  usageHistory?: {
    date: string;
    access_count: number;
  }[];
  serviceMetrics?: {
    total_requests: number;
    average_processing_time: number;
    success_rate: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'moderator';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

// Chart data interfaces for analytics
export interface ServiceUsageData {
  name: string;
  value: number;
  color: string;
}

export interface ConfidenceTrendData {
  date: string;
  averageConfidence: number;
  count: number;
}

export interface ProcessingTimeData {
  date: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

export interface RiskDistributionData {
  risk_level: string;
  count: number;
  percentage: number;
}

// API Response types
export interface AIInsightsResponse {
  data: AIInsight[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AIServiceConfigResponse {
  services: AIService[];
  globalSettings: {
    enable_rate_limiting: boolean;
    enable_caching: boolean;
    default_timeout: number;
    max_retries: number;
  };
}

// Error types
export interface AIInsightError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Export default filter values
export const DEFAULT_FILTERS: AIInsightFilters = {
  search: '',
  aiService: 'all',
  riskLevel: 'all',
  confidenceRange: {
    min: 0,
    max: 100
  },
  dateRange: {
    startDate: '',
    endDate: ''
  },
  status: 'all',
  userId: '',
  pageSize: 10,
  currentPage: 1,
  sortBy: 'generated_at',
  sortOrder: 'desc'
};

// Service configuration constants
export const AI_SERVICES = [
  { value: 'openrouter', label: 'OpenRouter', color: '#007bff' },
  { value: 'chatbot', label: 'ChatBot', color: '#17a2b8' },
  { value: 'prophet', label: 'Prophet', color: '#28a745' },
  { value: 'fallback', label: 'Fallback', color: '#6c757d' }
] as const;

export const RISK_LEVELS = [
  { value: 'high', label: 'High Risk', color: '#dc3545', bgColor: '#f8d7da' },
  { value: 'medium', label: 'Medium Risk', color: '#fd7e14', bgColor: '#fdf2cc' },
  { value: 'low', label: 'Low Risk', color: '#28a745', bgColor: '#d4edda' }
] as const;

export const PROCESSING_STATUS = [
  { value: 'pending', label: 'Pending', color: '#ffc107' },
  { value: 'processing', label: 'Processing', color: '#17a2b8' },
  { value: 'completed', label: 'Completed', color: '#28a745' },
  { value: 'failed', label: 'Failed', color: '#dc3545' }
] as const;
