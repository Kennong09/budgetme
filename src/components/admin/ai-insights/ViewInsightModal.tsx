import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { AIInsightDetail, AI_SERVICES } from "./types";

interface ViewInsightModalProps {
  show: boolean;
  insight: AIInsightDetail;
  onClose: () => void;
}

const ViewInsightModal: FC<ViewInsightModalProps> = ({
  show,
  insight,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!show || !insight) return null;

  const getRiskInfo = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return { label: 'High Risk', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.1)', icon: 'fa-exclamation-triangle' };
      case 'medium':
        return { label: 'Medium Risk', color: '#fd7e14', bgColor: 'rgba(253, 126, 20, 0.1)', icon: 'fa-exclamation-circle' };
      case 'low':
        return { label: 'Low Risk', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)', icon: 'fa-check-circle' };
      default:
        return { label: 'Unknown', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)', icon: 'fa-question-circle' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const riskLevel = insight.insights?.riskAssessment?.level || insight.risk_assessment?.level || 'unknown';
  const riskInfo = getRiskInfo(riskLevel);
  const confidencePercent = Math.round((insight.confidence_level || 0) * 100);
  const serviceConfig = AI_SERVICES.find(s => s.value === insight.ai_service);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
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
                  <i className={`fas fa-brain ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base truncate">AI Insight Analysis</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    {insight.profiles?.full_name || insight.profiles?.email || 'Unknown User'}
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose} 
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile Optimized */}
            <div className="px-2 md:px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              {/* Mobile: 2x2 Grid */}
              <div className="block md:hidden">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className={`fas ${riskInfo.icon} text-xs`} style={{ color: riskInfo.color }}></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Risk</p>
                      <p className="text-[10px] font-bold" style={{ color: riskInfo.color }}>{riskInfo.label.split(' ')[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-percentage text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Confidence</p>
                      <p className="text-[10px] font-bold text-red-500">{confidencePercent}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-bolt text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Time</p>
                      <p className="text-[10px] font-bold text-red-500">{formatDuration(insight.generation_time_ms || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-robot text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Service</p>
                      <p className="text-[10px] font-bold text-red-500 truncate max-w-[60px]">{serviceConfig?.label || insight.ai_service}</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: Row Layout */}
              <div className="hidden md:block">
                <div className="row text-center g-2">
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className={`fas ${riskInfo.icon} mr-2`} style={{ color: riskInfo.color }}></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Risk</small>
                        <strong style={{ color: riskInfo.color, fontSize: '0.8rem' }}>{riskInfo.label.split(' ')[0]}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-percentage text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Confidence</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{confidencePercent}%</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-bolt text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Time</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formatDuration(insight.generation_time_ms || 0)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-robot text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Service</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{serviceConfig?.label || insight.ai_service}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Mobile Optimized */}
            <div className="px-2 md:px-3 pt-2">
              {/* Mobile: Full Width Tabs */}
              <div className="block md:hidden">
                <div className="flex gap-1">
                  {[
                    { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                    { id: 'insights', icon: 'fa-lightbulb', label: 'Insights' },
                    { id: 'technical', icon: 'fa-microchip', label: 'Tech' },
                    { id: 'related', icon: 'fa-project-diagram', label: 'Related' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      className={`flex-1 py-1.5 px-1 rounded-full text-[9px] font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <i className={`fas ${tab.icon} mr-0.5`}></i>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Desktop: Normal Tabs */}
              <div className="hidden md:flex" style={{ gap: '6px' }}>
                {[
                  { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                  { id: 'insights', icon: 'fa-lightbulb', label: 'Insights' },
                  { id: 'technical', icon: 'fa-microchip', label: 'Technical' },
                  { id: 'related', icon: 'fa-project-diagram', label: 'Related' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    <i className={`fas ${tab.icon} mr-1`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - Compact */}
            <div className="modal-body py-3" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row">
                  {/* Left Column - Summary */}
                  <div className="col-lg-7">
                    {insight.insights?.summary && (
                      <div className="mb-3">
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-file-alt mr-2"></i>AI Summary</h6>
                        <div className="p-2" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                          <p className="mb-0" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{insight.insights.summary}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Confidence Gauge */}
                    <div>
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-tachometer-alt mr-2"></i>Confidence</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <small>Analysis Confidence</small>
                          <strong className={confidencePercent >= 80 ? 'text-success' : confidencePercent >= 60 ? 'text-warning' : 'text-danger'} style={{ fontSize: '0.85rem' }}>
                            {confidencePercent}%
                          </strong>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                          <div 
                            className={`progress-bar ${confidencePercent >= 80 ? 'bg-success' : confidencePercent >= 60 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${confidencePercent}%`, borderRadius: '3px' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Quick Info */}
                  <div className="col-lg-5">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Details</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">ID</small>
                        <code style={{ fontSize: '0.75rem' }}>{insight.id?.substring(0, 12)}...</code>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Model</small>
                        <span style={{ fontSize: '0.8rem' }}>{insight.model_used?.split('/').pop() || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Status</small>
                        <Badge bg={insight.processing_status === 'completed' ? 'success' : 'warning'} style={{ fontSize: '0.7rem' }}>
                          {insight.processing_status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Views</small>
                        <span>{insight.access_count || 0}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <small className="text-muted">Expires</small>
                        <span style={{ fontSize: '0.8rem' }}>{insight.expires_at ? new Date(insight.expires_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <div>
                  {/* Risk Assessment */}
                  {(insight.insights?.riskAssessment || insight.risk_assessment) && (
                    <div className="mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-shield-alt mr-2"></i>Risk Assessment</h6>
                      <div className="p-2" style={{ background: riskInfo.bgColor, borderRadius: '8px', border: `1px solid ${riskInfo.color}20` }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className={`fas ${riskInfo.icon} mr-2`} style={{ color: riskInfo.color }}></i>
                          <strong style={{ color: riskInfo.color, fontSize: '0.85rem' }}>{riskInfo.label}</strong>
                        </div>
                        
                        {((insight.insights?.riskAssessment?.factors || insight.risk_assessment?.factors) || []).length > 0 && (
                          <div className="mb-2">
                            <small className="text-muted">Risk Factors:</small>
                            {(insight.insights?.riskAssessment?.factors || insight.risk_assessment?.factors || []).map((factor: string, i: number) => (
                              <div key={i} className="d-flex align-items-start mt-1">
                                <i className="fas fa-exclamation-circle text-warning mr-2" style={{ fontSize: '0.65rem', marginTop: '4px' }}></i>
                                <small>{factor}</small>
                              </div>
                            ))}
                          </div>
                        )}

                        {((insight.insights?.riskAssessment?.mitigationSuggestions || insight.risk_assessment?.mitigationSuggestions) || []).length > 0 && (
                          <div>
                            <small className="text-muted">Suggestions:</small>
                            {(insight.insights?.riskAssessment?.mitigationSuggestions || insight.risk_assessment?.mitigationSuggestions || []).map((suggestion: string, i: number) => (
                              <div key={i} className="d-flex align-items-start mt-1">
                                <i className="fas fa-check-circle text-success mr-2" style={{ fontSize: '0.65rem', marginTop: '4px' }}></i>
                                <small>{suggestion}</small>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {((insight.insights?.recommendations || insight.recommendations) || []).length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-tasks mr-2"></i>Recommendations</h6>
                      <div className="row g-2">
                        {(insight.insights?.recommendations || insight.recommendations || []).slice(0, 4).map((rec: string, i: number) => (
                          <div key={i} className="col-6">
                            <div className="p-2 h-100" style={{ background: '#f8f9fa', borderRadius: '6px' }}>
                              <div className="d-flex align-items-start">
                                <span className="badge badge-danger mr-2" style={{ fontSize: '0.65rem', minWidth: '18px' }}>{i + 1}</span>
                                <small>{rec}</small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opportunity Areas */}
                  {((insight.insights?.opportunityAreas || insight.opportunity_areas) || []).length > 0 && (
                    <div>
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-star mr-2"></i>Opportunities</h6>
                      <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                        {(insight.insights?.opportunityAreas || insight.opportunity_areas || []).slice(0, 6).map((area: string, i: number) => (
                          <span key={i} className="badge badge-light px-2 py-1" style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                            <i className="fas fa-lightbulb text-warning mr-1"></i>{area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Tab */}
              {activeTab === 'technical' && (
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-server mr-2"></i>Processing</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                        <tbody>
                          <tr><td className="text-muted py-1">Time</td><td className="text-right py-1"><strong>{formatDuration(insight.generation_time_ms || 0)}</strong></td></tr>
                          <tr><td className="text-muted py-1">Version</td><td className="text-right py-1">{insight.model_version || 'N/A'}</td></tr>
                          <tr><td className="text-muted py-1">Status</td><td className="text-right py-1"><Badge bg={insight.processing_status === 'completed' ? 'success' : 'warning'} style={{ fontSize: '0.65rem' }}>{insight.processing_status}</Badge></td></tr>
                          <tr><td className="text-muted py-1">Rate Limited</td><td className="text-right py-1"><Badge bg={insight.rate_limited ? 'warning' : 'success'} style={{ fontSize: '0.65rem' }}>{insight.rate_limited ? 'Yes' : 'No'}</Badge></td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-coins mr-2"></i>Tokens</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      {insight.token_usage ? (
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr><td className="text-muted py-1">Prompt</td><td className="text-right py-1">{insight.token_usage.prompt_tokens?.toLocaleString() || 0}</td></tr>
                            <tr><td className="text-muted py-1">Completion</td><td className="text-right py-1">{insight.token_usage.completion_tokens?.toLocaleString() || 0}</td></tr>
                            <tr><td className="text-muted py-1">Total</td><td className="text-right py-1"><strong className="text-danger">{insight.token_usage.total_tokens?.toLocaleString() || 0}</strong></td></tr>
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-muted mb-0 text-center py-2" style={{ fontSize: '0.8rem' }}>No token data</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Raw JSON */}
                  {insight.insights && (
                    <div className="col-12">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-code mr-2"></i>Raw Data</h6>
                      <pre className="p-2 mb-0" style={{ background: '#1e1e1e', color: '#d4d4d4', borderRadius: '8px', maxHeight: '150px', overflow: 'auto', fontSize: '0.7rem' }}>
                        {JSON.stringify(insight.insights, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Related Tab */}
              {activeTab === 'related' && (
                <div>
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-chart-line mr-2"></i>Related Predictions</h6>
                  {insight.relatedPredictions?.length > 0 ? (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                        <thead style={{ background: '#f8f9fa' }}>
                          <tr>
                            <th className="py-2">ID</th>
                            <th className="py-2">Timeframe</th>
                            <th className="py-2">Confidence</th>
                            <th className="py-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insight.relatedPredictions.map((pred) => (
                            <tr key={pred.id}>
                              <td className="py-1"><code style={{ fontSize: '0.7rem' }}>{pred.id.substring(0, 8)}...</code></td>
                              <td className="py-1"><Badge bg="info" style={{ fontSize: '0.65rem' }}>{pred.timeframe}</Badge></td>
                              <td className="py-1">
                                <span className={`text-${pred.confidence_score >= 0.8 ? 'success' : pred.confidence_score >= 0.6 ? 'warning' : 'danger'}`}>
                                  {Math.round(pred.confidence_score * 100)}%
                                </span>
                              </td>
                              <td className="py-1">{new Date(pred.generated_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <i className="fas fa-chart-line fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>No related predictions</p>
                    </div>
                  )}

                  {/* Usage History */}
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-history mr-2"></i>Usage History</h6>
                  {(insight.usageHistory || []).length > 0 ? (
                    <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
                      {(insight.usageHistory || []).map((usage, i) => (
                        <div key={i} className="p-2 text-center" style={{ background: '#f8f9fa', borderRadius: '6px', minWidth: '100px' }}>
                          <small className="text-muted d-block">{usage.date}</small>
                          <strong className="text-danger" style={{ fontSize: '0.85rem' }}>{usage.access_count} views</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <i className="fas fa-history fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>No usage history</p>
                    </div>
                  )}
                </div>
              )}
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{insight.id?.substring(0, 12)}...</code>
              </small>
              <button 
                type="button" 
                className="btn btn-danger w-100" 
                onClick={onClose}
                style={{ 
                  padding: '10px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  minHeight: '42px'
                }}
              >
                <i className="fas fa-times mr-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewInsightModal;
