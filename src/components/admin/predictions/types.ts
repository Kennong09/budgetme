// Shared type definitions for admin prediction components

// Interface for prediction summary from the database
export interface PredictionSummary {
  userId: string;
  username: string;
  avatarUrl?: string;
  lastPredictionDate: string;
  incomeTrend: number;
  expenseTrend: number;
  savingsTrend: number;
  predictionCount: number;
  predictionAccuracy: number;
  status: 'active' | 'pending' | 'error';
}

// Interface for prophet prediction from database
export interface ProphetPrediction {
  id: string;
  user_id: string;
  generated_at: string;
  prediction_data: any;
  confidence_score: number;
  timeframe: string;
  // forecast_type: 'income' | 'expense' | 'savings'; // Column doesn't exist
  created_at: string;
  updated_at: string;
}

// Interface for prediction service
export interface PredictionService {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  type: 'Prophet' | 'TensorFlow' | 'Custom';
  description: string;
  lastUpdated: string;
  requests: number;
  errors: number;
}

// Interface for prediction model stats
export interface ModelStats {
  name: string;
  value: number;
  description: string;
  type?: 'percentage' | 'count' | 'currency' | 'decimal';
}

// Interface for user distribution
export interface UserDistribution {
  name: string;
  value: number;
  color?: string;
}

// Interface for historical accuracy data
export interface HistoricalAccuracy {
  month: string;
  accuracy: number;
  error: number;
  predictions?: number;
}

// Interface for prediction statistics
export interface PredictionStats {
  totalPredictions: number;
  activePredictions: number;
  predictionUsers: number;
  averageAccuracy: number;
  predictionsByStatus: {[key: string]: number};
  predictionsByType: {[key: string]: number};
  predictionsByUser: {[key: string]: number};
}

// Interface for prediction filters
export interface PredictionFilters {
  searchTerm: string;
  filterStatus: string;
  filterType: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}

// Interface for prediction user (matching other admin patterns)
export interface PredictionUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Interface for adding/editing a prediction
export interface PredictionFormData {
  user_id: string;
  // forecast_type: 'income' | 'expense' | 'savings'; // Column doesn't exist
  timeframe: string;
  confidence_score?: number;
  prediction_data?: any;
}

// Interface for prediction usage analytics
export interface PredictionUsage {
  user_id: string;
  tier: string;
  total_requests_today: number;
  prophet_daily_count: number;
  ai_insights_daily_count: number;
  last_request_at: string;
}

// Interface for prediction detail view
export interface PredictionDetail extends ProphetPrediction {
  user_name: string;
  user_email: string;
  user_avatar?: string;
  usage_data?: PredictionUsage;
}

// Interface for prediction analytics charts props
export interface PredictionAnalyticsChartsProps {
  stats: PredictionStats;
  userDistribution: UserDistribution[];
  historicalAccuracy: HistoricalAccuracy[];
  predictions: PredictionSummary[];
  loading?: boolean;
}
