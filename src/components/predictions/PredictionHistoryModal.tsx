/**
 * Prediction History Modal
 * Similar design to BudgetSetupModal - displays prediction and AI insights history in a modal
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { 
  PredictionHistoryService, 
  PredictionHistoryItem,
  AIInsightHistoryItem
} from '../../services/database/predictionHistoryService';
import { toast } from 'react-toastify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PredictionHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Predictions state
  const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
  const [predictionsCount, setPredictionsCount] = useState(0);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalPredictions: 0,
    totalAIInsights: 0,
    totalRequests: 0,
    averageConfidence: 0,
    mostUsedTimeframe: 'months_3'
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
  // Selected item for detail view
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionHistoryItem | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
  }, [isOpen, user?.id, page]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load predictions
      const { data, count, error } = await PredictionHistoryService.getPredictionHistory(
        user.id,
        pageSize,
        page * pageSize
      );
      
      if (error) {
        toast.error('Failed to load predictions history');
        return;
      }
      
      setPredictions(data);
      setPredictionsCount(count);

      // Load statistics
      const stats = await PredictionHistoryService.getPredictionStatistics(user.id);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPredictions = async (format: 'csv' | 'json') => {
    try {
      await PredictionHistoryService.exportPredictionsHistory(user!.id, format);
      toast.success(`Predictions exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export predictions');
    }
  };

  const handleExportInsights = async (format: 'csv' | 'json') => {
    try {
      await PredictionHistoryService.exportAIInsightsHistory(user!.id, format);
      toast.success(`AI Insights exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export AI insights');
    }
  };

  const handleDeletePrediction = async (predictionId: string) => {
    if (!confirm('Are you sure you want to delete this prediction? This action cannot be undone.')) {
      return;
    }
    
    const { success } = await PredictionHistoryService.deletePrediction(predictionId, user!.id);
    
    if (success) {
      toast.success('Prediction deleted successfully');
      loadData();
    } else {
      toast.error('Failed to delete prediction');
    }
  };

  const handleViewDetails = async (predictionId: string) => {
    const { data, error } = await PredictionHistoryService.getPredictionById(predictionId, user!.id);
    
    if (error || !data) {
      toast.error('Failed to load prediction details');
      return;
    }
    
    setSelectedPrediction(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 1060}}>
      <div className="w-[95vw] h-[90vh] mx-auto my-auto">
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200" style={{zIndex: 1065}}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                <i className="fas fa-history mr-3 text-blue-600"></i>
                Prediction & AI Insights History
              </h2>
              <p className="text-sm text-gray-600">
                View and manage your prediction history
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex min-h-0">
            <div className="flex w-full h-full">
              
              {/* Left Side - Predictions List */}
              <div className="flex-1 flex flex-col border-r border-gray-200">
                <div className="p-8 flex-1 overflow-y-auto">
                  
                  {/* Export Buttons */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Recent Predictions ({predictionsCount})
                    </h3>
                    <div className="btn-group">
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => handleExportPredictions('csv')}
                        disabled={predictions.length === 0}
                      >
                        <i className="fas fa-file-csv mr-2"></i>
                        Export CSV
                      </button>
                      <button 
                        className="btn btn-sm btn-info ml-2"
                        onClick={() => handleExportInsights('json')}
                        disabled={predictions.length === 0}
                      >
                        <i className="fas fa-file-code mr-2"></i>
                        Export JSON
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <p className="mt-3 text-gray-500">Loading predictions...</p>
                    </div>
                  ) : predictions.length === 0 ? (
                    <div className="text-center py-12">
                      <i className="fas fa-chart-line text-gray-300 mb-3" style={{ fontSize: '3rem' }}></i>
                      <p className="text-gray-500">No predictions found. Generate your first prediction to see history here.</p>
                    </div>
                  ) : (
                    <>
                      {/* Predictions List */}
                      <div className="space-y-4">
                        {predictions.map(pred => (
                          <div 
                            key={pred.id} 
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleViewDetails(pred.id)}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="badge badge-primary">{pred.timeframe}</span>
                                  {pred.ai_insights && (
                                    <span className="badge badge-success">
                                      <i className="fas fa-brain mr-1"></i>
                                      AI Insights
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  <i className="far fa-calendar mr-1"></i>
                                  {new Date(pred.generated_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePrediction(pred.id);
                                  }}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <p className="text-xs text-gray-500 mb-0">Confidence</p>
                                  <span className="text-xs font-weight-bold">{(pred.confidence_score * 100).toFixed(0)}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${
                                      pred.confidence_score > 0.8 ? 'bg-success' :
                                      pred.confidence_score > 0.6 ? 'bg-info' :
                                      'bg-warning'
                                    }`}
                                    role="progressbar"
                                    style={{ width: `${pred.confidence_score * 100}%` }}
                                    aria-valuenow={pred.confidence_score * 100}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  ></div>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">MAE</p>
                                <p className="font-semibold">{pred.model_accuracy.mae.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Data Points</p>
                                <p className="font-semibold">{pred.model_accuracy.data_points}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {predictionsCount > pageSize && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                          <span className="text-sm text-gray-600">
                            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, predictionsCount)} of {predictionsCount}
                          </span>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setPage(Math.max(0, page - 1))}
                              disabled={page === 0}
                            >
                              <i className="fas fa-chevron-left mr-1"></i>
                              Previous
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setPage(page + 1)}
                              disabled={(page + 1) * pageSize >= predictionsCount}
                            >
                              Next
                              <i className="fas fa-chevron-right ml-1"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Side - Statistics & Details */}
              <div className="w-2/5 bg-gray-50 flex flex-col">
                <div className="p-8 flex-1 overflow-y-auto">
                  
                  {selectedPrediction ? (
                    /* Prediction Details */
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Prediction Details</h3>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelectedPrediction(null)}
                        >
                          <i className="fas fa-times mr-1"></i>
                          Close
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="font-semibold mb-3 text-gray-700">Basic Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Generated:</span>
                              <span className="font-medium">{new Date(selectedPrediction.generated_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timeframe:</span>
                              <span className="badge badge-primary">{selectedPrediction.timeframe}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Views:</span>
                              <span className="font-medium">{selectedPrediction.access_count}</span>
                            </div>
                          </div>
                        </div>

                        {/* Growth Metrics */}
                        {selectedPrediction.category_forecasts && Object.keys(selectedPrediction.category_forecasts).length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold mb-3 text-gray-700">
                              <i className="fas fa-chart-line mr-2 text-green-600"></i>
                              Projected Growth
                            </h4>
                            <div className="space-y-2">
                              {(() => {
                                // Calculate growth from category forecasts
                                const categories = selectedPrediction.category_forecasts;
                                let totalCurrent = 0;
                                let totalPredicted = 0;
                                
                                Object.values(categories).forEach((cat: any) => {
                                  totalCurrent += cat.historicalAverage || 0;
                                  totalPredicted += cat.predicted || 0;
                                });
                                
                                const expenseGrowth = totalCurrent > 0 
                                  ? ((totalPredicted - totalCurrent) / totalCurrent * 100).toFixed(1)
                                  : '0.0';
                                
                                return (
                                  <div className="text-sm">
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                      <span className="text-gray-600">Expense Growth:</span>
                                      <span className={`font-semibold ${parseFloat(expenseGrowth) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {expenseGrowth}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-2 text-xs text-gray-500">
                                      <span>Current: ₱{totalCurrent.toLocaleString()}</span>
                                      <span>Predicted: ₱{totalPredicted.toLocaleString()}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Model Accuracy */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="font-semibold mb-3 text-gray-700">
                            <i className="fas fa-bullseye mr-2 text-blue-600"></i>
                            Model Accuracy
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Confidence Score</span>
                                <span className="font-semibold">{(selectedPrediction.confidence_score * 100).toFixed(1)}%</span>
                              </div>
                              <div className="progress w-100" style={{ height: '8px' }}>
                                <div 
                                  className="progress-bar bg-success"
                                  role="progressbar"
                                  style={{ width: `${selectedPrediction.confidence_score * 100}%` }}
                                  aria-valuenow={selectedPrediction.confidence_score * 100}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                ></div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">MAE:</span>
                                <span className="font-semibold ml-2">{selectedPrediction.model_accuracy.mae.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">MAPE:</span>
                                <span className="font-semibold ml-2">{selectedPrediction.model_accuracy.mape.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">RMSE:</span>
                                <span className="font-semibold ml-2">{selectedPrediction.model_accuracy.rmse.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Data Points:</span>
                                <span className="font-semibold ml-2">{selectedPrediction.model_accuracy.data_points}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Category Forecasts */}
                        {selectedPrediction.category_forecasts && Object.keys(selectedPrediction.category_forecasts).length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold mb-3 text-gray-700">
                              <i className="fas fa-layer-group mr-2 text-purple-600"></i>
                              Category Forecasts
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {Object.entries(selectedPrediction.category_forecasts).map(([category, forecast]: [string, any]) => (
                                <div key={category} className="text-sm border-b border-gray-100 pb-2">
                                  <div className="font-medium text-gray-700 mb-1">{category}</div>
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Current: ₱{(forecast.historicalAverage || 0).toFixed(0)}</span>
                                    <span className={forecast.predicted > forecast.historicalAverage ? 'text-red-600' : 'text-green-600'}>
                                      → ₱{(forecast.predicted || 0).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Insights */}
                        {selectedPrediction.ai_insights && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold mb-3 text-gray-700">
                              <i className="fas fa-brain mr-2 text-purple-600"></i>
                              AI Insights
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Service:</span>
                                <span className="badge badge-info">{selectedPrediction.ai_insights.ai_service}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Model:</span>
                                <span className="text-xs font-mono">{selectedPrediction.ai_insights.model_used}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Confidence:</span>
                                <span className="font-semibold">{(selectedPrediction.ai_insights.confidence_level * 100).toFixed(1)}%</span>
                              </div>
                              {selectedPrediction.ai_insights.recommendations && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <span className="text-gray-600 block mb-2">Has Recommendations</span>
                                  <span className="badge badge-success">Yes</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Statistics Dashboard */
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Statistics Overview</h3>
                      
                      <div className="space-y-4">
                        {/* Total Predictions */}
                        <div className="bg-white rounded-lg p-4 border-l-4 border-primary">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">Total Predictions</p>
                              <p className="text-2xl font-bold text-gray-800">{statistics.totalPredictions}</p>
                            </div>
                            <i className="fas fa-chart-line text-3xl text-gray-300"></i>
                          </div>
                        </div>

                        {/* AI Insights */}
                        <div className="bg-white rounded-lg p-4 border-l-4 border-success">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">AI Insights Generated</p>
                              <p className="text-2xl font-bold text-gray-800">{statistics.totalAIInsights}</p>
                            </div>
                            <i className="fas fa-brain text-3xl text-gray-300"></i>
                          </div>
                        </div>

                        {/* Average Confidence */}
                        <div className="bg-white rounded-lg p-4 border-l-4 border-info">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">Average Confidence</p>
                              <p className="text-2xl font-bold text-gray-800">
                                {(statistics.averageConfidence * 100).toFixed(1)}%
                              </p>
                            </div>
                            <i className="fas fa-trophy text-3xl text-gray-300"></i>
                          </div>
                        </div>

                        {/* Total Requests */}
                        <div className="bg-white rounded-lg p-4 border-l-4 border-warning">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">Total Requests</p>
                              <p className="text-2xl font-bold text-gray-800">{statistics.totalRequests}</p>
                            </div>
                            <i className="fas fa-server text-3xl text-gray-300"></i>
                          </div>
                        </div>

                        {/* Quick Tip */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-6">
                          <h4 className="font-semibold text-blue-900 mb-2">
                            <i className="fas fa-lightbulb mr-2"></i>
                            Quick Tip
                          </h4>
                          <p className="text-sm text-blue-800">
                            Click on any prediction to view detailed information including model accuracy metrics and AI-generated insights.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PredictionHistoryModal;

