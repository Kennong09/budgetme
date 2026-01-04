/**
 * Prediction History Service
 * Manages fetching and exporting of saved predictions and AI insights history
 */

import { supabase } from '../../utils/supabaseClient';

export interface PredictionHistoryItem {
  id: string;
  timeframe: string;
  generated_at: string;
  expires_at: string;
  confidence_score: number;
  predictions: any[];
  category_forecasts: Record<string, any>;
  model_accuracy: {
    mae: number;
    mape: number;
    rmse: number;
    data_points: number;
  };
  ai_insights?: AIInsightHistoryItem;
  access_count: number;
}

export interface AIInsightHistoryItem {
  id: string;
  prediction_id: string;
  ai_service: string;
  model_used: string;
  insights: any;
  risk_assessment: any;
  recommendations: any;
  opportunity_areas: any;
  confidence_level: number;
  generated_at: string;
  access_count: number;
}

export interface PredictionRequestHistoryItem {
  id: string;
  timeframe: string;
  prediction_type: string;
  status: string;
  request_at: string;
  completed_at: string | null;
  api_response_time_ms: number | null;
  transaction_count: number;
}

export class PredictionHistoryService {
  /**
   * Fetch user's prediction history with AI insights
   */
  static async getPredictionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: PredictionHistoryItem[]; count: number; error: any }> {
    try {
      // Fetch predictions with left join on ai_insights
      const { data: predictions, error: predError, count } = await supabase
        .from('prophet_predictions')
        .select(`
          id,
          timeframe,
          generated_at,
          expires_at,
          confidence_score,
          predictions,
          category_forecasts,
          model_accuracy,
          access_count,
          ai_insights (
            id,
            prediction_id,
            ai_service,
            model_used,
            insights,
            risk_assessment,
            recommendations,
            opportunity_areas,
            confidence_level,
            generated_at,
            access_count
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (predError) {
        console.error('Error fetching prediction history:', predError);
        return { data: [], count: 0, error: predError };
      }

      // Transform the data to flatten ai_insights
      const formattedData: PredictionHistoryItem[] = (predictions || []).map((pred: any) => ({
        ...pred,
        ai_insights: pred.ai_insights?.[0] || null, // Take the first insight if exists
      }));

      return { 
        data: formattedData, 
        count: count || 0, 
        error: null 
      };
    } catch (error) {
      console.error('Exception in getPredictionHistory:', error);
      return { data: [], count: 0, error };
    }
  }

  /**
   * Fetch user's AI insights history separately
   */
  static async getAIInsightsHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: AIInsightHistoryItem[]; count: number; error: any }> {
    try {
      const { data, error, count } = await supabase
        .from('ai_insights')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching AI insights history:', error);
        return { data: [], count: 0, error };
      }

      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('Exception in getAIInsightsHistory:', error);
      return { data: [], count: 0, error };
    }
  }

  /**
   * Fetch user's prediction request history
   */
  static async getPredictionRequestsHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: PredictionRequestHistoryItem[]; count: number; error: any }> {
    try {
      const { data, error, count } = await supabase
        .from('prediction_requests')
        .select(`
          id,
          timeframe,
          prediction_type,
          status,
          request_at,
          completed_at,
          api_response_time_ms,
          transaction_count
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('request_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching prediction requests history:', error);
        return { data: [], count: 0, error };
      }

      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('Exception in getPredictionRequestsHistory:', error);
      return { data: [], count: 0, error };
    }
  }

  /**
   * Get a specific prediction by ID
   */
  static async getPredictionById(
    predictionId: string,
    userId: string
  ): Promise<{ data: PredictionHistoryItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('prophet_predictions')
        .select(`
          *,
          ai_insights (*)
        `)
        .eq('id', predictionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching prediction by ID:', error);
        return { data: null, error };
      }

      return { 
        data: {
          ...data,
          ai_insights: data.ai_insights?.[0] || null
        } as PredictionHistoryItem, 
        error: null 
      };
    } catch (error) {
      console.error('Exception in getPredictionById:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a prediction from history
   */
  static async deletePrediction(
    predictionId: string,
    userId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      // First delete associated AI insights
      const { error: insightsError } = await supabase
        .from('ai_insights')
        .delete()
        .eq('prediction_id', predictionId)
        .eq('user_id', userId);

      if (insightsError) {
        console.error('Error deleting AI insights:', insightsError);
        return { success: false, error: insightsError };
      }

      // Then delete the prediction
      const { error: predError } = await supabase
        .from('prophet_predictions')
        .delete()
        .eq('id', predictionId)
        .eq('user_id', userId);

      if (predError) {
        console.error('Error deleting prediction:', predError);
        return { success: false, error: predError };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Exception in deletePrediction:', error);
      return { success: false, error };
    }
  }

  /**
   * Export predictions to CSV format
   */
  static exportPredictionsToCSV(predictions: PredictionHistoryItem[]): string {
    const headers = [
      'ID',
      'Timeframe',
      'Generated At',
      'Confidence Score',
      'MAE',
      'MAPE',
      'RMSE',
      'Data Points',
      'Has AI Insights',
      'Access Count'
    ];

    const rows = predictions.map(pred => [
      pred.id,
      pred.timeframe,
      new Date(pred.generated_at).toLocaleString(),
      pred.confidence_score.toFixed(2),
      pred.model_accuracy.mae.toFixed(2),
      pred.model_accuracy.mape.toFixed(2),
      pred.model_accuracy.rmse.toFixed(2),
      pred.model_accuracy.data_points,
      pred.ai_insights ? 'Yes' : 'No',
      pred.access_count
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export AI insights to CSV format
   */
  static exportAIInsightsToCSV(insights: AIInsightHistoryItem[]): string {
    const headers = [
      'ID',
      'AI Service',
      'Model Used',
      'Confidence Level',
      'Generated At',
      'Insights Summary',
      'Risk Assessment',
      'Recommendations Count',
      'Access Count'
    ];

    const rows = insights.map(insight => [
      insight.id,
      insight.ai_service,
      insight.model_used,
      insight.confidence_level.toFixed(2),
      new Date(insight.generated_at).toLocaleString(),
      insight.insights ? Object.keys(insight.insights).join('; ') : 'N/A',
      insight.risk_assessment ? JSON.stringify(insight.risk_assessment).substring(0, 50) : 'N/A',
      insight.recommendations ? Object.keys(insight.recommendations).length : 0,
      insight.access_count
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export AI insights to JSON format with full details
   */
  static exportAIInsightsToJSON(insights: AIInsightHistoryItem[]): string {
    return JSON.stringify(insights, null, 2);
  }

  /**
   * Download a file with given content
   */
  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export predictions history to file
   */
  static async exportPredictionsHistory(
    userId: string,
    format: 'csv' | 'json' = 'csv'
  ) {
    const { data: predictions, error } = await this.getPredictionHistory(userId, 1000, 0);

    if (error || !predictions || predictions.length === 0) {
      throw new Error('No predictions to export');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const csv = this.exportPredictionsToCSV(predictions);
      this.downloadFile(csv, `predictions-history-${timestamp}.csv`, 'text/csv');
    } else {
      const json = JSON.stringify(predictions, null, 2);
      this.downloadFile(json, `predictions-history-${timestamp}.json`, 'application/json');
    }
  }

  /**
   * Export AI insights history to file
   */
  static async exportAIInsightsHistory(
    userId: string,
    format: 'csv' | 'json' = 'csv'
  ) {
    const { data: insights, error } = await this.getAIInsightsHistory(userId, 1000, 0);

    if (error || !insights || insights.length === 0) {
      throw new Error('No AI insights to export');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const csv = this.exportAIInsightsToCSV(insights);
      this.downloadFile(csv, `ai-insights-history-${timestamp}.csv`, 'text/csv');
    } else {
      const json = this.exportAIInsightsToJSON(insights);
      this.downloadFile(json, `ai-insights-history-${timestamp}.json`, 'application/json');
    }
  }

  /**
   * Get prediction statistics
   */
  static async getPredictionStatistics(userId: string): Promise<{
    totalPredictions: number;
    totalAIInsights: number;
    totalRequests: number;
    averageConfidence: number;
    mostUsedTimeframe: string;
  }> {
    try {
      // Get predictions count and average confidence
      const { data: predictions } = await supabase
        .from('prophet_predictions')
        .select('confidence_score, timeframe')
        .eq('user_id', userId);

      // Get AI insights count
      const { count: insightsCount } = await supabase
        .from('ai_insights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get requests count
      const { count: requestsCount } = await supabase
        .from('prediction_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const totalPredictions = predictions?.length || 0;
      const averageConfidence = totalPredictions > 0
        ? predictions!.reduce((sum, p) => sum + p.confidence_score, 0) / totalPredictions
        : 0;

      // Find most used timeframe
      const timeframeCounts: Record<string, number> = {};
      predictions?.forEach(p => {
        timeframeCounts[p.timeframe] = (timeframeCounts[p.timeframe] || 0) + 1;
      });
      const mostUsedTimeframe = Object.entries(timeframeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'months_3';

      return {
        totalPredictions,
        totalAIInsights: insightsCount || 0,
        totalRequests: requestsCount || 0,
        averageConfidence,
        mostUsedTimeframe
      };
    } catch (error) {
      console.error('Error getting prediction statistics:', error);
      return {
        totalPredictions: 0,
        totalAIInsights: 0,
        totalRequests: 0,
        averageConfidence: 0,
        mostUsedTimeframe: 'months_3'
      };
    }
  }
}

