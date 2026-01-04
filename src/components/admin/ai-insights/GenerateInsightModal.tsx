import React, { FC, useState, useEffect } from "react";
import { UserProfile, AIService, AI_SERVICES } from "./types";
import { supabase } from "../../../utils/supabaseClient";

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ProphetPrediction {
  id: string;
  user_id: string;
  generated_at: string;
  predictions: any; // Changed from prediction_data to predictions
  confidence_score: number;
  timeframe: string;
}

interface GenerateInsightFormData {
  user_id: string;
  prediction_id: string;
  ai_service: 'openrouter' | 'chatbot' | 'prophet' | 'fallback';
  model_used: string;
  confidence_threshold: number;
  generate_recommendations: boolean;
  include_risk_assessment: boolean;
  analyze_trends: boolean;
}

interface GenerateInsightModalProps {
  show: boolean;
  users: UserProfile[];
  services: AIService[];
  onClose: () => void;
  onInsightGenerated: () => void;
  onGenerate: (data: GenerateInsightFormData) => Promise<boolean>;
}

const GenerateInsightModal: FC<GenerateInsightModalProps> = ({
  show,
  users,
  services,
  onClose,
  onInsightGenerated,
  onGenerate
}) => {
  // Available AI models matching BudgetSense chatbot
  const availableModels = [
    { id: 'gpt-oss-20b', name: 'Default Model', description: 'Experimental model' },
    { id: 'openai/gpt-5', name: 'GPT-5', description: 'Most advanced model' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Compact version' },
    { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Lightweight option' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1', description: 'Enhanced reasoning' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Multimodal capable' }
  ];

  const [formData, setFormData] = useState<GenerateInsightFormData>({
    user_id: '',
    prediction_id: '',
    ai_service: 'openrouter',
    model_used: 'gpt-oss-20b', // Default model matching BudgetSense chatbot
    confidence_threshold: 0.8,
    generate_recommendations: true,
    include_risk_assessment: true,
    analyze_trends: true
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [userSearch, setUserSearch] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<ProphetPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  if (!show) return null;

  // Fetch predictions for selected user
  const fetchUserPredictions = async (userId: string) => {
    if (!userId || !supabase) return;
    
    setLoadingPredictions(true);
    try {
      const { data, error } = await supabase
        .from('prophet_predictions')
        .select('id, user_id, generated_at, predictions, confidence_score, timeframe')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setFormData({
        user_id: '',
        prediction_id: '',
        ai_service: 'openrouter',
        model_used: 'gpt-oss-20b', // Default model matching BudgetSense chatbot
        confidence_threshold: 0.8,
        generate_recommendations: true,
        include_risk_assessment: true,
        analyze_trends: true
      });
      setUserSearch('');
      setShowUserDropdown(false);
      setErrors({});
      setIsGenerating(false);
      setPredictions([]);
    }
  }, [show]);

  // Fetch predictions when user changes
  useEffect(() => {
    if (formData.user_id) {
      fetchUserPredictions(formData.user_id);
      // Reset prediction selection when user changes
      setFormData(prev => ({ ...prev, prediction_id: '' }));
    } else {
      setPredictions([]);
    }
  }, [formData.user_id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setUserSearch(user.full_name || user.email);
    setShowUserDropdown(false);
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }

    if (!formData.prediction_id) {
      newErrors.prediction_id = 'Please select a prediction to base insights on';
    }

    if (!formData.ai_service) {
      newErrors.ai_service = 'Please select an AI service';
    }

    if (!formData.model_used.trim()) {
      newErrors.model_used = 'Please specify the AI model';
    }

    if (formData.confidence_threshold < 0 || formData.confidence_threshold > 1) {
      newErrors.confidence_threshold = 'Confidence threshold must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    try {
      const success = await onGenerate(formData);
      if (success) {
        onInsightGenerated();
        handleClose();
      } else {
        setErrors({ submit: 'Failed to generate AI insight. Please try again.' });
      }
    } catch (error) {
      console.error('Error generating AI insight:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setFormData({
        user_id: '',
        prediction_id: '',
        ai_service: 'openrouter',
        model_used: 'gpt-oss-20b', // Default model matching BudgetSense chatbot
        confidence_threshold: 0.8,
        generate_recommendations: true,
        include_risk_assessment: true,
        analyze_trends: true
      });
      setUserSearch('');
      setShowUserDropdown(false);
      setErrors({});
      setIsGenerating(false);
      setPredictions([]);
      setLoadingPredictions(false);
      onClose();
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const fullName = user.full_name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUser = users.find(u => u.id === formData.user_id);
  const selectedService = AI_SERVICES.find(s => s.value === formData.ai_service);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto' }}
        >
          {/* Unified Modal - Mobile/Desktop Responsive */}
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: window.innerWidth < 768 ? '0' : '12px', 
              overflow: 'hidden', 
              maxHeight: window.innerWidth < 768 ? '100vh' : '85vh',
              minHeight: window.innerWidth < 768 ? '100vh' : 'auto'
            }}
          >
            
            {/* Header - Mobile Optimized */}
            <div 
              className="modal-header border-0 text-white py-2 md:py-3" 
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2" 
                  style={{ 
                    width: window.innerWidth < 768 ? '32px' : '40px', 
                    height: window.innerWidth < 768 ? '32px' : '40px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '8px' 
                  }}
                >
                  <i className={`fas fa-magic ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base truncate">Generate AI Insights</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    AI-powered financial analysis
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={isGenerating}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile Optimized */}
            <div className="px-2 md:px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              {/* Mobile: Compact Info */}
              <div className="block md:hidden">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5">
                    <i className="fas fa-user text-red-500 text-[10px]"></i>
                    <div>
                      <p className="text-[7px] text-gray-500 leading-none">User</p>
                      <p className="text-[9px] font-bold text-red-500 truncate max-w-[50px]">
                        {selectedUser ? (selectedUser.full_name?.split(' ')[0] || 'Selected') : 'None'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5">
                    <i className="fas fa-robot text-red-500 text-[10px]"></i>
                    <div>
                      <p className="text-[7px] text-gray-500 leading-none">Model</p>
                      <p className="text-[9px] font-bold text-red-500 truncate max-w-[50px]">
                        {formData.model_used?.split('/').pop()?.slice(0, 8) || 'Default'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5">
                    <i className="fas fa-bullseye text-red-500 text-[10px]"></i>
                    <div>
                      <p className="text-[7px] text-gray-500 leading-none">Threshold</p>
                      <p className="text-[9px] font-bold text-red-500">{Math.round(formData.confidence_threshold * 100)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: Row Layout */}
              <div className="hidden md:block">
                <div className="row text-center g-2">
                  <div className="col-4">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-user text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>User</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>
                          {selectedUser ? (selectedUser.full_name?.split(' ')[0] || 'Selected') : 'Not Selected'}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-robot text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Model</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formData.model_used?.split('/').pop() || 'Default'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-bullseye text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Threshold</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{Math.round(formData.confidence_threshold * 100)}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
            {/* Modal Body - Mobile Optimized */}
            <div className="modal-body py-2 md:py-3 px-2 md:px-4" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              
              {/* Info Banner - Hidden on mobile */}
              <div className="hidden md:block p-2 mb-3" style={{ background: '#e7f3ff', borderRadius: '8px', borderLeft: '3px solid #007bff' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-info-circle text-primary mr-2 mt-1" style={{ fontSize: '0.8rem' }}></i>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                    AI insights will be generated based on the selected Prophet prediction data, user's transaction history, and predictive financial modeling.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {errors.submit && (
                  <div className="p-2 mb-2 bg-red-50 rounded-lg border-l-3" style={{ borderLeft: '3px solid #dc3545' }}>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-red-500 text-xs"></i>
                      <span className="text-red-500 text-xs">{errors.submit}</span>
                    </div>
                  </div>
                )}

                {/* User Selection */}
                <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                  <i className="fas fa-user mr-2"></i>User Selection
                </h6>
                <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                  <label className="block text-xs md:text-sm text-gray-700 mb-1">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.user_id ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Search for a user..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      disabled={isGenerating}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div 
                        className="absolute w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1" 
                        style={{ maxHeight: '150px', overflowY: 'auto', zIndex: 1000 }}
                      >
                        {filteredUsers.slice(0, 5).map(user => (
                          <button
                            key={user.id}
                            type="button"
                            className="w-full px-3 py-2 flex items-center hover:bg-gray-50 text-left"
                            onClick={() => handleUserSelect(user)}
                          >
                            <img
                              src={user.avatar_url || "../images/placeholder.png"}
                              alt="Avatar"
                              className="rounded-full mr-2"
                              style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                            />
                            <div>
                              <div className="font-medium text-xs">{user.full_name || user.email.split('@')[0]}</div>
                              <div className="text-gray-500 text-[10px]">{user.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.user_id && <p className="text-red-500 text-[10px] mt-1">{errors.user_id}</p>}
                  </div>
                  {selectedUser && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-center gap-2">
                      <img
                        src={selectedUser.avatar_url || "../images/placeholder.png"}
                        alt="Avatar"
                        className="rounded-full"
                        style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <div className="text-xs">
                        <strong>Selected:</strong> {selectedUser.full_name || selectedUser.email.split('@')[0]}
                        <span className="text-gray-500 ml-1 text-[10px]">({selectedUser.email})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prediction Selection */}
                {selectedUser && (
                  <>
                    <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                      <i className="fas fa-chart-line mr-2"></i>Prediction Selection
                    </h6>
                    <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                      <label className="block text-xs md:text-sm text-gray-700 mb-1">
                        Select Prediction <span className="text-red-500">*</span>
                      </label>
                      {loadingPredictions ? (
                        <div className="text-center py-3">
                          <i className="fas fa-spinner fa-spin mr-2 text-red-500"></i>
                          <span className="text-xs text-gray-500">Loading predictions...</span>
                        </div>
                      ) : predictions.length > 0 ? (
                        <>
                          <select
                            className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.prediction_id ? 'border-red-500' : 'border-gray-300'}`}
                            value={formData.prediction_id}
                            onChange={(e) => handleInputChange('prediction_id', e.target.value)}
                            disabled={isGenerating}
                          >
                            <option value="">Choose a prediction...</option>
                            {predictions.map(prediction => (
                              <option key={prediction.id} value={prediction.id}>
                                {prediction.timeframe} - {new Date(prediction.generated_at).toLocaleDateString()} ({Math.round(prediction.confidence_score * 100)}%)
                              </option>
                            ))}
                          </select>
                          {errors.prediction_id && <p className="text-red-500 text-[10px] mt-1">{errors.prediction_id}</p>}
                        </>
                      ) : (
                        <div className="p-2 bg-amber-50 rounded-lg border-l-3" style={{ borderLeft: '3px solid #f59e0b' }}>
                          <p className="text-amber-600 text-xs mb-1 font-medium">No predictions found</p>
                          <p className="text-gray-500 text-[10px]">Create predictions first in the Predictions module.</p>
                        </div>
                      )}
                      
                      {formData.prediction_id && (() => {
                        const selectedPrediction = predictions.find(p => p.id === formData.prediction_id);
                        if (!selectedPrediction) return null;
                        return (
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                            <div className="p-1.5 bg-white rounded-lg">
                              <p className="text-[8px] text-gray-500">Timeframe</p>
                              <p className="text-[10px] font-bold text-red-500 capitalize">{selectedPrediction.timeframe}</p>
                            </div>
                            <div className="p-1.5 bg-white rounded-lg">
                              <p className="text-[8px] text-gray-500">Generated</p>
                              <p className="text-[10px] font-bold text-red-500">{new Date(selectedPrediction.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div className="p-1.5 bg-white rounded-lg">
                              <p className="text-[8px] text-gray-500">Confidence</p>
                              <p className="text-[10px] font-bold text-red-500">{Math.round(selectedPrediction.confidence_score * 100)}%</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* AI Configuration */}
                <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                  <i className="fas fa-brain mr-2"></i>AI Configuration
                </h6>
                <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs md:text-sm text-gray-700 mb-1">AI Service</label>
                      <select className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg bg-gray-100" disabled>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm text-gray-700 mb-1">AI Model <span className="text-red-500">*</span></label>
                      <select
                        className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 outline-none ${errors.model_used ? 'border-red-500' : 'border-gray-300'}`}
                        value={formData.model_used}
                        onChange={(e) => handleInputChange('model_used', e.target.value)}
                        disabled={isGenerating}
                      >
                        {availableModels.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-gray-700 mb-1">
                      <i className="fas fa-percentage mr-1 text-red-500"></i>
                      Confidence: <span className="font-bold text-red-500">{Math.round(formData.confidence_threshold * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                      min="0" max="1" step="0.01"
                      value={formData.confidence_threshold}
                      onChange={(e) => handleInputChange('confidence_threshold', parseFloat(e.target.value))}
                      disabled={isGenerating}
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>Low</span><span>Medium</span><span>High</span>
                    </div>
                  </div>
                </div>

                {/* Generation Options */}
                <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                  <i className="fas fa-cogs mr-2"></i>Options
                </h6>
                <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                        checked={formData.generate_recommendations}
                        onChange={(e) => handleInputChange('generate_recommendations', e.target.checked)}
                        disabled={isGenerating}
                      />
                      <span className="text-xs"><i className="fas fa-lightbulb text-amber-500 mr-1"></i>Recommendations</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                        checked={formData.include_risk_assessment}
                        onChange={(e) => handleInputChange('include_risk_assessment', e.target.checked)}
                        disabled={isGenerating}
                      />
                      <span className="text-xs"><i className="fas fa-exclamation-triangle text-red-500 mr-1"></i>Risk Assessment</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                        checked={formData.analyze_trends}
                        onChange={(e) => handleInputChange('analyze_trends', e.target.checked)}
                        disabled={isGenerating}
                      />
                      <span className="text-xs"><i className="fas fa-chart-line text-emerald-500 mr-1"></i>Trend Analysis</span>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                {selectedUser && formData.prediction_id && (
                  <div className="p-2 md:p-3 bg-red-50 rounded-lg border-l-3" style={{ borderLeft: '3px solid #dc3545' }}>
                    <h6 className="text-red-500 mb-2 text-xs flex items-center">
                      <i className="fas fa-info-circle mr-2"></i>Summary
                    </h6>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-gray-500">User:</span> <span className="font-medium">{selectedUser.full_name?.split(' ')[0] || selectedUser.email.split('@')[0]}</span></div>
                      <div><span className="text-gray-500">Model:</span> <span className="font-medium">{formData.model_used?.split('/').pop()}</span></div>
                      <div><span className="text-gray-500">Threshold:</span> <span className="font-medium">{Math.round(formData.confidence_threshold * 100)}%</span></div>
                      <div><span className="text-gray-500">Options:</span> <span className="font-medium">{[formData.generate_recommendations && "Rec", formData.include_risk_assessment && "Risk", formData.analyze_trends && "Trends"].filter(Boolean).join(", ") || "None"}</span></div>
                    </div>
                  </div>
                )}

              </form>
            </div>

            {/* Footer - Mobile Responsive */}
            <div 
              className="modal-footer border-0" 
              style={{ 
                background: '#f8f9fa',
                padding: '10px 16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-info-circle mr-1"></i>{formData.user_id && formData.prediction_id ? 'Ready to generate insights' : 'Complete all required fields'}
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClose} 
                  disabled={isGenerating}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-times mr-1"></i>Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleSubmit}
                  disabled={isGenerating || !formData.user_id || !formData.prediction_id}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic mr-1"></i>Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GenerateInsightModal;
